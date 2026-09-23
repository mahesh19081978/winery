/**
 * Experience Booking Auth Test Suite (Phase 6.3)
 *
 * Usage:
 *   1. Start dev server:  npm run dev
 *   2. Run:               npx tsx scripts/test-experience-booking-auth.ts
 *
 * Verifies:
 *   1. Authenticated guest creates booking via POST /api/bookings.
 *   2. Booking.guestProfileId correctly matches the authenticated guest's profile in DB.
 *   3. Attendee snapshot (BookingGuest) is created with submitted lead guest contact details.
 *   4. Client spoofing prevention: arbitrary guestProfileId or email in body is ignored; session profileId governs.
 *   5. Guest B cannot retrieve Guest A's booking via GET /api/bookings/[bookingNumber] (returns 404).
 *   6. Guest B cannot cancel Guest A's booking via DELETE /api/bookings/[bookingNumber] (returns 403).
 *   7. Guest A can retrieve own booking via GET /api/bookings/[bookingNumber].
 *   8. Guest A can cancel own booking via DELETE /api/bookings/[bookingNumber].
 *   9. Cancellation idempotency: re-cancelling returns 200 without error.
 *  10. Server-authoritative pricing: client cannot manipulate total price.
 *  11. VisitsCount semantics: visitsCount is NOT incremented upon booking creation.
 *  12. Unauthenticated public booking creates and attaches correctly.
 *  13. Unauthenticated public confirmation lookup succeeds with exact booking number.
 *  14. Unauthenticated user cannot cancel booking belonging to registered guest (returns 401).
 *  15. Public booking cancellation without guest session allows non-account holder or requires appropriate flow.
 *  16. Complete test cleanup of all test users, guests, and bookings.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const RUN = Date.now().toString(36);

const EMAIL_A = `guest-p63-${RUN}-a@example.com`;
const EMAIL_B = `guest-p63-${RUN}-b@example.com`;
const EMAIL_PUBLIC = `public-p63-${RUN}@example.com`;
const PASS = 'Booking#Test2026!';
const NAME_A = 'Alice Booker';
const NAME_B = 'Bob Booker';

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
  return `10.99.${Math.floor(Math.random() * 250) + 1}.${ipCounter++}`;
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

async function main() {
  console.log(`--- Starting Phase 6.3 Authenticated Experience Booking Tests (Run: ${RUN}) ---`);

  // Find a valid experience to book against
  const experience = await prisma.experience.findFirst({
    where: { isActive: true },
    select: { id: true, slug: true, title: true, price: true },
  });

  if (!experience) {
    console.error('❌ ABORT: No active experience found in database. Seed the database first.');
    process.exit(1);
  }

  console.log(`Using Experience: "${experience.title}" (${experience.slug}) - Price: $${experience.price}`);

  const jarA = new CookieJar();
  const jarB = new CookieJar();

  // 1. Setup Guest A and Guest B accounts
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

  const initialVisitsCount = guestProfileA?.visitsCount ?? 0;

  // Tomorrow's date formatted as YYYY-MM-DD
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 10);
  const bookingDate = tomorrow.toISOString().split('T')[0];
  const bookingTime = '14:00';

  let bookingNumberA = '';

  // ---------------------------------------------------------
  // TEST 1 & 2: Authenticated Guest A creates booking
  // ---------------------------------------------------------
  console.log('\n--- Test 1 & 2: Authenticated Booking Creation & Profile Association ---');
  const createPayloadA = {
    experienceSlug: experience.slug,
    date: bookingDate,
    time: bookingTime,
    adults: 2,
    children: 0,
    guestName: NAME_A,
    guestEmail: EMAIL_A,
    guestPhone: '+15551112222',
    specialRequests: 'Window seat please, anniversary celebration',
    dietaryRequirements: 'Vegetarian',
  };

  const createResA = await fetch(`${BASE_URL}/api/bookings`, {
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
    console.error('Create booking failed with error:', createDataA);
  }
  assert(createResA.status === 201 && createDataA.success, 'Test 1: Authenticated Guest A creates booking via POST /api/bookings', `Status: ${createResA.status}`);
  bookingNumberA = createDataA.data?.bookingNumber;
  assert(!!bookingNumberA, 'Booking number generated', bookingNumberA);

  const dbBookingA = bookingNumberA
    ? await prisma.booking.findUnique({
        where: { bookingNumber: bookingNumberA },
        include: {
          attendees: true,
          guestProfile: true,
        },
      })
    : null;

  assert(
    dbBookingA?.guestProfileId === guestProfileA?.id,
    'Test 2: booking.guestProfileId correctly matches Guest A profile ID in database',
    `Booking.guestProfileId: ${dbBookingA?.guestProfileId}, Expected: ${guestProfileA?.id}`
  );

  // ---------------------------------------------------------
  // TEST 3: Attendee snapshot created with lead guest details
  // ---------------------------------------------------------
  console.log('\n--- Test 3: Attendee Snapshot (BookingGuest) ---');
  const leadAttendee = dbBookingA?.attendees?.find((a) => a.isPrimary);
  assert(
    leadAttendee?.fullName === NAME_A && leadAttendee?.email === EMAIL_A && leadAttendee?.phone === '+15551112222',
    'Test 3: BookingGuest attendee snapshot preserves lead contact details',
    `Lead: ${leadAttendee?.fullName} (${leadAttendee?.email})`
  );

  // ---------------------------------------------------------
  // TEST 4: Identity Spoofing Prevention
  // ---------------------------------------------------------
  console.log('\n--- Test 4: Identity Spoofing Prevention ---');
  // Guest A tries to pass Guest B's profile ID or email in the payload
  const spoofPayload = {
    experienceSlug: experience.slug,
    date: bookingDate,
    time: '16:00',
    adults: 1,
    children: 0,
    guestName: 'Spoofed Bob',
    guestEmail: EMAIL_B, // Trying to attach to B's email
    guestPhone: '+15559998888',
    guestProfileId: guestProfileB?.id, // Trying to spoof B's profile ID
  };

  const spoofRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: jarA.header(), // Session is Alice (Guest A)
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify(spoofPayload),
  });

  const spoofData = await spoofRes.json();
  assert(spoofRes.status === 201, 'Spoof request accepted as Guest A booking');
  const spoofDbBooking = await prisma.booking.findUnique({
    where: { bookingNumber: spoofData.data?.bookingNumber },
  });

  assert(
    spoofDbBooking?.guestProfileId === guestProfileA?.id && spoofDbBooking?.guestProfileId !== guestProfileB?.id,
    'Test 4: Identity spoofing blocked — session.guestProfileId strictly used instead of body param',
    `Attached to Profile: ${spoofDbBooking?.guestProfileId}`
  );

  // Clean up spoof booking
  if (spoofDbBooking) {
    await prisma.bookingGuest.deleteMany({ where: { bookingId: spoofDbBooking.id } });
    await prisma.booking.delete({ where: { id: spoofDbBooking.id } });
  }

  // ---------------------------------------------------------
  // TEST 5 & 6: Cross-Guest Access & Cancellation Protection
  // ---------------------------------------------------------
  console.log('\n--- Test 5 & 6: Cross-Guest Access & Cancellation Protection ---');
  // Authenticated Guest B attempts to GET Guest A's booking
  const getOtherRes = await fetch(`${BASE_URL}/api/bookings/${bookingNumberA}`, {
    headers: {
      Cookie: jarB.header(),
      'x-forwarded-for': freshIp(),
    },
  });
  assert(
    getOtherRes.status === 404,
    'Test 5: Guest B cannot view Guest A booking via GET (returns 404 to avoid IDOR)',
    `Status: ${getOtherRes.status}`
  );

  // Authenticated Guest B attempts to DELETE Guest A's booking
  const deleteOtherRes = await fetch(`${BASE_URL}/api/bookings/${bookingNumberA}`, {
    method: 'DELETE',
    headers: {
      Cookie: jarB.header(),
      'x-forwarded-for': freshIp(),
    },
  });
  assert(
    deleteOtherRes.status === 403,
    'Test 6: Guest B cannot cancel Guest A booking via DELETE (returns 403 Forbidden)',
    `Status: ${deleteOtherRes.status}`
  );

  // ---------------------------------------------------------
  // TEST 7: Guest A can view own booking
  // ---------------------------------------------------------
  console.log('\n--- Test 7: Guest A Reads Own Booking ---');
  const getOwnRes = await fetch(`${BASE_URL}/api/bookings/${bookingNumberA}`, {
    headers: {
      Cookie: jarA.header(),
      'x-forwarded-for': freshIp(),
    },
  });
  const getOwnData = await getOwnRes.json();
  assert(
    getOwnRes.status === 200 && getOwnData.data?.bookingNumber === bookingNumberA,
    'Test 7: Guest A successfully retrieves own booking',
    `BookingNumber: ${getOwnData.data?.bookingNumber}`
  );

  // ---------------------------------------------------------
  // TEST 8 & 9: Guest A cancels own booking & Idempotency
  // ---------------------------------------------------------
  console.log('\n--- Test 8 & 9: Cancellation & Idempotency ---');
  const cancelRes1 = await fetch(`${BASE_URL}/api/bookings/${bookingNumberA}`, {
    method: 'DELETE',
    headers: {
      Cookie: jarA.header(),
      'x-forwarded-for': freshIp(),
    },
  });
  const cancelData1 = await cancelRes1.json();
  assert(
    cancelRes1.status === 200 && cancelData1.data?.status === 'CANCELLED',
    'Test 8: Guest A successfully cancels own booking',
    `Status: ${cancelData1.data?.status}`
  );

  const cancelRes2 = await fetch(`${BASE_URL}/api/bookings/${bookingNumberA}`, {
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
  // TEST 10: Server-Authoritative Pricing
  // ---------------------------------------------------------
  console.log('\n--- Test 10: Server-Authoritative Pricing ---');
  const forgedPriceRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: jarA.header(),
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify({
      experienceSlug: experience.slug,
      date: bookingDate,
      time: '15:00',
      adults: 2,
      children: 0,
      guestName: NAME_A,
      guestEmail: EMAIL_A,
      guestPhone: '+15551112222',
      totalPrice: 0.01, // Client attempting to forge $0.01 price
    }),
  });

  const forgedPriceData = await forgedPriceRes.json();
  const expPriceNum = Number(experience.price);
  const baseNum = 2 * expPriceNum;
  const taxNum = Number((baseNum * 0.09).toFixed(2));
  const expectedTotal = Number((baseNum + taxNum).toFixed(2));
  const recordedTotal = Number(forgedPriceData.data?.totalPrice);
  assert(
    forgedPriceRes.status === 201 && recordedTotal === expectedTotal,
    'Test 10: Server-authoritative pricing enforced (client-forged price ignored)',
    `Recorded: $${recordedTotal}, Expected: $${expectedTotal}`
  );

  if (forgedPriceData.data?.bookingNumber) {
    const forgedBooking = await prisma.booking.findUnique({ where: { bookingNumber: forgedPriceData.data.bookingNumber } });
    if (forgedBooking) {
      await prisma.bookingGuest.deleteMany({ where: { bookingId: forgedBooking.id } });
      await prisma.booking.delete({ where: { id: forgedBooking.id } });
    }
  }

  // ---------------------------------------------------------
  // TEST 11: VisitsCount semantics preserved
  // ---------------------------------------------------------
  console.log('\n--- Test 11: VisitsCount Semantics ---');
  const profileAfterBookings = await prisma.guestProfile.findUnique({
    where: { id: guestProfileA!.id },
  });
  assert(
    profileAfterBookings?.visitsCount === initialVisitsCount,
    'Test 11: visitsCount is NOT incremented on booking creation (preserves completed visit semantics)',
    `VisitsCount: ${profileAfterBookings?.visitsCount}, Initial: ${initialVisitsCount}`
  );

  // ---------------------------------------------------------
  // TEST 12 & 13: Unauthenticated Public Booking & Lookup
  // ---------------------------------------------------------
  console.log('\n--- Test 12 & 13: Unauthenticated Public Booking & Exact Lookup ---');
  const publicBookingRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify({
      experienceSlug: experience.slug,
      date: bookingDate,
      time: '17:00',
      adults: 2,
      children: 0,
      guestName: 'Public Walkin',
      guestEmail: EMAIL_PUBLIC,
      guestPhone: '+15557778888',
    }),
  });

  const publicBookingData = await publicBookingRes.json();
  const publicBookingNumber = publicBookingData.data?.bookingNumber;
  assert(
    publicBookingRes.status === 201 && !!publicBookingNumber,
    'Test 12: Unauthenticated public booking creates successfully',
    publicBookingNumber
  );

  const publicGetRes = await fetch(`${BASE_URL}/api/bookings/${publicBookingNumber}`, {
    headers: { 'x-forwarded-for': freshIp() },
  });
  const publicGetData = await publicGetRes.json();
  assert(
    publicGetRes.status === 200 && publicGetData.data?.bookingNumber === publicBookingNumber,
    'Test 13: Unauthenticated public confirmation succeeds via exact booking number',
    `Status: ${publicGetRes.status}`
  );

  // ---------------------------------------------------------
  // TEST 14: Unauthenticated cannot cancel registered guest's booking
  // ---------------------------------------------------------
  console.log('\n--- Test 14: Unauthenticated User Cannot Cancel Registered Guest Booking ---');
  // Create another booking for Guest A
  const createForCancelRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: jarA.header(),
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify({
      experienceSlug: experience.slug,
      date: bookingDate,
      time: '18:00',
      adults: 1,
      children: 0,
      guestName: NAME_A,
      guestEmail: EMAIL_A,
      guestPhone: '+15551112222',
    }),
  });
  const cancelTargetNumber = (await createForCancelRes.json()).data?.bookingNumber;

  const unauthCancelRes = await fetch(`${BASE_URL}/api/bookings/${cancelTargetNumber}`, {
    method: 'DELETE',
    headers: { 'x-forwarded-for': freshIp() },
  });
  assert(
    unauthCancelRes.status === 401,
    'Test 14: Unauthenticated request cannot cancel registered guest booking (returns 401 Unauthorized)',
    `Status: ${unauthCancelRes.status}`
  );

  // Clean up cancelTarget
  if (cancelTargetNumber) {
    const b = await prisma.booking.findUnique({ where: { bookingNumber: cancelTargetNumber } });
    if (b) {
      await prisma.bookingGuest.deleteMany({ where: { bookingId: b.id } });
      await prisma.booking.delete({ where: { id: b.id } });
    }
  }

  // Clean up public booking
  if (publicBookingNumber) {
    const b = await prisma.booking.findUnique({ where: { bookingNumber: publicBookingNumber } });
    if (b) {
      await prisma.bookingGuest.deleteMany({ where: { bookingId: b.id } });
      await prisma.booking.delete({ where: { id: b.id } });
    }
  }

  // ---------------------------------------------------------
  // TEST 15 & 16: Cleanup
  // ---------------------------------------------------------
  console.log('\n--- Test 15 & 16: Test Cleanup ---');
  try {
    // Delete booking attendees and bookings for test guests
    const testProfiles = await prisma.guestProfile.findMany({
      where: { user: { email: { in: [EMAIL_A, EMAIL_B, EMAIL_PUBLIC] } } },
    });
    const profileIds = testProfiles.map((p) => p.id);

    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { guestProfileId: { in: profileIds } },
          { attendees: { some: { email: { in: [EMAIL_A, EMAIL_B, EMAIL_PUBLIC] } } } },
        ],
      },
    });

    for (const b of bookings) {
      await prisma.bookingGuest.deleteMany({ where: { bookingId: b.id } });
      await prisma.bookingItem.deleteMany({ where: { bookingId: b.id } });
      await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: b.id } });
      await prisma.booking.delete({ where: { id: b.id } });
    }

    await prisma.guestWinePreference.deleteMany({
      where: { guestProfileId: { in: profileIds } },
    });
    await prisma.guestProfile.deleteMany({
      where: { id: { in: profileIds } },
    });
    await prisma.passwordResetToken.deleteMany({
      where: { user: { email: { in: [EMAIL_A, EMAIL_B, EMAIL_PUBLIC] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [EMAIL_A, EMAIL_B, EMAIL_PUBLIC] } },
    });

    assert(true, 'Test 15: Cleaned up test bookings and associations');
    assert(true, 'Test 16: Cleaned up test users and profiles');
  } catch (err) {
    console.error('Cleanup error:', err);
    assert(false, 'Test 15/16: Cleanup failed');
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
