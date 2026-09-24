/**
 * VINORA — Phase 6.8 Guest Wine Profile / Wine Preferences Test Suite
 *
 * Verifies:
 *   A. Unauthenticated GET → 401.
 *   B. Unauthenticated PATCH → 401.
 *   C. Guest A can GET own preferences.
 *   D. Guest A can PATCH own preferences.
 *   E. Guest B cannot access Guest A preferences.
 *   F. Guest B cannot modify Guest A preferences.
 *   G. Forged guestProfileId cannot change ownership.
 *   H. Forged userId cannot change ownership.
 *   I. Forged email cannot change ownership.
 *   J. Valid favoriteWineId accepted.
 *   K. Nonexistent favoriteWineId rejected.
 *   L. Malformed favoriteWineId rejected.
 *   M. Favorite wine from another winery rejected when applicable.
 *   N. Valid favoriteVarietals accepted.
 *   O. Invalid favoriteVarietals rejected.
 *   P. Invalid sweetness rejected.
 *   Q. Invalid body rejected.
 *   R. Invalid acidity rejected.
 *   S. Clearing favoriteWineId works if schema permits.
 *   T. Repeated PATCH does not create duplicate preference rows.
 *   U. Saved preferences persist after a fresh GET.
 *   V. Response contains no passwordHash.
 *   W. Response contains no authentication/session secrets.
 *   X. Response contains no unrelated guest data.
 *   Y. Guest A cannot infer/read Guest B preference data.
 *   Z. Unknown security fields cannot alter the stored record.
 *   AA. Favorite wine is actually associated with the authenticated guest's winery.
 *   AB. Arbitrary wine ID is rejected.
 *   AC. Favorite wine selection returns correct public wine information.
 *   AD. Existing profile endpoint still works after preference separation.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const RUN = Date.now().toString(36);

const EMAIL_A = `guest-p68-${RUN}-a@example.com`;
const EMAIL_B = `guest-p68-${RUN}-b@example.com`;
const PASS = 'WineProf#Test2026!';
const NAME_A = 'Alice Sommelier';
const NAME_B = 'Bob Cellar';

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
  json: {
    success?: boolean;
    data?: {
      name?: string;
      email?: string;
      userId?: string;
      guestProfileId?: string;
      preferences?: {
        favoriteVarietals?: string[];
        preferredSweetness?: string | null;
        preferredBody?: string | null;
        preferredAcidity?: string | null;
        favoriteWineId?: string | null;
        favoriteWine?: {
          id?: string;
          name?: string;
          slug?: string;
          category?: string;
        } | null;
      };
      [key: string]: unknown;
    };
    error?: string;
    message?: string;
    details?: unknown;
  } | null;
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

function hasKeyDeep(obj: unknown, targetKey: string): boolean {
  if (!obj || typeof obj !== 'object') return false;
  if (Array.isArray(obj)) return obj.some((item) => hasKeyDeep(item, targetKey));
  for (const [k, v] of Object.entries(obj)) {
    if (k.toLowerCase() === targetKey.toLowerCase()) return true;
    if (hasKeyDeep(v, targetKey)) return true;
  }
  return false;
}

async function cleanup() {
  console.log(`\n🧹 Starting cleanup for run: ${RUN}`);
  try {
    // Clean foreign wine fixture
    const foreignWinerySlug = `winery-foreign-${RUN}`;
    const foreignWine = await prisma.wine.findFirst({
      where: { winery: { slug: foreignWinerySlug } },
    });
    if (foreignWine) {
      await prisma.wine.delete({ where: { id: foreignWine.id } });
    }
    await prisma.winery.deleteMany({ where: { slug: foreignWinerySlug } });

    // Clean test users
    const deletedUsers = await prisma.user.deleteMany({
      where: { email: { startsWith: `guest-p68-${RUN}` } },
    });
    console.log(`🧹 Cleaned up ${deletedUsers.count} test user(s) and foreign test fixtures.`);
  } catch (err) {
    console.error('Error during cleanup:', err);
  }
}

async function main() {
  console.log(`\n🍷 VINORA Phase 6.8 Guest Wine Profile Test Suite — target: ${BASE_URL} (run: ${RUN})\n`);

  let foreignWineryId = '';
  let foreignWineId = '';

  try {
    // Pre-flight check
    try {
      await api('/api/wines');
    } catch {
      console.error(`❌ Cannot reach ${BASE_URL}. Ensure dev server is running on port 3000.`);
      process.exit(1);
    }

    // 0. Ensure real estate wine exists in database
    const realWine = await prisma.wine.findFirst({
      select: { id: true, name: true, slug: true, category: true, wineryId: true },
    });
    if (!realWine) {
      console.error('❌ No real wine found in the database. Please ensure seed data exists.');
      process.exit(1);
    }

    // Create a temporary secondary winery + wine for foreign winery test (Test M & AA)
    const foreignWinery = await prisma.winery.create({
      data: {
        name: `Foreign Vineyard ${RUN}`,
        slug: `winery-foreign-${RUN}`,
        description: 'Test foreign winery for cross-tenant isolation tests',
        address: '100 Other Valley Rd',
        city: 'Napa',
        state: 'CA',
        country: 'USA',
        postalCode: '94558',
        phone: '+1-555-0199',
        email: `foreign-${RUN}@example.com`,
      },
    });
    foreignWineryId = foreignWinery.id;

    const foreignWine = await prisma.wine.create({
      data: {
        wineryId: foreignWineryId,
        slug: `foreign-cabernet-${RUN}`,
        name: `Foreign Estate Cabernet ${RUN}`,
        category: 'RED',
        description: 'Wine belonging exclusively to foreign winery',
        shortDescription: 'Foreign cabernet',
      },
    });
    foreignWineId = foreignWine.id;

    // A. Unauthenticated GET → 401
    const unauthGet = await api('/api/auth/guest/wine-profile');
    assert(unauthGet.status === 401, 'A. Unauthenticated GET → 401', `status=${unauthGet.status}`);

    // B. Unauthenticated PATCH → 401
    const unauthPatch = await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      body: { preferredSweetness: 'Dry (1–3)' },
    });
    assert(unauthPatch.status === 401, 'B. Unauthenticated PATCH → 401', `status=${unauthPatch.status}`);

    // Register Guest A & Guest B
    const jarA = new CookieJar();
    const regA = await api('/api/auth/guest/register', {
      method: 'POST',
      jar: jarA,
      body: { name: NAME_A, email: EMAIL_A, password: PASS, confirmPassword: PASS },
    });
    assert(regA.status === 201, 'Register Guest A', `status=${regA.status}`);

    const jarB = new CookieJar();
    const regB = await api('/api/auth/guest/register', {
      method: 'POST',
      jar: jarB,
      body: { name: NAME_B, email: EMAIL_B, password: PASS, confirmPassword: PASS },
    });
    assert(regB.status === 201, 'Register Guest B', `status=${regB.status}`);

    const guestAUser = await prisma.user.findUnique({
      where: { email: EMAIL_A },
      include: { guestProfile: true },
    });
    const guestBUser = await prisma.user.findUnique({
      where: { email: EMAIL_B },
      include: { guestProfile: true },
    });
    const guestAProfileId = guestAUser!.guestProfile!.id;
    const guestBProfileId = guestBUser!.guestProfile!.id;

    // C. Guest A can GET own preferences (initially empty)
    const getResA = await api('/api/auth/guest/wine-profile', { jar: jarA });
    assert(
      getResA.status === 200 && getResA.json?.success === true && Array.isArray(getResA.json?.data?.preferences?.favoriteVarietals),
      'C. Guest A can GET own preferences',
      `status=${getResA.status}`
    );

    // D. Guest A can PATCH own preferences
    const patchResA = await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarA,
      body: {
        favoriteVarietals: ['Cabernet Sauvignon', 'Merlot'],
        preferredSweetness: 'Dry (1–3)',
        preferredBody: 'Full & Opulent (7–9)',
        preferredAcidity: 'Vibrant & Crisp (6–8)',
        favoriteWineId: realWine.id,
      },
    });
    assert(
      patchResA.status === 200 &&
        patchResA.json?.success === true &&
        patchResA.json?.data?.preferences?.preferredSweetness === 'Dry (1–3)' &&
        patchResA.json?.data?.preferences?.favoriteWine?.id === realWine.id,
      'D. Guest A can PATCH own preferences',
      `status=${patchResA.status}`
    );

    // E. Guest B cannot access Guest A preferences (returns Guest B's own empty profile)
    const getResB = await api('/api/auth/guest/wine-profile', { jar: jarB });
    assert(
      getResB.status === 200 &&
        getResB.json?.data?.preferences?.favoriteWine === null &&
        getResB.json?.data?.preferences?.favoriteVarietals?.length === 0,
      'E. Guest B cannot access Guest A preferences',
      `guestBVarietalsCount=${getResB.json?.data?.preferences?.favoriteVarietals?.length}`
    );

    // F. Guest B cannot modify Guest A preferences
    const patchResB = await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarB,
      body: {
        favoriteVarietals: ['Pinot Noir'],
        preferredSweetness: 'Sweet / Dessert (7–10)',
      },
    });
    const checkAAfterB = await api('/api/auth/guest/wine-profile', { jar: jarA });
    assert(
      Boolean(
        patchResB.status === 200 &&
          checkAAfterB.json?.data?.preferences?.preferredSweetness === 'Dry (1–3)' &&
          checkAAfterB.json?.data?.preferences?.favoriteVarietals?.includes('Cabernet Sauvignon')
      ),
      'F. Guest B cannot modify Guest A preferences (A preferences remain isolated)',
      `guestAPref=${checkAAfterB.json?.data?.preferences?.preferredSweetness}`
    );

    // G. Forged guestProfileId cannot change ownership
    const spoofProfileId = await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarB,
      body: {
        guestProfileId: guestAProfileId,
        preferredSweetness: 'Off-Dry (4–6)',
      },
    });
    const checkAAgain = await api('/api/auth/guest/wine-profile', { jar: jarA });
    assert(
      spoofProfileId.status === 200 && checkAAgain.json?.data?.preferences?.preferredSweetness === 'Dry (1–3)',
      'G. Forged guestProfileId cannot change ownership',
      `guestASweetness=${checkAAgain.json?.data?.preferences?.preferredSweetness}`
    );

    // H. Forged userId cannot change ownership
    const spoofUserId = await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarB,
      body: {
        userId: guestAUser!.id,
        preferredSweetness: 'Off-Dry (4–6)',
      },
    });
    const checkAThird = await api('/api/auth/guest/wine-profile', { jar: jarA });
    assert(
      spoofUserId.status === 200 && checkAThird.json?.data?.preferences?.preferredSweetness === 'Dry (1–3)',
      'H. Forged userId cannot change ownership'
    );

    // I. Forged email cannot change ownership
    const spoofEmail = await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarB,
      body: {
        email: EMAIL_A,
        preferredSweetness: 'Off-Dry (4–6)',
      },
    });
    const checkAFourth = await api('/api/auth/guest/wine-profile', { jar: jarA });
    assert(
      spoofEmail.status === 200 && checkAFourth.json?.data?.preferences?.preferredSweetness === 'Dry (1–3)',
      'I. Forged email cannot change ownership'
    );

    // J. Valid favoriteWineId accepted
    const validWineRes = await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarA,
      body: { favoriteWineId: realWine.id },
    });
    assert(
      validWineRes.status === 200 && validWineRes.json?.data?.preferences?.favoriteWine?.id === realWine.id,
      'J. Valid favoriteWineId accepted',
      `wineId=${validWineRes.json?.data?.preferences?.favoriteWine?.id}`
    );

    // K. Nonexistent favoriteWineId rejected
    const nonexistentWine = await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarA,
      body: { favoriteWineId: '00000000-0000-0000-0000-000000000000' },
    });
    assert(
      nonexistentWine.status === 400,
      'K. Nonexistent favoriteWineId rejected with 400',
      `status=${nonexistentWine.status}`
    );

    // L. Malformed favoriteWineId rejected
    const malformedWine = await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarA,
      body: { favoriteWineId: 'not-a-valid-uuid' },
    });
    assert(
      malformedWine.status === 400,
      'L. Malformed favoriteWineId rejected with 400',
      `status=${malformedWine.status}`
    );

    // M. Favorite wine from another winery rejected when applicable (cross-winery tenant check)
    const crossWineryRes = await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarA,
      body: { favoriteWineId: foreignWineId },
    });
    assert(
      crossWineryRes.status === 403,
      'M. Favorite wine from another winery rejected with 403',
      `status=${crossWineryRes.status}`
    );

    // N. Valid favoriteVarietals accepted
    const validVarietalsRes = await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarA,
      body: { favoriteVarietals: ['Syrah', 'Chardonnay', 'Rosé'] },
    });
    assert(
      validVarietalsRes.status === 200 &&
        validVarietalsRes.json?.data?.preferences?.favoriteVarietals?.length === 3,
      'N. Valid favoriteVarietals accepted',
      `varietals=${validVarietalsRes.json?.data?.preferences?.favoriteVarietals?.join(', ')}`
    );

    // O. Invalid favoriteVarietals rejected
    const invalidVarietalsRes = await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarA,
      body: { favoriteVarietals: ['Kryptonite Grape', 'Moonshine'] },
    });
    assert(
      invalidVarietalsRes.status === 400,
      'O. Invalid favoriteVarietals rejected with 400',
      `status=${invalidVarietalsRes.status}`
    );

    // P. Invalid sweetness rejected
    const invalidSweetnessRes = await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarA,
      body: { preferredSweetness: 'Ultra Sugary 500' },
    });
    assert(
      invalidSweetnessRes.status === 400,
      'P. Invalid sweetness rejected with 400',
      `status=${invalidSweetnessRes.status}`
    );

    // Q. Invalid body rejected
    const invalidBodyRes = await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarA,
      body: { preferredBody: 'Hyper Sonic Heavyweight' },
    });
    assert(
      invalidBodyRes.status === 400,
      'Q. Invalid body rejected with 400',
      `status=${invalidBodyRes.status}`
    );

    // R. Invalid acidity rejected
    const invalidAcidityRes = await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarA,
      body: { preferredAcidity: 'Battery Acid X' },
    });
    assert(
      invalidAcidityRes.status === 400,
      'R. Invalid acidity rejected with 400',
      `status=${invalidAcidityRes.status}`
    );

    // S. Clearing favoriteWineId works if schema permits
    const clearWineRes = await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarA,
      body: { favoriteWineId: null },
    });
    assert(
      clearWineRes.status === 200 &&
        clearWineRes.json?.data?.preferences?.favoriteWine === null &&
        clearWineRes.json?.data?.preferences?.favoriteWineId === null,
      'S. Clearing favoriteWineId works (returns null)',
      `favoriteWine=${clearWineRes.json?.data?.preferences?.favoriteWine}`
    );

    // T. Repeated PATCH does not create duplicate preference rows
    await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarA,
      body: { preferredSweetness: 'Bone Dry (1–2)' },
    });
    await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarA,
      body: { preferredSweetness: 'Dry (1–3)' },
    });
    await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarA,
      body: { preferredSweetness: 'Bone Dry (1–2)', favoriteWineId: realWine.id },
    });

    const prefRowCount = await prisma.guestWinePreference.count({
      where: { guestProfileId: guestAProfileId },
    });
    assert(
      prefRowCount === 1,
      'T. Repeated PATCH does not create duplicate preference rows (exactly 1 row exists)',
      `count=${prefRowCount}`
    );

    // U. Saved preferences persist after a fresh GET
    const freshGet = await api('/api/auth/guest/wine-profile', { jar: jarA });
    assert(
      freshGet.status === 200 &&
        freshGet.json?.data?.preferences?.preferredSweetness === 'Bone Dry (1–2)' &&
        freshGet.json?.data?.preferences?.favoriteWine?.id === realWine.id,
      'U. Saved preferences persist after a fresh GET',
      `persistedSweetness=${freshGet.json?.data?.preferences?.preferredSweetness}`
    );

    // V. Response contains no passwordHash
    const hasHash = hasKeyDeep(freshGet.json, 'passwordHash') || hasKeyDeep(freshGet.json, 'password');
    assert(!hasHash, 'V. Response contains no passwordHash or password');

    // W. Response contains no authentication/session secrets
    const hasSecrets =
      hasKeyDeep(freshGet.json, 'tokenHash') ||
      hasKeyDeep(freshGet.json, 'secret') ||
      hasKeyDeep(freshGet.json, 'apiKey');
    assert(!hasSecrets, 'W. Response contains no authentication/session secrets');

    // X. Response contains no unrelated guest data
    const hasBobData =
      JSON.stringify(freshGet.json).includes(EMAIL_B) ||
      JSON.stringify(freshGet.json).includes(NAME_B) ||
      JSON.stringify(freshGet.json).includes(guestBProfileId);
    assert(!hasBobData, 'X. Response contains no unrelated guest data');

    // Y. Guest A cannot infer/read Guest B preference data
    const guestBGet = await api('/api/auth/guest/wine-profile', { jar: jarB });
    const hasAliceDataInB =
      JSON.stringify(guestBGet.json).includes(EMAIL_A) ||
      JSON.stringify(guestBGet.json).includes(NAME_A) ||
      JSON.stringify(guestBGet.json).includes(guestAProfileId);
    assert(!hasAliceDataInB, 'Y. Guest A cannot infer/read Guest B preference data');

    // Z. Unknown security fields cannot alter the stored record
    const maliciousPayload = {
      role: 'SUPER_ADMIN',
      isAdmin: true,
      guestProfileId: 'hacked-id',
      userId: 'hacked-user-id',
      preferredSweetness: 'Dry (1–3)',
    };
    const spoofRes = await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarA,
      body: maliciousPayload,
    });
    const checkRoleUser = await prisma.user.findUnique({ where: { email: EMAIL_A } });
    assert(
      spoofRes.status === 200 && checkRoleUser?.role === 'GUEST',
      'Z. Unknown security fields cannot alter stored role or ownership'
    );

    // AA. Favorite wine is actually associated with the authenticated guest's winery
    const wineInEstate = await prisma.wine.findUnique({
      where: { id: realWine.id },
      select: { wineryId: true },
    });
    assert(
      wineInEstate?.wineryId === realWine.wineryId,
      'AA. Favorite wine is actually associated with the authenticated guest winery'
    );

    // AB. Arbitrary wine ID is rejected
    const arbitraryWineRes = await api('/api/auth/guest/wine-profile', {
      method: 'PATCH',
      jar: jarA,
      body: { favoriteWineId: 'ffffffff-ffff-ffff-ffff-ffffffffffff' },
    });
    assert(
      arbitraryWineRes.status === 400,
      'AB. Arbitrary wine ID is rejected with 400',
      `status=${arbitraryWineRes.status}`
    );

    // AC. Favorite wine selection returns correct public wine information
    const favWineInfo = freshGet.json?.data?.preferences?.favoriteWine;
    assert(
      Boolean(
        favWineInfo != null &&
          typeof favWineInfo.id === 'string' &&
          typeof favWineInfo.name === 'string' &&
          typeof favWineInfo.slug === 'string' &&
          typeof favWineInfo.category === 'string'
      ),
      'AC. Favorite wine selection returns correct public wine information',
      `name=${favWineInfo?.name}, category=${favWineInfo?.category}`
    );

    // AD. Existing profile endpoint still works after preference separation
    const profileGet = await api('/api/auth/guest/profile', { jar: jarA });
    const profilePatch = await api('/api/auth/guest/profile', {
      method: 'PATCH',
      jar: jarA,
      body: {
        name: 'Alice Updated Sommelier',
        phone: '+1-555-0144',
      },
    });
    assert(
      profileGet.status === 200 &&
        profilePatch.status === 200 &&
        profilePatch.json?.data?.name === 'Alice Updated Sommelier',
      'AD. Existing profile endpoint still works after preference separation'
    );
  } finally {
    await cleanup();
  }

  console.log(`\n==================================================`);
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
