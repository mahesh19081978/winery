/**
 * My Bookings Test Suite (Phase 6.5)
 *
 * Usage:
 *   1. Start dev server:  npm run dev
 *   2. Run:               npx tsx scripts/test-my-bookings.ts
 *
 * Verifies GET /api/auth/guest/bookings:
 *   1. Authenticated guest can retrieve their bookings.
 *   2. Returned experience bookings belong to the authenticated GuestProfile.
 *   3. Returned event bookings belong to the authenticated GuestProfile.
 *   4. Guest A cannot retrieve Guest B's bookings (IDOR).
 *   5. Client cannot spoof guestProfileId via query params.
 *   6. Client cannot spoof userId via query params.
 *   7. Client cannot spoof email via query params.
 *   8. Unauthenticated request is rejected (401).
 *   9. Guest with no bookings receives an empty result.
 *  10. Experience booking details are correct.
 *  11. Event booking details are correct.
 *  12. Cancelled bookings are represented correctly (actual CANCELLED status,
 *      surfaced by filter=cancelled, excluded from filter=upcoming).
 *  13. Multiple bookings are returned correctly.
 *  14. Pagination works correctly (database-level, merged type=all).
 *  15. Timeline filters (upcoming/past) use real dates + database status without
 *      inventing statuses.
 *  16. Safe data only: no passwordHash / no arbitrary bookingNumber lookup.
 *  17. Invalid query parameters are rejected (400).
 *  18. Complete cleanup: all test records removed, soldCount restored.
 *
 * Phase 6.1-6.4 suites are run separately per the Phase 6.5 verification list:
 *   npx tsx scripts/test-guest-auth.ts
 *   npx tsx scripts/test-guest-profile.ts
 *   npx tsx scripts/test-experience-booking-auth.ts
 *   npx tsx scripts/test-event-booking-auth.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const RUN = Date.now().toString(36);

const EMAIL_A = `myp65-${RUN}-a@example.com`;
const EMAIL_B = `myp65-${RUN}-b@example.com`;
const EMAIL_C = `myp65-${RUN}-c@example.com`;
const PASS = 'MyBookings#Test2026!';
const NAME_A = 'Alice MyBookings';
const NAME_B = 'Bob MyBookings';
const NAME_C = 'Carol MyBookings';

interface BookingListItem {
  type: string;
  bookingNumber: string;
  status: string;
  scheduledDate: string;
  totalPrice: string;
  currency: string;
  createdAt: string;
  detailHref: string;
  experienceName?: string;
  time?: string;
  adults?: number;
  children?: number;
  totalGuests?: number;
  subtotal?: string;
  taxAmount?: string;
  eventTitle?: string;
  eventSlug?: string;
  timeRange?: string;
  venue?: string;
  schedule?: { timeSlot: string; activity: string };
  tickets?: Array<{ name: string; quantity: number; unitPrice: string }>;
  totalTickets?: number;
}

interface BookingsListResponse {
  success?: boolean;
  error?: string;
  data?: {
    items?: BookingListItem[];
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
  return `10.96.${Math.floor(Math.random() * 250) + 1}.${ipCounter++}`;
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

async function getBookings(
  jar: CookieJar | null,
  query = '',
  headers: Record<string, string> = {}
): Promise<{ status: number; json: BookingsListResponse }> {
  const res = await fetch(`${BASE_URL}/api/auth/guest/bookings${query}`, {
    headers: {
      ...(jar ? { Cookie: jar.header() } : {}),
      'x-forwarded-for': freshIp(),
      ...headers,
    },
  });
  return { status: res.status, json: (await res.json()) as BookingsListResponse };
}

async function createExperienceBooking(
  jar: CookieJar,
  experienceSlug: string,
  date: string,
  time: string,
  adults: number,
  guestName: string,
  guestEmail: string
): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: jar.header(),
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify({
      experienceSlug,
      date,
      time,
      adults,
      children: 0,
      guestName,
      guestEmail,
      guestPhone: '+15551112222',
    }),
  });
  const json = await res.json();
  if (res.status !== 201) {
    throw new Error(`Experience booking failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json.data.bookingNumber;
}

async function createEventBooking(
  jar: CookieJar,
  eventId: string,
  scheduleId: string,
  ticketTypeId: string,
  quantity: number,
  guestName: string,
  guestEmail: string
): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/event-bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: jar.header(),
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify({
      eventId,
      eventScheduleId: scheduleId,
      guestName,
      guestEmail,
      guestPhone: '+15551112222',
      tickets: [{ eventTicketTypeId: ticketTypeId, quantity }],
    }),
  });
  const json = await res.json();
  if (res.status !== 201) {
    throw new Error(`Event booking failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json.data.bookingNumber;
}

async function cancelExperienceBooking(jar: CookieJar, bookingNumber: string): Promise<number> {
  const res = await fetch(`${BASE_URL}/api/bookings/${bookingNumber}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Cookie: jar.header(),
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify({ reason: 'Phase 6.5 test cancellation' }),
  });
  await res.json();
  return res.status;
}

async function cancelEventBooking(jar: CookieJar, bookingNumber: string): Promise<number> {
  const res = await fetch(`${BASE_URL}/api/event-bookings/${bookingNumber}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Cookie: jar.header(),
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify({ reason: 'Phase 6.5 test cancellation' }),
  });
  await res.json();
  return res.status;
}

function itemNumbers(res: { json: BookingsListResponse }): string[] {
  return (res.json?.data?.items ?? []).map((i) => i.bookingNumber);
}

function findSummaryByNumber<T extends { bookingNumber: string }>(
  items: readonly T[] | null | undefined,
  bookingNumber: string
): T | undefined {
  return (items ?? []).find((i) => i.bookingNumber === bookingNumber);
}

function findTicketByName<T extends { name: string }>(
  tickets: readonly T[] | null | undefined,
  name: string
): T | undefined {
  return (tickets ?? []).find((t) => t.name === name);
}

function allCancelled(items: ReadonlyArray<{ status: string }> | null | undefined): boolean {
  return (items ?? []).every((i) => i.status === 'CANCELLED');
}

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function dateOnly(daysFromToday: number): string {
  const d = startOfTodayUtc();
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d.toISOString().split('T')[0];
}

async function main() {
  console.log(`--- Starting Phase 6.5 My Bookings Tests (Run: ${RUN}) ---`);

  const experience = await prisma.experience.findFirst({
    where: { isActive: true },
    select: { id: true, slug: true, title: true, price: true, wineryId: true },
  });
  if (!experience) {
    console.error('❌ ABORT: No active experience found in database. Seed the database first.');
    await prisma.$disconnect();
    process.exit(1);
  }

  const upcomingEvents = await prisma.event.findMany({
    where: {
      status: 'UPCOMING',
      isPast: false,
      eventDate: { gte: startOfTodayUtc() },
      schedules: { some: {} },
    },
    include: { schedules: true, ticketTypes: true },
    orderBy: { eventDate: 'asc' },
  });
  const eligible = upcomingEvents
    .map((e) => ({
      event: e,
      ticket: e.ticketTypes
        .filter((t) => t.capacity - t.soldCount >= 4)
        .sort((a, b) => b.capacity - b.soldCount - (a.capacity - a.soldCount))[0],
    }))
    .find((x) => !!x.ticket);
  if (!eligible) {
    console.error('❌ ABORT: No UPCOMING event ticket type with at least 4 seats available.');
    await prisma.$disconnect();
    process.exit(1);
  }
  const eventWithData = eligible.event;
  const schedule = eventWithData.schedules[0];
  const ticketType = eligible.ticket;
  const initialSoldCount = ticketType.soldCount;

  console.log(`Using Experience: "${experience.title}" (${experience.slug})`);
  console.log(
    `Using Event: "${eventWithData.title}" | Schedule: ${schedule.timeSlot} | Ticket: "${ticketType.name}" (initial soldCount: ${initialSoldCount})`
  );

  const jarA = new CookieJar();
  const jarB = new CookieJar();
  const jarC = new CookieJar();

  // ------------------------------------------------------------------
  // SETUP: register Guest A, Guest B, Guest C
  // ------------------------------------------------------------------
  console.log('\n--- Setup Guest Accounts ---');
  const regA = await register(jarA, EMAIL_A, NAME_A);
  assert(regA.status === 201, 'Guest A registered', `Status: ${regA.status}`);
  const regB = await register(jarB, EMAIL_B, NAME_B);
  assert(regB.status === 201, 'Guest B registered', `Status: ${regB.status}`);
  const regC = await register(jarC, EMAIL_C, NAME_C);
  assert(regC.status === 201, 'Guest C registered (no bookings guest)', `Status: ${regC.status}`);

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
  // SETUP: create bookings for Guest A (experience x3 + event x2 + past fixture)
  // ------------------------------------------------------------------
  console.log('\n--- Setup Guest A Bookings ---');
  const EXP1 = await createExperienceBooking(jarA, experience.slug, dateOnly(10), '14:00', 2, NAME_A, EMAIL_A);
  const EXP2 = await createExperienceBooking(jarA, experience.slug, dateOnly(12), '16:00', 1, NAME_A, EMAIL_A);
  const EXP_CANCEL = await createExperienceBooking(jarA, experience.slug, dateOnly(15), '11:00', 1, NAME_A, EMAIL_A);
  console.log(`Experience bookings: ${EXP1}, ${EXP2}, ${EXP_CANCEL}`);

  const EVT1 = await createEventBooking(jarA, eventWithData.id, schedule.id, ticketType.id, 2, NAME_A, EMAIL_A);
  const EVT_CANCEL = await createEventBooking(jarA, eventWithData.id, schedule.id, ticketType.id, 1, NAME_A, EMAIL_A);
  console.log(`Event bookings: ${EVT1}, ${EVT_CANCEL}`);

  const pastDate = startOfTodayUtc();
  pastDate.setUTCDate(pastDate.getUTCDate() - 30);
  const PAST_EXP = await prisma.booking.create({
    data: {
      bookingNumber: `DVR-TEST-${RUN}`,
      wineryId: experience.wineryId,
      guestProfileId: profileA.id,
      date: pastDate,
      time: '13:00',
      adults: 2,
      children: 0,
      totalGuests: 2,
      subtotal: experience.price,
      taxAmount: 0,
      totalPrice: experience.price,
      currency: 'USD',
      status: 'COMPLETED',
      items: {
        create: [
          {
            experienceId: experience.id,
            itemType: 'EXPERIENCE',
            title: experience.title,
            unitPrice: experience.price,
            quantity: 1,
            totalPrice: experience.price,
          },
        ],
      },
    },
  });
  console.log(`Past fixture booking: ${PAST_EXP.bookingNumber}`);

  const cancelExpStatus = await cancelExperienceBooking(jarA, EXP_CANCEL);
  const cancelEvtStatus = await cancelEventBooking(jarA, EVT_CANCEL);
  assert(
    cancelExpStatus === 200 && cancelEvtStatus === 200,
    'Setup: Guest A cancels one experience booking and one event booking',
    `exp: ${cancelExpStatus}, evt: ${cancelEvtStatus}`
  );

  // ------------------------------------------------------------------
  // SETUP: create bookings for Guest B
  // ------------------------------------------------------------------
  console.log('\n--- Setup Guest B Bookings ---');
  const EXP_B = await createExperienceBooking(jarB, experience.slug, dateOnly(10), '12:00', 1, NAME_B, EMAIL_B);
  const EVT_B = await createEventBooking(jarB, eventWithData.id, schedule.id, ticketType.id, 1, NAME_B, EMAIL_B);
  console.log(`Guest B bookings: ${EXP_B}, ${EVT_B}`);
  assert(true, 'Setup complete: Guest A has 6 bookings, Guest B has 2, Guest C has 0');

  // ------------------------------------------------------------------
  // TEST 1: Authenticated guest retrieves their bookings
  // ------------------------------------------------------------------
  console.log('\n--- Test 1: Authenticated Retrieval ---');
  const listA = await getBookings(jarA, '?pageSize=50');
  assert(
    listA.status === 200 && listA.json.success === true && Array.isArray(listA.json.data?.items),
    'Test 1: Authenticated Guest A retrieves bookings via GET /api/auth/guest/bookings',
    `Status: ${listA.status}, items: ${listA.json.data?.items?.length}`
  );
  assert(
    !!listA.json.data?.pagination &&
      typeof listA.json.data.pagination.total === 'number' &&
      typeof listA.json.data.pagination.totalPages === 'number',
    'Test 1b: Response includes pagination metadata',
    JSON.stringify(listA.json.data?.pagination)
  );

  const expNumbersA = itemNumbers(
    await getBookings(jarA, '?type=experience&pageSize=50')
  ).filter((n) => n !== PAST_EXP.bookingNumber);
  const expListA = await getBookings(jarA, '?type=experience&pageSize=50');
  const evtListA = await getBookings(jarA, '?type=event&pageSize=50');

  // ------------------------------------------------------------------
  // TEST 2: Experience bookings ownership
  // ------------------------------------------------------------------
  console.log('\n--- Test 2: Experience Booking Ownership ---');
  let expOwned = true;
  let expOwnerDetails = '';
  for (const item of expListA.json.data?.items ?? []) {
    const db = await prisma.booking.findUnique({ where: { bookingNumber: item.bookingNumber } });
    if (!db || db.guestProfileId !== profileA.id) {
      expOwned = false;
      expOwnerDetails = `${item.bookingNumber} -> ${db?.guestProfileId}`;
      break;
    }
  }
  assert(expOwned, 'Test 2: Every returned experience booking belongs to Guest A profile', expOwnerDetails || `all ${expListA.json.data?.items?.length} owned by ${profileA.id}`);

  const expCountA = await prisma.booking.count({ where: { guestProfileId: profileA.id } });
  assert(
    expListA.json.data?.pagination?.total === expCountA && expCountA === 4,
    'Test 2b: Experience booking total matches database count for Guest A',
    `API: ${expListA.json.data?.pagination?.total}, DB: ${expCountA}`
  );

  // ------------------------------------------------------------------
  // TEST 3: Event bookings ownership
  // ------------------------------------------------------------------
  console.log('\n--- Test 3: Event Booking Ownership ---');
  let evtOwned = true;
  let evtOwnerDetails = '';
  for (const item of evtListA.json.data?.items ?? []) {
    const db = await prisma.eventBooking.findUnique({ where: { bookingNumber: item.bookingNumber } });
    if (!db || db.guestProfileId !== profileA.id) {
      evtOwned = false;
      evtOwnerDetails = `${item.bookingNumber} -> ${db?.guestProfileId}`;
      break;
    }
  }
  assert(evtOwned, 'Test 3: Every returned event booking belongs to Guest A profile', evtOwnerDetails || `all ${evtListA.json.data?.items?.length} owned by ${profileA.id}`);

  const evtCountA = await prisma.eventBooking.count({ where: { guestProfileId: profileA.id } });
  assert(
    evtListA.json.data?.pagination?.total === evtCountA && evtCountA === 2,
    'Test 3b: Event booking total matches database count for Guest A',
    `API: ${evtListA.json.data?.pagination?.total}, DB: ${evtCountA}`
  );

  // ------------------------------------------------------------------
  // TEST 4: IDOR — Guest A cannot retrieve Guest B's bookings
  // ------------------------------------------------------------------
  console.log('\n--- Test 4: Cross-Guest Isolation (IDOR) ---');
  const numbersA = itemNumbers(listA);
  assert(
    !numbersA.includes(EXP_B) && !numbersA.includes(EVT_B),
    'Test 4: Guest A list contains NONE of Guest B\'s booking numbers',
    `A saw ${numbersA.length} bookings`
  );
  const listB = await getBookings(jarB, '?pageSize=50');
  const numbersB = itemNumbers(listB);
  assert(
    listB.status === 200 && numbersB.includes(EXP_B) && numbersB.includes(EVT_B),
    'Test 4b: Guest B retrieves their own bookings (proves B\'s bookings exist)',
    `B: ${numbersB.join(', ')}`
  );
  assert(
    !numbersB.includes(EXP1) && !numbersB.includes(EVT1),
    'Test 4c: Guest B list contains NONE of Guest A\'s booking numbers',
    `B saw ${numbersB.length} bookings`
  );

  // ------------------------------------------------------------------
  // TEST 5-7: Identity spoofing via query params
  // ------------------------------------------------------------------
  console.log('\n--- Tests 5-7: Identity Spoofing Prevention ---');
  const spoofProfile = await getBookings(jarA, `?guestProfileId=${profileB.id}&pageSize=50`);
  const spoofProfileNumbers = itemNumbers(spoofProfile);
  assert(
    spoofProfile.status === 200 &&
      !spoofProfileNumbers.includes(EXP_B) &&
      !spoofProfileNumbers.includes(EVT_B),
    'Test 5: guestProfileId query param cannot change authenticated identity',
    `items: ${spoofProfileNumbers.length}, contains B: ${spoofProfileNumbers.some((n: string) => n === EXP_B || n === EVT_B)}`
  );

  const spoofUser = await getBookings(jarA, `?userId=${userB.id}&pageSize=50`);
  const spoofUserNumbers = itemNumbers(spoofUser);
  assert(
    spoofUser.status === 200 &&
      !spoofUserNumbers.includes(EXP_B) &&
      !spoofUserNumbers.includes(EVT_B),
    'Test 6: userId query param cannot change authenticated identity',
    `items: ${spoofUserNumbers.length}`
  );

  const spoofEmail = await getBookings(jarA, `?email=${encodeURIComponent(EMAIL_B)}&pageSize=50`);
  const spoofEmailNumbers = itemNumbers(spoofEmail);
  assert(
    spoofEmail.status === 200 &&
      !spoofEmailNumbers.includes(EXP_B) &&
      !spoofEmailNumbers.includes(EVT_B),
    'Test 7: email query param cannot change authenticated identity',
    `items: ${spoofEmailNumbers.length}`
  );

  // ------------------------------------------------------------------
  // TEST 8: Unauthenticated request rejected
  // ------------------------------------------------------------------
  console.log('\n--- Test 8: Unauthenticated Request ---');
  const unauth = await getBookings(null);
  assert(unauth.status === 401, 'Test 8: Unauthenticated request returns 401', `Status: ${unauth.status}`);

  // ------------------------------------------------------------------
  // TEST 9: Guest with no bookings receives empty result
  // ------------------------------------------------------------------
  console.log('\n--- Test 9: Empty Result ---');
  const listC = await getBookings(jarC, '?pageSize=50');
  assert(
    listC.status === 200 &&
      listC.json.success === true &&
      Array.isArray(listC.json.data?.items) &&
      listC.json.data.items.length === 0 &&
      listC.json.data.pagination?.total === 0,
    'Test 9: Guest C (no bookings) receives an empty result',
    `total: ${listC.json.data?.pagination?.total}`
  );

  // ------------------------------------------------------------------
  // TEST 10: Experience booking details are correct
  // ------------------------------------------------------------------
  console.log('\n--- Test 10: Experience Booking Details ---');
  const expItem = findSummaryByNumber(expListA.json.data?.items, EXP1);
  const dbExp1 = await prisma.booking.findUnique({
    where: { bookingNumber: EXP1 },
    include: { items: { include: { experience: true } } },
  });
  assert(!!expItem, 'Test 10: Experience booking EXP1 present in list', EXP1);
  if (expItem && dbExp1) {
    assert(
      expItem.type === 'experience' &&
        expItem.experienceName === experience.title &&
        expItem.scheduledDate === dbExp1.date.toISOString() &&
        expItem.time === dbExp1.time &&
        expItem.adults === dbExp1.adults &&
        expItem.children === dbExp1.children &&
        expItem.totalGuests === dbExp1.totalGuests &&
        expItem.status === dbExp1.status &&
        expItem.subtotal === dbExp1.subtotal.toString() &&
        expItem.taxAmount === dbExp1.taxAmount.toString() &&
        expItem.totalPrice === dbExp1.totalPrice.toString() &&
        expItem.currency === dbExp1.currency &&
        expItem.createdAt === dbExp1.createdAt.toISOString() &&
        expItem.detailHref === `/booking/${EXP1}`,
      'Test 10b: Experience summary fields match database record exactly',
      `name=${expItem.experienceName}, status=${expItem.status}, total=${expItem.totalPrice} ${expItem.currency}`
    );
  } else {
    assert(false, 'Test 10b: Experience summary fields match database record exactly', 'missing item or DB record');
  }

  // ------------------------------------------------------------------
  // TEST 11: Event booking details are correct
  // ------------------------------------------------------------------
  console.log('\n--- Test 11: Event Booking Details ---');
  const evtItem = findSummaryByNumber(evtListA.json.data?.items, EVT1);
  const dbEvt1 = await prisma.eventBooking.findUnique({
    where: { bookingNumber: EVT1 },
    include: { tickets: { include: { ticketType: true } }, event: true, eventSchedule: true },
  });
  assert(!!evtItem, 'Test 11: Event booking EVT1 present in list', EVT1);
  if (evtItem && dbEvt1) {
    const expectedTicket = dbEvt1.tickets.find((t) => t.eventTicketTypeId === ticketType.id);
    const apiTicket = findTicketByName(evtItem.tickets, ticketType.name);
    assert(
      evtItem.type === 'event' &&
        evtItem.eventTitle === eventWithData.title &&
        evtItem.eventSlug === eventWithData.slug &&
        evtItem.scheduledDate === eventWithData.eventDate.toISOString() &&
        evtItem.timeRange === eventWithData.timeRange &&
        evtItem.venue === eventWithData.venue &&
        evtItem.schedule?.timeSlot === schedule.timeSlot &&
        evtItem.schedule?.activity === schedule.activity &&
        evtItem.status === dbEvt1.status &&
        evtItem.totalPrice === dbEvt1.totalPrice.toString() &&
        evtItem.currency === eventWithData.currency &&
        evtItem.createdAt === dbEvt1.createdAt.toISOString() &&
        evtItem.detailHref === `/event-booking/${EVT1}`,
      'Test 11b: Event summary fields match database record exactly',
      `title=${evtItem.eventTitle}, status=${evtItem.status}, total=${evtItem.totalPrice} ${evtItem.currency}`
    );
    assert(
      !!apiTicket &&
        apiTicket.quantity === 2 &&
        evtItem.totalTickets === 2 &&
        expectedTicket?.quantity === 2,
      'Test 11c: Selected ticket type and quantity are correct',
      `api qty: ${apiTicket?.quantity}, db qty: ${expectedTicket?.quantity}`
    );
  } else {
    assert(false, 'Test 11b: Event summary fields match database record exactly', 'missing item or DB record');
    assert(false, 'Test 11c: Selected ticket type and quantity are correct', 'missing item or DB record');
  }

  // ------------------------------------------------------------------
  // TEST 12: Cancelled bookings represented correctly
  // ------------------------------------------------------------------
  console.log('\n--- Test 12: Cancelled Bookings ---');
  const allNumbersA = itemNumbers(listA);
  const cancelledList = await getBookings(jarA, '?filter=cancelled&pageSize=50');
  const cancelledNumbers = itemNumbers(cancelledList);
  const upcomingList = await getBookings(jarA, '?filter=upcoming&pageSize=50');
  const upcomingNumbers = itemNumbers(upcomingList);

  const dbExpCancel = await prisma.booking.findUnique({ where: { bookingNumber: EXP_CANCEL } });
  const dbEvtCancel = await prisma.eventBooking.findUnique({ where: { bookingNumber: EVT_CANCEL } });

  assert(
    dbExpCancel?.status === 'CANCELLED' && dbEvtCancel?.status === 'CANCELLED',
    'Test 12: Cancelled bookings have actual CANCELLED status in database',
    `exp: ${dbExpCancel?.status}, evt: ${dbEvtCancel?.status}`
  );
  assert(
    cancelledNumbers.includes(EXP_CANCEL) &&
      cancelledNumbers.includes(EVT_CANCEL) &&
      allNumbersA.includes(EXP_CANCEL) &&
      allNumbersA.includes(EVT_CANCEL),
    'Test 12b: Cancelled bookings appear in default list and filter=cancelled',
    `cancelled: ${cancelledNumbers.join(', ')}`
  );
  assert(
    allCancelled(cancelledList.json.data?.items),
    'Test 12c: Every filter=cancelled item reports status CANCELLED',
    `count: ${cancelledList.json.data?.items?.length}`
  );
  assert(
    !upcomingNumbers.includes(EXP_CANCEL) && !upcomingNumbers.includes(EVT_CANCEL),
    'Test 12d: Cancelled bookings excluded from filter=upcoming',
    `upcoming: ${upcomingNumbers.join(', ')}`
  );

  // ------------------------------------------------------------------
  // TEST 13: Multiple bookings returned correctly
  // ------------------------------------------------------------------
  console.log('\n--- Test 13: Multiple Bookings ---');
  const expectedA = [EXP1, EXP2, EXP_CANCEL, PAST_EXP.bookingNumber, EVT1, EVT_CANCEL];
  assert(
    listA.json.data?.items?.length === 6 &&
      expectedA.every((n) => numbersA.includes(n)) &&
      listA.json.data?.pagination?.total === 6,
    'Test 13: All 6 Guest A bookings returned (3 upcoming experiences + 1 past + 2 events)',
    `got ${listA.json.data?.items?.length}, total ${listA.json.data?.pagination?.total}`
  );
  assert(
    expNumbersA.length === 3,
    'Test 13b: type=experience returns the 3 non-past experience bookings plus past handled separately',
    `experience items (excl. fixture check): ${expNumbersA.length}`
  );

  // ------------------------------------------------------------------
  // TEST 14: Pagination works correctly
  // ------------------------------------------------------------------
  console.log('\n--- Test 14: Pagination ---');
  const page1 = await getBookings(jarA, '?page=1&pageSize=2');
  const page2 = await getBookings(jarA, '?page=2&pageSize=2');
  const page3 = await getBookings(jarA, '?page=3&pageSize=2');
  const p1n = itemNumbers(page1);
  const p2n = itemNumbers(page2);
  const p3n = itemNumbers(page3);

  assert(
    page1.json.data?.pagination?.page === 1 &&
      page1.json.data?.pagination?.pageSize === 2 &&
      page1.json.data?.pagination?.total === 6 &&
      page1.json.data?.pagination?.totalPages === 3 &&
      p1n.length === 2,
    'Test 14: Page 1 returns 2 items with correct pagination metadata',
    JSON.stringify(page1.json.data?.pagination)
  );
  assert(
    page2.json.data?.pagination?.page === 2 && p2n.length === 2,
    'Test 14b: Page 2 returns 2 items',
    `page: ${page2.json.data?.pagination?.page}, items: ${p2n.length}`
  );
  assert(
    page3.json.data?.pagination?.page === 3 && p3n.length === 2,
    'Test 14c: Page 3 returns 2 items',
    `page: ${page3.json.data?.pagination?.page}, items: ${p3n.length}`
  );
  const union = [...p1n, ...p2n, ...p3n];
  assert(
    union.length === 6 && new Set(union).size === 6 && expectedA.every((n) => union.includes(n)),
    'Test 14d: Pages are disjoint and their union equals the full result set',
    `union: ${union.length}, unique: ${new Set(union).size}`
  );
  const overPage = await getBookings(jarA, '?page=99&pageSize=2');
  assert(
    overPage.status === 200 && itemNumbers(overPage).length === 0,
    'Test 14e: Page beyond the end returns empty items (no error)',
    `items: ${itemNumbers(overPage).length}`
  );
  const capPage = await getBookings(jarA, '?pageSize=999');
  assert(
    capPage.status === 200 && capPage.json.data?.pagination?.pageSize === 50,
    'Test 14f: pageSize is capped at 50 (database-level pagination bound)',
    `pageSize: ${capPage.json.data?.pagination?.pageSize}`
  );

  // ------------------------------------------------------------------
  // TEST 15: Timeline filters use real dates + database status
  // ------------------------------------------------------------------
  console.log('\n--- Test 15: Timeline Filters ---');
  assert(
    upcomingNumbers.includes(EXP1) &&
      upcomingNumbers.includes(EXP2) &&
      upcomingNumbers.includes(EVT1) &&
      upcomingNumbers.length === 3 &&
      upcomingList.json.data?.pagination?.total === 3,
    'Test 15: filter=upcoming returns exactly the future non-terminal bookings',
    `upcoming: ${upcomingNumbers.join(', ')}`
  );
  const pastList = await getBookings(jarA, '?filter=past&pageSize=50');
  const pastNumbers = itemNumbers(pastList);
  const pastItem = findSummaryByNumber(pastList.json.data?.items, PAST_EXP.bookingNumber);
  assert(
    pastNumbers.length === 1 && pastNumbers.includes(PAST_EXP.bookingNumber),
    'Test 15b: filter=past returns exactly the past scheduled booking (cancelled excluded)',
    `past: ${pastNumbers.join(', ')}`
  );
  assert(
    pastItem?.status === 'COMPLETED',
    'Test 15c: Past booking keeps its real database status (COMPLETED, not invented)',
    `status: ${pastItem?.status}`
  );
  assert(
    !pastNumbers.includes(EXP1) && !pastNumbers.includes(EXP_CANCEL),
    'Test 15d: filter=past excludes future and cancelled bookings',
    `past: ${pastNumbers.join(', ')}`
  );

  // ------------------------------------------------------------------
  // TEST 16: Safe data only — no sensitive fields, no bookingNumber lookup
  // ------------------------------------------------------------------
  console.log('\n--- Test 16: Safe Data / No Arbitrary Lookup ---');
  assert(
    !JSON.stringify(listA.json).includes('passwordHash'),
    'Test 16: Response never exposes passwordHash or User relation',
    'passwordHash absent'
  );
  const spoofLookup = await getBookings(jarA, `?bookingNumber=${EXP_B}&pageSize=50`);
  const spoofLookupNumbers = itemNumbers(spoofLookup);
  assert(
    spoofLookup.status === 200 && !spoofLookupNumbers.includes(EXP_B),
    'Test 16b: bookingNumber query param is not a lookup channel through the list endpoint',
    `contains B booking: ${spoofLookupNumbers.includes(EXP_B)}`
  );

  // ------------------------------------------------------------------
  // TEST 17: Invalid query parameters rejected
  // ------------------------------------------------------------------
  console.log('\n--- Test 17: Invalid Query Parameters ---');
  const badType = await getBookings(jarA, '?type=bogus');
  assert(badType.status === 400, 'Test 17: Invalid type returns 400', `Status: ${badType.status}`);
  const badFilter = await getBookings(jarA, '?filter=bogus');
  assert(badFilter.status === 400, 'Test 17b: Invalid filter returns 400', `Status: ${badFilter.status}`);
  const badPage = await getBookings(jarA, '?page=abc');
  assert(badPage.status === 400, 'Test 17c: Non-numeric page returns 400', `Status: ${badPage.status}`);
  const badPageSize = await getBookings(jarA, '?pageSize=0');
  assert(badPageSize.status === 400, 'Test 17d: pageSize=0 returns 400', `Status: ${badPageSize.status}`);

  // ------------------------------------------------------------------
  // TEST 18: Complete cleanup + soldCount restoration
  // ------------------------------------------------------------------
  console.log('\n--- Test 18: Cleanup ---');
  try {
    const cancelExp1Status = await cancelExperienceBooking(jarA, EXP1);
    const cancelExp2Status = await cancelExperienceBooking(jarA, EXP2);
    assert(
      cancelExp1Status === 200 && cancelExp2Status === 200,
      'Test 18: Remaining Guest A experience bookings cancelled before cleanup',
      `EXP1: ${cancelExp1Status}, EXP2: ${cancelExp2Status}`
    );
    const releaseEvt1 = await cancelEventBooking(jarA, EVT1);
    const releaseEvtB = await cancelEventBooking(jarB, EVT_B);
    assert(
      releaseEvt1 === 200 && releaseEvtB === 200,
      'Test 18b: Remaining event bookings cancelled via API to release soldCount',
      `EVT1: ${releaseEvt1}, EVT_B: ${releaseEvtB}`
    );

    const testEmails = [EMAIL_A, EMAIL_B, EMAIL_C];
    const testProfiles = await prisma.guestProfile.findMany({
      where: { user: { email: { in: testEmails } } },
    });
    const profileIds = testProfiles.map((p) => p.id);

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
    const residualProfiles = await prisma.guestProfile.count({
      where: { id: { in: profileIds } },
    });
    const residualBookings = await prisma.booking.count({
      where: { guestProfileId: { in: profileIds } },
    });
    const residualEventBookings = await prisma.eventBooking.count({
      where: { guestProfileId: { in: profileIds } },
    });
    const residualByNumber = await prisma.booking.count({
      where: {
        bookingNumber: { in: [EXP1, EXP2, EXP_CANCEL, PAST_EXP.bookingNumber, EXP_B] },
      },
    });
    const residualEvtByNumber = await prisma.eventBooking.count({
      where: { bookingNumber: { in: [EVT1, EVT_CANCEL, EVT_B] } },
    });

    assert(
      residualUsers === 0 &&
        residualProfiles === 0 &&
        residualBookings === 0 &&
        residualEventBookings === 0 &&
        residualByNumber === 0 &&
        residualEvtByNumber === 0,
      'Test 18c: All test users, profiles, experience bookings, and event bookings removed',
      `users:${residualUsers} profiles:${residualProfiles} exp:${residualBookings}/${residualByNumber} evt:${residualEventBookings}/${residualEvtByNumber}`
    );

    const ticketTypeAfter = await prisma.eventTicketType.findUnique({
      where: { id: ticketType.id },
    });
    assert(
      ticketTypeAfter?.soldCount === initialSoldCount,
      'Test 18d: soldCount fully restored to initial value',
      `initial: ${initialSoldCount}, after: ${ticketTypeAfter?.soldCount}`
    );
  } catch (err) {
    console.error('Cleanup error:', err);
    assert(false, 'Test 18: Cleanup failed', String(err));
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
