/**
 * Guest Wine Journey Test Suite (Phase 6.6)
 *
 * Usage:
 *   1. Start dev server:  npm run dev
 *   2. Run:               node scripts/test-guest-journey.ts
 *      (or npx tsx scripts/test-guest-journey.ts)
 *
 * Verifies GET /api/auth/guest/journey:
 *   1. Authenticated guest can retrieve their tasting history.
 *   2. Returned tasting records belong to the authenticated GuestProfile.
 *   3. Guest A cannot retrieve Guest B's tasting history (IDOR).
 *   4. Client cannot spoof guestProfileId via query params.
 *   5. Client cannot spoof userId via query params.
 *   6. Client cannot spoof email via query params.
 *   7. Unauthenticated request is rejected (401).
 *   8. Guest with no tasting history receives an empty result.
 *   9. Real wine/vintage mapping is correct (name, slug, category, year, ID).
 *  10. Optional fields (experienceName, session, booking) are null when absent,
 *      populated when present — no fabricated values.
 *  11. Rating and drink-again preference are returned from stored data.
 *  12. No passwordHash / sensitive User fields are exposed.
 *  13. Pagination works (database-level, disjoint pages, cap, out-of-range).
 *  14. Search filters within the authenticated guest's scope only.
 *  15. Invalid pagination/search parameters are rejected (400).
 *  16. Complete cleanup: all test records removed.
 *
 * Phase 6.1-6.5 suites are run separately per prior verification lists:
 *   npx tsx scripts/test-guest-auth.ts
 *   npx tsx scripts/test-guest-profile.ts
 *   npx tsx scripts/test-experience-booking-auth.ts
 *   npx tsx scripts/test-event-booking-auth.ts
 *   npx tsx scripts/test-my-bookings.ts
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const RUN = Date.now().toString(36);

const EMAIL_A = `journey-p66-${RUN}-a@example.com`;
const EMAIL_B = `journey-p66-${RUN}-b@example.com`;
const EMAIL_C = `journey-p66-${RUN}-c@example.com`;
const PASS = 'Journey#Test2026!';
const NAME_A = 'Alice Journey';
const NAME_B = 'Bob Journey';
const NAME_C = 'Carol Journey';

interface JourneyTastingItem {
  id: string;
  tastingDate: string;
  rating: string;
  wouldDrinkAgain: string;
  notes: string;
  tasteCharacteristics: string[];
  experienceName: string | null;
  wine: { id: string; name: string; slug: string; category: string };
  wineVintageId: string;
  vintageYear: number;
  session: { id: string; sessionDate: string; location: string | null; notes: string | null } | null;
  booking: { bookingNumber: string; date: string } | null;
}

interface JourneyListResponse {
  success?: boolean;
  error?: string;
  data?: {
    items?: JourneyTastingItem[];
    pagination?: { page: number; pageSize: number; total: number; totalPages: number };
  };
}

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
  return `10.97.${Math.floor(Math.random() * 250) + 1}.${ipCounter++}`;
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
      if (match) {
        this.cookies.set(match[1].trim(), match[2].trim());
      }
    }
  }
}

async function register(jar: CookieJar, email: string, name: string) {
  const res = await fetch(`${BASE_URL}/api/auth/guest/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': freshIp() },
    body: JSON.stringify({ email, password: PASS, confirmPassword: PASS, name }),
  });
  jar.absorb(res);
  return { status: res.status, data: await res.json() };
}

async function getJourney(
  jar: CookieJar | null,
  query = '',
  headers: Record<string, string> = {}
): Promise<{ status: number; json: JourneyListResponse }> {
  const res = await fetch(`${BASE_URL}/api/auth/guest/journey${query}`, {
    headers: {
      ...(jar ? { Cookie: jar.header() } : {}),
      'x-forwarded-for': freshIp(),
      ...headers,
    },
  });
  return { status: res.status, json: (await res.json()) as JourneyListResponse };
}

function itemIds(res: { json: JourneyListResponse }): string[] {
  return (res.json?.data?.items ?? []).map((i) => i.id);
}

function findItemById(
  items: readonly JourneyTastingItem[] | null | undefined,
  id: string
): JourneyTastingItem | undefined {
  return (items ?? []).find((i) => i.id === id);
}

async function main() {
  console.log(`--- Starting Phase 6.6 Guest Wine Journey Tests (Run: ${RUN}) ---`);

  // ------------------------------------------------------------------
  // SETUP: real wine + vintage from the database
  // ------------------------------------------------------------------
  const wine = await prisma.wine.findFirst({
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      vintages: { select: { id: true, vintageYear: true }, orderBy: { vintageYear: 'desc' }, take: 1 },
    },
  });
  if (!wine || wine.vintages.length === 0) {
    console.error('❌ ABORT: No wine with a vintage found in database. Seed the database first.');
    await prisma.$disconnect();
    process.exit(1);
  }
  const vintage = wine.vintages[0];
  console.log(`Using Wine: "${wine.name}" (${wine.slug}) | Vintage ${vintage.vintageYear} (${vintage.id})`);

  const jarA = new CookieJar();
  const jarB = new CookieJar();
  const jarC = new CookieJar();

  // ------------------------------------------------------------------
  // SETUP: register Guest A, B, C
  // ------------------------------------------------------------------
  console.log('\n--- Setup Guest Accounts ---');
  const regA = await register(jarA, EMAIL_A, NAME_A);
  assert(regA.status === 201, 'Guest A registered', `Status: ${regA.status}`);
  const regB = await register(jarB, EMAIL_B, NAME_B);
  assert(regB.status === 201, 'Guest B registered', `Status: ${regB.status}`);
  const regC = await register(jarC, EMAIL_C, NAME_C);
  assert(regC.status === 201, 'Guest C registered (no journey guest)', `Status: ${regC.status}`);

  const profileA = await prisma.guestProfile.findFirst({ where: { user: { email: EMAIL_A } } });
  const profileB = await prisma.guestProfile.findFirst({ where: { user: { email: EMAIL_B } } });
  const profileC = await prisma.guestProfile.findFirst({ where: { user: { email: EMAIL_C } } });
  const userB = await prisma.user.findUnique({ where: { email: EMAIL_B } });

  assert(!!profileA, 'Guest A profile exists in DB');
  assert(!!profileB, 'Guest B profile exists in DB');
  assert(!!profileC, 'Guest C profile exists in DB');
  if (!profileA || !profileB || !profileC || !userB) {
    console.error('❌ ABORT: Setup failed — missing profiles/user.');
    await prisma.$disconnect();
    process.exit(1);
  }

  // ------------------------------------------------------------------
  // SETUP: tasting records for Guest A (6 total: 2 standalone + 1 session-linked)
  // ------------------------------------------------------------------
  console.log('\n--- Setup Guest A Tasting Records ---');

  const pastDate = new Date();
  pastDate.setUTCDate(pastDate.getUTCDate() - 30);

  // Fixture booking for session-linked record
  const winery = await prisma.winery.findFirst({ select: { id: true } });
  if (!winery) {
    console.error('❌ ABORT: No winery found. Seed the database first.');
    await prisma.$disconnect();
    process.exit(1);
  }

  const fixtureBooking = await prisma.booking.create({
    data: {
      bookingNumber: `DVR-JRN-${RUN}`,
      wineryId: winery.id,
      guestProfileId: profileA.id,
      date: pastDate,
      time: '14:00',
      adults: 2,
      children: 0,
      totalGuests: 2,
      subtotal: 0,
      taxAmount: 0,
      totalPrice: 0,
      currency: 'USD',
      status: 'COMPLETED',
    },
  });
  console.log(`Fixture booking: ${fixtureBooking.bookingNumber}`);

  const fixtureSession = await prisma.tastingSession.create({
    data: {
      guestProfileId: profileA.id,
      bookingId: fixtureBooking.id,
      sessionDate: pastDate,
      location: 'Historic Salon',
      notes: 'Phase 6.6 fixture session',
    },
  });
  console.log(`Fixture session: ${fixtureSession.id}`);

  const recA1 = await prisma.tastingRecord.create({
    data: {
      guestProfileId: profileA.id,
      wineVintageId: vintage.id,
      wineNameSnapshot: wine.name,
      vintageYear: vintage.vintageYear,
      rating: new Prisma.Decimal('4.8'),
      notes: 'Phase 6.6 journey test — dark fruit and cedar.',
      tasteCharacteristics: ['Full-bodied', 'Cedar'],
      wouldDrinkAgain: 'YES',
      experienceName: null,
      body: 7,
      acidity: 6,
      sweetness: 2,
      tannin: 7,
      tastedAt: pastDate,
    },
  });

  const recA2 = await prisma.tastingRecord.create({
    data: {
      guestProfileId: profileA.id,
      wineVintageId: vintage.id,
      wineNameSnapshot: wine.name,
      vintageYear: vintage.vintageYear,
      rating: new Prisma.Decimal('5.0'),
      notes: 'Phase 6.6 journey test — violet, graphite, long finish.',
      tasteCharacteristics: ['Violet', 'Graphite'],
      wouldDrinkAgain: 'MAYBE',
      experienceName: 'Vault Tasting',
      body: 8,
      acidity: 5,
      sweetness: 2,
      tannin: 8,
      tastedAt: new Date(pastDate.getTime() + 86400000),
    },
  });

  const recA3 = await prisma.tastingRecord.create({
    data: {
      guestProfileId: profileA.id,
      tastingSessionId: fixtureSession.id,
      wineVintageId: vintage.id,
      wineNameSnapshot: wine.name,
      vintageYear: vintage.vintageYear,
      rating: new Prisma.Decimal('4.5'),
      notes: 'Phase 6.6 journey test — session-linked record.',
      tasteCharacteristics: ['Spice'],
      wouldDrinkAgain: 'NO',
      experienceName: 'Estate Tour & Tasting',
      body: 6,
      acidity: 7,
      sweetness: 3,
      tannin: 6,
      tastedAt: new Date(pastDate.getTime() + 2 * 86400000),
    },
  });

  // Extra records for pagination (total A = 6)
  const recA4 = await prisma.tastingRecord.create({
    data: {
      guestProfileId: profileA.id,
      wineVintageId: vintage.id,
      wineNameSnapshot: wine.name,
      vintageYear: vintage.vintageYear,
      rating: new Prisma.Decimal('4.0'),
      notes: 'Phase 6.6 journey test — record 4.',
      tasteCharacteristics: [],
      wouldDrinkAgain: 'YES',
      body: 5,
      acidity: 5,
      sweetness: 2,
      tannin: 5,
      tastedAt: new Date(pastDate.getTime() + 3 * 86400000),
    },
  });

  const recA5 = await prisma.tastingRecord.create({
    data: {
      guestProfileId: profileA.id,
      wineVintageId: vintage.id,
      wineNameSnapshot: wine.name,
      vintageYear: vintage.vintageYear,
      rating: new Prisma.Decimal('3.5'),
      notes: 'Phase 6.6 journey test — record 5.',
      tasteCharacteristics: ['Bright'],
      wouldDrinkAgain: 'MAYBE',
      body: 4,
      acidity: 8,
      sweetness: 4,
      tannin: 3,
      tastedAt: new Date(pastDate.getTime() + 4 * 86400000),
    },
  });

  const recA6 = await prisma.tastingRecord.create({
    data: {
      guestProfileId: profileA.id,
      wineVintageId: vintage.id,
      wineNameSnapshot: wine.name,
      vintageYear: vintage.vintageYear,
      rating: new Prisma.Decimal('4.2'),
      notes: 'Phase 6.6 journey test — record 6 unique-search-term.',
      tasteCharacteristics: ['Minerality'],
      wouldDrinkAgain: 'YES',
      body: 5,
      acidity: 6,
      sweetness: 2,
      tannin: 5,
      tastedAt: new Date(pastDate.getTime() + 5 * 86400000),
    },
  });

  console.log(`Guest A records: ${recA1.id}, ${recA2.id}, ${recA3.id}, ${recA4.id}, ${recA5.id}, ${recA6.id}`);

  // ------------------------------------------------------------------
  // SETUP: tasting records for Guest B
  // ------------------------------------------------------------------
  console.log('\n--- Setup Guest B Tasting Records ---');
  const recB1 = await prisma.tastingRecord.create({
    data: {
      guestProfileId: profileB.id,
      wineVintageId: vintage.id,
      wineNameSnapshot: wine.name,
      vintageYear: vintage.vintageYear,
      rating: new Prisma.Decimal('4.9'),
      notes: 'Phase 6.6 journey test — Guest B exclusive notes.',
      tasteCharacteristics: ['Bramble'],
      wouldDrinkAgain: 'YES',
      experienceName: 'Sunset Flight',
      body: 7,
      acidity: 6,
      sweetness: 2,
      tannin: 7,
    },
  });
  const recB2 = await prisma.tastingRecord.create({
    data: {
      guestProfileId: profileB.id,
      wineVintageId: vintage.id,
      wineNameSnapshot: wine.name,
      vintageYear: vintage.vintageYear,
      rating: new Prisma.Decimal('4.1'),
      notes: 'Phase 6.6 journey test — Guest B record 2.',
      tasteCharacteristics: [],
      wouldDrinkAgain: 'NO',
      body: 5,
      acidity: 5,
      sweetness: 2,
      tannin: 5,
    },
  });
  console.log(`Guest B records: ${recB1.id}, ${recB2.id}`);
  assert(true, 'Setup complete: Guest A has 6 records, Guest B has 2, Guest C has 0');

  const idsA = [recA1.id, recA2.id, recA3.id, recA4.id, recA5.id, recA6.id];
  const idsB = [recB1.id, recB2.id];

  // ------------------------------------------------------------------
  // TEST 1: Authenticated retrieval
  // ------------------------------------------------------------------
  console.log('\n--- Test 1: Authenticated Retrieval ---');
  const listA = await getJourney(jarA, '?pageSize=50');
  assert(
    listA.status === 200 && listA.json.success === true && Array.isArray(listA.json.data?.items),
    'Test 1: Authenticated Guest A retrieves journey via GET /api/auth/guest/journey',
    `Status: ${listA.status}, items: ${listA.json.data?.items?.length}`
  );
  assert(
    !!listA.json.data?.pagination &&
      typeof listA.json.data.pagination.total === 'number' &&
      typeof listA.json.data.pagination.totalPages === 'number',
    'Test 1b: Response includes pagination metadata',
    JSON.stringify(listA.json.data?.pagination)
  );

  // ------------------------------------------------------------------
  // TEST 2: Ownership
  // ------------------------------------------------------------------
  console.log('\n--- Test 2: Ownership ---');
  const returnedA = itemIds(listA);
  assert(
    returnedA.length === 6 && idsA.every((id) => returnedA.includes(id)),
    'Test 2: All 6 Guest A tasting records returned',
    `got ${returnedA.length}`
  );
  let owned = true;
  let ownedDetail = '';
  for (const item of listA.json.data?.items ?? []) {
    const db = await prisma.tastingRecord.findUnique({ where: { id: item.id } });
    if (!db || db.guestProfileId !== profileA.id) {
      owned = false;
      ownedDetail = `${item.id} -> ${db?.guestProfileId}`;
      break;
    }
  }
  assert(owned, 'Test 2b: Every returned record belongs to Guest A profile', ownedDetail || `all owned by ${profileA.id}`);
  const countA = await prisma.tastingRecord.count({ where: { guestProfileId: profileA.id } });
  assert(
    listA.json.data?.pagination?.total === countA,
    'Test 2c: Pagination total matches database count for Guest A',
    `API: ${listA.json.data?.pagination?.total}, DB: ${countA}`
  );

  // ------------------------------------------------------------------
  // TEST 3: Cross-guest isolation (IDOR)
  // ------------------------------------------------------------------
  console.log('\n--- Test 3: Cross-Guest Isolation ---');
  assert(
    !returnedA.includes(recB1.id) && !returnedA.includes(recB2.id),
    'Test 3: Guest A list contains NONE of Guest B\'s record IDs'
  );
  const listB = await getJourney(jarB, '?pageSize=50');
  const returnedB = itemIds(listB);
  assert(
    listB.status === 200 && returnedB.includes(recB1.id) && returnedB.includes(recB2.id),
    'Test 3b: Guest B retrieves their own records (proves B\'s records exist)',
    `B: ${returnedB.join(', ')}`
  );
  assert(
    !returnedB.includes(recA1.id) && !returnedB.includes(recA3.id),
    'Test 3c: Guest B list contains NONE of Guest A\'s record IDs',
    `B saw ${returnedB.length} records`
  );
  const countB = await prisma.tastingRecord.count({ where: { guestProfileId: profileB.id } });
  assert(
    listB.json.data?.pagination?.total === countB && countB === 2,
    'Test 3d: Guest B total matches database count',
    `API: ${listB.json.data?.pagination?.total}, DB: ${countB}`
  );

  // ------------------------------------------------------------------
  // TESTS 4-6: Identity spoofing via query params
  // ------------------------------------------------------------------
  console.log('\n--- Tests 4-6: Identity Spoofing Prevention ---');
  const spoofProfile = await getJourney(jarA, `?guestProfileId=${profileB.id}&pageSize=50`);
  const spoofProfileIds = itemIds(spoofProfile);
  assert(
    spoofProfile.status === 200 &&
      !spoofProfileIds.includes(recB1.id) &&
      !spoofProfileIds.includes(recB2.id),
    'Test 4: guestProfileId query param cannot change authenticated identity',
    `items: ${spoofProfileIds.length}`
  );

  const spoofUser = await getJourney(jarA, `?userId=${userB.id}&pageSize=50`);
  const spoofUserIds = itemIds(spoofUser);
  assert(
    spoofUser.status === 200 &&
      !spoofUserIds.includes(recB1.id) &&
      !spoofUserIds.includes(recB2.id),
    'Test 5: userId query param cannot change authenticated identity',
    `items: ${spoofUserIds.length}`
  );

  const spoofEmail = await getJourney(jarA, `?email=${encodeURIComponent(EMAIL_B)}&pageSize=50`);
  const spoofEmailIds = itemIds(spoofEmail);
  assert(
    spoofEmail.status === 200 &&
      !spoofEmailIds.includes(recB1.id) &&
      !spoofEmailIds.includes(recB2.id),
    'Test 6: email query param cannot change authenticated identity',
    `items: ${spoofEmailIds.length}`
  );

  // ------------------------------------------------------------------
  // TEST 7: Unauthenticated request rejected
  // ------------------------------------------------------------------
  console.log('\n--- Test 7: Unauthenticated Request ---');
  const unauth = await getJourney(null);
  assert(unauth.status === 401, 'Test 7: Unauthenticated request returns 401', `Status: ${unauth.status}`);
  const unauthWithSpoof = await getJourney(null, `?guestProfileId=${profileA.id}`);
  assert(
    unauthWithSpoof.status === 401,
    'Test 7b: Unauthenticated request with spoofed guestProfileId still returns 401',
    `Status: ${unauthWithSpoof.status}`
  );

  // ------------------------------------------------------------------
  // TEST 8: Empty journey
  // ------------------------------------------------------------------
  console.log('\n--- Test 8: Empty Journey ---');
  const listC = await getJourney(jarC, '?pageSize=50');
  assert(
    listC.status === 200 &&
      listC.json.success === true &&
      Array.isArray(listC.json.data?.items) &&
      listC.json.data.items.length === 0 &&
      listC.json.data.pagination?.total === 0,
    'Test 8: Guest C (no tastings) receives a valid empty response',
    `total: ${listC.json.data?.pagination?.total}`
  );

  // ------------------------------------------------------------------
  // TEST 9: Real wine/vintage mapping
  // ------------------------------------------------------------------
  console.log('\n--- Test 9: Wine/Vintage Mapping ---');
  const mapped = findItemById(listA.json.data?.items, recA1.id);
  assert(!!mapped, 'Test 9: Session-less record present in list', recA1.id);
  if (mapped) {
    assert(
      mapped.wine.id === wine.id &&
        mapped.wine.name === wine.name &&
        mapped.wine.slug === wine.slug &&
        mapped.wine.category === wine.category &&
        mapped.wineVintageId === vintage.id &&
        mapped.vintageYear === vintage.vintageYear,
      'Test 9b: Wine name/slug/category and vintage year/ID match the database relation exactly',
      `wine=${mapped.wine.slug}, vintage=${mapped.vintageYear}, id=${mapped.wineVintageId}`
    );
    assert(
      mapped.wine.slug.length > 0 && !mapped.wine.slug.startsWith('mock'),
      'Test 9c: Wine slug comes from the real Wine relation (not mock data)',
      mapped.wine.slug
    );
  } else {
    assert(false, 'Test 9b: Wine mapping fields match database', 'record missing from response');
    assert(false, 'Test 9c: Wine slug from real relation', 'record missing from response');
  }

  // ------------------------------------------------------------------
  // TEST 10: Optional fields — null when absent, populated when present
  // ------------------------------------------------------------------
  console.log('\n--- Test 10: Optional Fields ---');
  const standalone = findItemById(listA.json.data?.items, recA1.id);
  const withSession = findItemById(listA.json.data?.items, recA3.id);
  const withExperience = findItemById(listA.json.data?.items, recA2.id);

  if (standalone) {
    assert(
      standalone.experienceName === null && standalone.session === null && standalone.booking === null,
      'Test 10: Standalone record returns null for experience/session/booking (no fabrication)',
      `exp=${standalone.experienceName}, session=${standalone.session}, booking=${standalone.booking}`
    );
  } else {
    assert(false, 'Test 10: Standalone optional fields are null', 'record missing');
  }

  if (withSession) {
    assert(
      !!withSession.session &&
        withSession.session.id === fixtureSession.id &&
        withSession.session.location === 'Historic Salon' &&
        !!withSession.booking &&
        withSession.booking.bookingNumber === fixtureBooking.bookingNumber,
      'Test 10b: Session-linked record returns real session + booking reference',
      `session=${withSession.session?.id}, booking=${withSession.booking?.bookingNumber}`
    );
  } else {
    assert(false, 'Test 10b: Session/booking populated from real relations', 'record missing');
  }

  if (withExperience) {
    assert(
      withExperience.experienceName === 'Vault Tasting',
      'Test 10c: experienceName returned only when stored on the record',
      withExperience.experienceName ?? undefined
    );
  } else {
    assert(false, 'Test 10c: experienceName from stored snapshot', 'record missing');
  }

  // ------------------------------------------------------------------
  // TEST 11: Rating / drink-again from stored data
  // ------------------------------------------------------------------
  console.log('\n--- Test 11: Rating & Drink-Again ---');
  const rated = findItemById(listA.json.data?.items, recA1.id);
  const drinkAgain = findItemById(listA.json.data?.items, recA3.id);
  assert(
    rated?.rating === '4.8' && rated?.wouldDrinkAgain === 'YES',
    'Test 11: Rating and drink-again match stored values',
    `rating=${rated?.rating}, drinkAgain=${rated?.wouldDrinkAgain}`
  );
  assert(
    drinkAgain?.wouldDrinkAgain === 'NO',
    'Test 11b: Drink-again MAYBE/NO values are surfaced correctly',
    `drinkAgain=${drinkAgain?.wouldDrinkAgain}`
  );
  assert(
    !!rated?.tastingDate && !Number.isNaN(Date.parse(rated.tastingDate)),
    'Test 11c: tastingDate is a valid ISO date',
    rated?.tastingDate
  );

  // ------------------------------------------------------------------
  // TEST 12: Safe data only
  // ------------------------------------------------------------------
  console.log('\n--- Test 12: Safe Data / No Sensitive Fields ---');
  const raw = JSON.stringify(listA.json);
  assert(!raw.includes('passwordHash'), 'Test 12: Response never exposes passwordHash', 'passwordHash absent');
  assert(!raw.includes('tokenHash'), 'Test 12b: Response never exposes tokenHash', 'tokenHash absent');
  assert(!raw.includes(EMAIL_A) && !raw.includes(EMAIL_B), 'Test 12c: Response does not embed User emails', 'emails absent');
  assert(!raw.includes('"userId"'), 'Test 12d: Response does not expose userId', 'userId absent');

  // ------------------------------------------------------------------
  // TEST 13: Pagination
  // ------------------------------------------------------------------
  console.log('\n--- Test 13: Pagination ---');
  const page1 = await getJourney(jarA, '?page=1&pageSize=2');
  const page2 = await getJourney(jarA, '?page=2&pageSize=2');
  const page3 = await getJourney(jarA, '?page=3&pageSize=2');
  const p1 = itemIds(page1);
  const p2 = itemIds(page2);
  const p3 = itemIds(page3);

  assert(
    page1.json.data?.pagination?.page === 1 &&
      page1.json.data?.pagination?.pageSize === 2 &&
      page1.json.data?.pagination?.total === 6 &&
      page1.json.data?.pagination?.totalPages === 3 &&
      p1.length === 2,
    'Test 13: Page 1 returns 2 items with correct pagination metadata',
    JSON.stringify(page1.json.data?.pagination)
  );
  assert(p2.length === 2 && page2.json.data?.pagination?.page === 2, 'Test 13b: Page 2 returns 2 items', `items: ${p2.length}`);
  assert(p3.length === 2 && page3.json.data?.pagination?.page === 3, 'Test 13c: Page 3 returns 2 items', `items: ${p3.length}`);

  const union = [...p1, ...p2, ...p3];
  assert(
    union.length === 6 && new Set(union).size === 6 && idsA.every((id) => union.includes(id)),
    'Test 13d: Pages are disjoint and their union equals the full Guest A result set (pagination cannot escape guest scope)',
    `union: ${union.length}, unique: ${new Set(union).size}`
  );
  assert(
    !union.some((id) => idsB.includes(id)),
    'Test 13e: Paginated pages contain zero Guest B records'
  );

  const overPage = await getJourney(jarA, '?page=99&pageSize=2');
  assert(
    overPage.status === 200 && itemIds(overPage).length === 0,
    'Test 13f: Page beyond the end returns empty items (no error)',
    `items: ${itemIds(overPage).length}`
  );
  const capPage = await getJourney(jarA, '?pageSize=999');
  assert(
    capPage.status === 200 && capPage.json.data?.pagination?.pageSize === 50,
    'Test 13g: pageSize is capped at 50 (database-level pagination bound)',
    `pageSize: ${capPage.json.data?.pagination?.pageSize}`
  );

  // ------------------------------------------------------------------
  // TEST 14: Search within guest scope
  // ------------------------------------------------------------------
  console.log('\n--- Test 14: Search ---');
  const searchHit = await getJourney(jarA, '?search=unique-search-term&pageSize=50');
  const hitIds = itemIds(searchHit);
  assert(
    searchHit.status === 200 &&
      searchHit.json.data?.pagination?.total === 1 &&
      hitIds.includes(recA6.id),
    'Test 14: Search finds Guest A\'s matching record within own scope',
    `total: ${searchHit.json.data?.pagination?.total}`
  );
  const searchCross = await getJourney(jarA, `?search=${encodeURIComponent('Guest B exclusive')}&pageSize=50`);
  assert(
    searchCross.status === 200 &&
      (searchCross.json.data?.pagination?.total ?? -1) === 0 &&
      itemIds(searchCross).length === 0,
    'Test 14b: Search cannot surface Guest B records to Guest A',
    `total: ${searchCross.json.data?.pagination?.total}`
  );
  const searchB = await getJourney(jarB, '?search=exclusive&pageSize=50');
  assert(
    searchB.status === 200 &&
      itemIds(searchB).includes(recB1.id) &&
      !itemIds(searchB).includes(recA6.id),
    'Test 14c: Guest B search returns only Guest B matches'
  );

  // ------------------------------------------------------------------
  // TEST 15: Invalid parameters rejected
  // ------------------------------------------------------------------
  console.log('\n--- Test 15: Invalid Parameters ---');
  const badPage = await getJourney(jarA, '?page=abc');
  assert(badPage.status === 400, 'Test 15: Non-numeric page returns 400', `Status: ${badPage.status}`);
  const badPageSize = await getJourney(jarA, '?pageSize=0');
  assert(badPageSize.status === 400, 'Test 15b: pageSize=0 returns 400', `Status: ${badPageSize.status}`);
  const badPageZero = await getJourney(jarA, '?page=0');
  assert(badPageZero.status === 400, 'Test 15c: page=0 returns 400', `Status: ${badPageZero.status}`);
  const longSearch = await getJourney(jarA, `?search=${'x'.repeat(201)}`);
  assert(longSearch.status === 400, 'Test 15d: search longer than 200 chars returns 400', `Status: ${longSearch.status}`);

  // ------------------------------------------------------------------
  // TEST 16: Cleanup
  // ------------------------------------------------------------------
  console.log('\n--- Test 16: Cleanup ---');
  try {
    const testEmails = [EMAIL_A, EMAIL_B, EMAIL_C];
    const testProfiles = await prisma.guestProfile.findMany({
      where: { user: { email: { in: testEmails } } },
    });
    const profileIds = testProfiles.map((p) => p.id);

    await prisma.tastingRecord.deleteMany({ where: { guestProfileId: { in: profileIds } } });
    await prisma.tastingSession.deleteMany({ where: { guestProfileId: { in: profileIds } } });

    const bookings = await prisma.booking.findMany({
      where: { guestProfileId: { in: profileIds } },
    });
    for (const b of bookings) {
      await prisma.bookingGuest.deleteMany({ where: { bookingId: b.id } });
      await prisma.bookingItem.deleteMany({ where: { bookingId: b.id } });
      await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: b.id } });
      await prisma.booking.delete({ where: { id: b.id } });
    }

    const eventBookings = await prisma.eventBooking.findMany({
      where: { guestProfileId: { in: profileIds } },
    });
    for (const eb of eventBookings) {
      await prisma.eventBookingStatusHistory.deleteMany({ where: { eventBookingId: eb.id } });
      await prisma.eventBookingTicket.deleteMany({ where: { eventBookingId: eb.id } });
      await prisma.eventBooking.delete({ where: { id: eb.id } });
    }

    await prisma.guestWinePreference.deleteMany({ where: { guestProfileId: { in: profileIds } } });
    await prisma.guestProfile.deleteMany({ where: { id: { in: profileIds } } });
    await prisma.passwordResetToken.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } });

    const residualUsers = await prisma.user.count({ where: { email: { in: testEmails } } });
    const residualProfiles = await prisma.guestProfile.count({ where: { id: { in: profileIds } } });
    const residualRecords = await prisma.tastingRecord.count({
      where: { id: { in: [...idsA, ...idsB] } },
    });
    const residualSessions = await prisma.tastingSession.count({ where: { id: fixtureSession.id } });
    const residualBookings = await prisma.booking.count({ where: { bookingNumber: fixtureBooking.bookingNumber } });
    const wineStillPresent = await prisma.wine.count({ where: { id: wine.id } });

    assert(
      residualUsers === 0 &&
        residualProfiles === 0 &&
        residualRecords === 0 &&
        residualSessions === 0 &&
        residualBookings === 0,
      'Test 16: All test users, profiles, tasting records, sessions, and fixture booking removed',
      `users:${residualUsers} profiles:${residualProfiles} records:${residualRecords} sessions:${residualSessions} bookings:${residualBookings}`
    );
    assert(wineStillPresent === 1, 'Test 16b: Legitimate winery wine data untouched', `wine present: ${wineStillPresent}`);
  } catch (err) {
    console.error('Cleanup error:', err);
    assert(false, 'Test 16: Cleanup failed', String(err));
  }

  console.log('\n==================================================');
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('==================================================');

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(async (e) => {
  console.error('Test runner failure:', e);
  await prisma.$disconnect();
  process.exit(1);
});
