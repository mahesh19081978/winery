import { prisma } from '../src/lib/db';
import { BookingRepository } from '../src/server/repositories';
import { BookingStatus } from '@prisma/client';
import {
  calculateExperienceStartBoundary,
  calculateExperienceEndBoundary,
  getExperienceTimingStatus,
} from '../src/lib/events/timing';

const TEST_PREFIX = 'test-exp-timing-';
let passed = 0;
let failed = 0;
function ok(msg: string) { console.log(`✅ ${msg}`); passed++; }
function fail(msg: string, e?: unknown) { console.log(`❌ ${msg}${e ? ': ' + (e instanceof Error ? e.message : String(e)) : ''}`); failed++; }
function assert(cond: boolean, msg: string) { if (cond) ok(msg); else fail(msg); }

async function cleanup() {
  const experiences = await prisma.experience.findMany({
    where: { slug: { startsWith: TEST_PREFIX } },
    select: { id: true },
  });
  const expIds = experiences.map(e => e.id);
  if (expIds.length > 0) {
    const items = await prisma.bookingItem.findMany({
      where: { experienceId: { in: expIds } },
      select: { bookingId: true },
    });
    const bookingIds = items.map(i => i.bookingId);
    if (bookingIds.length > 0) {
      await prisma.bookingStatusHistory.deleteMany({
        where: { bookingId: { in: bookingIds } },
      });
      await prisma.bookingGuest.deleteMany({
        where: { bookingId: { in: bookingIds } },
      });
      await prisma.bookingItem.deleteMany({
        where: { bookingId: { in: bookingIds } },
      });
      await prisma.booking.deleteMany({
        where: { id: { in: bookingIds } },
      });
    }
    await prisma.experience.deleteMany({ where: { id: { in: expIds } } });
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
  console.log('=== Experience Booking Timing Protection Test Suite ===\n');

  // ==========================================
  // SECTION 1: Pure Timing Unit Tests
  // ==========================================
  console.log('--- 1. Pure Timing Window Logic Unit Tests ---');

  // 14:00 (2:00 PM) on Nov 25, 2026, duration: 75 mins, America/Los_Angeles (PST, UTC-8)
  // 14:00 PST = 22:00 UTC
  // 14:00 + 75 mins = 15:15 PST = 23:15 UTC
  const bookingConfig = {
    bookingDate: '2026-11-25',
    bookingTime: '14:00',
    durationMinutes: 75,
    timeZone: 'America/Los_Angeles',
  };

  const startUtc = calculateExperienceStartBoundary(bookingConfig);
  const endUtc = calculateExperienceEndBoundary(bookingConfig);

  assert(
    startUtc.toISOString() === '2026-11-25T22:00:00.000Z',
    'Experience start calculated accurately in winery timezone (Nov 25 14:00 PST -> 22:00:00Z)'
  );
  assert(
    endUtc.toISOString() === '2026-11-25T23:15:00.000Z',
    'Experience end calculated accurately: scheduledStart + durationMinutes (75 mins -> Nov 25 23:15:00Z)'
  );

  // Timezone check: New York timezone (EST, UTC-5)
  // 14:00 EST = 19:00 UTC
  const nyStart = calculateExperienceStartBoundary({ ...bookingConfig, timeZone: 'America/New_York' });
  assert(
    nyStart.toISOString() === '2026-11-25T19:00:00.000Z',
    'Winery timezone handling verified with America/New_York (14:00 EST -> 19:00:00Z)'
  );

  // Check-In:
  // - booking tomorrow -> rejected
  const timeTomorrow = new Date(startUtc.getTime() - 24 * 60 * 60 * 1000);
  const resTomorrow = getExperienceTimingStatus({ ...bookingConfig, now: timeTomorrow });
  assert(!resTomorrow.isCheckInAvailable && resTomorrow.isBeforeStart, 'Check-in: booking tomorrow -> rejected (before start)');

  // - booking 2 hours in future -> rejected
  const time2HoursFuture = new Date(startUtc.getTime() - 2 * 60 * 60 * 1000);
  const res2Hours = getExperienceTimingStatus({ ...bookingConfig, now: time2HoursFuture });
  assert(!res2Hours.isCheckInAvailable && res2Hours.isBeforeStart, 'Check-in: booking 2 hours in future -> rejected (before start)');

  // - exactly at start time -> allowed
  const timeAtStart = new Date(startUtc.getTime());
  const resAtStart = getExperienceTimingStatus({ ...bookingConfig, now: timeAtStart });
  assert(resAtStart.isCheckInAvailable && !resAtStart.isBeforeStart, 'Check-in: exactly at start time -> allowed');

  // - during experience -> allowed
  const timeDuring = new Date(startUtc.getTime() + 30 * 60 * 1000); // 30 mins into experience
  const resDuring = getExperienceTimingStatus({ ...bookingConfig, now: timeDuring });
  assert(resDuring.isCheckInAvailable && resDuring.isDuringExperience, 'Check-in: during experience -> allowed');

  // - after experience end -> rejected
  const timeAfterEnd = new Date(endUtc.getTime() + 5 * 60 * 1000); // 5 mins after experience ends
  const resAfterEnd = getExperienceTimingStatus({ ...bookingConfig, now: timeAfterEnd });
  assert(!resAfterEnd.isCheckInAvailable && resAfterEnd.isPastEnd, 'Check-in: after experience end -> rejected');

  // No-Show:
  // - booking tomorrow -> rejected
  assert(!resTomorrow.isNoShowAvailable, 'No-show: booking tomorrow -> rejected');

  // - booking during experience -> rejected
  assert(!resDuring.isNoShowAvailable, 'No-show: booking during experience -> rejected');

  // - exactly at experience end -> allowed
  const timeAtEnd = new Date(endUtc.getTime());
  const resAtEnd = getExperienceTimingStatus({ ...bookingConfig, now: timeAtEnd });
  assert(resAtEnd.isNoShowAvailable && resAtEnd.isPastEnd, 'No-show: exactly at experience end -> allowed');

  // - after experience end -> allowed
  assert(resAfterEnd.isNoShowAvailable, 'No-show: after experience end -> allowed');

  // Completion:
  // - CHECKED_IN before experience end -> rejected
  assert(!resDuring.isCompleteAvailable, 'Completion: CHECKED_IN before experience end -> rejected');

  // - CHECKED_IN at/after experience end -> allowed
  assert(resAtEnd.isCompleteAvailable, 'Completion: CHECKED_IN at experience end -> allowed');
  assert(resAfterEnd.isCompleteAvailable, 'Completion: CHECKED_IN after experience end -> allowed');

  // ==========================================
  // SECTION 2: Server-Side Enforcement Tests
  // ==========================================
  console.log('\n--- 2. Server-Side Enforcement (BookingRepository.updateStatus) ---');
  await cleanup();

  try {
    const winery = await prisma.winery.findFirst();
    if (!winery) throw new Error('No winery found');

    const exp75Min = await prisma.experience.create({
      data: {
        wineryId: winery.id,
        slug: `${TEST_PREFIX}harvest-walk-${Date.now()}`,
        title: 'Harvest Morning Viticulture Walk',
        category: 'TOUR',
        durationMinutes: 75,
        durationText: '75 Minutes',
        price: 75,
        currency: 'USD',
        shortDescription: 'Vineyard tour',
        description: 'Detailed vineyard tour',
        capacity: 10,
        minGuests: 1,
        maxGuests: 10,
        isActive: true,
      },
    });

    const testUser = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}guest-${Date.now()}@test.com`,
        passwordHash: 'dummy-hash',
        name: 'Experience Test Guest',
        role: 'GUEST',
      },
    });

    const guestProfile = await prisma.guestProfile.create({
      data: {
        userId: testUser.id,
        name: 'Experience Test Guest',
      },
    });

    // 1. Future booking (Wednesday, November 25, 2026, 14:00)
    const futureBooking = await prisma.booking.create({
      data: {
        wineryId: winery.id,
        guestProfileId: guestProfile.id,
        bookingNumber: `DVR-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        date: new Date('2026-11-25T00:00:00.000Z'),
        time: '14:00',
        adults: 2,
        children: 0,
        totalGuests: 2,
        subtotal: 150,
        taxAmount: 13.5,
        totalPrice: 163.5,
        status: BookingStatus.CONFIRMED,
        items: {
          create: [{
            title: exp75Min.title,
            itemType: 'EXPERIENCE',
            unitPrice: 75,
            quantity: 2,
            totalPrice: 150,
            experienceId: exp75Min.id,
          }],
        },
      },
    });

    // Check-in rejection test on future booking
    let futureCheckInRejected = false;
    let futureCheckInMsg = '';
    try {
      await BookingRepository.updateStatus(futureBooking.id, BookingStatus.CHECKED_IN, 'STAFF_USER', 'Early check-in attempt');
    } catch (e) {
      futureCheckInRejected = true;
      futureCheckInMsg = e instanceof Error ? e.message : String(e);
    }
    assert(futureCheckInRejected, 'Server-side: Future booking check-in rejected');
    assert(
      futureCheckInMsg === 'Check-in is not available until the experience start time.',
      `Error message matches "Check-in is not available until the experience start time." (got "${futureCheckInMsg}")`
    );

    // No-show rejection test on future booking
    let futureNoShowRejected = false;
    let futureNoShowMsg = '';
    try {
      await BookingRepository.updateStatus(futureBooking.id, BookingStatus.NO_SHOW, 'STAFF_USER', 'Early no-show attempt');
    } catch (e) {
      futureNoShowRejected = true;
      futureNoShowMsg = e instanceof Error ? e.message : String(e);
    }
    assert(futureNoShowRejected, 'Server-side: Future booking NO_SHOW rejected');
    assert(
      futureNoShowMsg === 'No-show can only be marked after the experience has ended.',
      `Error message matches "No-show can only be marked after the experience has ended." (got "${futureNoShowMsg}")`
    );

    // Verify booking is still CONFIRMED
    const verifyBooking = await prisma.booking.findUnique({ where: { id: futureBooking.id } });
    assert(verifyBooking?.status === BookingStatus.CONFIRMED, 'Booking remains CONFIRMED in DB');

    // 2. Past ended booking (e.g., 2024-11-25 14:00)
    const pastBooking = await prisma.booking.create({
      data: {
        wineryId: winery.id,
        guestProfileId: guestProfile.id,
        bookingNumber: `DVR-2024-${Math.floor(10000 + Math.random() * 90000)}`,
        date: new Date('2024-11-25T00:00:00.000Z'),
        time: '14:00',
        adults: 2,
        children: 0,
        totalGuests: 2,
        subtotal: 150,
        taxAmount: 13.5,
        totalPrice: 163.5,
        status: BookingStatus.CONFIRMED,
        items: {
          create: [{
            title: exp75Min.title,
            itemType: 'EXPERIENCE',
            unitPrice: 75,
            quantity: 2,
            totalPrice: 150,
            experienceId: exp75Min.id,
          }],
        },
      },
    });

    // Check-in on past ended booking -> rejected
    let pastCheckInRejected = false;
    let pastCheckInMsg = '';
    try {
      await BookingRepository.updateStatus(pastBooking.id, BookingStatus.CHECKED_IN, 'STAFF_USER', 'Past check-in attempt');
    } catch (e) {
      pastCheckInRejected = true;
      pastCheckInMsg = e instanceof Error ? e.message : String(e);
    }
    assert(pastCheckInRejected, 'Server-side: Past ended booking check-in rejected');
    assert(
      pastCheckInMsg === 'Cannot check in guests for an experience that has already ended.',
      `Error message matches "Cannot check in guests for an experience that has already ended." (got "${pastCheckInMsg}")`
    );

    // No-show on past ended booking -> allowed
    const updatedNoShow = await BookingRepository.updateStatus(pastBooking.id, BookingStatus.NO_SHOW, 'STAFF_USER', 'Past experience no-show');
    assert(updatedNoShow.status === BookingStatus.NO_SHOW, 'Server-side: Past ended booking NO_SHOW allowed');

    // 3. Early completion test:
    // Create a CHECKED_IN future booking
    const checkedInFutureBooking = await prisma.booking.create({
      data: {
        wineryId: winery.id,
        guestProfileId: guestProfile.id,
        bookingNumber: `DVR-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        date: new Date('2026-11-25T00:00:00.000Z'),
        time: '14:00',
        adults: 2,
        children: 0,
        totalGuests: 2,
        subtotal: 150,
        taxAmount: 13.5,
        totalPrice: 163.5,
        status: BookingStatus.CHECKED_IN,
        items: {
          create: [{
            title: exp75Min.title,
            itemType: 'EXPERIENCE',
            unitPrice: 75,
            quantity: 2,
            totalPrice: 150,
            experienceId: exp75Min.id,
          }],
        },
      },
    });

    // Attempt early COMPLETED on checked-in future booking -> rejected
    let earlyCompleteRejected = false;
    let earlyCompleteMsg = '';
    try {
      await BookingRepository.updateStatus(checkedInFutureBooking.id, BookingStatus.COMPLETED, 'STAFF_USER', 'Early complete attempt');
    } catch (e) {
      earlyCompleteRejected = true;
      earlyCompleteMsg = e instanceof Error ? e.message : String(e);
    }
    assert(earlyCompleteRejected, 'Server-side: Early completion before experience end rejected');
    assert(
      earlyCompleteMsg === 'Experience cannot be completed before it has ended.',
      `Error message matches "Experience cannot be completed before it has ended." (got "${earlyCompleteMsg}")`
    );

    // 4. Allowed completion test:
    // Create a CHECKED_IN past booking
    const checkedInPastBooking = await prisma.booking.create({
      data: {
        wineryId: winery.id,
        guestProfileId: guestProfile.id,
        bookingNumber: `DVR-2024-${Math.floor(10000 + Math.random() * 90000)}`,
        date: new Date('2024-11-25T00:00:00.000Z'),
        time: '14:00',
        adults: 2,
        children: 0,
        totalGuests: 2,
        subtotal: 150,
        taxAmount: 13.5,
        totalPrice: 163.5,
        status: BookingStatus.CHECKED_IN,
        items: {
          create: [{
            title: exp75Min.title,
            itemType: 'EXPERIENCE',
            unitPrice: 75,
            quantity: 2,
            totalPrice: 150,
            experienceId: exp75Min.id,
          }],
        },
      },
    });

    const updatedComplete = await BookingRepository.updateStatus(checkedInPastBooking.id, BookingStatus.COMPLETED, 'STAFF_USER', 'Completed past visit');
    assert(updatedComplete.status === BookingStatus.COMPLETED, 'Server-side: CHECKED_IN at/after experience end -> COMPLETED allowed');

    // ==========================================
    // SECTION 3: Automated Lifecycle Reconciliation Tests
    // ==========================================
    console.log('\n--- 3. Automated Lifecycle Reconciliation (reconcileExpiredExperienceBookings) ---');

    // 1. Create a CONFIRMED past booking that never checked in
    const unreconciledConfirmedPast = await prisma.booking.create({
      data: {
        wineryId: winery.id,
        guestProfileId: guestProfile.id,
        bookingNumber: `DVR-2024-${Math.floor(10000 + Math.random() * 90000)}`,
        date: new Date('2024-11-20T00:00:00.000Z'),
        time: '14:00',
        adults: 2,
        children: 0,
        totalGuests: 2,
        subtotal: 150,
        taxAmount: 13.5,
        totalPrice: 163.5,
        status: BookingStatus.CONFIRMED,
        items: {
          create: [{
            title: exp75Min.title,
            itemType: 'EXPERIENCE',
            unitPrice: 75,
            quantity: 2,
            totalPrice: 150,
            experienceId: exp75Min.id,
          }],
        },
      },
    });

    // 2. Create a CHECKED_IN past booking
    const unreconciledCheckedInPast = await prisma.booking.create({
      data: {
        wineryId: winery.id,
        guestProfileId: guestProfile.id,
        bookingNumber: `DVR-2024-${Math.floor(10000 + Math.random() * 90000)}`,
        date: new Date('2024-11-20T00:00:00.000Z'),
        time: '14:00',
        adults: 2,
        children: 0,
        totalGuests: 2,
        subtotal: 150,
        taxAmount: 13.5,
        totalPrice: 163.5,
        status: BookingStatus.CHECKED_IN,
        items: {
          create: [{
            title: exp75Min.title,
            itemType: 'EXPERIENCE',
            unitPrice: 75,
            quantity: 2,
            totalPrice: 150,
            experienceId: exp75Min.id,
          }],
        },
      },
    });

    // Run reconciliation
    const reconcileRes = await BookingRepository.reconcileExpiredExperienceBookings(winery.id);
    assert(reconcileRes.noShowCount >= 1, 'Reconciliation: at least 1 past CONFIRMED transitioned to NO_SHOW');
    assert(reconcileRes.completedCount >= 1, 'Reconciliation: at least 1 past CHECKED_IN transitioned to COMPLETED');
    assert(reconcileRes.updatedBookingNumbers.includes(unreconciledConfirmedPast.bookingNumber), 'Reconciliation: included unreconciledConfirmedPast');
    assert(reconcileRes.updatedBookingNumbers.includes(unreconciledCheckedInPast.bookingNumber), 'Reconciliation: included unreconciledCheckedInPast');

    // Verify DB statuses
    const dbConfirmedPast = await prisma.booking.findUnique({
      where: { id: unreconciledConfirmedPast.id },
      include: { statusHistory: true },
    });
    assert(dbConfirmedPast?.status === BookingStatus.NO_SHOW, 'Reconciliation: past CONFIRMED is now NO_SHOW in database');
    const noShowHistory = dbConfirmedPast?.statusHistory.find(h => h.toStatus === BookingStatus.NO_SHOW);
    assert(noShowHistory?.changedBy === 'SYSTEM_RECONCILIATION', 'Reconciliation: status history recorded changedBy=SYSTEM_RECONCILIATION');

    const dbCheckedInPast = await prisma.booking.findUnique({
      where: { id: unreconciledCheckedInPast.id },
      include: { statusHistory: true },
    });
    assert(dbCheckedInPast?.status === BookingStatus.COMPLETED, 'Reconciliation: past CHECKED_IN is now COMPLETED in database');

    // Verify future booking was NOT touched
    const dbFuture = await prisma.booking.findUnique({ where: { id: futureBooking.id } });
    assert(dbFuture?.status === BookingStatus.CONFIRMED, 'Reconciliation: future CONFIRMED booking untouched');

    // Repeat run idempotency test
    const repeatRes = await BookingRepository.reconcileExpiredExperienceBookings(winery.id);
    assert(!repeatRes.updatedBookingNumbers.includes(unreconciledConfirmedPast.bookingNumber), 'Idempotency: already reconciled booking not updated again');

  } finally {
    await cleanup();
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal error in experience timing tests:', err);
  process.exit(1);
});
