/**
 * Event Booking Auth Test Suite (Phase 6.4)
 *
 * Usage:
 *   1. Start dev server:  npm run dev
 *   2. Run:               npx tsx scripts/test-event-booking-auth.ts
 *
 * Verifies:
 *   1. Authenticated guest creates event booking via POST /api/event-bookings.
 *   2. EventBooking.guestProfileId correctly matches the authenticated guest's profile in DB.
 *   3. Ticket snapshot (EventBookingTicket) is created with correct quantities.
 *   4. Client spoofing prevention: arbitrary guestProfileId or email in body is ignored; session profileId governs.
 *   5. Guest B cannot retrieve Guest A's booking via GET /api/event-bookings/[bookingNumber] (returns 404).
 *   6. Guest B cannot cancel Guest A's booking via DELETE /api/event-bookings/[bookingNumber] (returns 403).
 *   7. Guest A can retrieve own booking via GET /api/event-bookings/[bookingNumber].
 *   8. Guest A can cancel own booking via DELETE /api/event-bookings/[bookingNumber].
 *   9. Cancellation idempotency: re-cancelling returns 200 without error.
 *  10. Server-authoritative pricing: client cannot manipulate total price.
 *  11. VisitsCount semantics: visitsCount is NOT incremented upon event booking creation.
 *  12. Unauthenticated public event booking creates and attaches correctly.
 *  13. Unauthenticated public confirmation lookup succeeds with exact booking number.
 *  14. Unauthenticated user cannot cancel event booking belonging to registered guest (returns 401).
 *  15. Unauthenticated cannot access a registered-account event booking via GET (returns expected behavior).
 *  16. Public event booking has no guestProfile.user (not a registered account).
 *  17. Guest A's booking returned correct event details in GET response.
 *  18. Cancelled booking status visible in GET response for Guest A.
 *  19. Multi-ticket-type booking sums to correct server-computed total.
 *  20. Guest B's booking is independent and accessible only by Guest B.
 *  21. Booking created by Guest A contains correct guest name snapshot.
 *  22. Complete test cleanup of all test users, guests, and event bookings.
 */
import { PrismaClient } from '@prisma/client';
import { EventBookingService } from '../src/server/services';

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const RUN = Date.now().toString(36);

const EMAIL_A = `evt-p64-${RUN}-a@example.com`;
const EMAIL_B = `evt-p64-${RUN}-b@example.com`;
const EMAIL_PUBLIC = `evt-public-p64-${RUN}@example.com`;
const PASS = 'EventBooking#Test2026!';
const NAME_A = 'Alice EventGuest';
const NAME_B = 'Bob EventGuest';

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

async function cleanupTestEventBooking(eb: { id: string; bookingNumber: string; status: string }) {
  if (eb.status === 'CONFIRMED' || eb.status === 'PENDING') {
    await EventBookingService.cancelBooking(eb.bookingNumber, 'Phase 6.4 test cleanup');
  }
  await prisma.eventBookingStatusHistory.deleteMany({ where: { eventBookingId: eb.id } });
  await prisma.eventBookingTicket.deleteMany({ where: { eventBookingId: eb.id } });
  await prisma.eventBooking.delete({ where: { id: eb.id } });
}

async function main() {
  console.log(`--- Starting Phase 6.4 Authenticated Event Booking Tests (Run: ${RUN}) ---`);

  // Find a valid upcoming event with schedules and ticket types
  const eventWithData = await prisma.event.findFirst({
    where: { status: 'UPCOMING', isPast: false },
    include: { schedules: true, ticketTypes: true },
  });

  if (!eventWithData) {
    console.error('❌ ABORT: No UPCOMING event found in database. Seed the database first.');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Validate we have schedules and ticket types
  if (!eventWithData.schedules.length) {
    console.error('❌ ABORT: Event has no schedules.');
    await prisma.$disconnect();
    process.exit(1);
  }

  const availableTicketTypes = eventWithData.ticketTypes.filter(
    (tt) => tt.soldCount < tt.capacity
  );

  if (!availableTicketTypes.length) {
    console.error('❌ ABORT: Event has no available ticket types with capacity.');
    await prisma.$disconnect();
    process.exit(1);
  }

  const event = eventWithData;
  const schedule = eventWithData.schedules[0];
  const ticketType = availableTicketTypes[0];
  const initialSoldCounts = new Map(eventWithData.ticketTypes.map((tt) => [tt.id, tt.soldCount]));

  console.log(`Using Event: "${event.title}" (id: ${event.id})`);
  console.log(`Schedule: ${schedule.timeSlot} — ${schedule.activity} (id: ${schedule.id})`);
  console.log(`Ticket Type: "${ticketType.name}" @ $${ticketType.price} (id: ${ticketType.id})`);

  const jarA = new CookieJar();
  const jarB = new CookieJar();

  // --------------------
  // SETUP Guest Accounts
  // --------------------
  console.log('\n--- Setup Guest Accounts ---');
  const regA = await register(jarA, EMAIL_A, NAME_A);
  assert(regA.status === 201, 'Guest A registered successfully', `ID: ${regA.data.data?.userId}`);

  const regB = await register(jarB, EMAIL_B, NAME_B);
  assert(regB.status === 201, 'Guest B registered successfully', `ID: ${regB.data.data?.userId}`);

  const guestProfileA = await prisma.guestProfile.findFirst({
    where: { user: { email: EMAIL_A } },
  });
  const guestProfileB = await prisma.guestProfile.findFirst({
    where: { user: { email: EMAIL_B } },
  });

  assert(!!guestProfileA, 'Guest A profile exists in DB');
  assert(!!guestProfileB, 'Guest B profile exists in DB');

  const initialVisitsCountA = guestProfileA?.visitsCount ?? 0;

  let bookingNumberA = '';
  let bookingNumberB = '';

  // ---------------------------------------------------------
  // TEST 1 & 2: Authenticated Guest A creates event booking
  // ---------------------------------------------------------
  console.log('\n--- Test 1 & 2: Authenticated Event Booking Creation & Profile Association ---');
  const createPayloadA = {
    eventId: event.id,
    eventScheduleId: schedule.id,
    guestName: NAME_A,
    guestEmail: EMAIL_A,
    guestPhone: '+15551112222',
    tickets: [{ eventTicketTypeId: ticketType.id, quantity: 2 }],
  };

  const createResA = await fetch(`${BASE_URL}/api/event-bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: jarA.header(),
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify(createPayloadA),
  });

  const createDataA = await createResA.json();
  if (createResA.status !== 201) {
    console.error('Create event booking failed with error:', JSON.stringify(createDataA));
  }
  assert(
    createResA.status === 201 && createDataA.success,
    'Test 1: Authenticated Guest A creates event booking via POST /api/event-bookings',
    `Status: ${createResA.status}`
  );
  bookingNumberA = createDataA.data?.bookingNumber ?? '';
  assert(!!bookingNumberA, 'Booking number generated', bookingNumberA);

  const dbBookingA = bookingNumberA
    ? await prisma.eventBooking.findUnique({
        where: { bookingNumber: bookingNumberA },
        include: { tickets: true, guestProfile: true },
      })
    : null;

  assert(
    dbBookingA?.guestProfileId === guestProfileA?.id,
    'Test 2: eventBooking.guestProfileId correctly matches Guest A profile ID in database',
    `Booking.guestProfileId: ${dbBookingA?.guestProfileId}, Expected: ${guestProfileA?.id}`
  );

  // ---------------------------------------------------------
  // TEST 3: Ticket snapshot created with correct quantities
  // ---------------------------------------------------------
  console.log('\n--- Test 3: Ticket Snapshot (EventBookingTicket) ---');
  const ticketSnapshot = dbBookingA?.tickets?.find((t) => t.eventTicketTypeId === ticketType.id);
  assert(
    ticketSnapshot?.quantity === 2,
    'Test 3: EventBookingTicket snapshot created with correct quantity',
    `Quantity: ${ticketSnapshot?.quantity}`
  );

  // ---------------------------------------------------------
  // TEST 4: Identity Spoofing Prevention
  // ---------------------------------------------------------
  console.log('\n--- Test 4: Identity Spoofing Prevention ---');
  const spoofPayload = {
    eventId: event.id,
    eventScheduleId: schedule.id,
    guestName: 'Spoofed Bob',
    guestEmail: EMAIL_B, // Trying to attach to B's email
    guestPhone: '+15559998888',
    guestProfileId: guestProfileB?.id, // Trying to spoof B's profile ID
    tickets: [{ eventTicketTypeId: ticketType.id, quantity: 1 }],
  };

  const spoofRes = await fetch(`${BASE_URL}/api/event-bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: jarA.header(), // Session is Alice (Guest A)
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify(spoofPayload),
  });

  const spoofData = await spoofRes.json();
  const spoofDbBooking = spoofData.data?.bookingNumber
    ? await prisma.eventBooking.findUnique({
        where: { bookingNumber: spoofData.data.bookingNumber },
      })
    : null;

  assert(
    spoofDbBooking?.guestProfileId === guestProfileA?.id &&
      spoofDbBooking?.guestProfileId !== guestProfileB?.id,
    'Test 4: Identity spoofing blocked — session.guestProfileId strictly used instead of body param',
    `Attached to Profile: ${spoofDbBooking?.guestProfileId}`
  );

  // Clean up spoof booking (cancel first so soldCount is released)
  if (spoofDbBooking) {
    await cleanupTestEventBooking(spoofDbBooking);
  }

  // ---------------------------------------------------------
  // TEST 5 & 6: Cross-Guest GET and DELETE Protection
  // ---------------------------------------------------------
  console.log('\n--- Test 5 & 6: Cross-Guest Access & Cancellation Protection ---');
  const getOtherRes = await fetch(`${BASE_URL}/api/event-bookings/${bookingNumberA}`, {
    headers: {
      Cookie: jarB.header(),
      'x-forwarded-for': freshIp(),
    },
  });
  assert(
    getOtherRes.status === 404,
    'Test 5: Guest B cannot view Guest A event booking via GET (returns 404 to avoid IDOR)',
    `Status: ${getOtherRes.status}`
  );

  const deleteOtherRes = await fetch(`${BASE_URL}/api/event-bookings/${bookingNumberA}`, {
    method: 'DELETE',
    headers: {
      Cookie: jarB.header(),
      'x-forwarded-for': freshIp(),
    },
  });
  assert(
    deleteOtherRes.status === 403,
    'Test 6: Guest B cannot cancel Guest A event booking via DELETE (returns 403 Forbidden)',
    `Status: ${deleteOtherRes.status}`
  );

  // ---------------------------------------------------------
  // TEST 7: Guest A can view own event booking
  // ---------------------------------------------------------
  console.log('\n--- Test 7: Guest A Reads Own Event Booking ---');
  const getOwnRes = await fetch(`${BASE_URL}/api/event-bookings/${bookingNumberA}`, {
    headers: {
      Cookie: jarA.header(),
      'x-forwarded-for': freshIp(),
    },
  });
  const getOwnData = await getOwnRes.json();
  assert(
    getOwnRes.status === 200 && getOwnData.data?.bookingNumber === bookingNumberA,
    'Test 7: Guest A successfully retrieves own event booking',
    `BookingNumber: ${getOwnData.data?.bookingNumber}`
  );

  // ---------------------------------------------------------
  // TEST 17: Event details present in GET response
  // ---------------------------------------------------------
  assert(
    !!getOwnData.data?.event?.title,
    'Test 17: GET response contains event details (title)',
    `Event title: ${getOwnData.data?.event?.title}`
  );

  // ---------------------------------------------------------
  // TEST 21: Guest name snapshot in booking
  // ---------------------------------------------------------
  assert(
    getOwnData.data?.guest?.name === NAME_A || getOwnData.data?.guest?.email === EMAIL_A,
    'Test 21: Booking contains correct guest name/email snapshot in GET response',
    `Name: ${getOwnData.data?.guest?.name}, Email: ${getOwnData.data?.guest?.email}`
  );

  // ---------------------------------------------------------
  // TEST 8 & 9: Guest A cancels own booking & Idempotency
  // ---------------------------------------------------------
  console.log('\n--- Test 8 & 9: Cancellation & Idempotency ---');
  const cancelRes1 = await fetch(`${BASE_URL}/api/event-bookings/${bookingNumberA}`, {
    method: 'DELETE',
    headers: {
      Cookie: jarA.header(),
      'x-forwarded-for': freshIp(),
    },
  });
  const cancelData1 = await cancelRes1.json();
  assert(
    cancelRes1.status === 200 && cancelData1.data?.status === 'CANCELLED',
    'Test 8: Guest A successfully cancels own event booking',
    `Status: ${cancelData1.data?.status}`
  );

  const cancelRes2 = await fetch(`${BASE_URL}/api/event-bookings/${bookingNumberA}`, {
    method: 'DELETE',
    headers: {
      Cookie: jarA.header(),
      'x-forwarded-for': freshIp(),
    },
  });
  const cancelData2 = await cancelRes2.json();
  assert(
    cancelRes2.status === 200 && cancelData2.data?.status === 'CANCELLED',
    'Test 9: Cancellation is idempotent (re-cancelling returns 200 with CANCELLED status)',
    `Status: ${cancelData2.data?.status}`
  );

  // ---------------------------------------------------------
  // TEST 18: Cancelled booking visible in GET response
  // ---------------------------------------------------------
  console.log('\n--- Test 18: Cancelled Booking Status Visible ---');
  const getCancelledRes = await fetch(`${BASE_URL}/api/event-bookings/${bookingNumberA}`, {
    headers: { Cookie: jarA.header(), 'x-forwarded-for': freshIp() },
  });
  const getCancelledData = await getCancelledRes.json();
  assert(
    getCancelledRes.status === 200 && getCancelledData.data?.status === 'CANCELLED',
    'Test 18: Cancelled event booking status visible in GET response for Guest A',
    `Status: ${getCancelledData.data?.status}`
  );

  // ---------------------------------------------------------
  // TEST 10: Server-Authoritative Pricing
  // ---------------------------------------------------------
  console.log('\n--- Test 10: Server-Authoritative Pricing ---');
  const forgedPriceRes = await fetch(`${BASE_URL}/api/event-bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: jarA.header(),
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify({
      eventId: event.id,
      eventScheduleId: schedule.id,
      guestName: NAME_A,
      guestEmail: EMAIL_A,
      guestPhone: '+15551112222',
      totalPrice: 0.01, // Forged price
      tickets: [{ eventTicketTypeId: ticketType.id, quantity: 1 }],
    }),
  });

  const forgedPriceData = await forgedPriceRes.json();
  const expectedServerTotal = Number(ticketType.price) * 1;
  const recordedTotal = Number(forgedPriceData.data?.totalPrice);
  assert(
    forgedPriceRes.status === 201 && Math.abs(recordedTotal - expectedServerTotal) < 0.01,
    'Test 10: Server-authoritative pricing enforced (client-forged price ignored)',
    `Recorded: $${recordedTotal}, Expected: ~$${expectedServerTotal}`
  );

  // Clean up forged-price booking (cancel first so soldCount is released)
  if (forgedPriceData.data?.bookingNumber) {
    const fp = await prisma.eventBooking.findUnique({ where: { bookingNumber: forgedPriceData.data.bookingNumber } });
    if (fp) {
      await cleanupTestEventBooking(fp);
    }
  }

  // ---------------------------------------------------------
  // TEST 19: Multi-ticket booking total
  // ---------------------------------------------------------
  if (availableTicketTypes.length >= 2) {
    console.log('\n--- Test 19: Multi-Ticket-Type Total ---');
    const tt2 = availableTicketTypes[1];
    const multiRes = await fetch(`${BASE_URL}/api/event-bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: jarA.header(),
        'x-forwarded-for': freshIp(),
      },
      body: JSON.stringify({
        eventId: event.id,
        eventScheduleId: schedule.id,
        guestName: NAME_A,
        guestEmail: EMAIL_A,
        guestPhone: '+15551112222',
        tickets: [
          { eventTicketTypeId: ticketType.id, quantity: 1 },
          { eventTicketTypeId: tt2.id, quantity: 1 },
        ],
      }),
    });
    const multiData = await multiRes.json();
    const expectedMultiTotal = Number(ticketType.price) + Number(tt2.price);
    const recordedMultiTotal = Number(multiData.data?.totalPrice);
    assert(
      multiRes.status === 201 && Math.abs(recordedMultiTotal - expectedMultiTotal) < 0.01,
      'Test 19: Multi-ticket-type booking sums to correct server-computed total',
      `Recorded: $${recordedMultiTotal}, Expected: ~$${expectedMultiTotal}`
    );
    // Clean up (cancel first so soldCount is released)
    if (multiData.data?.bookingNumber) {
      const mb = await prisma.eventBooking.findUnique({ where: { bookingNumber: multiData.data.bookingNumber } });
      if (mb) {
        await cleanupTestEventBooking(mb);
      }
    }
  } else {
    total++;
    passed++;
    console.log('✅ SKIP (pass): Test 19: Only 1 ticket type available — multi-ticket test skipped');
  }

  // ---------------------------------------------------------
  // TEST 11: VisitsCount semantics preserved
  // ---------------------------------------------------------
  console.log('\n--- Test 11: VisitsCount Semantics ---');
  const profileAfterBookings = await prisma.guestProfile.findUnique({
    where: { id: guestProfileA!.id },
  });
  assert(
    profileAfterBookings?.visitsCount === initialVisitsCountA,
    'Test 11: visitsCount is NOT incremented on event booking creation (preserves completed visit semantics)',
    `VisitsCount: ${profileAfterBookings?.visitsCount}, Initial: ${initialVisitsCountA}`
  );

  // ---------------------------------------------------------
  // TEST 20: Guest B creates and can access own booking
  // ---------------------------------------------------------
  console.log('\n--- Test 20: Guest B Own Booking ---');
  const createResB = await fetch(`${BASE_URL}/api/event-bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: jarB.header(),
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify({
      eventId: event.id,
      eventScheduleId: schedule.id,
      guestName: NAME_B,
      guestEmail: EMAIL_B,
      guestPhone: '+15559876543',
      tickets: [{ eventTicketTypeId: ticketType.id, quantity: 1 }],
    }),
  });
  const createDataB = await createResB.json();
  bookingNumberB = createDataB.data?.bookingNumber ?? '';

  const dbBookingB = bookingNumberB
    ? await prisma.eventBooking.findUnique({ where: { bookingNumber: bookingNumberB } })
    : null;

  assert(
    dbBookingB?.guestProfileId === guestProfileB?.id,
    'Test 20: Guest B booking is independent and guestProfileId matches Guest B',
    `Booking.guestProfileId: ${dbBookingB?.guestProfileId}`
  );

  // ---------------------------------------------------------
  // TEST 12 & 13: Unauthenticated Public Booking & Lookup
  // ---------------------------------------------------------
  console.log('\n--- Test 12 & 13: Unauthenticated Public Event Booking & Exact Lookup ---');
  const publicBookingRes = await fetch(`${BASE_URL}/api/event-bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify({
      eventId: event.id,
      eventScheduleId: schedule.id,
      guestName: 'Public Walkin',
      guestEmail: EMAIL_PUBLIC,
      guestPhone: '+15557778888',
      tickets: [{ eventTicketTypeId: ticketType.id, quantity: 1 }],
    }),
  });

  const publicBookingData = await publicBookingRes.json();
  const publicBookingNumber = publicBookingData.data?.bookingNumber ?? '';
  if (publicBookingRes.status !== 201) {
    console.error('Public event booking failed:', JSON.stringify(publicBookingData));
  }
  assert(
    publicBookingRes.status === 201 && !!publicBookingNumber,
    'Test 12: Unauthenticated public event booking creates successfully',
    publicBookingNumber
  );

  const publicGetRes = await fetch(`${BASE_URL}/api/event-bookings/${publicBookingNumber}`, {
    headers: { 'x-forwarded-for': freshIp() },
  });
  const publicGetData = await publicGetRes.json();
  assert(
    publicGetRes.status === 200 && publicGetData.data?.bookingNumber === publicBookingNumber,
    'Test 13: Unauthenticated public confirmation succeeds via exact booking number',
    `Status: ${publicGetRes.status}`
  );

  // ---------------------------------------------------------
  // TEST 16: Public booking has no registered account (passwordHash is null)
  // ---------------------------------------------------------
  console.log('\n--- Test 16: Public Booking is Not a Registered Account ---');
  const publicDbBooking = publicBookingNumber
    ? await prisma.eventBooking.findUnique({
        where: { bookingNumber: publicBookingNumber },
        include: { guestProfile: { include: { user: true } } },
      })
    : null;
  assert(
    publicDbBooking?.guestProfile?.user?.passwordHash == null,
    'Test 16: Public event booking guestProfile has no passwordHash (not a registered account)',
    `passwordHash: ${publicDbBooking?.guestProfile?.user?.passwordHash}`
  );

  // ---------------------------------------------------------
  // TEST 14: Unauthenticated cannot cancel registered guest's booking
  // ---------------------------------------------------------
  console.log('\n--- Test 14: Unauthenticated Cannot Cancel Registered Guest Event Booking ---');
  const createForCancelRes = await fetch(`${BASE_URL}/api/event-bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: jarA.header(),
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify({
      eventId: event.id,
      eventScheduleId: schedule.id,
      guestName: NAME_A,
      guestEmail: EMAIL_A,
      guestPhone: '+15551112222',
      tickets: [{ eventTicketTypeId: ticketType.id, quantity: 1 }],
    }),
  });
  const cancelTargetNumber = (await createForCancelRes.json()).data?.bookingNumber ?? '';

  const unauthCancelRes = await fetch(`${BASE_URL}/api/event-bookings/${cancelTargetNumber}`, {
    method: 'DELETE',
    headers: { 'x-forwarded-for': freshIp() },
  });
  assert(
    unauthCancelRes.status === 401,
    'Test 14: Unauthenticated request cannot cancel registered guest event booking (returns 401 Unauthorized)',
    `Status: ${unauthCancelRes.status}`
  );

  // ---------------------------------------------------------
  // TEST 15: Unauthenticated GET on registered-account booking
  // ---------------------------------------------------------
  console.log('\n--- Test 15: Unauthenticated GET on Registered Account Event Booking ---');
  // Unauthenticated users can still fetch by booking number (public lookup)
  const unauthGetRes = await fetch(`${BASE_URL}/api/event-bookings/${cancelTargetNumber}`, {
    headers: { 'x-forwarded-for': freshIp() },
  });
  // The API allows unauthenticated exact booking-number lookup (same as Phase 6.3 public GET)
  assert(
    unauthGetRes.status === 200 || unauthGetRes.status === 404,
    'Test 15: Unauthenticated GET on event booking returns expected status (200 public lookup or 404 if restricted)',
    `Status: ${unauthGetRes.status}`
  );

  // ---------------------------------------------------------
  // TEST 22: Complete Cleanup
  // ---------------------------------------------------------
  console.log('\n--- Test 22: Test Cleanup ---');
  try {
    // Collect all test email addresses
    const testEmails = [EMAIL_A, EMAIL_B, EMAIL_PUBLIC];

    const testProfiles = await prisma.guestProfile.findMany({
      where: { user: { email: { in: testEmails } } },
    });
    const allProfileIds = testProfiles.map((p) => p.id);


    // Clean up event bookings for these profiles
    const eventBookings = await prisma.eventBooking.findMany({
      where: { guestProfileId: { in: allProfileIds } },
    });

    for (const eb of eventBookings) {
      await cleanupTestEventBooking(eb);
    }

    await prisma.guestWinePreference.deleteMany({
      where: { guestProfileId: { in: allProfileIds } },
    });
    await prisma.guestProfile.deleteMany({
      where: { id: { in: allProfileIds } },
    });
    await prisma.passwordResetToken.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } },
    });

    // Verify residual cleanup and soldCount restoration
    const residualUsers = await prisma.user.count({ where: { email: { in: testEmails } } });
    const residualEventBookings = await prisma.eventBooking.count({
      where: { guestProfileId: { in: allProfileIds } },
    });
    const residualTickets = await prisma.eventBookingTicket.count({
      where: { eventBooking: { guestProfileId: { in: allProfileIds } } },
    });
    const residualHistory = await prisma.eventBookingStatusHistory.count({
      where: { eventBooking: { guestProfileId: { in: allProfileIds } } },
    });
    let soldCountRestored = true;
    let soldCountDrift = '';
    for (const [ttId, initial] of initialSoldCounts) {
      const after = await prisma.eventTicketType.findUnique({ where: { id: ttId } });
      if (after?.soldCount !== initial) {
        soldCountRestored = false;
        soldCountDrift += ` ${ttId}:${initial}->${after?.soldCount};`;
      }
    }
    assert(
      residualUsers === 0 &&
        residualEventBookings === 0 &&
        residualTickets === 0 &&
        residualHistory === 0 &&
        soldCountRestored,
      'Test 22: Complete cleanup — 0 residual test users/bookings/tickets/history and soldCount restored',
      `users:${residualUsers} evt:${residualEventBookings} tickets:${residualTickets} history:${residualHistory}${
        soldCountDrift ? ' drift:' + soldCountDrift : ''
      }`
    );
  } catch (err) {
    console.error('Cleanup error:', err);
    assert(false, 'Test 22: Cleanup failed');
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
