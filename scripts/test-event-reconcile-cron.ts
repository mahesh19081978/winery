import { prisma } from '../src/lib/db';
import { EventBookingService } from '../src/server/services';
import { EventBookingRepository } from '../src/server/repositories';
import { BookingStatus } from '@prisma/client';

const TEST_PREFIX = 'test-reconcile-';
let passed = 0;
let failed = 0;
function ok(msg: string) { console.log(`✅ ${msg}`); passed++; }
function fail(msg: string, e?: unknown) { console.log(`❌ ${msg}${e ? ': ' + (e instanceof Error ? e.message : String(e)) : ''}`); failed++; }
function assert(cond: boolean, msg: string) { if (cond) ok(msg); else fail(msg); }

async function cleanup() {
  const events = await prisma.event.findMany({
    where: { slug: { startsWith: TEST_PREFIX } },
    select: { id: true },
  });
  const eventIds = events.map(e => e.id);
  if (eventIds.length > 0) {
    const bookings = await prisma.eventBooking.findMany({
      where: { eventId: { in: eventIds } },
      select: { id: true },
    });
    const bookingIds = bookings.map(b => b.id);
    if (bookingIds.length > 0) {
      await prisma.eventBookingStatusHistory.deleteMany({
        where: { eventBookingId: { in: bookingIds } },
      });
      await prisma.eventBookingTicket.deleteMany({
        where: { eventBookingId: { in: bookingIds } },
      });
      await prisma.eventBooking.deleteMany({
        where: { id: { in: bookingIds } },
      });
    }
    await prisma.eventSchedule.deleteMany({ where: { eventId: { in: eventIds } } });
    await prisma.eventTicketType.deleteMany({ where: { eventId: { in: eventIds } } });
    await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
  }

  // Cleanup test users and profiles
  const users = await prisma.user.findMany({
    where: { email: { startsWith: TEST_PREFIX } },
    select: { id: true },
  });
  const userIds = users.map(u => u.id);
  if (userIds.length > 0) {
    await prisma.guestProfile.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
  }
}

async function main() {
  console.log('=== Event Booking Automated Lifecycle Reconciliation Test Suite ===');
  await cleanup();

  try {
    // 1. Get winery
    const winery = await prisma.winery.findFirst();
    if (!winery) {
      throw new Error('No winery found in database');
    }

    // 2. Create test past event (past date in 2024, 6:00 PM – 10:00 PM, LA timezone)
    // and test future event (Dec 25, 2030, 6:00 PM – 10:00 PM)
    const pastEvent = await prisma.event.create({
      data: {
        wineryId: winery.id,
        slug: `${TEST_PREFIX}past-${Date.now()}`,
        title: 'Past Test Gala',
        eventDate: new Date('2024-10-31T00:00:00.000Z'),
        timeRange: '6:00 PM – 10:00 PM',
        venue: 'Grand Barrel Room',
        price: 150,
        currency: 'USD',
        description: 'A test past event for reconciliation testing.',
        shortDescription: 'Past test gala short description',
        featuredImage: '/images/test-past.jpg',
        availableTickets: 50,
        maxCapacity: 50,
        status: 'UPCOMING',
        schedules: {
          create: [{ timeSlot: '6:00 PM', activity: 'Gala', sortOrder: 0 }],
        },
      },
      include: { schedules: true },
    });

    const futureEvent = await prisma.event.create({
      data: {
        wineryId: winery.id,
        slug: `${TEST_PREFIX}future-${Date.now()}`,
        title: 'Future Test Gala',
        eventDate: new Date('2030-12-25T00:00:00.000Z'),
        timeRange: '6:00 PM – 10:00 PM',
        venue: 'Grand Ballroom',
        price: 150,
        currency: 'USD',
        description: 'A test future event for reconciliation testing.',
        shortDescription: 'Future test gala short description',
        featuredImage: '/images/test-future.jpg',
        availableTickets: 50,
        maxCapacity: 50,
        status: 'UPCOMING',
        schedules: {
          create: [{ timeSlot: '6:00 PM', activity: 'Gala', sortOrder: 0 }],
        },
      },
      include: { schedules: true },
    });

    // Create guest profile
    const testUser = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}user@example.com`,
        name: 'Reconcile Test User',
        passwordHash: 'dummyhash',
        role: 'GUEST',
        guestProfile: {
          create: {
            name: 'Reconcile Test User',
            phone: '555-0100',
          },
        },
      },
      include: { guestProfile: true },
    });

    const guestProfileId = testUser.guestProfile!.id;

    // Create bookings
    // Past booking 1: CONFIRMED -> should become NO_SHOW
    const bookingConfirmedPast = await prisma.eventBooking.create({
      data: {
        bookingNumber: `EVT-${Date.now()}-1`,
        eventId: pastEvent.id,
        eventScheduleId: pastEvent.schedules[0].id,
        guestProfileId,
        status: BookingStatus.CONFIRMED,
        totalPrice: 150,
      },
    });

    // Past booking 2: CHECKED_IN -> should become COMPLETED
    const bookingCheckedInPast = await prisma.eventBooking.create({
      data: {
        bookingNumber: `EVT-${Date.now()}-2`,
        eventId: pastEvent.id,
        eventScheduleId: pastEvent.schedules[0].id,
        guestProfileId,
        status: BookingStatus.CHECKED_IN,
        totalPrice: 150,
      },
    });

    // Past booking 3: PENDING -> should remain PENDING
    const bookingPendingPast = await prisma.eventBooking.create({
      data: {
        bookingNumber: `EVT-${Date.now()}-3`,
        eventId: pastEvent.id,
        eventScheduleId: pastEvent.schedules[0].id,
        guestProfileId,
        status: BookingStatus.PENDING,
        totalPrice: 150,
      },
    });

    // Future booking: CONFIRMED -> should remain CONFIRMED
    const bookingConfirmedFuture = await prisma.eventBooking.create({
      data: {
        bookingNumber: `EVT-${Date.now()}-4`,
        eventId: futureEvent.id,
        eventScheduleId: futureEvent.schedules[0].id,
        guestProfileId,
        status: BookingStatus.CONFIRMED,
        totalPrice: 150,
      },
    });

    console.log('\n--- 1. Testing Automated Multi-Winery Reconciliation ---');
    const result1 = await EventBookingService.reconcileAllWineries();
    assert(result1.processedWineries >= 1, `Processed wineries count >= 1 (got ${result1.processedWineries})`);
    assert(result1.updatedBookingNumbers.includes(bookingConfirmedPast.bookingNumber), 'Reconciled CONFIRMED past booking');
    assert(result1.updatedBookingNumbers.includes(bookingCheckedInPast.bookingNumber), 'Reconciled CHECKED_IN past booking');
    assert(!result1.updatedBookingNumbers.includes(bookingPendingPast.bookingNumber), 'PENDING booking not touched');
    assert(!result1.updatedBookingNumbers.includes(bookingConfirmedFuture.bookingNumber), 'Future booking not touched');

    // Verify DB records
    const b1 = await prisma.eventBooking.findUnique({
      where: { id: bookingConfirmedPast.id },
      include: { statusHistory: true },
    });
    assert(b1?.status === BookingStatus.NO_SHOW, 'CONFIRMED past booking updated to NO_SHOW');
    assert(
      Boolean(b1?.statusHistory.some(h => h.toStatus === BookingStatus.NO_SHOW && h.changedBy === 'SYSTEM_RECONCILIATION')),
      'StatusHistory records SYSTEM_RECONCILIATION for NO_SHOW'
    );

    const b2 = await prisma.eventBooking.findUnique({
      where: { id: bookingCheckedInPast.id },
      include: { statusHistory: true },
    });
    assert(b2?.status === BookingStatus.COMPLETED, 'CHECKED_IN past booking updated to COMPLETED');
    assert(
      Boolean(b2?.statusHistory.some(h => h.toStatus === BookingStatus.COMPLETED && h.changedBy === 'SYSTEM_RECONCILIATION')),
      'StatusHistory records SYSTEM_RECONCILIATION for COMPLETED'
    );

    const b3 = await prisma.eventBooking.findUnique({ where: { id: bookingPendingPast.id } });
    assert(b3?.status === BookingStatus.PENDING, 'PENDING past booking remains PENDING');

    const b4 = await prisma.eventBooking.findUnique({ where: { id: bookingConfirmedFuture.id } });
    assert(b4?.status === BookingStatus.CONFIRMED, 'CONFIRMED future booking remains CONFIRMED');

    console.log('\n--- 2. Testing Idempotency & Repeat Runs ---');
    const result2 = await EventBookingService.reconcileAllWineries();
    assert(
      !result2.updatedBookingNumbers.includes(bookingConfirmedPast.bookingNumber),
      'Idempotent: bookingConfirmedPast not updated again'
    );
    assert(
      !result2.updatedBookingNumbers.includes(bookingCheckedInPast.bookingNumber),
      'Idempotent: bookingCheckedInPast not updated again'
    );

    // Verify status history count did not duplicate
    const b1After = await prisma.eventBooking.findUnique({
      where: { id: bookingConfirmedPast.id },
      include: { statusHistory: true },
    });
    const reconcileHistories = b1After?.statusHistory.filter(h => h.changedBy === 'SYSTEM_RECONCILIATION') || [];
    assert(reconcileHistories.length === 1, `Exactly 1 status history record created (got ${reconcileHistories.length})`);

    console.log('\n--- 3. Testing Winery-Scoped Tenant Isolation ---');
    // Scope specifically to winery.id
    const resultScoped = await EventBookingRepository.reconcileExpiredEventBookings(winery.id);
    assert(resultScoped.noShowCount === 0 && resultScoped.completedCount === 0, 'Scoped reconciliation returned 0 for already reconciled data');

    console.log('\n--- 4. Testing Cron Route Handler Authorization & Structure ---');
    const { GET, POST } = await import('../src/app/api/cron/reconcile-event-bookings/route');
    assert(typeof GET === 'function', 'GET handler exported');
    assert(typeof POST === 'function', 'POST handler exported');

    // Test unauthorized request simulation with CRON_SECRET set
    const originalSecret = process.env.CRON_SECRET;
    try {
      process.env.CRON_SECRET = 'super-test-secret-123';
      const mockReqUnauthorized = {
        headers: new Headers({
          'authorization': 'Bearer wrong-secret',
        }),
      } as unknown as Request;

      const unauthResponse = await GET(mockReqUnauthorized);
      assert(unauthResponse.status === 401, 'Unauthorized request without valid Bearer token rejected with 401');

      const mockReqAuthorized = {
        headers: new Headers({
          'authorization': 'Bearer super-test-secret-123',
        }),
      } as unknown as Request;

      const authResponse = await GET(mockReqAuthorized);
      assert(authResponse.status === 200, 'Authorized request with valid Bearer token succeeds with 200');
    } finally {
      process.env.CRON_SECRET = originalSecret;
    }

  } finally {
    await cleanup();
  }

  console.log(`\nTests finished: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
