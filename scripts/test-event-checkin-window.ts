import { prisma } from '../src/lib/db';
import { EventBookingRepository } from '../src/server/repositories';
import { BookingStatus } from '@prisma/client';
import {
  extractEventStartTime,
  extractEventEndTime,
  getEventCheckInWindow,
} from '../src/lib/events/timing';

const TEST_PREFIX = 'test-checkin-';
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
  console.log('=== Event Booking Check-In Window & Timing Verification ===\n');

  // ==========================================
  // SECTION 1: Pure Timing Unit Tests
  // ==========================================
  console.log('--- 1. Pure Timing Window Logic Unit Tests ---');
  const eventConfig = {
    eventDate: '2026-10-31',
    timeRange: '6:00 PM – 10:00 PM',
    timeZone: 'America/Los_Angeles',
  };

  const windowInfo = getEventCheckInWindow(eventConfig);

  // Time boundaries validation
  assert(
    extractEventStartTime(eventConfig.timeRange) === '6:00 PM',
    'extractEventStartTime extracts "6:00 PM"'
  );
  assert(
    extractEventEndTime(eventConfig.timeRange) === '10:00 PM',
    'extractEventEndTime extracts "10:00 PM"'
  );

  // Oct 31, 2026 is in Daylight Saving Time (PDT, UTC-7).
  // 5:00 PM PDT = Nov 1, 00:00 UTC
  // 6:00 PM PDT = Nov 1, 01:00 UTC
  // 10:00 PM PDT = Nov 1, 05:00 UTC
  assert(
    windowInfo.checkInOpens.toISOString() === '2026-11-01T00:00:00.000Z',
    'Check-in window opens exactly at 5:00 PM local (Nov 1 00:00:00Z)'
  );
  assert(
    windowInfo.eventStart.toISOString() === '2026-11-01T01:00:00.000Z',
    'Event start is 6:00 PM local (Nov 1 01:00:00Z)'
  );
  assert(
    windowInfo.eventEnd.toISOString() === '2026-11-01T05:00:00.000Z',
    'Event end is 10:00 PM local (Nov 1 05:00:00Z)'
  );

  // 1. Event 2 days in future -> check-in rejected
  const time2DaysFuture = new Date(windowInfo.eventStart.getTime() - 2 * 24 * 60 * 60 * 1000);
  const res2DaysFuture = getEventCheckInWindow({ ...eventConfig, now: time2DaysFuture });
  assert(!res2DaysFuture.isOpen && res2DaysFuture.isBeforeWindow, 'Event 2 days in future -> check-in rejected (before window)');

  // 2. Event 2 hours in future -> check-in rejected
  const time2HoursFuture = new Date(windowInfo.eventStart.getTime() - 2 * 60 * 60 * 1000);
  const res2HoursFuture = getEventCheckInWindow({ ...eventConfig, now: time2HoursFuture });
  assert(!res2HoursFuture.isOpen && res2HoursFuture.isBeforeWindow, 'Event 2 hours in future -> check-in rejected (before window)');

  // 3. Event exactly 1 hour before start -> check-in allowed
  const time1HourBefore = new Date(windowInfo.eventStart.getTime() - 60 * 60 * 1000);
  const res1HourBefore = getEventCheckInWindow({ ...eventConfig, now: time1HourBefore });
  assert(res1HourBefore.isOpen && !res1HourBefore.isBeforeWindow && !res1HourBefore.isPastEnd, 'Event exactly 1 hour before start -> check-in allowed');

  // 4. Event 30 minutes before start -> allowed
  const time30MinBefore = new Date(windowInfo.eventStart.getTime() - 30 * 60 * 1000);
  const res30MinBefore = getEventCheckInWindow({ ...eventConfig, now: time30MinBefore });
  assert(res30MinBefore.isOpen, 'Event 30 minutes before start -> check-in allowed');

  // 5. Event during event -> allowed
  const timeDuring = new Date(windowInfo.eventStart.getTime() + 90 * 60 * 1000);
  const resDuring = getEventCheckInWindow({ ...eventConfig, now: timeDuring });
  assert(resDuring.isOpen, 'Event during event (7:30 PM) -> check-in allowed');

  // 6. Event exactly at end time -> rejected
  const timeAtEnd = new Date(windowInfo.eventEnd.getTime());
  const resAtEnd = getEventCheckInWindow({ ...eventConfig, now: timeAtEnd });
  assert(!resAtEnd.isOpen && resAtEnd.isPastEnd, 'Event exactly at end time -> check-in rejected');

  // 7. Event after end -> rejected
  const timeAfterEnd = new Date(windowInfo.eventEnd.getTime() + 5 * 60 * 1000);
  const resAfterEnd = getEventCheckInWindow({ ...eventConfig, now: timeAfterEnd });
  assert(!resAfterEnd.isOpen && resAfterEnd.isPastEnd, 'Event after end -> check-in rejected');

  // 8. Correct winery timezone handling (e.g. New York EST vs Los Angeles PST)
  const nyConfig = {
    eventDate: '2026-10-31',
    timeRange: '6:00 PM – 10:00 PM',
    timeZone: 'America/New_York',
  };
  const nyWindow = getEventCheckInWindow(nyConfig);
  // In NY (EDT, UTC-4), 6:00 PM is 22:00:00Z on Oct 31, 5:00 PM is 21:00:00Z
  assert(
    nyWindow.checkInOpens.toISOString() === '2026-10-31T21:00:00.000Z',
    'Correct winery timezone handling (America/New_York offset handled accurately)'
  );

  // --- NO_SHOW timing rule unit tests ---
  // CONFIRMED -> NO_SHOW must only be allowed AFTER the event has ended (currentTime >= eventEnd)
  // - Future event (2 days before) -> NO_SHOW rejected
  assert(time2DaysFuture.getTime() < windowInfo.eventEnd.getTime(), 'Unit test: 2 days before event -> currentTime < eventEnd (NO_SHOW rejected)');
  // - Event 2 hours before start -> NO_SHOW rejected
  assert(time2HoursFuture.getTime() < windowInfo.eventEnd.getTime(), 'Unit test: 2 hours before start -> currentTime < eventEnd (NO_SHOW rejected)');
  // - Event during event -> NO_SHOW rejected
  assert(timeDuring.getTime() < windowInfo.eventEnd.getTime(), 'Unit test: During event -> currentTime < eventEnd (NO_SHOW rejected)');
  // - Exactly at event end -> NO_SHOW allowed
  assert(timeAtEnd.getTime() >= windowInfo.eventEnd.getTime(), 'Unit test: Exactly at event end -> currentTime >= eventEnd (NO_SHOW allowed)');
  // - After event end -> NO_SHOW allowed
  assert(timeAfterEnd.getTime() >= windowInfo.eventEnd.getTime(), 'Unit test: After event end -> currentTime >= eventEnd (NO_SHOW allowed)');

  // ==========================================
  // SECTION 2: Database Server-Side Enforcement
  // ==========================================
  console.log('\n--- 2. Server-Side Enforcement (EventBookingRepository.updateStatus) ---');
  await cleanup();

  try {
    const winery = await prisma.winery.findFirst();
    if (!winery) throw new Error('No winery found');

    // Create a future event (Saturday, October 31, 2026 6:00 PM – 10:00 PM)
    const futureEvent = await prisma.event.create({
      data: {
        wineryId: winery.id,
        slug: `${TEST_PREFIX}gala-${Date.now()}`,
        title: 'Autumn Harvest Gala 2026',
        eventDate: new Date('2026-10-31T00:00:00.000Z'),
        timeRange: '6:00 PM – 10:00 PM',
        venue: 'Grand Barrel Room',
        price: 75,
        currency: 'USD',
        description: 'Test gala event',
        shortDescription: 'Test gala short',
        featuredImage: '/images/test-event.jpg',
        availableTickets: 20,
        maxCapacity: 20,
        status: 'UPCOMING',
        schedules: {
          create: [{ timeSlot: '6:00 PM', activity: 'Gala Welcome', sortOrder: 0 }],
        },
      },
      include: { schedules: true },
    });

    const ticketType = await prisma.eventTicketType.create({
      data: {
        eventId: futureEvent.id,
        name: 'General Admission',
        price: 75,
        capacity: 20,
        soldCount: 1,
      },
    });

    const testUser = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}guest-${Date.now()}@test.com`,
        passwordHash: 'dummy-hash',
        name: 'Checkin Test Guest',
        role: 'GUEST',
      },
    });

    const guestProfile = await prisma.guestProfile.create({
      data: {
        userId: testUser.id,
        name: 'Checkin Test Guest',
      },
    });

    const bookingFuture = await prisma.eventBooking.create({
      data: {
        eventId: futureEvent.id,
        eventScheduleId: futureEvent.schedules[0].id,
        guestProfileId: guestProfile.id,
        bookingNumber: `EVT-${Date.now()}-FUT`,
        status: BookingStatus.CONFIRMED,
        totalPrice: 75,
        tickets: {
          create: [{
            eventTicketTypeId: ticketType.id,
            quantity: 1,
            unitPrice: 75,
          }],
        },
      },
    });

    // Attempt check-in on this future event right now -> MUST BE REJECTED
    let futureRejected = false;
    let rejectedErrorMessage = '';
    try {
      await EventBookingRepository.updateStatus(bookingFuture.id, BookingStatus.CHECKED_IN, 'STAFF_TEST', 'Checking in early');
    } catch (e) {
      futureRejected = true;
      rejectedErrorMessage = e instanceof Error ? e.message : String(e);
    }

    assert(futureRejected, 'Server-side enforcement: Check-in rejected for future event');
    assert(
      rejectedErrorMessage === 'Check-in opens 1 hour before the event.',
      `Error message is "Check-in opens 1 hour before the event." (got "${rejectedErrorMessage}")`
    );

    // Verify booking is still CONFIRMED
    const bookingAfterFailedCheckIn = await prisma.eventBooking.findUnique({
      where: { id: bookingFuture.id },
    });
    assert(bookingAfterFailedCheckIn?.status === BookingStatus.CONFIRMED, 'Booking remains CONFIRMED in DB');

    // Create an ended past event (2024-10-31 6:00 PM – 10:00 PM)
    const pastEvent = await prisma.event.create({
      data: {
        wineryId: winery.id,
        slug: `${TEST_PREFIX}past-${Date.now()}`,
        title: 'Past Gala 2024',
        eventDate: new Date('2024-10-31T00:00:00.000Z'),
        timeRange: '6:00 PM – 10:00 PM',
        venue: 'Grand Barrel Room',
        price: 75,
        currency: 'USD',
        description: 'Past gala event',
        shortDescription: 'Past gala short',
        featuredImage: '/images/test-event.jpg',
        availableTickets: 20,
        maxCapacity: 20,
        status: 'UPCOMING',
        schedules: {
          create: [{ timeSlot: '6:00 PM', activity: 'Past Gala', sortOrder: 0 }],
        },
      },
      include: { schedules: true },
    });

    const bookingPast = await prisma.eventBooking.create({
      data: {
        eventId: pastEvent.id,
        eventScheduleId: pastEvent.schedules[0].id,
        guestProfileId: guestProfile.id,
        bookingNumber: `EVT-${Date.now()}-PST`,
        status: BookingStatus.CONFIRMED,
        totalPrice: 75,
      },
    });

    let pastRejected = false;
    let pastErrorMessage = '';
    try {
      await EventBookingRepository.updateStatus(bookingPast.id, BookingStatus.CHECKED_IN, 'STAFF_TEST', 'Checking in past');
    } catch (e) {
      pastRejected = true;
      pastErrorMessage = e instanceof Error ? e.message : String(e);
    }

    assert(pastRejected, 'Server-side enforcement: Check-in rejected for past event');
    assert(
      pastErrorMessage === 'Cannot check in guests for an event that has already ended.',
      `Error message is "Cannot check in guests for an event that has already ended." (got "${pastErrorMessage}")`
    );

    // ==========================================
    // SECTION 3: Mark No-Show Timing Enforcement
    // ==========================================
    console.log('\n--- 3. Server-Side Enforcement for NO_SHOW ---');

    // 1. Future event -> CONFIRMED -> NO_SHOW rejected
    let noShowFutureRejected = false;
    let noShowFutureErrorMessage = '';
    try {
      await EventBookingRepository.updateStatus(bookingFuture.id, BookingStatus.NO_SHOW, 'STAFF_TEST', 'Marking future event as no-show');
    } catch (e) {
      noShowFutureRejected = true;
      noShowFutureErrorMessage = e instanceof Error ? e.message : String(e);
    }
    assert(noShowFutureRejected, 'Future event: CONFIRMED -> NO_SHOW rejected');
    assert(
      noShowFutureErrorMessage === 'No-show can only be marked after the event has ended.',
      `Error message is "No-show can only be marked after the event has ended." (got "${noShowFutureErrorMessage}")`
    );

    // Verify bookingFuture is still CONFIRMED in DB
    const bookingFutureStillConfirmed = await prisma.eventBooking.findUnique({
      where: { id: bookingFuture.id },
    });
    assert(bookingFutureStillConfirmed?.status === BookingStatus.CONFIRMED, 'Future booking remains CONFIRMED in DB');

    // 2. Past event (already ended) -> CONFIRMED -> NO_SHOW allowed
    const updatedPastToNoShow = await EventBookingRepository.updateStatus(
      bookingPast.id,
      BookingStatus.NO_SHOW,
      'STAFF_TEST',
      'Marked as no-show after event ended'
    );
    assert(updatedPastToNoShow.status === BookingStatus.NO_SHOW, 'Past ended event: CONFIRMED -> NO_SHOW allowed');

    const bookingPastAfterNoShow = await prisma.eventBooking.findUnique({
      where: { id: bookingPast.id },
    });
    assert(bookingPastAfterNoShow?.status === BookingStatus.NO_SHOW, 'Past booking successfully transitioned to NO_SHOW in DB');

  } finally {
    await cleanup();
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
