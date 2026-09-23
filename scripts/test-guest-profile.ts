/**
 * Guest Profile Test Suite (Phase 6.2)
 *
 * Usage:
 *   1. Start dev server:  npm run dev
 *   2. Run:               npx tsx scripts/test-guest-profile.ts
 *
 * Verifies:
 *   1. Authenticated guest can retrieve own profile via GET /api/auth/guest/profile.
 *   2. Unauthenticated GET returns 401.
 *   3. Authenticated guest can update name.
 *   4. Authenticated guest can update phone.
 *   5. Email cannot be changed (attempts to change email are ignored; email remains intact).
 *   6. Invalid profile input (e.g. short name, invalid types) is rejected with 400.
 *   7. Communication preferences persist.
 *   8. Wine preferences can be read.
 *   9. Wine preference changes persist with real database wine.
 *  10. Invalid/nonexistent wine IDs are rejected with 400.
 *  11. Guest A cannot read Guest B's profile.
 *  12. Guest A cannot modify Guest B's profile (IDOR prevention).
 *  13. Guest identity is derived strictly from session, ignoring request body/query spoofing.
 *  14. Deprecated/compat /api/guest/profile delegates cleanly without divergence.
 *  15. Complete cleanup of test data.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const RUN = Date.now().toString(36);

const EMAIL_A = `guest-p62-${RUN}-a@example.com`;
const EMAIL_B = `guest-p62-${RUN}-b@example.com`;
const PASS = 'Profile#Test2026!';
const NAME_A = 'Alice Profile';
const NAME_B = 'Bob Profile';

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

let ipCounter = 1;
function freshIp(): string {
  return `10.88.${Math.floor(Math.random() * 250) + 1}.${ipCounter++}`;
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
  json: { success?: boolean; data?: Record<string, unknown>; error?: string; message?: string; details?: unknown } | null;
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
    // Non-JSON
  }
  return { status: res.status, json, text, headers: res.headers };
}

async function cleanup() {
  const deleted = await prisma.user.deleteMany({
    where: { email: { startsWith: `guest-p62-${RUN}` } },
  });
  console.log(`\n🧹 Cleanup: removed ${deleted.count} test user(s).`);
}

async function main() {
  console.log(`\n🍷 Guest Profile Test Suite (Phase 6.2) — target: ${BASE_URL} (run: ${RUN})\n`);

  // Verify server is up
  try {
    await api('/api/auth/guest/me');
  } catch {
    console.error(`\n❌ Cannot reach ${BASE_URL}. Ensure the dev server is running.`);
    process.exit(1);
  }

  // Find a real wine in the database to test wine preferences
  const realWine = await prisma.wine.findFirst({ select: { id: true, name: true, slug: true } });
  if (!realWine) {
    console.error('❌ No real wine found in the database. Please seed the database first.');
    process.exit(1);
  }

  // 1. Register Guest A
  const jarA = new CookieJar();
  const regA = await api('/api/auth/guest/register', {
    method: 'POST',
    jar: jarA,
    body: { name: NAME_A, email: EMAIL_A, password: PASS, confirmPassword: PASS },
  });
  assert(regA.status === 201, 'Guest A registered successfully', `status=${regA.status}`);

  // 2. Register Guest B
  const jarB = new CookieJar();
  const regB = await api('/api/auth/guest/register', {
    method: 'POST',
    jar: jarB,
    body: { name: NAME_B, email: EMAIL_B, password: PASS, confirmPassword: PASS },
  });
  assert(regB.status === 201, 'Guest B registered successfully', `status=${regB.status}`);

  // 3. Unauthenticated GET /api/auth/guest/profile returns 401
  const anonGet = await api('/api/auth/guest/profile');
  assert(anonGet.status === 401, 'Unauthenticated GET /api/auth/guest/profile returns 401', `status=${anonGet.status}`);

  // 4. Authenticated Guest A can retrieve own profile
  const profileA = await api('/api/auth/guest/profile', { jar: jarA });
  const dataA = profileA.json?.data as { email?: string; name?: string } | undefined;
  assert(
    profileA.status === 200 && dataA?.email === EMAIL_A && dataA?.name === NAME_A,
    'Authenticated Guest A can retrieve own profile via canonical endpoint',
    `status=${profileA.status}`
  );

  // 5. Update Guest A name
  const updateNameRes = await api('/api/auth/guest/profile', {
    method: 'PATCH',
    jar: jarA,
    body: { name: 'Alice M. Profile' },
  });
  const updatedAData = updateNameRes.json?.data as { name?: string } | undefined;
  assert(
    updateNameRes.status === 200 && updatedAData?.name === 'Alice M. Profile',
    'Authenticated guest can update own name',
    `status=${updateNameRes.status}`
  );

  // 6. Update Guest A phone
  const updatePhoneRes = await api('/api/auth/guest/profile', {
    method: 'PATCH',
    jar: jarA,
    body: { phone: '+1 555 432 1098' },
  });
  const phoneAData = updatePhoneRes.json?.data as { phone?: string } | undefined;
  assert(
    updatePhoneRes.status === 200 && phoneAData?.phone === '+1 555 432 1098',
    'Authenticated guest can update own phone',
    `status=${updatePhoneRes.status}`
  );

  // 7. Email cannot be changed through this endpoint (client sends different email, endpoint ignores it)
  const attemptEmailChange = await api('/api/auth/guest/profile', {
    method: 'PATCH',
    jar: jarA,
    body: { email: 'hacked-alice@example.com', name: 'Alice Still Here' },
  });
  const checkEmailAfter = await api('/api/auth/guest/profile', { jar: jarA });
  const emailAfterData = checkEmailAfter.json?.data as { email?: string } | undefined;
  assert(
    attemptEmailChange.status === 200 && emailAfterData?.email === EMAIL_A,
    'Email cannot be changed through profile endpoint (email remains read-only)',
    `currentEmail=${emailAfterData?.email}`
  );

  // 8. Invalid profile input rejected with 400 (name too short)
  const badNameRes = await api('/api/auth/guest/profile', {
    method: 'PATCH',
    jar: jarA,
    body: { name: 'A' },
  });
  assert(badNameRes.status === 400, 'Invalid profile input rejected with 400', `status=${badNameRes.status}`);

  // 9. Communication preferences persist
  const commPrefRes = await api('/api/auth/guest/profile', {
    method: 'PATCH',
    jar: jarA,
    body: {
      notifications: { email: false, sms: true, whatsapp: true },
    },
  });
  const commData = commPrefRes.json?.data as {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    whatsappNotifications?: boolean;
  } | undefined;
  assert(
    commPrefRes.status === 200 &&
      commData?.emailNotifications === false &&
      commData?.smsNotifications === true &&
      commData?.whatsappNotifications === true,
    'Communication preferences persist correctly',
    `status=${commPrefRes.status}`
  );

  // 10. Wine preferences can be read & updated with real database wine
  const winePrefRes = await api('/api/auth/guest/profile', {
    method: 'PATCH',
    jar: jarA,
    body: {
      winePreferences: {
        favoriteVarietals: ['Cabernet Sauvignon', 'Merlot'],
        preferredSweetness: 'Bone Dry (1–2)',
        preferredBody: 'Full & Opulent (7–9)',
        preferredAcidity: 'Vibrant & Crisp (6–8)',
        favoriteWineId: realWine.id,
      },
    },
  });
  const wineData = winePrefRes.json?.data?.winePreference as {
    favoriteWineId?: string;
    favoriteVarietals?: string[];
    preferredSweetness?: string;
  } | undefined;
  assert(
    Boolean(
      winePrefRes.status === 200 &&
        wineData?.favoriteWineId === realWine.id &&
        wineData?.favoriteVarietals?.includes('Cabernet Sauvignon') &&
        wineData?.preferredSweetness === 'Bone Dry (1–2)'
    ),
    'Wine preferences and real database favorite wine persist',
    `favoriteWineId=${wineData?.favoriteWineId}`
  );

  // 11. Nonexistent/invalid wine ID is rejected with 400
  const fakeWineRes = await api('/api/auth/guest/profile', {
    method: 'PATCH',
    jar: jarA,
    body: {
      winePreferences: {
        favoriteWineId: '00000000-0000-0000-0000-000000000000',
      },
    },
  });
  assert(
    fakeWineRes.status === 400,
    'Nonexistent wine ID is rejected with 400',
    `status=${fakeWineRes.status} error=${fakeWineRes.json?.error}`
  );

  // 12. Non-UUID wine ID is rejected with 400 by Zod
  const nonUuidWineRes = await api('/api/auth/guest/profile', {
    method: 'PATCH',
    jar: jarA,
    body: {
      winePreferences: {
        favoriteWineId: 'not-a-valid-uuid',
      },
    },
  });
  assert(
    nonUuidWineRes.status === 400,
    'Malformed/non-UUID wine ID is rejected with 400',
    `status=${nonUuidWineRes.status}`
  );

  // 13. Guest A cannot read Guest B's profile via query params or headers
  const idorReadAttempt = await api(`/api/auth/guest/profile?email=${encodeURIComponent(EMAIL_B)}&userId=bogus`, {
    jar: jarA,
  });
  const idorData = idorReadAttempt.json?.data as { email?: string } | undefined;
  assert(
    idorReadAttempt.status === 200 && idorData?.email === EMAIL_A,
    'Guest A cannot read Guest B profile (query param spoofing ignored, session is authoritative)',
    `returnedEmail=${idorData?.email}`
  );

  // 14. Guest A cannot modify Guest B's profile via body spoofing
  const idorWriteAttempt = await api('/api/auth/guest/profile', {
    method: 'PATCH',
    jar: jarA,
    body: {
      userId: 'someone-else',
      guestProfileId: 'someone-else-profile',
      email: EMAIL_B,
      name: 'Hacked Bob By Alice',
    },
  });
  assert(idorWriteAttempt.status === 200, 'IDOR write request handled cleanly without server error');

  // Check Bob's profile remains untouched
  const bobProfile = await api('/api/auth/guest/profile', { jar: jarB });
  const bobData = bobProfile.json?.data as { name?: string } | undefined;
  assert(
    bobData?.name === NAME_B,
    "Guest A cannot modify Guest B's profile (Bob's profile remains unaffected)",
    `bobName=${bobData?.name}`
  );

  // 15. Compat /api/guest/profile route delegates properly to canonical implementation
  const compatGet = await api('/api/guest/profile', { jar: jarA });
  const compatData = compatGet.json?.data as { email?: string } | undefined;
  assert(
    compatGet.status === 200 && compatData?.email === EMAIL_A,
    'Compatibility route /api/guest/profile functions consistently with canonical route',
    `status=${compatGet.status}`
  );

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
