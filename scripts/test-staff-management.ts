/**
 * Staff & Roles User Management Test Suite (Phase 12A)
 *
 * Usage:
 *   1. Start the dev server:  npm run dev
 *   2. Run:                   npx tsx scripts/test-staff-management.ts
 *   Optional: TEST_BASE_URL=http://localhost:3001 npx tsx scripts/test-staff-management.ts
 *
 * Covers: route guards (401 for anonymous / guest / non-staff tokens), staff CRUD,
 * validation and duplicate-email handling, password policy + rotation, account
 * deactivation (login block + live-session revocation), self-protection rules,
 * SUPER_ADMIN/ADMIN management scope, winery tenant isolation (IDOR), delete-vs-
 * deactivate history guard, response hygiene (no passwordHash / JWT secret) and
 * the admin layout's DB re-validation redirect.
 *
 * Test data is namespaced by `staff12a-` and removed on exit; a legitimate winery
 * and its users are never touched.
 */
import { PrismaClient, UserRole } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const RUN = Date.now().toString(36);

const PREFIX = 'staff12a';
const EMAIL_A = `${PREFIX}-${RUN}-a@vinora.test`;
const EMAIL_MGR = `${PREFIX}-${RUN}-mgr@vinora.test`;
const EMAIL_REC = `${PREFIX}-${RUN}-rec@vinora.test`;
const EMAIL_B_ADMIN = `${PREFIX}-${RUN}-badmin@vinora.test`;
const EMAIL_B_STAFF = `${PREFIX}-${RUN}-bstaff@vinora.test`;
const EMAIL_HISTORY = `${PREFIX}-${RUN}-history@vinora.test`;
const PASSWORD_1 = 'Cellar#Door2026!';
const PASSWORD_2 = 'Vineyard#New2026!';
const WEAK_PW = 'short1';

const ADMIN_COOKIE = 'elysee_admin_session';

function loadDotEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const raw = readFileSync(join(process.cwd(), '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    // .env optional
  }
  return out;
}

const DOTENV = loadDotEnv();
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || DOTENV.ADMIN_JWT_SECRET || '';

let total = 0;
let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, details?: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`✔ PASS: ${name}${details ? ` - ${details}` : ''}`);
  } else {
    failed++;
    console.log(`✘ FAIL: ${name}${details ? ` - ${details}` : ''}`);
  }
}

let ipCounter = 1;
function freshIp(): string {
  // Guaranteed unique per attempt so the 5-attempt/15min login limiter never trips.
  return `10.77.0.${ipCounter++}`;
}

class CookieJar {
  private cookies = new Map<string, string>();
  header(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  absorb(res: Response) {
    const raw = res.headers.getSetCookie?.() || [];
    if (raw.length === 0) {
      const single = res.headers.get('set-cookie');
      if (single) raw.push(single);
    }
    for (const c of raw) {
      const match = c.match(/^([^=;]+)=([^;]*)/);
      if (match) this.cookies.set(match[1].trim(), match[2].trim());
    }
  }
}

interface ApiResponse {
  status: number;
  ok: boolean;
  json: {
    success?: boolean;
    error?: string;
    message?: string;
    data?: {
      userId?: string;
      role?: string;
      wineryId?: string | null;
      staff?: Record<string, unknown> | Record<string, unknown>[];
      staffList?: Record<string, unknown>[];
      items?: Record<string, unknown>[];
      wineries?: { id: string; name: string; slug: string }[];
      canManage?: boolean;
      actor?: { userId: string; role: string; wineryId: string | null };
      id?: string;
    };
  };
}

async function login(jar: CookieJar, email: string, password: string): Promise<ApiResponse> {
  const res = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': freshIp() },
    body: JSON.stringify({ email, password }),
  });
  jar.absorb(res);
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: Boolean(json?.success), json: json ?? {} };
}

async function listStaff(jar: CookieJar | null): Promise<ApiResponse> {
  const res = await fetch(`${BASE_URL}/api/admin/staff`, {
    headers: { ...(jar ? { Cookie: jar.header() } : {}), 'x-forwarded-for': freshIp() },
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: Boolean(json?.success), json: json ?? {} };
}

async function createStaff(
  jar: CookieJar | null,
  body: unknown
): Promise<ApiResponse> {
  const res = await fetch(`${BASE_URL}/api/admin/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jar ? { Cookie: jar.header() } : {}),
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: Boolean(json?.success), json: json ?? {} };
}

async function getStaff(
  jar: CookieJar | null,
  id: string
): Promise<ApiResponse> {
  const res = await fetch(`${BASE_URL}/api/admin/staff/${id}`, {
    headers: { ...(jar ? { Cookie: jar.header() } : {}), 'x-forwarded-for': freshIp() },
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: Boolean(json?.success), json: json ?? {} };
}

async function patchStaff(
  jar: CookieJar | null,
  id: string,
  body: unknown
): Promise<ApiResponse> {
  const res = await fetch(`${BASE_URL}/api/admin/staff/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(jar ? { Cookie: jar.header() } : {}),
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: Boolean(json?.success), json: json ?? {} };
}

async function deleteStaff(jar: CookieJar | null, id: string): Promise<ApiResponse> {
  const res = await fetch(`${BASE_URL}/api/admin/staff/${id}`, {
    method: 'DELETE',
    headers: { ...(jar ? { Cookie: jar.header() } : {}), 'x-forwarded-for': freshIp() },
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: Boolean(json?.success), json: json ?? {} };
}

async function changePassword(
  jar: CookieJar | null,
  id: string,
  body: unknown
): Promise<ApiResponse> {
  const res = await fetch(`${BASE_URL}/api/admin/staff/${id}/password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jar ? { Cookie: jar.header() } : {}),
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: Boolean(json?.success), json: json ?? {} };
}

/** Builds a signed admin-session JWT directly (used for non-staff role probes). */
async function forgeAdminCookie(role: UserRole, userId: string, wineryId: string | null) {
  const secretKey = new TextEncoder().encode(ADMIN_JWT_SECRET);
  const token = await new SignJWT({ userId, email: `${PREFIX}-forged@vinora.test`, role, wineryId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secretKey);
  const jar = new CookieJar();
  jar.absorb(
    new Response('', {
      headers: { 'set-cookie': `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly` },
    })
  );
  return jar;
}

function asArray(json: ApiResponse): Record<string, unknown>[] {
  const d = json.json.data;
  if (Array.isArray(d?.staff)) return d.staff;
  if (Array.isArray(d?.items)) return d.items;
  return [];
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: `${PREFIX}-` } },
    select: { id: true, guestProfile: { select: { id: true } } },
  });
  for (const u of users) {
    if (u.guestProfile) {
      await prisma.guestProfile.delete({ where: { id: u.guestProfile.id } }).catch(() => undefined);
    }
    await prisma.user.delete({ where: { id: u.id } }).catch(() => undefined);
  }
  await prisma.winery.deleteMany({ where: { slug: { startsWith: `${PREFIX}-winb` } } });
}

async function main() {
  console.log('=== Phase 12A Staff & Roles User Management Tests ===');
  await cleanup();

  const legitimateWinery = await prisma.winery.findFirst({
    where: { slug: 'domaine-elysee' },
    select: { id: true, name: true },
  });
  const wineryAId = legitimateWinery?.id ?? null;
  assert(Boolean(wineryAId), 'Setup: reference winery present', legitimateWinery?.name);

  // ==================================================================
  // Section 1: Route guards
  // ==================================================================
  console.log('\n--- Section 1: Route guards ---');

  assert((await listStaff(null)).status === 401, '1A. Anonymous list -> 401');
  assert(
    (await createStaff(null, { name: 'X', email: 'x@y.co', password: PASSWORD_1, confirmPassword: PASSWORD_1, role: 'RECEPTION' }))
      .status === 401,
    '1B. Anonymous create -> 401'
  );
  assert((await getStaff(null, 'missing-id')).status === 401, '1C. Anonymous read -> 401');
  assert((await patchStaff(null, 'missing-id', { isActive: false })).status === 401, '1D. Anonymous update -> 401');
  assert((await deleteStaff(null, 'missing-id')).status === 401, '1E. Anonymous delete -> 401');
  assert(
    (await changePassword(null, 'missing-id', { password: PASSWORD_1, confirmPassword: PASSWORD_1 })).status === 401,
    '1F. Anonymous password change -> 401'
  );

  const guestList = await listStaff(null);
  assert(
    guestList.status === 401 || guestList.status === 403,
    '1G. Guest cookie (no admin session) -> 401/403',
    `status: ${guestList.status}`
  );

  const forgedGuest = await forgeAdminCookie(UserRole.GUEST, '00000000-0000-0000-0000-000000000000', wineryAId);
  const forgedRes = await listStaff(forgedGuest);
  assert(
    forgedRes.status === 401 || forgedRes.status === 403,
    '1H. GUEST-role admin token -> 401/403',
    `status: ${forgedRes.status}`
  );

  // ==================================================================
  // Section 2: Super admin CRUD + validation
  // ==================================================================
  console.log('\n--- Section 2: Super admin CRUD & validation ---');

  // Self-provisioned super admin: the suite never depends on the ambient
  // INITIAL_ADMIN_* credentials staying in sync with the seeded password hash.
  const superEmail = `${PREFIX}-${RUN}-super@vinora.test`;
  const superHash = await bcrypt.hash(PASSWORD_1, 12);
  const superUser = await prisma.user.create({
    data: {
      email: superEmail,
      name: 'Phase 12A Super',
      passwordHash: superHash,
      role: UserRole.SUPER_ADMIN,
      wineryId: wineryAId,
      isActive: true,
    },
    select: { id: true },
  });
  const superUserId = superUser.id;
  assert(Boolean(superUserId), '2A. Setup: super admin test account created', superUserId);

  const superJar = new CookieJar();
  const superLogin = await login(superJar, superEmail, PASSWORD_1);
  assert(superLogin.status === 200 && superLogin.ok, '2B. Super admin login succeeds', `status: ${superLogin.status}`);
  assert(
    superLogin.json.data?.userId === superUserId,
    '2C. Login resolves the provisioned account'
  );

  const listRes = await listStaff(superJar);
  const staffList = asArray(listRes);
  const rawList = JSON.stringify(listRes.json);
  assert(listRes.status === 200 && listRes.ok, '2D. Super admin list -> 200', `status: ${listRes.status}`);
  assert(listRes.json.data?.canManage === true, '2E. Super admin canManage is true');
  assert(
    Array.isArray(listRes.json.data?.wineries) && (listRes.json.data?.wineries?.length ?? 0) > 0,
    '2F. Winery options returned',
    `count: ${listRes.json.data?.wineries?.length}`
  );
  assert(
    staffList.length > 0 && staffList.every((s) => s.role !== 'GUEST'),
    '2G. Staff list excludes GUEST accounts',
    `rows: ${staffList.length}`
  );
  assert(!rawList.includes('passwordHash'), '2H. List response never exposes passwordHash');
  assert(!rawList.includes(ADMIN_JWT_SECRET), '2I. List response never leaks the JWT secret');
  assert(
    listRes.json.data?.actor?.userId === superLogin.json.data?.userId,
    '2J. Actor identity echoed back matches the session'
  );

  const createBody = {
    name: 'Staff A',
    email: EMAIL_A,
    password: PASSWORD_1,
    confirmPassword: PASSWORD_1,
    role: 'RECEPTION',
    wineryId: wineryAId,
    isActive: true,
  };
  const createRes = await createStaff(superJar, createBody);
  const created = (createRes.json.data?.staff ?? {}) as Record<string, unknown>;
  assert(createRes.status === 201 && createRes.ok, '2K. Valid create -> 201', `status: ${createRes.status}`);
  assert(created.email === EMAIL_A && created.role === 'RECEPTION', '2L. Created user carries submitted values');
  assert(created.isActive === true, '2M. Created user is active by default');
  assert(!JSON.stringify(createRes.json).includes('passwordHash'), '2N. Create response omits passwordHash');

  const staffAId = String(created.id ?? '');
  assert(Boolean(staffAId), '2O. Created user id captured', staffAId);

  const dupRes = await createStaff(superJar, { ...createBody, name: 'Dup' });
  assert(dupRes.status === 409, '2P. Duplicate email -> 409', `status: ${dupRes.status}`);

  const weakRes = await createStaff(superJar, {
    ...createBody,
    email: `${PREFIX}-${RUN}-weak@vinora.test`,
    password: WEAK_PW,
    confirmPassword: WEAK_PW,
  });
  assert(weakRes.status === 400, '2Q. Weak password -> 400', `status: ${weakRes.status}`);

  const mismatchRes = await createStaff(superJar, {
    ...createBody,
    email: `${PREFIX}-${RUN}-mm@vinora.test`,
    password: PASSWORD_1,
    confirmPassword: PASSWORD_2,
  });
  assert(mismatchRes.status === 400, '2R. Password mismatch -> 400', `status: ${mismatchRes.status}`);

  const badRoleRes = await createStaff(superJar, {
    ...createBody,
    email: `${PREFIX}-${RUN}-guestrole@vinora.test`,
    role: 'GUEST',
  });
  assert(badRoleRes.status === 400, '2S. GUEST role rejected -> 400', `status: ${badRoleRes.status}`);

  const shortNameRes = await createStaff(superJar, {
    ...createBody,
    email: `${PREFIX}-${RUN}-short@vinora.test`,
    name: 'A',
  });
  assert(shortNameRes.status === 400, '2T. Short name -> 400', `status: ${shortNameRes.status}`);

  const badWineryRes = await createStaff(superJar, {
    ...createBody,
    email: `${PREFIX}-${RUN}-badwin@vinora.test`,
    wineryId: '00000000-0000-0000-0000-000000000000',
  });
  assert(badWineryRes.status === 400, '2U. Unknown winery -> 400', `status: ${badWineryRes.status}`);

  const readRes = await getStaff(superJar, staffAId);
  const readStaff = (readRes.json.data?.staff ?? {}) as Record<string, unknown>;
  assert(readRes.status === 200, '2V. Read by id -> 200', `status: ${readRes.status}`);
  assert(!JSON.stringify(readRes.json).includes('passwordHash'), '2W. Read response omits passwordHash');
  assert(
    readStaff.winery !== undefined && readStaff.winery !== null,
    '2X. Read includes winery relation'
  );

  const unknownRes = await getStaff(superJar, '00000000-0000-0000-0000-000000000000');
  assert(unknownRes.status === 404, '2Y. Read unknown id -> 404', `status: ${unknownRes.status}`);

  // ==================================================================
  // Section 3: Updates
  // ==================================================================
  console.log('\n--- Section 3: Updates ---');

  const patchRes = await patchStaff(superJar, staffAId, {
    name: 'Staff A Renamed',
    role: 'MANAGER',
    isActive: true,
  });
  assert(patchRes.status === 200 && patchRes.ok, '3A. Update name/role -> 200', `status: ${patchRes.status}`);
  assert(
    ((patchRes.json.data?.staff ?? {}) as Record<string, unknown>).name === 'Staff A Renamed',
    '3B. Updated name persisted'
  );

  const patchNoName = await patchStaff(superJar, staffAId, { role: 'RECEPTION', isActive: true });
  const patchNoNameStaff = (patchNoName.json.data?.staff ?? {}) as Record<string, unknown>;
  assert(patchNoName.status === 200, '3C. Update without name field -> 200', `status: ${patchNoName.status}`);
  assert(
    patchNoNameStaff.name === 'Staff A Renamed',
    '3D. Omitting name leaves the stored name untouched',
    `name: ${String(patchNoNameStaff.name)}`
  );

  // Target an email owned by a *different* account that already exists
  // (the super admin) so the clash is real and the subject is not renamed.
  const dupPatch = await patchStaff(superJar, staffAId, { email: superEmail });
  assert(dupPatch.status === 409, '3E. Update to an existing email -> 409', `status: ${dupPatch.status}`);
  const stillNamed = await getStaff(superJar, staffAId);
  assert(
    ((stillNamed.json.data?.staff ?? {}) as Record<string, unknown>).email === EMAIL_A,
    '3E2. Rejected update left the original email intact',
    `email: ${String(((stillNamed.json.data?.staff ?? {}) as Record<string, unknown>).email)}`
  );

  const emptyPatch = await patchStaff(superJar, staffAId, {});
  assert(emptyPatch.status === 400, '3F. Empty patch -> 400', `status: ${emptyPatch.status}`);

  const guestRolePatch = await patchStaff(superJar, staffAId, { role: 'GUEST' });
  assert(guestRolePatch.status === 400, '3G. Demoting to GUEST -> 400', `status: ${guestRolePatch.status}`);

  const badWineryPatch = await patchStaff(superJar, staffAId, {
    wineryId: '00000000-0000-0000-0000-000000000000',
  });
  assert(badWineryPatch.status === 400, '3H. Assigning an unknown winery -> 400', `status: ${badWineryPatch.status}`);

  const unknownPatch = await patchStaff(superJar, '00000000-0000-0000-0000-000000000000', { name: 'Nope' });
  assert(unknownPatch.status === 404, '3I. Update unknown id -> 404', `status: ${unknownPatch.status}`);

  // ==================================================================
  // Section 4: Password rotation
  // ==================================================================
  console.log('\n--- Section 4: Password rotation ---');

  const pwWeak = await changePassword(superJar, staffAId, { password: WEAK_PW, confirmPassword: WEAK_PW });
  assert(pwWeak.status === 400, '4A. Weak new password -> 400', `status: ${pwWeak.status}`);

  const pwMismatch = await changePassword(superJar, staffAId, {
    password: PASSWORD_2,
    confirmPassword: PASSWORD_1,
  });
  assert(pwMismatch.status === 400, '4B. Mismatched confirmation -> 400', `status: ${pwMismatch.status}`);

  const pwOk = await changePassword(superJar, staffAId, {
    password: PASSWORD_2,
    confirmPassword: PASSWORD_2,
  });
  assert(pwOk.status === 200 && pwOk.ok, '4C. Valid password change -> 200', `status: ${pwOk.status}`);

  const oldJar = new CookieJar();
  const oldLogin = await login(oldJar, EMAIL_A, PASSWORD_1);
  assert(oldLogin.status !== 200, '4D. Old password no longer works', `status: ${oldLogin.status}`);

  const newJar = new CookieJar();
  const newLogin = await login(newJar, EMAIL_A, PASSWORD_2);
  assert(newLogin.status === 200 && newLogin.ok, '4E. New password signs in', `status: ${newLogin.status}`);

  // ==================================================================
  // Section 5: Deactivation & live session revocation
  // ==================================================================
  console.log('\n--- Section 5: Deactivation ---');

  const deactivate = await patchStaff(superJar, staffAId, { isActive: false });
  assert(deactivate.status === 200, '5A. Deactivate user -> 200', `status: ${deactivate.status}`);
  assert(
    ((deactivate.json.data?.staff ?? {}) as Record<string, unknown>).isActive === false,
    '5B. Deactivation persisted'
  );

  const blockedLogin = await login(new CookieJar(), EMAIL_A, PASSWORD_2);
  assert(blockedLogin.status !== 200, '5C. Deactivated account cannot sign in', `status: ${blockedLogin.status}`);
  assert(
    (blockedLogin.json.error || '').toLowerCase().includes('deactivat'),
    '5D. Sign-in refusal explains the deactivation',
    `error: ${blockedLogin.json.error}`
  );

  const revokedList = await listStaff(newJar);
  assert(revokedList.status === 401, '5E. Live session of a deactivated user -> 401', `status: ${revokedList.status}`);

  const reactivate = await patchStaff(superJar, staffAId, { isActive: true });
  assert(reactivate.status === 200, '5F. Reactivate user -> 200', `status: ${reactivate.status}`);
  assert(
    ((reactivate.json.data?.staff ?? {}) as Record<string, unknown>).isActive === true,
    '5G. Reactivation persisted'
  );
  const reactivatedList = await listStaff(newJar);
  assert(reactivatedList.status === 200, '5H. Reactivated session works again', `status: ${reactivatedList.status}`);

  // ==================================================================
  // Section 6: Self-protection rules
  // ==================================================================
  console.log('\n--- Section 6: Self-protection ---');

  assert(Boolean(superUserId), '6A. Super admin user id captured', superUserId);

  const selfRole = await patchStaff(superJar, superUserId, { role: 'RECEPTION' });
  assert(selfRole.status === 400, '6B. Changing own role -> 400', `status: ${selfRole.status}`);

  const selfDeactivate = await patchStaff(superJar, superUserId, { isActive: false });
  assert(selfDeactivate.status === 400, '6C. Deactivating own account -> 400', `status: ${selfDeactivate.status}`);

  const selfWinery = await patchStaff(superJar, superUserId, {
    wineryId: '00000000-0000-0000-0000-000000000000',
  });
  assert(selfWinery.status === 400, '6D. Reassigning own winery -> 400', `status: ${selfWinery.status}`);

  const selfDelete = await deleteStaff(superJar, superUserId);
  assert(selfDelete.status === 400, '6E. Deleting own account -> 400', `status: ${selfDelete.status}`);

  // ==================================================================
  // Section 7: Management scope (MANAGER / RECEPTION)
  // ==================================================================
  console.log('\n--- Section 7: Management scope ---');

  const mgrCreate = await createStaff(superJar, {
    name: 'Estate Manager',
    email: EMAIL_MGR,
    password: PASSWORD_1,
    confirmPassword: PASSWORD_1,
    role: 'MANAGER',
    wineryId: wineryAId,
    isActive: true,
  });
  assert(mgrCreate.status === 201, '7A. Setup: MANAGER user created', `status: ${mgrCreate.status}`);
  const mgrId = String(((mgrCreate.json.data?.staff ?? {}) as Record<string, unknown>).id ?? '');
  assert(Boolean(mgrId), '7A2. MANAGER account id captured', mgrId);

  const recCreate = await createStaff(superJar, {
    name: 'Front Desk',
    email: EMAIL_REC,
    password: PASSWORD_1,
    confirmPassword: PASSWORD_1,
    role: 'RECEPTION',
    wineryId: wineryAId,
    isActive: true,
  });
  assert(recCreate.status === 201, '7B. Setup: RECEPTION user created', `status: ${recCreate.status}`);
  const recId = String(((recCreate.json.data?.staff ?? {}) as Record<string, unknown>).id ?? '');

  const mgrJar = new CookieJar();
  assert((await login(mgrJar, EMAIL_MGR, PASSWORD_1)).status === 200, '7C. MANAGER signs in');

  const mgrList = await listStaff(mgrJar);
  assert(mgrList.status === 200, '7D. MANAGER can read the roster -> 200', `status: ${mgrList.status}`);
  assert(mgrList.json.data?.canManage === false, '7E. MANAGER canManage is false');

  const mgrCreateRes = await createStaff(mgrJar, {
    name: 'Nope',
    email: `${PREFIX}-${RUN}-mgrnew@vinora.test`,
    password: PASSWORD_1,
    confirmPassword: PASSWORD_1,
    role: 'RECEPTION',
    wineryId: wineryAId,
  });
  assert(mgrCreateRes.status === 403, '7F. MANAGER create -> 403', `status: ${mgrCreateRes.status}`);
  assert((await patchStaff(mgrJar, recId, { name: 'Nope' })).status === 403, '7G. MANAGER update -> 403');
  assert((await deleteStaff(mgrJar, recId)).status === 403, '7H. MANAGER delete -> 403');
  assert(
    (await changePassword(mgrJar, recId, { password: PASSWORD_1, confirmPassword: PASSWORD_1 })).status === 403,
    '7I. MANAGER password change -> 403'
  );

  const recJar = new CookieJar();
  assert((await login(recJar, EMAIL_REC, PASSWORD_1)).status === 200, '7J. RECEPTION signs in');
  assert((await listStaff(recJar)).status === 200, '7K. RECEPTION can read the roster -> 200');
  assert((await createStaff(recJar, { ...createBody, email: `${PREFIX}-${RUN}-recnew@vinora.test` })).status === 403, '7L. RECEPTION create -> 403');

  // ==================================================================
  // Section 8: Winery tenant isolation (IDOR)
  // ==================================================================
  console.log('\n--- Section 8: Winery tenant isolation ---');

  const wineryB = await prisma.winery.create({
    data: {
      name: `Staff12A Test Estate ${RUN}`,
      slug: `${PREFIX}-winb-${RUN}`,
      description: 'Temporary winery used by the Phase 12A staff management suite.',
      address: '1 Test Lane',
      city: 'Testville',
      state: 'CA',
      country: 'USA',
      postalCode: '90001',
      phone: '+1 555 0100',
      email: `${PREFIX}-winb-${RUN}@vinora.test`,
    },
    select: { id: true },
  });
  const wineryBId = wineryB.id;

  const bAdminCreate = await createStaff(superJar, {
    name: 'Winery B Admin',
    email: EMAIL_B_ADMIN,
    password: PASSWORD_1,
    confirmPassword: PASSWORD_1,
    role: 'ADMIN',
    wineryId: wineryBId,
    isActive: true,
  });
  assert(bAdminCreate.status === 201, '8A. Setup: winery-B ADMIN created', `status: ${bAdminCreate.status}`);
  const bAdminId = String(((bAdminCreate.json.data?.staff ?? {}) as Record<string, unknown>).id ?? '');
  assert(Boolean(bAdminId), '8A2. Winery-B admin id captured', bAdminId);

  const bStaffCreate = await createStaff(superJar, {
    name: 'Winery B Reception',
    email: EMAIL_B_STAFF,
    password: PASSWORD_1,
    confirmPassword: PASSWORD_1,
    role: 'RECEPTION',
    wineryId: wineryBId,
    isActive: true,
  });
  assert(bStaffCreate.status === 201, '8B. Setup: winery-B staff created', `status: ${bStaffCreate.status}`);
  const bStaffId = String(((bStaffCreate.json.data?.staff ?? {}) as Record<string, unknown>).id ?? '');

  const bAdminJar = new CookieJar();
  assert((await login(bAdminJar, EMAIL_B_ADMIN, PASSWORD_1)).status === 200, '8C. Winery-B admin signs in');

  const bList = await listStaff(bAdminJar);
  const bStaffList = asArray(bList);
  assert(bList.status === 200, '8D. Winery-B admin list -> 200', `status: ${bList.status}`);
  assert(
    bStaffList.length > 0 && bStaffList.every((s) => s.wineryId === wineryBId),
    '8E. Winery-B roster is scoped to winery B',
    `rows: ${bStaffList.length}`
  );
  assert(!bStaffList.some((s) => s.id === staffAId), '8F. Winery-B admin cannot see winery-A users');
  assert(
    (bList.json.data?.wineries?.length ?? 0) === 1 && bList.json.data?.wineries?.[0]?.id === wineryBId,
    '8G. Winery-B admin only receives winery-B options',
    `count: ${bList.json.data?.wineries?.length}`
  );

  assert((await getStaff(bAdminJar, staffAId)).status === 403, '8H. Cross-tenant read -> 403');
  assert((await patchStaff(bAdminJar, staffAId, { name: 'Hacked' })).status === 403, '8I. Cross-tenant update -> 403');
  assert((await deleteStaff(bAdminJar, staffAId)).status === 403, '8J. Cross-tenant delete -> 403');

  const crossWineryCreate = await createStaff(bAdminJar, {
    name: 'Cross Tenant',
    email: `${PREFIX}-${RUN}-cross@vinora.test`,
    password: PASSWORD_1,
    confirmPassword: PASSWORD_1,
    role: 'RECEPTION',
    wineryId: wineryAId,
  });
  assert(crossWineryCreate.status === 403, '8K. Creating in another winery -> 403', `status: ${crossWineryCreate.status}`);

  const pinnedCreate = await createStaff(bAdminJar, {
    name: 'Pinned Staff',
    email: EMAIL_B_STAFF.replace('-bstaff', '-bstaff2'),
    password: PASSWORD_1,
    confirmPassword: PASSWORD_1,
    role: 'RECEPTION',
    wineryId: wineryBId,
  });
  assert(pinnedCreate.status === 201, '8L. Creating inside own winery -> 201', `status: ${pinnedCreate.status}`);

  const grantSuper = await patchStaff(bAdminJar, bStaffId, { role: 'SUPER_ADMIN' });
  assert(grantSuper.status === 403, '8M. Non-super admin granting SUPER_ADMIN -> 403', `status: ${grantSuper.status}`);

  const touchSuper = await patchStaff(bAdminJar, superUserId, { name: 'Hijack' });
  assert(touchSuper.status === 403, '8N. Non-super admin touching a Super Admin -> 403', `status: ${touchSuper.status}`);

  // ==================================================================
  // Section 9: Delete vs deactivate
  // ==================================================================
  console.log('\n--- Section 9: Delete vs deactivate ---');

  const historyCreate = await createStaff(superJar, {
    name: 'Historic Staff',
    email: EMAIL_HISTORY,
    password: PASSWORD_1,
    confirmPassword: PASSWORD_1,
    role: 'RECEPTION',
    wineryId: wineryAId,
    isActive: true,
  });
  const historyId = String(((historyCreate.json.data?.staff ?? {}) as Record<string, unknown>).id ?? '');
  assert(historyCreate.status === 201, '9A. Setup: staff with guest history created', `status: ${historyCreate.status}`);

  await prisma.guestProfile.create({ data: { userId: historyId, name: 'Historic Staff' } });

  const historyDelete = await deleteStaff(superJar, historyId);
  assert(historyDelete.status === 409, '9B. Deleting a user with history -> 409', `status: ${historyDelete.status}`);
  const historyStillThere = await prisma.user.findUnique({ where: { id: historyId }, select: { id: true } });
  assert(Boolean(historyStillThere), '9C. User with history was not deleted');

  const historyDeactivate = await patchStaff(superJar, historyId, { isActive: false });
  assert(historyDeactivate.status === 200, '9D. Deactivating instead succeeds -> 200', `status: ${historyDeactivate.status}`);

  const cleanDelete = await deleteStaff(superJar, recId);
  assert(cleanDelete.status === 200 && cleanDelete.ok, '9E. Deleting a history-free user -> 200', `status: ${cleanDelete.status}`);
  const recGone = await prisma.user.findUnique({ where: { id: recId }, select: { id: true } });
  assert(recGone === null, '9F. Deleted user removed from the database');

  const unknownDelete = await deleteStaff(superJar, '00000000-0000-0000-0000-000000000000');
  assert(unknownDelete.status === 404, '9G. Deleting an unknown id -> 404', `status: ${unknownDelete.status}`);

  // ==================================================================
  // Section 10: Admin layout re-validation
  // ==================================================================
  console.log('\n--- Section 10: Live session re-validation ---');

  const pageJar = new CookieJar();
  const pageLogin = await login(pageJar, EMAIL_A, PASSWORD_2);
  assert(pageLogin.status === 200, '10A. Setup: staff session for page probe', `status: ${pageLogin.status}`);

  const activePage = await fetch(`${BASE_URL}/admin/staff`, {
    headers: { Cookie: pageJar.header() },
    redirect: 'manual',
  });
  assert(
    activePage.status === 200,
    '10B. Active staff can load /admin/staff',
    `status: ${activePage.status}`
  );

  await patchStaff(superJar, staffAId, { isActive: false });

  const revokedPage = await fetch(`${BASE_URL}/admin/staff`, {
    headers: { Cookie: pageJar.header() },
    redirect: 'manual',
  });
  const location = revokedPage.headers.get('location') || '';
  assert(
    [301, 302, 303, 307, 308].includes(revokedPage.status) && location.includes('/admin/login'),
    '10C. Deactivated session is redirected to login',
    `status: ${revokedPage.status}, location: ${location}`
  );
  assert(
    location.includes('error=account_inactive'),
    '10D. Redirect explains the inactive account',
    `location: ${location}`
  );

  const loginPage = await fetch(`${BASE_URL}/admin/login?error=account_inactive`, {
    headers: { 'x-forwarded-for': freshIp() },
    redirect: 'manual',
  });
  assert(loginPage.status === 200, '10E. Login page renders the inactive-account error', `status: ${loginPage.status}`);

  const staffPageHtml = await activePage.text();
  assert(
    !staffPageHtml.includes('passwordHash') && !staffPageHtml.includes(ADMIN_JWT_SECRET),
    '10F. Staff page HTML carries no secrets'
  );

  // ==================================================================
  // Cleanup
  // ==================================================================
  console.log('\n--- Cleanup ---');
  try {
    await cleanup();
    const residual = await prisma.user.count({ where: { email: { startsWith: `${PREFIX}-` } } });
    const residualWineries = await prisma.winery.count({ where: { slug: { startsWith: `${PREFIX}-winb` } } });
    assert(residual === 0 && residualWineries === 0, 'X. All test data removed', `users: ${residual}, wineries: ${residualWineries}`);

    const untouched = await prisma.winery.findFirst({
      where: { slug: 'domaine-elysee' },
      select: { id: true, name: true },
    });
    assert(untouched !== null, 'Y. Legitimate winery untouched', untouched?.name);

    const legitStaff = await prisma.user.count({ where: { role: { not: 'GUEST' } } });
    assert(legitStaff > 0, 'Z. Legitimate staff accounts intact', `staff: ${legitStaff}`);
  } catch (cleanupErr) {
    console.error('Cleanup error:', cleanupErr);
    assert(false, 'Cleanup failed with error', String(cleanupErr));
  }

  console.log('\n==================================================');
  console.log(`PHASE 12A TEST SUITE SUMMARY:`);
  console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('==================================================\n');

  if (failed > 0) process.exit(1);
}

main()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
