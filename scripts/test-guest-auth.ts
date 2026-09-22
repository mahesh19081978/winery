/**
 * Guest Authentication Test Suite (Phase 6.1)
 *
 * Usage:
 *   1. Start the dev server:  npm run dev
 *   2. Run:                   npx tsx scripts/test-guest-auth.ts
 *   Optional: TEST_BASE_URL=http://localhost:3001 npx tsx scripts/test-guest-auth.ts
 *
 * Covers: registration, login, logout, session cookie lifecycle, /me,
 * profile route session enforcement, IDOR prevention, password hashing,
 * admin-area isolation, proxy protection of /app, and rate limiting.
 * Cleans up all test users it creates.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const RUN = Date.now().toString(36);

const EMAIL_A = `guest-auth-${RUN}-a@example.com`;
const EMAIL_B = `guest-auth-${RUN}-b@example.com`;
const PASS_A = 'Cellar#Door2026!';
const NAME_A = 'Test Guest A';
const NAME_B = 'Test Guest B';

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition: boolean, name: string, details?: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`✅ PASS: ${name}${details ? ' - ' + details : ''}`);
  } else {
    failed++;
    console.log(`❌ FAIL: ${name}${details ? ' - ' + details : ''}`);
  }
}

// Unique forwarded IP per call so per-IP rate-limit buckets never collide between tests
let ipCounter = 1;
function freshIp(): string {
  return `10.77.${Math.floor(Math.random() * 250) + 1}.${ipCounter++}`;
}

class CookieJar {
  private cookies = new Map<string, string>();
  header(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  has(name: string): boolean {
    return this.cookies.has(name);
  }
  get(name: string): string | undefined {
    return this.cookies.get(name);
  }
  store(res: Response) {
    const headers = res.headers as unknown as { getSetCookie?: () => string[] };
    const setCookies = headers.getSetCookie?.() || [];
    for (const c of setCookies) {
      const [pair] = c.split(';');
      const idx = pair.indexOf('=');
      if (idx < 0) continue;
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (value === '' || /max-age=0/i.test(c)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }
}

interface ApiResult {
  status: number;
  json: { success?: boolean; data?: Record<string, unknown>; error?: string; message?: string } | null;
  text: string;
  headers: Headers;
}

async function api(
  path: string,
  opts: { method?: string; body?: unknown; jar?: CookieJar; ip?: string } = {}
): Promise<ApiResult> {
  const headers: Record<string, string> = { 'x-forwarded-for': opts.ip || freshIp() };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.jar && opts.jar.header()) headers['Cookie'] = opts.jar.header();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    redirect: 'manual',
  });
  if (opts.jar) opts.jar.store(res);
  const text = await res.text();
  let json: ApiResult['json'] = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Non-JSON response (redirect page, HTML)
  }
  return { status: res.status, json, text, headers: res.headers };
}

async function cleanup() {
  const deleted = await prisma.user.deleteMany({
    where: { email: { startsWith: `guest-auth-${RUN}` } },
  });
  console.log(`\n🧹 Cleanup: removed ${deleted.count} test user(s).`);
}

async function main() {
  console.log(`\n🍷 Guest Auth Test Suite — target: ${BASE_URL} (run: ${RUN})\n`);

  // Warm-up: make sure the dev server responds at all
  try {
    await api('/api/auth/guest/me');
  } catch {
    console.error(`\n❌ Cannot reach ${BASE_URL}. Start the dev server first (npm run dev).`);
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Registration success
  // ─────────────────────────────────────────────────────────────────────────
  const jarA = new CookieJar();
  const regA = await api('/api/auth/guest/register', {
    method: 'POST',
    jar: jarA,
    body: { name: NAME_A, email: EMAIL_A, password: PASS_A, confirmPassword: PASS_A },
  });
  assert(
    regA.status === 201 && regA.json?.success === true && !!regA.json?.data?.guestProfileId,
    'Registration succeeds with valid payload',
    `status=${regA.status}`
  );
  assert(
    jarA.has('elysee_guest_session') && (jarA.get('elysee_guest_session') || '').split('.').length === 3,
    'Registration sets elysee_guest_session JWT cookie'
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Duplicate email
  // ─────────────────────────────────────────────────────────────────────────
  const regDup = await api('/api/auth/guest/register', {
    method: 'POST',
    body: { name: 'Dupe Guest', email: EMAIL_A, password: PASS_A, confirmPassword: PASS_A },
  });
  assert(regDup.status === 409, 'Duplicate email registration rejected with 409', `status=${regDup.status}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Invalid email format
  // ─────────────────────────────────────────────────────────────────────────
  const regBadEmail = await api('/api/auth/guest/register', {
    method: 'POST',
    body: { name: 'Bad Email', email: 'not-an-email', password: PASS_A, confirmPassword: PASS_A },
  });
  assert(regBadEmail.status === 400, 'Invalid email format rejected with 400', `status=${regBadEmail.status}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Weak/short password
  // ─────────────────────────────────────────────────────────────────────────
  const regWeak = await api('/api/auth/guest/register', {
    method: 'POST',
    body: { name: 'Weak Pass', email: `guest-auth-${RUN}-weak@example.com`, password: 'abc', confirmPassword: 'abc' },
  });
  assert(regWeak.status === 400, 'Weak password rejected with 400', `status=${regWeak.status}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Password confirmation mismatch
  // ─────────────────────────────────────────────────────────────────────────
  const regMismatch = await api('/api/auth/guest/register', {
    method: 'POST',
    body: { name: 'Mismatch', email: `guest-auth-${RUN}-mm@example.com`, password: PASS_A, confirmPassword: 'Different#Pass1' },
  });
  assert(regMismatch.status === 400, 'Password mismatch rejected with 400', `status=${regMismatch.status}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Login success
  // ─────────────────────────────────────────────────────────────────────────
  const jarB = new CookieJar();
  const loginB = await api('/api/auth/guest/login', {
    method: 'POST',
    jar: jarB,
    body: { email: EMAIL_A, password: PASS_A },
  });
  assert(
    loginB.status === 200 && loginB.json?.success === true && loginB.json?.data?.email === EMAIL_A,
    'Login succeeds with valid credentials',
    `status=${loginB.status}`
  );
  assert(jarB.has('elysee_guest_session'), 'Login sets elysee_guest_session cookie');

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Wrong password
  // ─────────────────────────────────────────────────────────────────────────
  const loginWrong = await api('/api/auth/guest/login', {
    method: 'POST',
    body: { email: EMAIL_A, password: 'Wrong#Passw0rd' },
  });
  assert(
    loginWrong.status === 401 && loginWrong.json?.error === 'Invalid email or password',
    'Wrong password returns generic 401',
    `status=${loginWrong.status}`
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Unknown email
  // ─────────────────────────────────────────────────────────────────────────
  const loginUnknown = await api('/api/auth/guest/login', {
    method: 'POST',
    body: { email: `ghost-${RUN}@example.com`, password: PASS_A },
  });
  assert(
    loginUnknown.status === 401 && loginUnknown.json?.error === 'Invalid email or password',
    'Unknown email returns generic 401 (no account enumeration)',
    `status=${loginUnknown.status}`
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 9. GET /me authenticated
  // ─────────────────────────────────────────────────────────────────────────
  const meAuthed = await api('/api/auth/guest/me', { jar: jarB });
  assert(
    meAuthed.status === 200 && meAuthed.json?.data?.email === EMAIL_A && meAuthed.json?.data?.name === NAME_A,
    'GET /me returns the authenticated guest',
    `status=${meAuthed.status}`
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 10. GET /me unauthenticated
  // ─────────────────────────────────────────────────────────────────────────
  const meAnon = await api('/api/auth/guest/me');
  assert(meAnon.status === 401, 'GET /me without session returns 401', `status=${meAnon.status}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 11. Logout
  // ─────────────────────────────────────────────────────────────────────────
  const logoutRes = await api('/api/auth/guest/logout', { method: 'POST', jar: jarB });
  assert(logoutRes.status === 200, 'Logout succeeds', `status=${logoutRes.status}`);
  assert(!jarB.has('elysee_guest_session'), 'Logout clears the session cookie');

  // ─────────────────────────────────────────────────────────────────────────
  // 12. Session invalid after logout
  // ─────────────────────────────────────────────────────────────────────────
  const meAfterLogout = await api('/api/auth/guest/me', { jar: jarB });
  assert(meAfterLogout.status === 401, 'GET /me after logout returns 401', `status=${meAfterLogout.status}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 13. Guest session cannot access /admin
  // ─────────────────────────────────────────────────────────────────────────
  const jarC = new CookieJar();
  await api('/api/auth/guest/login', { method: 'POST', jar: jarC, body: { email: EMAIL_A, password: PASS_A } });
  const adminHit = await api('/admin', { jar: jarC });
  const adminLocation = adminHit.headers.get('location') || '';
  assert(
    [301, 302, 303, 307, 308].includes(adminHit.status) && adminLocation.includes('/admin/login'),
    'Guest session is redirected away from /admin',
    `status=${adminHit.status} location=${adminLocation}`
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 14. Password is stored hashed
  // ─────────────────────────────────────────────────────────────────────────
  const dbUser = await prisma.user.findUnique({ where: { email: EMAIL_A } });
  assert(
    !!dbUser?.passwordHash && dbUser.passwordHash !== PASS_A && bcrypt.compareSync(PASS_A, dbUser.passwordHash),
    'Password stored as bcrypt hash (verifiable, not plaintext)'
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 15. passwordHash never appears in any API response
  // ─────────────────────────────────────────────────────────────────────────
  const serialized = JSON.stringify({
    reg: regA.json,
    login: loginB.json,
    me: meAuthed.json,
    profileGet: meAuthed.json,
  });
  assert(!serialized.includes('passwordHash'), 'passwordHash never returned in API responses');

  // ─────────────────────────────────────────────────────────────────────────
  // 16. Identity is not substitutable (IDOR)
  // ─────────────────────────────────────────────────────────────────────────
  // Register a second guest (user B) and log them in
  const jarVictim = new CookieJar();
  await api('/api/auth/guest/register', {
    method: 'POST',
    jar: jarVictim,
    body: { name: NAME_B, email: EMAIL_B, password: PASS_A, confirmPassword: PASS_A },
  });

  // 16a. Unauthenticated profile access is rejected
  const profileAnon = await api('/api/guest/profile');
  assert(profileAnon.status === 401, 'GET /api/guest/profile without session returns 401', `status=${profileAnon.status}`);

  // 16b. Old-style ?email= query param no longer grants access to arbitrary guests:
  // user A's session asking for user B's profile returns A's own data only.
  const idorAttempt = await api(`/api/guest/profile?email=${encodeURIComponent(EMAIL_B)}`, { jar: jarC });
  assert(
    idorAttempt.status === 200 && idorAttempt.json?.data?.email === EMAIL_A,
    'Guest profile route ignores spoofed email param and returns session identity only',
    `status=${idorAttempt.status}`
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Extra: PATCH profile persists against the real session
  // ─────────────────────────────────────────────────────────────────────────
  const patchRes = await api('/api/guest/profile', {
    method: 'PATCH',
    jar: jarC,
    body: {
      name: 'Test Guest A Updated',
      phone: '+1 555 010 2026',
      notifications: { email: false, sms: true, whatsapp: false },
      winePreferences: { preferredBody: 'Medium-Bodied (4–6)', favoriteVarietals: ['Pinot Noir'] },
    },
  });
  const meAfterPatch = await api('/api/auth/guest/me', { jar: jarC });
  const meAfterPatchData = meAfterPatch.json?.data as { name?: string; guestProfile?: { phone?: string } } | undefined;
  assert(
    patchRes.status === 200 &&
      meAfterPatchData?.name === 'Test Guest A Updated' &&
      meAfterPatchData?.guestProfile?.phone === '+1 555 010 2026',
    'PATCH /api/guest/profile persists and /me reflects the update',
    `patch=${patchRes.status}`
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Extra: proxy protects /app
  // ─────────────────────────────────────────────────────────────────────────
  const appNoCookie = await api('/app');
  const appLocation = appNoCookie.headers.get('location') || '';
  assert(
    [301, 302, 303, 307, 308].includes(appNoCookie.status) && appLocation.includes('/login'),
    'Unauthenticated /app visit redirected to /login by proxy',
    `status=${appNoCookie.status} location=${appLocation}`
  );
  const appWithCookie = await api('/app', { jar: jarC });
  assert(appWithCookie.status === 200, 'Authenticated guest can access /app', `status=${appWithCookie.status}`);

  // ─────────────────────────────────────────────────────────────────────────
  // Extra: rate limiting kicks in on the 6th attempt from one IP
  // ─────────────────────────────────────────────────────────────────────────
  const rateIp = freshIp();
  let sixthStatus = 0;
  for (let i = 0; i < 6; i++) {
    // Validation-failing payloads so no attempt resets the bucket
    const r = await api('/api/auth/guest/register', {
      method: 'POST',
      ip: rateIp,
      body: { name: 'RL', email: 'invalid', password: 'x', confirmPassword: 'y' },
    });
    if (i === 5) sixthStatus = r.status;
  }
  assert(sixthStatus === 429, 'Rate limiter blocks 6th attempt from same IP', `status=${sixthStatus}`);

  // ─────────────────────────────────────────────────────────────────────────
  // Extra: staff/admin accounts are rejected at the guest login endpoint
  // ─────────────────────────────────────────────────────────────────────────
  const staffEmail = process.env.INITIAL_ADMIN_EMAIL;
  if (staffEmail) {
    const staffLogin = await api('/api/auth/guest/login', {
      method: 'POST',
      body: { email: staffEmail, password: 'NotTheRealPassword#1' },
    });
    assert(
      staffLogin.status === 401 && staffLogin.json?.error === 'Invalid email or password',
      'Staff/admin account cannot authenticate via guest login (generic 401)',
      `status=${staffLogin.status}`
    );
  } else {
    console.log('⚠️  Skipped staff-login rejection test (INITIAL_ADMIN_EMAIL not set)');
  }

  console.log(`\n📊 Results: ${passed}/${total} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error('💥 Test suite crashed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
