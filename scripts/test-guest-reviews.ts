/**
 * Guest Reviews Test Suite (Phase 6.7)
 *
 * Usage:
 *   1. Start dev server:  npm run dev
 *   2. Run:               node scripts/test-guest-reviews.ts
 *      (or npx tsx scripts/test-guest-reviews.ts)
 *
 * Verifies /api/auth/guest/reviews:
 *   A. Unauthenticated GET → 401.
 *   B. Unauthenticated POST → 401.
 *   C. Guest A sees only Guest A reviews.
 *   D. Guest B cannot see Guest A reviews.
 *   E. Guest A cannot submit a review for Guest B's booking.
 *   F. Forged guestProfileId is ignored/rejected.
 *   G. Forged userId is ignored/rejected.
 *   H. Forged email is ignored/rejected.
 *   I. Cannot review PENDING booking.
 *   J. Cannot review CONFIRMED future booking.
 *   K. Cannot review CANCELLED booking.
 *   L. Cannot review NO_SHOW booking.
 *   M. Can review valid COMPLETED visit.
 *   N. Duplicate review is rejected/idempotently prevented.
 *   O. Guest cannot set status to APPROVED.
 *   P. Guest cannot manipulate moderation fields.
 *   Q. Invalid rating rejected.
 *   R. Invalid/missing required fields rejected.
 *   S. Review history contains only authenticated guest's records.
 *   T. passwordHash and sensitive User fields never appear in response.
 *   U. Pagination works correctly.
 *   V. Empty review history works correctly.
 *   W. Eligible review list is guest-scoped.
 *
 * Phase 6.7 follow-up (wine/event targets + admin visibility):
 *   Y. Wine target is server-derived from the completed visit (allowed wine → 201).
 *   Z. Arbitrary/out-of-visit wineId rejected → 403; cross-guest booking → 404.
 *   EVT. Event target is server-authoritative from the guest's EventBooking.
 *   EVTb. Guest cannot review arbitrary/foreign/future/cancelled events.
 *   ADM. Admin can list submitted guest reviews (staff session).
 *   ADMb. Unauthorized (anonymous/guest) cannot access Admin Reviews → 401.
 *   ST. Guest cannot modify review status (PATCH → 405; status always PENDING).
 *
 * Regression suites are run separately per prior verification lists:
 *   npx tsx scripts/test-guest-auth.ts
 *   npx tsx scripts/test-guest-profile.ts
 *   npx tsx scripts/test-my-bookings.ts
 *   npx tsx scripts/test-experience-booking-auth.ts
 *   npx tsx scripts/test-event-booking-auth.ts
 *   npx tsx scripts/test-guest-journey.ts
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const RUN = Date.now().toString(36);

function loadDotEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const raw = readFileSync(join(process.cwd(), '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    // .env optional — falls back to process.env
  }
  return out;
}
const DOTENV = loadDotEnv();
const ADMIN_EMAIL = process.env.INITIAL_ADMIN_EMAIL || DOTENV.INITIAL_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || DOTENV.INITIAL_ADMIN_PASSWORD || '';

const EMAIL_A = `review-p67-${RUN}-a@example.com`;
const EMAIL_B = `review-p67-${RUN}-b@example.com`;
const EMAIL_C = `review-p67-${RUN}-c@example.com`;
const PASS = 'Review#Test2026!';
const NAME_A = 'Alice Review';
const NAME_B = 'Bob Review';
const NAME_C = 'Carol Review';

interface ReviewItem {
  id: string;
  rating: number;
  title: string;
  comment: string;
  category: string;
  targetName: string;
  status: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  booking: { bookingNumber: string; date: string; status: string } | null;
  experience: { id: string; title: string; slug: string } | null;
  wine: { id: string; name: string; slug: string } | null;
  event?: { id: string; title: string; slug: string } | null;
  eventBookingNumber?: string | null;
}

interface EligibleTarget {
  bookingId: string;
  bookingNumber: string;
  visitDate: string;
  time: string;
  status: string;
  experience: { id: string; title: string; slug: string } | null;
  wines?: { id: string; name: string; slug: string }[];
  targetName: string;
  alreadyReviewed: boolean;
  review: { id: string; status: string } | null;
}

interface EligibleEventTarget {
  eventBookingId: string;
  eventBookingNumber: string;
  eventDate: string;
  timeRange: string;
  status: string;
  event: { id: string; title: string; slug: string };
  targetName: string;
  alreadyReviewed: boolean;
  review: { id: string; status: string } | null;
}

interface ReviewListResponse {
  success?: boolean;
  error?: string;
  data?: {
    items?: ReviewItem[];
    pagination?: { page: number; pageSize: number; total: number; totalPages: number };
  };
}

interface EligibleListResponse {
  success?: boolean;
  error?: string;
  data?: {
    items?: EligibleTarget[];
    events?: EligibleEventTarget[];
    pagination?: { page: number; pageSize: number; total: number; totalPages: number };
  };
}

interface AdminReviewItem {
  id: string;
  authorName: string;
  guestName: string | null;
  guestEmail: string | null;
  rating: number;
  title: string;
  comment: string;
  category: string;
  targetName: string;
  status: string;
  createdAt: string;
  booking: { bookingNumber: string; date: string; status: string } | null;
  eventBookingNumber: string | null;
  experience: { id: string; title: string; slug: string } | null;
  wine: { id: string; name: string; slug: string } | null;
  event: { id: string; title: string; slug: string; eventDate: string } | null;
}

interface AdminReviewListResponse {
  success?: boolean;
  error?: string;
  data?: {
    items?: AdminReviewItem[];
    pagination?: { page: number; pageSize: number; total: number; totalPages: number };
  };
}

interface ReviewResponse {
  success?: boolean;
  error?: string;
  data?: ReviewItem;
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
  return `10.98.${Math.floor(Math.random() * 250) + 1}.${ipCounter++}`;
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

async function getReviews(
  jar: CookieJar | null,
  query = '',
  headers: Record<string, string> = {}
): Promise<{ status: number; json: ReviewListResponse }> {
  const res = await fetch(`${BASE_URL}/api/auth/guest/reviews${query}`, {
    headers: {
      ...(jar ? { Cookie: jar.header() } : {}),
      'x-forwarded-for': freshIp(),
      ...headers,
    },
  });
  return { status: res.status, json: (await res.json()) as ReviewListResponse };
}

async function getReviewById(
  jar: CookieJar | null,
  id: string
): Promise<{ status: number; json: ReviewResponse }> {
  const res = await fetch(`${BASE_URL}/api/auth/guest/reviews/${id}`, {
    headers: {
      ...(jar ? { Cookie: jar.header() } : {}),
      'x-forwarded-for': freshIp(),
    },
  });
  return { status: res.status, json: (await res.json()) as ReviewResponse };
}

async function getEligible(
  jar: CookieJar | null,
  query = ''
): Promise<{ status: number; json: EligibleListResponse }> {
  const res = await fetch(`${BASE_URL}/api/auth/guest/reviews/eligible${query}`, {
    headers: {
      ...(jar ? { Cookie: jar.header() } : {}),
      'x-forwarded-for': freshIp(),
    },
  });
  return { status: res.status, json: (await res.json()) as EligibleListResponse };
}

async function postReview(
  jar: CookieJar | null,
  body: Record<string, unknown>
): Promise<{ status: number; json: ReviewResponse }> {
  const res = await fetch(`${BASE_URL}/api/auth/guest/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jar ? { Cookie: jar.header() } : {}),
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as ReviewResponse };
}

async function getAdminReviews(
  jar: CookieJar | null,
  query = ''
): Promise<{ status: number; json: AdminReviewListResponse }> {
  const res = await fetch(`${BASE_URL}/api/admin/reviews${query}`, {
    headers: {
      ...(jar ? { Cookie: jar.header() } : {}),
      'x-forwarded-for': freshIp(),
    },
  });
  return { status: res.status, json: (await res.json()) as AdminReviewListResponse };
}

async function loginAdmin(
  jar: CookieJar
): Promise<{ status: number; ok: boolean }> {
  const res = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  jar.absorb(res);
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: Boolean(json?.success) };
}

async function patchReview(
  jar: CookieJar | null,
  id: string,
  body: Record<string, unknown>
): Promise<{ status: number }> {
  const res = await fetch(`${BASE_URL}/api/auth/guest/reviews/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(jar ? { Cookie: jar.header() } : {}),
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status };
}

function reviewIds(res: { json: ReviewListResponse }): string[] {
  return (res.json?.data?.items ?? []).map((r) => r.id);
}

function eligibleNumbers(res: { json: EligibleListResponse }): string[] {
  return (res.json?.data?.items ?? []).map((b) => b.bookingNumber);
}

async function main() {
  console.log(`--- Starting Phase 6.7 Guest Reviews Tests (Run: ${RUN}) ---`);

  // ------------------------------------------------------------------
  // SETUP: real winery + experience from the database
  // ------------------------------------------------------------------
  const winery = await prisma.winery.findFirst({ select: { id: true } });
  const experience = await prisma.experience.findFirst({
    select: { id: true, title: true, slug: true, price: true, wineryId: true },
  });
  if (!winery || !experience) {
    console.error('❌ ABORT: No winery/experience found in database. Seed the database first.');
    await prisma.$disconnect();
    process.exit(1);
  }
  const expId = experience.id;
  const expTitle = experience.title;
  const expSlug = experience.slug;
  const expWineryId = experience.wineryId;
  console.log(`Using Winery: ${winery.id} | Experience: "${expTitle}" (${expSlug})`);

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
  assert(regC.status === 201, 'Guest C registered (empty-history guest)', `Status: ${regC.status}`);

  const profileA = await prisma.guestProfile.findFirst({ where: { user: { email: EMAIL_A } } });
  const profileB = await prisma.guestProfile.findFirst({ where: { user: { email: EMAIL_B } } });
  const profileC = await prisma.guestProfile.findFirst({ where: { user: { email: EMAIL_C } } });
  const userA = await prisma.user.findUnique({ where: { email: EMAIL_A } });
  const userB = await prisma.user.findUnique({ where: { email: EMAIL_B } });

  assert(!!profileA, 'Guest A profile exists in DB');
  assert(!!profileB, 'Guest B profile exists in DB');
  assert(!!profileC, 'Guest C profile exists in DB');
  if (!profileA || !profileB || !profileC || !userA || !userB) {
    console.error('❌ ABORT: Setup failed — missing profiles/user.');
    await prisma.$disconnect();
    process.exit(1);
  }

  // ------------------------------------------------------------------
  // SETUP: fixture bookings (created directly, cleaned up at the end)
  // ------------------------------------------------------------------
  console.log('\n--- Setup Fixture Bookings ---');
  const pastDate = new Date();
  pastDate.setUTCDate(pastDate.getUTCDate() - 30);
  const futureDate = new Date();
  futureDate.setUTCDate(futureDate.getUTCDate() + 30);

  async function createFixtureBooking(
    guestProfileId: string,
    suffix: string,
    status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW',
    date: Date,
    experience?: { id: string; title: string }
  ) {
    const exp = experience ?? { id: expId, title: expTitle };
    return prisma.booking.create({
      data: {
        bookingNumber: `DVR-REV-${RUN}-${suffix}`,
        wineryId: expWineryId,
        guestProfileId,
        date,
        time: '14:00',
        adults: 2,
        children: 0,
        totalGuests: 2,
        subtotal: 0,
        taxAmount: 0,
        totalPrice: 0,
        currency: 'USD',
        status,
        items: {
          create: [
            {
              experienceId: exp.id,
              itemType: 'EXPERIENCE',
              title: exp.title,
              unitPrice: 0,
              quantity: 1,
              totalPrice: 0,
            },
          ],
        },
      },
    });
  }

  const completed1 = await createFixtureBooking(profileA.id, 'a-c1', 'COMPLETED', pastDate);
  const completed2 = await createFixtureBooking(profileA.id, 'a-c2', 'COMPLETED', pastDate);
  const completed3 = await createFixtureBooking(profileA.id, 'a-c3', 'COMPLETED', pastDate);
  const completed4 = await createFixtureBooking(profileA.id, 'a-c4', 'COMPLETED', pastDate);
  const completed5 = await createFixtureBooking(profileA.id, 'a-c5', 'COMPLETED', pastDate);
  const pendingBk = await createFixtureBooking(profileA.id, 'a-pd', 'PENDING', pastDate);
  const confirmedBk = await createFixtureBooking(profileA.id, 'a-cf', 'CONFIRMED', futureDate);
  const cancelledBk = await createFixtureBooking(profileA.id, 'a-cc', 'CANCELLED', pastDate);
  const noShowBk = await createFixtureBooking(profileA.id, 'a-ns', 'NO_SHOW', pastDate);
  const completedB = await createFixtureBooking(profileB.id, 'b-c1', 'COMPLETED', pastDate);

  // ------------------------------------------------------------------
  // SETUP: wine fixtures (ExperienceWine + a foreign wine not on any visit)
  // ------------------------------------------------------------------
  console.log('\n--- Setup Wine Fixtures ---');
  const wineInVisit = await prisma.wine.create({
    data: {
      wineryId: expWineryId,
      slug: `rev-wine-in-${RUN}`,
      name: `Review Wine In Visit ${RUN}`,
      category: 'RED',
      description: 'Fixture wine included in the test experience.',
      shortDescription: 'Fixture wine',
      characteristics: [],
    },
  });
  await prisma.experienceWine.create({
    data: { experienceId: expId, wineId: wineInVisit.id },
  });

  const wineOutOfVisit = await prisma.wine.create({
    data: {
      wineryId: expWineryId,
      slug: `rev-wine-out-${RUN}`,
      name: `Review Wine Out Of Visit ${RUN}`,
      category: 'WHITE',
      description: 'Fixture wine NOT included in any test visit.',
      shortDescription: 'Foreign fixture wine',
      characteristics: [],
    },
  });

  // Guest B gets a different experience + wine so cross-guest wine targets are distinct.
  const experienceB = await prisma.experience.create({
    data: {
      wineryId: expWineryId,
      slug: `rev-exp-b-${RUN}`,
      title: `Review Test Experience B ${RUN}`,
      category: 'TASTING',
      durationMinutes: 60,
      durationText: '60 Minutes',
      price: 0,
      shortDescription: 'Fixture experience for Guest B',
      description: 'Fixture experience for Guest B wine target tests.',
      capacity: 10,
      minGuests: 1,
      maxGuests: 10,
    },
  });
  const wineB = await prisma.wine.create({
    data: {
      wineryId: expWineryId,
      slug: `rev-wine-b-${RUN}`,
      name: `Review Wine B ${RUN}`,
      category: 'RED',
      description: 'Fixture wine only on Guest B experience.',
      shortDescription: 'Guest B fixture wine',
      characteristics: [],
    },
  });
  await prisma.experienceWine.create({
    data: { experienceId: experienceB.id, wineId: wineB.id },
  });
  const completedB2 = await createFixtureBooking(profileB.id, 'b-c2', 'COMPLETED', pastDate, {
    id: experienceB.id,
    title: experienceB.title,
  });

  // ------------------------------------------------------------------
  // SETUP: event fixtures (past/concluded, future, cancelled booking, Guest B)
  // ------------------------------------------------------------------
  console.log('\n--- Setup Event Fixtures ---');
  async function createFixtureEvent(suffix: string, date: Date, status?: 'UPCOMING' | 'COMPLETED' | 'CANCELLED') {
    const evt = await prisma.event.create({
      data: {
        wineryId: expWineryId,
        slug: `rev-evt-${RUN}-${suffix}`,
        title: `Review Fixture Event ${suffix} ${RUN}`,
        eventDate: date,
        timeRange: '6:00 PM – 9:00 PM',
        venue: 'Historic Salon',
        price: 0,
        description: 'Fixture event for guest review tests.',
        shortDescription: 'Fixture event',
        availableTickets: 20,
        maxCapacity: 20,
        featuredImage: 'https://example.com/fixture-event.jpg',
        winesServed: [],
        culinaryMenu: [],
        galleryImages: [],
        status: status ?? 'UPCOMING',
      },
    });
    const schedule = await prisma.eventSchedule.create({
      data: { eventId: evt.id, timeSlot: '6:00 PM', activity: 'Tasting', sortOrder: 0 },
    });
    return { evt, schedule };
  }

  async function createFixtureEventBooking(
    suffix: string,
    evt: { id: string },
    schedule: { id: string },
    guestProfileId: string,
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'CHECKED_IN' | 'NO_SHOW'
  ) {
    return prisma.eventBooking.create({
      data: {
        bookingNumber: `EVT-REV-${RUN}-${suffix}`,
        eventId: evt.id,
        eventScheduleId: schedule.id,
        guestProfileId,
        totalPrice: 0,
        status,
      },
    });
  }

  const pastEvtA = await createFixtureEvent('past-a', pastDate);
  const eventBookingA = await createFixtureEventBooking(
    'a',
    pastEvtA.evt,
    pastEvtA.schedule,
    profileA.id,
    'CONFIRMED'
  );

  const futureEvtA = await createFixtureEvent('future-a', futureDate);
  const eventBookingFuture = await createFixtureEventBooking(
    'a-future',
    futureEvtA.evt,
    futureEvtA.schedule,
    profileA.id,
    'CONFIRMED'
  );

  const cancelledEvtBooking = await createFixtureEventBooking(
    'a-cancelled',
    pastEvtA.evt,
    pastEvtA.schedule,
    profileA.id,
    'CANCELLED'
  );

  const pastEvtB = await createFixtureEvent('past-b', pastDate);
  const eventBookingB = await createFixtureEventBooking(
    'b',
    pastEvtB.evt,
    pastEvtB.schedule,
    profileB.id,
    'CONFIRMED'
  );

  const cancelledEvent = await createFixtureEvent('cancelled', pastDate, 'CANCELLED');
  const eventBookingOnCancelledEvent = await createFixtureEventBooking(
    'a-on-cancelled',
    cancelledEvent.evt,
    cancelledEvent.schedule,
    profileA.id,
    'CONFIRMED'
  );

  const fixtureBookings = [
    completed1,
    completed2,
    completed3,
    completed4,
    completed5,
    pendingBk,
    confirmedBk,
    cancelledBk,
    noShowBk,
    completedB,
    completedB2,
  ];
  console.log(`Created ${fixtureBookings.length} fixture bookings`);

  try {
    // ------------------------------------------------------------------
    // TEST A/B: Unauthenticated requests → 401
    // ------------------------------------------------------------------
    console.log('\n--- Tests A/B: Unauthenticated ---');
    const unauthGet = await getReviews(null);
    assert(unauthGet.status === 401, 'Test A: Unauthenticated GET → 401', `Status: ${unauthGet.status}`);
    const unauthPost = await postReview(null, {
      bookingNumber: completed1.bookingNumber,
      rating: 5,
      title: 'Unauthenticated attempt',
      comment: 'This submission must be rejected before any processing.',
      category: 'WINE_TASTING',
    });
    assert(unauthPost.status === 401, 'Test B: Unauthenticated POST → 401', `Status: ${unauthPost.status}`);
    const unauthEligible = await getEligible(null);
    assert(unauthEligible.status === 401, 'Test Bb: Unauthenticated eligible GET → 401', `Status: ${unauthEligible.status}`);
    const unauthById = await getReviewById(null, 'any-id');
    assert(unauthById.status === 401, 'Test Bc: Unauthenticated GET [id] → 401', `Status: ${unauthById.status}`);

    // ------------------------------------------------------------------
    // TEST M + F/G/H/O/P: valid COMPLETED review with forged fields
    // ------------------------------------------------------------------
    console.log('\n--- Tests M/F/G/H/O/P: Valid submit with forged fields ---');
    const forgedSubmit = await postReview(jarA, {
      bookingNumber: completed1.bookingNumber,
      rating: 5,
      title: 'Phase 6.7 completed visit A1',
      comment: 'A wonderful completed visit with outstanding service and superb wines.',
      category: 'WINE_TASTING',
      // Forged identity fields — must be ignored (session wins)
      guestProfileId: profileB.id,
      userId: userB.id,
      email: EMAIL_B,
      authorName: 'Mallory Forger',
      // Forged moderation fields — must be ignored
      status: 'APPROVED',
      verified: false,
      helpfulCount: 999,
      approvedAt: new Date().toISOString(),
      wineryId: 'forged-winery',
      experienceId: 'forged-experience',
    });
    assert(
      forgedSubmit.status === 201 && !!forgedSubmit.json.data?.id,
      'Test M: Can review valid COMPLETED visit',
      `Status: ${forgedSubmit.status} error: ${forgedSubmit.json.error ?? '-'}`
    );
    const review1Id = forgedSubmit.json.data?.id;

    const dbReview1 = review1Id
      ? await prisma.review.findUnique({ where: { id: review1Id } })
      : null;
    assert(!!dbReview1, 'Test Mb: Review persisted in database');
    assert(
      dbReview1?.guestProfileId === profileA.id,
      'Test F: Forged guestProfileId ignored — review owned by Guest A',
      `guestProfileId: ${dbReview1?.guestProfileId}`
    );
    assert(
      dbReview1?.status === 'PENDING',
      'Test O: Forged status APPROVED ignored — review starts PENDING',
      `status: ${dbReview1?.status}`
    );
    assert(
      dbReview1?.authorName === NAME_A,
      'Test Fb: Forged authorName ignored — session name used',
      `authorName: ${dbReview1?.authorName}`
    );
    assert(
      dbReview1?.verified === true && dbReview1?.helpfulCount === 0,
      'Test P: Moderation/helpful fields not client-controlled',
      `verified: ${dbReview1?.verified} helpfulCount: ${dbReview1?.helpfulCount}`
    );
    assert(
      dbReview1?.bookingId === completed1.id &&
        dbReview1?.experienceId === experience.id &&
        dbReview1?.wineryId === winery.id,
      'Test Mc: Server-side relationships authoritative (booking/experience/winery)',
      `bookingId: ${dbReview1?.bookingId} experienceId: ${dbReview1?.experienceId}`
    );
    assert(
      !('userId' in (dbReview1 ?? {})) || dbReview1?.guestProfileId === profileA.id,
      'Test G: Forged userId ignored/rejected',
      'userId is not a Review field and body key was stripped'
    );
    assert(
      dbReview1?.guestProfileId !== profileB.id,
      'Test H: Forged email did not attribute the review to Guest B'
    );

    // ------------------------------------------------------------------
    // TEST C/S: Guest A sees only Guest A reviews
    // ------------------------------------------------------------------
    console.log('\n--- Tests C/S: Guest A scope ---');
    const listA = await getReviews(jarA, '?pageSize=50');
    assert(
      listA.status === 200 && listA.json.data?.pagination?.total === 1 && reviewIds(listA).includes(review1Id!),
      'Test C: Guest A sees own reviews',
      `total: ${listA.json.data?.pagination?.total}`
    );
    const listASpoofed = await getReviews(
      jarA,
      `?pageSize=50&guestProfileId=${profileB.id}&userId=${userB.id}&email=${encodeURIComponent(EMAIL_B)}`
    );
    assert(
      listASpoofed.status === 200 &&
        reviewIds(listASpoofed).every((id) => id === review1Id) &&
        !reviewIds(listASpoofed).includes(''),
      'Test Fc: Spoofed guestProfileId/userId/email query params ignored',
      `total: ${listASpoofed.json.data?.pagination?.total}`
    );

    // ------------------------------------------------------------------
    // TEST D: Guest B cannot see Guest A reviews
    // ------------------------------------------------------------------
    console.log('\n--- Tests D: Guest B scope ---');
    const listBEmpty = await getReviews(jarB, '?pageSize=50');
    assert(
      listBEmpty.status === 200 &&
        (listBEmpty.json.data?.pagination?.total ?? -1) === 0 &&
        !reviewIds(listBEmpty).includes(review1Id!),
      'Test D: Guest B cannot see Guest A reviews (empty before own submit)',
      `total: ${listBEmpty.json.data?.pagination?.total}`
    );

    // ------------------------------------------------------------------
    // TEST E: Guest A cannot review Guest B's booking
    // ------------------------------------------------------------------
    console.log('\n--- Test E: Cross-guest booking ---');
    const crossSubmit = await postReview(jarA, {
      bookingNumber: completedB.bookingNumber,
      rating: 5,
      title: 'Phase 6.7 cross guest attempt',
      comment: 'Attempting to review a booking that belongs to Guest B.',
      category: 'WINE_TASTING',
    });
    assert(
      crossSubmit.status === 404,
      'Test E: Guest A cannot submit a review for Guest B\'s booking → 404',
      `Status: ${crossSubmit.status}`
    );
    const crossCount = await prisma.review.count({ where: { bookingId: completedB.id } });
    assert(crossCount === 0, 'Test Eb: No review created for Guest B\'s booking', `count: ${crossCount}`);

    // ------------------------------------------------------------------
    // TESTS I/J/K/L: Ineligible booking statuses → 403
    // ------------------------------------------------------------------
    console.log('\n--- Tests I/J/K/L: Booking status eligibility ---');
    const ineligible: Array<{ name: string; bookingNumber: string; label: string }> = [
      { name: 'I', bookingNumber: pendingBk.bookingNumber, label: 'PENDING booking' },
      { name: 'J', bookingNumber: confirmedBk.bookingNumber, label: 'CONFIRMED future booking' },
      { name: 'K', bookingNumber: cancelledBk.bookingNumber, label: 'CANCELLED booking' },
      { name: 'L', bookingNumber: noShowBk.bookingNumber, label: 'NO_SHOW booking' },
    ];
    for (const item of ineligible) {
      const res = await postReview(jarA, {
        bookingNumber: item.bookingNumber,
        rating: 5,
        title: `Phase 6.7 ineligible ${item.label}`,
        comment: `Attempting to review a ${item.label} must be rejected by the server.`,
        category: 'WINE_TASTING',
      });
      assert(
        res.status === 403,
        `Test ${item.name}: Cannot review ${item.label} → 403`,
        `Status: ${res.status}`
      );
    }
    const ineligibleCreated = await prisma.review.count({
      where: {
        bookingId: { in: [pendingBk.id, confirmedBk.id, cancelledBk.id, noShowBk.id] },
      },
    });
    assert(ineligibleCreated === 0, 'Test Ib: No reviews created for ineligible bookings', `count: ${ineligibleCreated}`);

    // ------------------------------------------------------------------
    // TEST N: Duplicate review rejected
    // ------------------------------------------------------------------
    console.log('\n--- Test N: Duplicate protection ---');
    const dupSubmit = await postReview(jarA, {
      bookingNumber: completed1.bookingNumber,
      rating: 4,
      title: 'Phase 6.7 duplicate attempt with a different title',
      comment: 'A second review for the same completed visit must be rejected.',
      category: 'VINEYARD_TOUR',
    });
    assert(
      dupSubmit.status === 409,
      'Test N: Duplicate review for same visit → 409',
      `Status: ${dupSubmit.status} error: ${dupSubmit.json.error ?? '-'}`
    );
    const dupCount = await prisma.review.count({ where: { bookingId: completed1.id } });
    assert(dupCount === 1, 'Test Nb: Still only one review for the completed visit', `count: ${dupCount}`);

    // ------------------------------------------------------------------
    // TEST W: Eligible list is guest-scoped and status-filtered
    // ------------------------------------------------------------------
    console.log('\n--- Test W: Eligible review targets ---');
    const eligibleA = await getEligible(jarA, '?pageSize=50');
    const eligibleANumbers = eligibleNumbers(eligibleA);
    assert(
      eligibleA.status === 200 &&
        eligibleANumbers.includes(completed1.bookingNumber) &&
        eligibleANumbers.includes(completed2.bookingNumber) &&
        eligibleANumbers.includes(completed3.bookingNumber),
      'Test W: Guest A eligible list contains own COMPLETED visits',
      `numbers: ${eligibleANumbers.join(', ')}`
    );
    assert(
      !eligibleANumbers.includes(pendingBk.bookingNumber) &&
        !eligibleANumbers.includes(confirmedBk.bookingNumber) &&
        !eligibleANumbers.includes(cancelledBk.bookingNumber) &&
        !eligibleANumbers.includes(noShowBk.bookingNumber),
      'Test Wb: PENDING/CONFIRMED/CANCELLED/NO_SHOW bookings not eligible',
      `total: ${eligibleA.json.data?.pagination?.total}`
    );
    assert(
      !eligibleANumbers.includes(completedB.bookingNumber),
      'Test Wc: Guest B\'s completed booking not visible to Guest A'
    );
    const eligibleC1 = (eligibleA.json.data?.items ?? []).find(
      (i) => i.bookingNumber === completed1.bookingNumber
    );
    const eligibleC2 = (eligibleA.json.data?.items ?? []).find(
      (i) => i.bookingNumber === completed2.bookingNumber
    );
    assert(
      eligibleC1?.alreadyReviewed === true && eligibleC1?.review?.status === 'PENDING',
      'Test Wd: Reviewed visit flagged alreadyReviewed with moderation status',
      `flag: ${eligibleC1?.alreadyReviewed} status: ${eligibleC1?.review?.status}`
    );
    assert(
      eligibleC2?.alreadyReviewed === false && eligibleC2?.review === null,
      'Test We: Unreviewed visit flagged not reviewed',
      `flag: ${eligibleC2?.alreadyReviewed}`
    );
    assert(
      eligibleC1?.experience?.slug === experience.slug,
      'Test Wf: Eligible target exposes experience name/slug',
      `slug: ${eligibleC1?.experience?.slug}`
    );

    const eligibleB = await getEligible(jarB, '?pageSize=50');
    const eligibleBNumbers = eligibleNumbers(eligibleB);
    assert(
      eligibleB.status === 200 &&
        eligibleBNumbers.includes(completedB.bookingNumber) &&
        !eligibleBNumbers.includes(completed1.bookingNumber),
      'Test Wg: Eligible list is guest-scoped for Guest B',
      `numbers: ${eligibleBNumbers.join(', ')}`
    );

    // ------------------------------------------------------------------
    // TEST Q: Invalid rating rejected
    // ------------------------------------------------------------------
    console.log('\n--- Test Q: Invalid rating ---');
    for (const badRating of [0, 6, 2.5, -1]) {
      const res = await postReview(jarA, {
        bookingNumber: completed2.bookingNumber,
        rating: badRating,
        title: 'Phase 6.7 invalid rating attempt',
        comment: 'This review uses an invalid rating and must be rejected.',
        category: 'WINE_TASTING',
      });
      assert(res.status === 400, `Test Q: Rating ${badRating} rejected → 400`, `Status: ${res.status}`);
    }

    // ------------------------------------------------------------------
    // TEST R: Invalid/missing required fields rejected
    // ------------------------------------------------------------------
    console.log('\n--- Test R: Invalid/missing fields ---');
    const badBodies: Array<{ name: string; body: Record<string, unknown> }> = [
      {
        name: 'missing bookingNumber',
        body: { rating: 5, title: 'Valid title here', comment: 'Valid comment here indeed.', category: 'WINE_TASTING' },
      },
      {
        name: 'short title',
        body: { bookingNumber: completed2.bookingNumber, rating: 5, title: 'ab', comment: 'Valid comment here indeed.', category: 'WINE_TASTING' },
      },
      {
        name: 'short comment',
        body: { bookingNumber: completed2.bookingNumber, rating: 5, title: 'Valid title here', comment: 'short', category: 'WINE_TASTING' },
      },
      {
        name: 'bad category',
        body: { bookingNumber: completed2.bookingNumber, rating: 5, title: 'Valid title here', comment: 'Valid comment here indeed.', category: 'NOT_A_CATEGORY' },
      },
      {
        name: 'missing category',
        body: { bookingNumber: completed2.bookingNumber, rating: 5, title: 'Valid title here', comment: 'Valid comment here indeed.' },
      },
      {
        name: 'non-integer rating',
        body: { bookingNumber: completed2.bookingNumber, rating: 5.5, title: 'Valid title here', comment: 'Valid comment here indeed.', category: 'WINE_TASTING' },
      },
    ];
    for (const item of badBodies) {
      const res = await postReview(jarA, item.body);
      assert(res.status === 400, `Test R: ${item.name} rejected → 400`, `Status: ${res.status}`);
    }

    // ------------------------------------------------------------------
    // M2: valid submits for remaining completed visits (pagination fixtures)
    // ------------------------------------------------------------------
    console.log('\n--- Setup: Remaining valid reviews for pagination ---');
    const r2 = await postReview(jarA, {
      bookingNumber: completed2.bookingNumber,
      rating: 4,
      title: 'Phase 6.7 completed visit A2',
      comment: 'Another completed visit, this time focused on the vineyard tour and soil story.',
      category: 'VINEYARD_TOUR',
    });
    assert(r2.status === 201, 'Setup: Second valid review submitted', `Status: ${r2.status}`);
    const r3 = await postReview(jarA, {
      bookingNumber: completed3.bookingNumber,
      rating: 3,
      title: 'Phase 6.7 completed visit A3',
      comment: 'Third completed visit review used for pagination and status filter checks.',
      category: 'FOOD',
    });
    assert(r3.status === 201, 'Setup: Third valid review submitted', `Status: ${r3.status}`);
    const rB = await postReview(jarB, {
      bookingNumber: completedB.bookingNumber,
      rating: 5,
      title: 'Phase 6.7 completed visit B1',
      comment: 'Guest B review used to verify cross-guest isolation of review history.',
      category: 'EVENTS',
    });
    assert(rB.status === 201, 'Setup: Guest B review submitted', `Status: ${rB.status}`);
    const r1 = review1Id!;
    const r2Id = r2.json.data?.id;
    const r3Id = r3.json.data?.id;
    const rBId = rB.json.data?.id;

    // ------------------------------------------------------------------
    // TEST S: History contains only authenticated guest's records
    // ------------------------------------------------------------------
    console.log('\n--- Test S: Authenticated scope ---');
    const finalA = await getReviews(jarA, '?pageSize=50');
    const idsA = reviewIds(finalA);
    assert(
      finalA.status === 200 &&
        finalA.json.data?.pagination?.total === 3 &&
        idsA.includes(r1) &&
        idsA.includes(r2Id!) &&
        idsA.includes(r3Id!) &&
        !idsA.includes(rBId!),
      'Test S: Guest A history contains exactly Guest A\'s reviews',
      `total: ${finalA.json.data?.pagination?.total}`
    );
    const finalB = await getReviews(jarB, '?pageSize=50');
    const idsB = reviewIds(finalB);
    assert(
      finalB.status === 200 &&
        idsB.includes(rBId!) &&
        !idsB.includes(r1) &&
        !idsB.includes(r2Id!) &&
        !idsB.includes(r3Id!),
      'Test Db: Guest B history contains only Guest B\'s reviews',
      `total: ${finalB.json.data?.pagination?.total}`
    );
    const dbScope = await prisma.review.findMany({
      where: { id: { in: [r1, r2Id!, r3Id!] } },
      select: { guestProfileId: true },
    });
    assert(
      dbScope.length === 3 && dbScope.every((r) => r.guestProfileId === profileA.id),
      'Test Sb: All Guest A reviews attributed to Guest A in the database'
    );

    // ------------------------------------------------------------------
    // TEST T: No passwordHash / sensitive fields in responses
    // ------------------------------------------------------------------
    console.log('\n--- Test T: Sensitive data ---');
    const rawList = JSON.stringify(finalA.json);
    const rawEligible = JSON.stringify(eligibleA.json);
    const rawPost = JSON.stringify(r2.json);
    assert(
      !rawList.includes('passwordHash') && !rawList.includes('password'),
      'Test T: Review list contains no password fields'
    );
    assert(
      !rawEligible.includes('passwordHash') && !rawEligible.includes('password'),
      'Test Tb: Eligible list contains no password fields'
    );
    assert(
      !rawPost.includes('passwordHash') && !rawPost.includes('password'),
      'Test Tc: POST response contains no password fields'
    );

    // ------------------------------------------------------------------
    // TEST U: Pagination works correctly
    // ------------------------------------------------------------------
    console.log('\n--- Test U: Pagination ---');
    const page1 = await getReviews(jarA, '?page=1&pageSize=2');
    const page2 = await getReviews(jarA, '?page=2&pageSize=2');
    const page1Ids = reviewIds(page1);
    const page2Ids = reviewIds(page2);
    assert(
      page1.status === 200 &&
        page1.json.data?.pagination?.total === 3 &&
        page1.json.data?.pagination?.totalPages === 2 &&
        page1Ids.length === 2,
      'Test U: Page 1 returns 2 of 3 reviews',
      `items: ${page1Ids.length} total: ${page1.json.data?.pagination?.total}`
    );
    assert(
      page2.status === 200 &&
        page2Ids.length === 1 &&
        page2Ids.every((id) => !page1Ids.includes(id)),
      'Test Ub: Page 2 is disjoint from Page 1',
      `items: ${page2Ids.join(',')}`
    );
    const badPage = await getReviews(jarA, '?page=0');
    assert(badPage.status === 400, 'Test Uc: page=0 rejected → 400', `Status: ${badPage.status}`);
    const badPageSize = await getReviews(jarA, '?pageSize=0');
    assert(badPageSize.status === 400, 'Test Ud: pageSize=0 rejected → 400', `Status: ${badPageSize.status}`);
    const badPageNaN = await getReviews(jarA, '?page=abc');
    assert(badPageNaN.status === 400, 'Test Ue: non-numeric page rejected → 400', `Status: ${badPageNaN.status}`);
    const badStatus = await getReviews(jarA, '?status=NOT_A_STATUS');
    assert(badStatus.status === 400, 'Test Uf: invalid status filter rejected → 400', `Status: ${badStatus.status}`);

    // Status filter + search
    const pendingOnly = await getReviews(jarA, '?status=PENDING&pageSize=50');
    assert(
      pendingOnly.status === 200 && pendingOnly.json.data?.pagination?.total === 3,
      'Test Ug: status=PENDING returns all 3 pending reviews',
      `total: ${pendingOnly.json.data?.pagination?.total}`
    );
    const approvedOnly = await getReviews(jarA, '?status=APPROVED&pageSize=50');
    assert(
      approvedOnly.status === 200 && approvedOnly.json.data?.pagination?.total === 0,
      'Test Uh: status=APPROVED returns 0 (no guest review is approved yet)',
      `total: ${approvedOnly.json.data?.pagination?.total}`
    );
    const searchRes = await getReviews(jarA, '?search=A3&pageSize=50');
    assert(
      searchRes.status === 200 &&
        searchRes.json.data?.pagination?.total === 1 &&
        reviewIds(searchRes).includes(r3Id!),
      'Test Ui: Search finds matching review within own scope',
      `total: ${searchRes.json.data?.pagination?.total}`
    );

    // ------------------------------------------------------------------
    // TEST V: Empty review history
    // ------------------------------------------------------------------
    console.log('\n--- Test V: Empty history ---');
    const emptyC = await getReviews(jarC, '?pageSize=50');
    assert(
      emptyC.status === 200 &&
        (emptyC.json.data?.items?.length ?? -1) === 0 &&
        emptyC.json.data?.pagination?.total === 0,
      'Test V: Empty review history returns 200 with zero items',
      `total: ${emptyC.json.data?.pagination?.total}`
    );
    const eligibleC = await getEligible(jarC, '?pageSize=50');
    assert(
      eligibleC.status === 200 && (eligibleC.json.data?.items?.length ?? -1) === 0,
      'Test Vb: Guest with no completed visits has empty eligible list',
      `total: ${eligibleC.json.data?.pagination?.total}`
    );

    // ------------------------------------------------------------------
    // GET [id]: ownership scoping
    // ------------------------------------------------------------------
    console.log('\n--- GET [id]: Single review access ---');
    const ownById = await getReviewById(jarA, r1);
    assert(
      ownById.status === 200 && ownById.json.data?.id === r1,
      'Test X: Guest A can fetch own review by id',
      `Status: ${ownById.status}`
    );
    const foreignById = await getReviewById(jarA, rBId!);
    assert(
      foreignById.status === 404,
      'Test Xb: Guest A cannot fetch Guest B\'s review by id → 404',
      `Status: ${foreignById.status}`
    );
    const bFetchesA = await getReviewById(jarB, r1);
    assert(
      bFetchesA.status === 404,
      'Test Xc: Guest B cannot fetch Guest A\'s review by id → 404',
      `Status: ${bFetchesA.status}`
    );
    const missingById = await getReviewById(jarA, '00000000-0000-4000-8000-000000000000');
    assert(missingById.status === 404, 'Test Xd: Missing review id → 404', `Status: ${missingById.status}`);

    // ------------------------------------------------------------------
    // TEST Y: Wine review target (server-derived from the completed visit)
    // ------------------------------------------------------------------
    console.log('\n--- Tests Y/Z: Wine review target ---');
    const eligibleWineList = await getEligible(jarA, '?pageSize=50');
    const eligibleWineTarget = (eligibleWineList.json.data?.items ?? []).find(
      (i) => i.bookingNumber === completed4.bookingNumber
    );
    assert(
      Array.isArray(eligibleWineTarget?.wines) &&
        eligibleWineTarget!.wines!.some((w) => w.id === wineInVisit.id),
      'Test Y: Eligible visit exposes allowed wines derived from the visit',
      `wines: ${JSON.stringify(eligibleWineTarget?.wines?.map((w) => w.id) ?? [])}`
    );

    const wineSubmit = await postReview(jarA, {
      bookingNumber: completed4.bookingNumber,
      wineId: wineInVisit.id,
      rating: 5,
      title: 'Phase 6.7 wine target review',
      comment: 'A wine-specific review for a wine actually tasted on this visit.',
      category: 'WINE_TASTING',
    });
    assert(
      wineSubmit.status === 201 && !!wineSubmit.json.data?.id,
      'Test Yb: Allowed wineId on completed visit → 201',
      `Status: ${wineSubmit.status} error: ${wineSubmit.json.error ?? '-'}`
    );
    const wineReviewId = wineSubmit.json.data?.id;
    const dbWineReview = wineReviewId
      ? await prisma.review.findUnique({ where: { id: wineReviewId } })
      : null;
    assert(
      dbWineReview?.wineId === wineInVisit.id && dbWineReview?.status === 'PENDING',
      'Test Yc: Review persisted with server-validated wineId and PENDING status',
      `wineId: ${dbWineReview?.wineId} status: ${dbWineReview?.status}`
    );

    // Arbitrary wine not part of the visit → 403, no review row for completed5.
    const arbitraryWineSubmit = await postReview(jarA, {
      bookingNumber: completed5.bookingNumber,
      wineId: wineOutOfVisit.id,
      rating: 5,
      title: 'Phase 6.7 arbitrary wine attempt',
      comment: 'Attempting to attach a wine that was not part of this visit.',
      category: 'WINE_TASTING',
    });
    assert(
      arbitraryWineSubmit.status === 403,
      'Test Z: Arbitrary wineId not on the visit → 403',
      `Status: ${arbitraryWineSubmit.status}`
    );
    const arbitraryWineCount = await prisma.review.count({
      where: { bookingId: completed5.id },
    });
    assert(arbitraryWineCount === 0, 'Test Zb: No review created for rejected wine target', `count: ${arbitraryWineCount}`);

    // Guest A cannot review Guest B's wine via B's booking (ownership → 404).
    const crossWineSubmit = await postReview(jarA, {
      bookingNumber: completedB2.bookingNumber,
      wineId: wineB.id,
      rating: 5,
      title: 'Phase 6.7 cross guest wine attempt',
      comment: 'Attempting to review Guest B wine through Guest B booking.',
      category: 'WINE_TASTING',
    });
    assert(
      crossWineSubmit.status === 404,
      'Test Zc: Guest A cannot review Guest B\'s wine via B\'s booking → 404',
      `Status: ${crossWineSubmit.status}`
    );

    // Guest A cannot attach Guest B's wine to Guest A's own visit either.
    const foreignWineOwnVisit = await postReview(jarA, {
      bookingNumber: completed5.bookingNumber,
      wineId: wineB.id,
      rating: 5,
      title: 'Phase 6.7 foreign wine on own visit',
      comment: 'Attempting to attach a wine only present on Guest B experience.',
      category: 'WINE_TASTING',
    });
    assert(
      foreignWineOwnVisit.status === 403,
      'Test Zd: Guest B\'s wine cannot be attached to Guest A\'s visit → 403',
      `Status: ${foreignWineOwnVisit.status}`
    );

    // Forged wineId with non-existent UUID → 403 (not in allowed set).
    const nonExistentWine = await postReview(jarA, {
      bookingNumber: completed5.bookingNumber,
      wineId: '00000000-0000-4000-8000-000000000001',
      rating: 4,
      title: 'Phase 6.7 nonexistent wine attempt',
      comment: 'Attempting to attach a wine id that does not exist at all.',
      category: 'WINE_TASTING',
    });
    assert(
      nonExistentWine.status === 403,
      'Test Ze: Non-existent wineId rejected → 403',
      `Status: ${nonExistentWine.status}`
    );

    // ------------------------------------------------------------------
    // TEST EVT: Event review target (server-authoritative EventBooking)
    // ------------------------------------------------------------------
    console.log('\n--- Tests EVT: Event review target ---');
    const eligibleEvents = await getEligible(jarA, '?pageSize=50');
    const eligibleEventNumbers = (eligibleEvents.json.data?.events ?? []).map(
      (e) => e.eventBookingNumber
    );
    assert(
      eligibleEvents.status === 200 &&
        eligibleEventNumbers.includes(eventBookingA.bookingNumber) &&
        !eligibleEventNumbers.includes(eventBookingFuture.bookingNumber) &&
        !eligibleEventNumbers.includes(cancelledEvtBooking.bookingNumber) &&
        !eligibleEventNumbers.includes(eventBookingOnCancelledEvent.bookingNumber),
      'Test EVT: Eligible events include concluded confirmed booking only',
      `events: ${eligibleEventNumbers.join(', ')}`
    );
    const eligibleEventsB = await getEligible(jarB, '?pageSize=50');
    const eligibleEventNumbersB = (eligibleEventsB.json.data?.events ?? []).map(
      (e) => e.eventBookingNumber
    );
    assert(
      eligibleEventsB.status === 200 &&
        eligibleEventNumbersB.includes(eventBookingB.bookingNumber) &&
        !eligibleEventNumbersB.includes(eventBookingA.bookingNumber),
      'Test EVTb: Eligible events are guest-scoped',
      `events B: ${eligibleEventNumbersB.join(', ')}`
    );

    const eventSubmit = await postReview(jarA, {
      eventBookingNumber: eventBookingA.bookingNumber,
      rating: 5,
      title: 'Phase 6.7 event review',
      comment: 'A wonderful concluded event with outstanding music and wines.',
      category: 'EVENTS',
      // Forged moderation fields must still be ignored on event path.
      status: 'APPROVED',
      guestProfileId: profileB.id,
    });
    assert(
      eventSubmit.status === 201 && !!eventSubmit.json.data?.id,
      'Test EVTc: Guest can review concluded attended event → 201',
      `Status: ${eventSubmit.status} error: ${eventSubmit.json.error ?? '-'}`
    );
    const eventReviewId = eventSubmit.json.data?.id;
    const dbEventReview = eventReviewId
      ? await prisma.review.findUnique({ where: { id: eventReviewId } })
      : null;
    assert(
      dbEventReview?.eventId === pastEvtA.evt.id &&
        dbEventReview?.guestProfileId === profileA.id &&
        dbEventReview?.status === 'PENDING' &&
        dbEventReview?.bookingId === null,
      'Test EVTd: Event review targets Event server-side, owned by Guest A, PENDING',
      `eventId: ${dbEventReview?.eventId} status: ${dbEventReview?.status} bookingId: ${dbEventReview?.bookingId}`
    );

    // Guest A cannot review Guest B's event booking → 404.
    const crossEventSubmit = await postReview(jarA, {
      eventBookingNumber: eventBookingB.bookingNumber,
      rating: 5,
      title: 'Phase 6.7 cross guest event attempt',
      comment: 'Attempting to review an event booking that belongs to Guest B.',
      category: 'EVENTS',
    });
    assert(
      crossEventSubmit.status === 404,
      'Test EVTe: Guest A cannot review Guest B\'s event booking → 404',
      `Status: ${crossEventSubmit.status}`
    );
    const crossEventCount = await prisma.review.count({
      where: { guestProfileId: profileA.id, eventId: pastEvtB.evt.id },
    });
    assert(crossEventCount === 0, 'Test EVTf: No review created for Guest B\'s event', `count: ${crossEventCount}`);

    // Future (not concluded) event → 403.
    const futureEventSubmit = await postReview(jarA, {
      eventBookingNumber: eventBookingFuture.bookingNumber,
      rating: 5,
      title: 'Phase 6.7 future event attempt',
      comment: 'Attempting to review an event that has not yet concluded.',
      category: 'EVENTS',
    });
    assert(
      futureEventSubmit.status === 403,
      'Test EVTg: Future event booking not reviewable → 403',
      `Status: ${futureEventSubmit.status}`
    );

    // Cancelled event booking → 403.
    const cancelledEventBookingSubmit = await postReview(jarA, {
      eventBookingNumber: cancelledEvtBooking.bookingNumber,
      rating: 5,
      title: 'Phase 6.7 cancelled event booking attempt',
      comment: 'Attempting to review a cancelled event booking must be rejected.',
      category: 'EVENTS',
    });
    assert(
      cancelledEventBookingSubmit.status === 403,
      'Test EVTh: Cancelled event booking not reviewable → 403',
      `Status: ${cancelledEventBookingSubmit.status}`
    );

    // Booking on a CANCELLED event → 403.
    const onCancelledEventSubmit = await postReview(jarA, {
      eventBookingNumber: eventBookingOnCancelledEvent.bookingNumber,
      rating: 5,
      title: 'Phase 6.7 cancelled event attempt',
      comment: 'Attempting to review an event that was cancelled must be rejected.',
      category: 'EVENTS',
    });
    assert(
      onCancelledEventSubmit.status === 403,
      'Test ETI: Booking on cancelled event not reviewable → 403',
      `Status: ${onCancelledEventSubmit.status}`
    );

    // Duplicate event review → 409.
    const dupEventSubmit = await postReview(jarA, {
      eventBookingNumber: eventBookingA.bookingNumber,
      rating: 4,
      title: 'Phase 6.7 duplicate event review with a different title',
      comment: 'A second review for the same concluded event must be rejected.',
      category: 'EVENTS',
    });
    assert(
      dupEventSubmit.status === 409,
      'Test EVTj: Duplicate event review → 409',
      `Status: ${dupEventSubmit.status} error: ${dupEventSubmit.json.error ?? '-'}`
    );

    // Schema: wineId on event review rejected; both/neither target rejected.
    const wineOnEvent = await postReview(jarA, {
      eventBookingNumber: eventBookingA.bookingNumber,
      wineId: wineInVisit.id,
      rating: 5,
      title: 'Phase 6.7 wine on event attempt',
      comment: 'wineId must not be accepted on event review submissions.',
      category: 'EVENTS',
    });
    assert(
      wineOnEvent.status === 400,
      'Test EVTk: wineId on event review rejected → 400',
      `Status: ${wineOnEvent.status}`
    );
    const bothTargets = await postReview(jarA, {
      bookingNumber: completed5.bookingNumber,
      eventBookingNumber: eventBookingA.bookingNumber,
      rating: 5,
      title: 'Phase 6.7 both targets attempt',
      comment: 'Providing both booking targets must be rejected by validation.',
      category: 'FOOD',
    });
    assert(
      bothTargets.status === 400,
      'Test EVTo: Both bookingNumber and eventBookingNumber rejected → 400',
      `Status: ${bothTargets.status}`
    );
    const neitherTarget = await postReview(jarA, {
      rating: 5,
      title: 'Phase 6.7 no target attempt',
      comment: 'Providing no booking target must be rejected by validation.',
      category: 'FOOD',
    });
    assert(
      neitherTarget.status === 400,
      'Test EVTm: Missing both targets rejected → 400',
      `Status: ${neitherTarget.status}`
    );

    // Event review appears in guest history with event target metadata.
    const historyWithEvent = await getReviews(jarA, '?pageSize=50');
    const eventRow = (historyWithEvent.json.data?.items ?? []).find(
      (r) => r.id === eventReviewId
    );
    assert(
      !!eventRow?.event && eventRow.event.id === pastEvtA.evt.id,
      'Test EVTp: Guest history exposes event target for event review',
      `event: ${JSON.stringify(eventRow?.event ?? null)}`
    );

    // ------------------------------------------------------------------
    // TEST ST: Guest cannot modify review status
    // ------------------------------------------------------------------
    console.log('\n--- Test ST: Status modification blocked ---');
    const patchOwn = await patchReview(jarA, r1, { status: 'APPROVED' });
    assert(
      patchOwn.status === 405 || patchOwn.status === 404,
      'Test ST: PATCH own review (status change) not allowed → 405/404',
      `Status: ${patchOwn.status}`
    );
    const stillPending = await prisma.review.findUnique({ where: { id: r1 } });
    assert(
      stillPending?.status === 'PENDING',
      'Test STb: Review remains PENDING after attempted modification',
      `status: ${stillPending?.status}`
    );
    const patchForeign = await patchReview(jarB, r1, { status: 'REJECTED' });
    assert(
      patchForeign.status === 405 || patchForeign.status === 404 || patchForeign.status === 403,
      'Test STc: Guest B cannot modify Guest A review status → 405/404/403',
      `Status: ${patchForeign.status}`
    );

    // ------------------------------------------------------------------
    // TEST ADM: Admin visibility + authorization
    // ------------------------------------------------------------------
    console.log('\n--- Tests ADM: Admin reviews visibility ---');
    const unauthAdmin = await getAdminReviews(null);
    assert(
      unauthAdmin.status === 401,
      'Test ADM: Unauthenticated Admin Reviews → 401',
      `Status: ${unauthAdmin.status}`
    );
    const guestAsAdmin = await getAdminReviews(jarA);
    assert(
      guestAsAdmin.status === 401,
      'Test ADMb: Guest session cannot access Admin Reviews → 401',
      `Status: ${guestAsAdmin.status}`
    );

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      assert(false, 'Test ADMc: Admin credentials available for login', 'INITIAL_ADMIN_EMAIL/PASSWORD missing');
    } else {
      const adminJar = new CookieJar();
      const adminLogin = await loginAdmin(adminJar);
      assert(
        adminLogin.status === 200 && adminLogin.ok,
        'Test ADMc: Admin login succeeds',
        `Status: ${adminLogin.status}`
      );

      const adminList = await getAdminReviews(adminJar, '?pageSize=50&status=PENDING');
      assert(
        adminList.status === 200 && Array.isArray(adminList.json.data?.items),
        'Test ADMd: Admin can list reviews',
        `Status: ${adminList.status} total: ${adminList.json.data?.pagination?.total}`
      );

      const items = adminList.json.data?.items ?? [];
      const adminSeesWine = items.find((r) => r.id === wineReviewId);
      assert(
        !!adminSeesWine &&
          adminSeesWine.wine?.id === wineInVisit.id &&
          adminSeesWine.status === 'PENDING' &&
          adminSeesWine.guestName === NAME_A &&
          adminSeesWine.rating === 5 &&
          adminSeesWine.category === 'WINE_TASTING' &&
          adminSeesWine.booking?.bookingNumber === completed4.bookingNumber &&
          typeof adminSeesWine.title === 'string' &&
          typeof adminSeesWine.comment === 'string' &&
          typeof adminSeesWine.createdAt === 'string',
        'Test ADMe: Admin sees wine guest review with all required fields',
        `found: ${!!adminSeesWine} wine: ${adminSeesWine?.wine?.id} booking: ${adminSeesWine?.booking?.bookingNumber}`
      );

      const adminSeesExperience = items.find((r) => r.id === r1);
      assert(
        !!adminSeesExperience &&
          adminSeesExperience.experience?.id === experience.id &&
          adminSeesExperience.booking?.bookingNumber === completed1.bookingNumber,
        'Test ADMf: Admin sees experience/booking target for visit review',
        `experience: ${adminSeesExperience?.experience?.id}`
      );

      const adminSeesEvent = items.find((r) => r.id === eventReviewId);
      assert(
        !!adminSeesEvent &&
          adminSeesEvent.event?.id === pastEvtA.evt.id &&
          adminSeesEvent.status === 'PENDING' &&
          adminSeesEvent.eventBookingNumber === eventBookingA.bookingNumber,
        'Test ADMg: Admin sees event guest review with event target',
        `event: ${adminSeesEvent?.event?.id} eventBooking: ${adminSeesEvent?.eventBookingNumber}`
      );

      // Admin list must not expose password material.
      const rawAdmin = JSON.stringify(adminList.json);
      assert(
        !rawAdmin.includes('passwordHash') && !rawAdmin.includes('password'),
        'Test ADMh: Admin reviews response contains no password fields'
      );

      // Invalid admin filters rejected.
      const badAdminStatus = await getAdminReviews(adminJar, '?status=NOT_A_STATUS');
      assert(
        badAdminStatus.status === 400,
        'Test ADI: Invalid admin status filter → 400',
        `Status: ${badAdminStatus.status}`
      );
      const badAdminPage = await getAdminReviews(adminJar, '?page=0');
      assert(
        badAdminPage.status === 400,
        'Test ADIk: Invalid admin page → 400',
        `Status: ${badAdminPage.status}`
      );
    }
  } finally {
    // ------------------------------------------------------------------
    // CLEANUP: all test data removed; legitimate winery data untouched
    // ------------------------------------------------------------------
    console.log('\n--- Cleanup ---');
    try {
      const testEmails = [EMAIL_A, EMAIL_B, EMAIL_C];
      const testProfiles = await prisma.guestProfile.findMany({
        where: { user: { email: { in: testEmails } } },
      });
      const profileIds = testProfiles.map((p) => p.id);

      await prisma.review.deleteMany({ where: { guestProfileId: { in: profileIds } } });

      // Event fixtures: bookings first (Restrict on schedule), then events (cascades schedules).
      await prisma.eventBooking.deleteMany({
        where: { bookingNumber: { startsWith: `EVT-REV-${RUN}-` } },
      });
      await prisma.event.deleteMany({
        where: { slug: { startsWith: `rev-evt-${RUN}-` } },
      });

      const bookings = await prisma.booking.findMany({
        where: { guestProfileId: { in: profileIds } },
      });
      for (const b of bookings) {
        await prisma.bookingGuest.deleteMany({ where: { bookingId: b.id } });
        await prisma.bookingItem.deleteMany({ where: { bookingId: b.id } });
        await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: b.id } });
        await prisma.tastingSession.deleteMany({ where: { bookingId: b.id } });
        await prisma.review.deleteMany({ where: { bookingId: b.id } });
        await prisma.booking.delete({ where: { id: b.id } });
      }

      // Wine/experience fixtures (ExperienceWine cascades from wine/experience).
      await prisma.wine.deleteMany({
        where: { slug: { in: [`rev-wine-in-${RUN}`, `rev-wine-out-${RUN}`, `rev-wine-b-${RUN}`] } },
      });
      await prisma.experience.deleteMany({ where: { slug: `rev-exp-b-${RUN}` } });

      await prisma.tastingRecord.deleteMany({ where: { guestProfileId: { in: profileIds } } });
      await prisma.tastingSession.deleteMany({ where: { guestProfileId: { in: profileIds } } });
      await prisma.guestWinePreference.deleteMany({ where: { guestProfileId: { in: profileIds } } });
      await prisma.guestProfile.deleteMany({ where: { id: { in: profileIds } } });
      await prisma.passwordResetToken.deleteMany({ where: { user: { email: { in: testEmails } } } });
      await prisma.user.deleteMany({ where: { email: { in: testEmails } } });

      const residualUsers = await prisma.user.count({ where: { email: { in: testEmails } } });
      const residualProfiles = await prisma.guestProfile.count({ where: { id: { in: profileIds } } });
      const residualReviews = await prisma.review.count({
        where: {
          OR: [
            { guestProfileId: { in: profileIds } },
            { bookingId: { in: fixtureBookings.map((b) => b.id) } },
            { eventId: { in: [pastEvtA.evt.id, pastEvtB.evt.id, futureEvtA.evt.id, cancelledEvent.evt.id] } },
          ],
        },
      });
      const residualBookings = await prisma.booking.count({
        where: { bookingNumber: { startsWith: `DVR-REV-${RUN}-` } },
      });
      const residualEventBookings = await prisma.eventBooking.count({
        where: { bookingNumber: { startsWith: `EVT-REV-${RUN}-` } },
      });
      const residualEvents = await prisma.event.count({
        where: { slug: { startsWith: `rev-evt-${RUN}-` } },
      });
      const residualWines = await prisma.wine.count({
        where: { slug: { in: [`rev-wine-in-${RUN}`, `rev-wine-out-${RUN}`, `rev-wine-b-${RUN}`] } },
      });
      const residualExperienceB = await prisma.experience.count({
        where: { slug: `rev-exp-b-${RUN}` },
      });
      const experienceStillPresent = await prisma.experience.count({ where: { id: experience.id } });
      const wineryStillPresent = await prisma.winery.count({ where: { id: winery.id } });

      assert(
        residualUsers === 0 &&
          residualProfiles === 0 &&
          residualReviews === 0 &&
          residualBookings === 0 &&
          residualEventBookings === 0 &&
          residualEvents === 0 &&
          residualWines === 0 &&
          residualExperienceB === 0,
        'Test CLEANUP: All test users, profiles, reviews, bookings, events, and wines removed',
        `users:${residualUsers} profiles:${residualProfiles} reviews:${residualReviews} bookings:${residualBookings} eventBookings:${residualEventBookings} events:${residualEvents} wines:${residualWines} expB:${residualExperienceB}`
      );
      assert(
        experienceStillPresent === 1 && wineryStillPresent === 1,
        'Test CLEANUPb: Legitimate winery/experience data untouched',
        `experience:${experienceStillPresent} winery:${wineryStillPresent}`
      );
    } catch (err) {
      console.error('Cleanup error:', err);
      assert(false, 'Test CLEANUP: Cleanup failed', String(err));
    }
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
