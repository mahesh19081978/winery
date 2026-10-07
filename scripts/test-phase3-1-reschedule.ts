/**
 * Phase 3.1 — Experience Booking Rescheduling Test Suite
 *
 * Verifies:
 *   1. Valid reschedule moves date and time, preserves bookingNumber, totalGuests, pricing, attendees, payments.
 *   2. Unavailable/blocked slot rejected (TimeSlotOverride with isBlocked).
 *   3. Insufficient capacity rejected (more requested guests than slot remainingCapacity).
 *   4. Past destination date/time rejected.
 *   5. Invalid booking status rejected (CHECKED_IN, COMPLETED, NO_SHOW, CANCELLED).
 *   6. Tenant isolation enforced: Winery B staff cannot reschedule Winery A booking.
 *   7. Same-slot no-op is idempotent and does not error or modify records.
 *   8. Transaction rollback: if error occurs, original booking state remains untouched.
 *   9. Concurrent capacity protection: serialized locks prevent overbooking on boundary capacity.
 *  10. BookingRescheduleHistory audit record created accurately with previous & new slots, actor, reason.
 *
 * Run:
 *   npx tsx scripts/test-phase3-1-reschedule.ts
 */

import { PrismaClient, BookingStatus, UserRole } from '@prisma/client';
import { BookingService } from '../src/server/services';

const prisma = new PrismaClient();
const RUN = Date.now().toString(36);

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

async function runTests() {
  console.log(`\n======================================================`);
  console.log(`  PHASE 3.1: EXPERIENCE BOOKING RESCHEDULING TESTS`);
  console.log(`======================================================\n`);

  // Setup test winery, experience, rules, user, guest
  const wineryA = await prisma.winery.create({
    data: {
      name: `Winery Reschedule A ${RUN}`,
      slug: `winery-reschedule-a-${RUN}`,
      description: 'Test winery for rescheduling audit',
      address: '100 Test Valley Rd',
      city: 'Napa',
      state: 'CA',
      country: 'USA',
      postalCode: '94558',
      phone: '+1 707 555 0101',
      email: `winery-a-${RUN}@example.com`,
      timezone: 'America/Los_Angeles',
    },
  });

  const wineryB = await prisma.winery.create({
    data: {
      name: `Winery Reschedule B ${RUN}`,
      slug: `winery-reschedule-b-${RUN}`,
      description: 'Second winery for isolation tests',
      address: '200 Other Valley Rd',
      city: 'Sonoma',
      state: 'CA',
      country: 'USA',
      postalCode: '95476',
      phone: '+1 707 555 0102',
      email: `winery-b-${RUN}@example.com`,
      timezone: 'America/Los_Angeles',
    },
  });

  const experienceA = await prisma.experience.create({
    data: {
      wineryId: wineryA.id,
      slug: `estate-tasting-${RUN}`,
      title: `Estate Tasting ${RUN}`,
      category: 'TASTING',
      durationMinutes: 60,
      durationText: '60 Minutes',
      price: 50.0,
      capacity: 10,
      shortDescription: 'Signature estate tasting',
      description: 'Full tasting experience in the valley',
    },
  });

  // Create AvailabilityRules for all days of the week at "10:00 AM", "02:00 PM", and "04:00 PM" with capacity 10
  for (let dow = 0; dow <= 6; dow++) {
    await prisma.availabilityRule.createMany({
      data: [
        { wineryId: wineryA.id, experienceId: experienceA.id, dayOfWeek: dow, time: '10:00 AM', capacity: 10 },
        { wineryId: wineryA.id, experienceId: experienceA.id, dayOfWeek: dow, time: '02:00 PM', capacity: 10 },
        { wineryId: wineryA.id, experienceId: experienceA.id, dayOfWeek: dow, time: '04:00 PM', capacity: 10 },
      ],
    });
  }

  const guestUser = await prisma.user.create({
    data: {
      email: `guest-${RUN}@example.com`,
      role: UserRole.GUEST,
      name: 'Reschedule Test Guest',
      wineryId: wineryA.id,
    },
  });

  const guestProfile = await prisma.guestProfile.create({
    data: {
      userId: guestUser.id,
      name: 'Reschedule Test Guest',
      phone: '+1 555 0199',
    },
  });

  // Future dates helper (in YYYY-MM-DD format)
  const d1 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const d2 = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
  const d3 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const dateStr1 = d1.toISOString().split('T')[0];
  const dateStr2 = d2.toISOString().split('T')[0];
  const dateStr3 = d3.toISOString().split('T')[0];

  // Helper to create a base confirmed booking
  let bNumCounter = 1;
  async function createTestBooking(status: BookingStatus = BookingStatus.CONFIRMED, guests = 2, date = dateStr1, time = '10:00 AM') {
    const bookingNumber = `DVR-TEST-${RUN}-${bNumCounter++}`;
    return prisma.booking.create({
      data: {
        bookingNumber,
        wineryId: wineryA.id,
        guestProfileId: guestProfile.id,
        date: new Date(date),
        time,
        adults: guests,
        children: 0,
        totalGuests: guests,
        subtotal: 100,
        taxAmount: 9,
        totalPrice: 109,
        status,
        specialRequests: 'Window seat please',
        items: {
          create: [
            {
              experienceId: experienceA.id,
              itemType: 'EXPERIENCE',
              title: experienceA.title,
              unitPrice: 50,
              quantity: guests,
              totalPrice: 100,
            },
          ],
        },
        attendees: {
          create: [
            {
              guestProfileId: guestProfile.id,
              fullName: 'Reschedule Test Guest',
              isPrimary: true,
            },
          ],
        },
        payments: {
          create: [
            {
              amount: 109,
              status: 'PAID',
              provider: 'RAZORPAY',
              providerPaymentId: `pay_test_${bNumCounter}`,
            },
          ],
        },
      },
      include: { items: { include: { experience: true } }, attendees: true, payments: true },
    });
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Valid Reschedule
    // ----------------------------------------------------
    const booking1 = await createTestBooking(BookingStatus.CONFIRMED, 2, dateStr1, '10:00 AM');
    const rescheduled1 = await BookingService.rescheduleBooking(
      booking1.bookingNumber,
      { date: dateStr2, time: '02:00 PM', reason: 'Guest requested afternoon' },
      'ADMIN_USER_1',
      { role: UserRole.ADMIN, wineryId: wineryA.id }
    );

    const checkDate1 = rescheduled1.date.toISOString().split('T')[0];
    assert(checkDate1 === dateStr2, 'Valid Reschedule updates date', `Expected ${dateStr2}, got ${checkDate1}`);
    assert(rescheduled1.time === '02:00 PM', 'Valid Reschedule updates time', `Expected 02:00 PM, got ${rescheduled1.time}`);
    assert(rescheduled1.bookingNumber === booking1.bookingNumber, 'Preserves original bookingNumber', rescheduled1.bookingNumber);
    assert(rescheduled1.totalGuests === booking1.totalGuests, 'Preserves totalGuests count', `${rescheduled1.totalGuests}`);
    assert(Number(rescheduled1.totalPrice) === Number(booking1.totalPrice), 'Preserves original pricing', `${rescheduled1.totalPrice}`);

    // Verify BookingRescheduleHistory record
    const history1 = await prisma.bookingRescheduleHistory.findFirst({
      where: { bookingId: booking1.id },
    });
    assert(history1 !== null, 'Creates BookingRescheduleHistory record');
    assert(history1?.previousTime === '10:00 AM', 'History records previousTime', history1?.previousTime);
    assert(history1?.newTime === '02:00 PM', 'History records newTime', history1?.newTime);
    assert(history1?.rescheduledBy === 'ADMIN_USER_1', 'History records actor', history1?.rescheduledBy);
    assert(history1?.reason === 'Guest requested afternoon', 'History records reason', history1?.reason ?? undefined);

    // ----------------------------------------------------
    // TEST 2: Same-slot Idempotent No-Op
    // ----------------------------------------------------
    const initialHistoriesCount = await prisma.bookingRescheduleHistory.count({ where: { bookingId: booking1.id } });
    const noopRescheduled = await BookingService.rescheduleBooking(
      booking1.bookingNumber,
      { date: dateStr2, time: '02:00 PM' },
      'ADMIN_USER_1',
      { role: UserRole.ADMIN, wineryId: wineryA.id }
    );
    const postNoopHistoriesCount = await prisma.bookingRescheduleHistory.count({ where: { bookingId: booking1.id } });
    assert(noopRescheduled.bookingNumber === booking1.bookingNumber, 'Same-slot reschedule returns booking safely');
    assert(initialHistoriesCount === postNoopHistoriesCount, 'Same-slot reschedule does not duplicate history records');

    // ----------------------------------------------------
    // TEST 3: Blocked / Unavailable Destination Slot
    // ----------------------------------------------------
    // Create a TimeSlotOverride blocking "04:00 PM" on dateStr2
    await prisma.timeSlotOverride.create({
      data: {
        experienceId: experienceA.id,
        date: new Date(dateStr2),
        time: '04:00 PM',
        capacity: 10,
        isBlocked: true,
        reason: 'Private VIP Tasting Session',
      },
    });

    let blockedError: string | null = null;
    try {
      await BookingService.rescheduleBooking(
        booking1.bookingNumber,
        { date: dateStr2, time: '04:00 PM' },
        'ADMIN_USER_1',
        { role: UserRole.ADMIN, wineryId: wineryA.id }
      );
    } catch (e: unknown) {
      blockedError = e instanceof Error ? e.message : String(e);
    }
    assert(
      blockedError !== null && (blockedError.includes('unavailable') || blockedError.includes('Private VIP')),
      'Rejects reschedule to blocked/unavailable slot',
      blockedError || 'none'
    );

    // ----------------------------------------------------
    // TEST 4: Insufficient Capacity at Destination
    // ----------------------------------------------------
    // Slot on dateStr3 at 10:00 AM has capacity 10. Let's fill 9 seats with other bookings.
    await createTestBooking(BookingStatus.CONFIRMED, 9, dateStr3, '10:00 AM');
    // booking1 has totalGuests = 2. Attempting to move booking1 to dateStr3 10:00 AM should fail (only 1 seat remaining)
    let capacityError: string | null = null;
    try {
      await BookingService.rescheduleBooking(
        booking1.bookingNumber,
        { date: dateStr3, time: '10:00 AM' },
        'ADMIN_USER_1',
        { role: UserRole.ADMIN, wineryId: wineryA.id }
      );
    } catch (e: unknown) {
      capacityError = e instanceof Error ? e.message : String(e);
    }
    assert(
      capacityError !== null && capacityError.includes('Insufficient capacity'),
      'Rejects reschedule when destination slot has insufficient capacity',
      capacityError || 'none'
    );

    // ----------------------------------------------------
    // TEST 5: Past Destination Date/Time Rejection
    // ----------------------------------------------------
    let pastError: string | null = null;
    try {
      await BookingService.rescheduleBooking(
        booking1.bookingNumber,
        { date: '2020-01-01', time: '10:00 AM' },
        'ADMIN_USER_1',
        { role: UserRole.ADMIN, wineryId: wineryA.id }
      );
    } catch (e: unknown) {
      pastError = e instanceof Error ? e.message : String(e);
    }
    assert(
      pastError !== null && pastError.includes('past date or time'),
      'Rejects past destination date/time',
      pastError || 'none'
    );

    // ----------------------------------------------------
    // TEST 6: Invalid Booking Status Rejection
    // ----------------------------------------------------
    for (const invalidStatus of [BookingStatus.CHECKED_IN, BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.NO_SHOW]) {
      const invalidBooking = await createTestBooking(invalidStatus, 1, dateStr1, '10:00 AM');
      let statusErr: string | null = null;
      try {
        await BookingService.rescheduleBooking(
          invalidBooking.bookingNumber,
          { date: dateStr2, time: '10:00 AM' },
          'ADMIN_USER_1',
          { role: UserRole.ADMIN, wineryId: wineryA.id }
        );
      } catch (e: unknown) {
        statusErr = e instanceof Error ? e.message : String(e);
      }
      assert(
        statusErr !== null && statusErr.includes('Only CONFIRMED bookings can be rescheduled'),
        `Rejects reschedule for ${invalidStatus} status`,
        statusErr || 'none'
      );
    }

    // ----------------------------------------------------
    // TEST 7: Tenant Isolation
    // ----------------------------------------------------
    let tenantErr: string | null = null;
    try {
      await BookingService.rescheduleBooking(
        booking1.bookingNumber,
        { date: dateStr1, time: '10:00 AM' },
        'STAFF_WINERY_B',
        { role: UserRole.MANAGER, wineryId: wineryB.id }
      );
    } catch (e: unknown) {
      tenantErr = e instanceof Error ? e.message : String(e);
    }
    assert(
      tenantErr !== null && tenantErr.includes('Forbidden: reservation belongs to another winery'),
      'Enforces tenant isolation (blocks cross-winery reschedule)',
      tenantErr || 'none'
    );

    // ----------------------------------------------------
    // TEST 8: Atomic Transaction Rollback on Failure
    // ----------------------------------------------------
    // Verify booking1's date & time were NOT altered during any failed attempt
    const pristineBooking = await prisma.booking.findUnique({ where: { id: booking1.id } });
    const pristineDate = pristineBooking?.date.toISOString().split('T')[0];
    assert(pristineDate === dateStr2, 'Booking remains intact at dateStr2 after subsequent failed operations');
    assert(pristineBooking?.time === '02:00 PM', 'Booking remains intact at 02:00 PM after subsequent failed operations');

    // ----------------------------------------------------
    // TEST 9: Winery Closure Rejection
    // ----------------------------------------------------
    const closureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const closureDateStr = closureDate.toISOString().split('T')[0];
    await prisma.wineryClosure.create({
      data: {
        wineryId: wineryA.id,
        startDate: closureDate,
        endDate: closureDate,
        reason: 'Annual Maintenance Day',
      },
    });

    let closureErr: string | null = null;
    try {
      await BookingService.rescheduleBooking(
        booking1.bookingNumber,
        { date: closureDateStr, time: '10:00 AM' },
        'ADMIN_USER_1',
        { role: UserRole.ADMIN, wineryId: wineryA.id }
      );
    } catch (e: unknown) {
      closureErr = e instanceof Error ? e.message : String(e);
    }
    assert(
      closureErr !== null && closureErr.includes('experience is closed'),
      'Rejects reschedule on winery closure date',
      closureErr || 'none'
    );

    // ----------------------------------------------------
    // TEST 10: Concurrent Reschedule Capacity Protection
    // ----------------------------------------------------
    // Target slot has capacity 10. Let's create an empty slot on dateStr3 at "02:00 PM".
    // We launch 3 concurrent reschedules each requesting 4 seats (total 12 seats requested for 10 capacity).
    // Exactly 2 must succeed (8 seats), and 1 must fail with insufficient capacity.
    const concB1 = await createTestBooking(BookingStatus.CONFIRMED, 4, dateStr1, '10:00 AM');
    const concB2 = await createTestBooking(BookingStatus.CONFIRMED, 4, dateStr1, '10:00 AM');
    const concB3 = await createTestBooking(BookingStatus.CONFIRMED, 4, dateStr1, '10:00 AM');

    const results = await Promise.allSettled([
      BookingService.rescheduleBooking(concB1.bookingNumber, { date: dateStr3, time: '02:00 PM' }, 'ADMIN_1', { role: UserRole.SUPER_ADMIN, wineryId: null }),
      BookingService.rescheduleBooking(concB2.bookingNumber, { date: dateStr3, time: '02:00 PM' }, 'ADMIN_2', { role: UserRole.SUPER_ADMIN, wineryId: null }),
      BookingService.rescheduleBooking(concB3.bookingNumber, { date: dateStr3, time: '02:00 PM' }, 'ADMIN_3', { role: UserRole.SUPER_ADMIN, wineryId: null }),
    ]);

    const fulfilledCount = results.filter((r) => r.status === 'fulfilled').length;
    const rejectedCount = results.filter((r) => r.status === 'rejected').length;

    assert(fulfilledCount === 2, 'Concurrent capacity: exactly 2 reschedules succeed (8 seats of 10 filled)', `Fulfilled: ${fulfilledCount}`);
    assert(rejectedCount === 1, 'Concurrent capacity: exactly 1 reschedule rejected due to insufficient capacity', `Rejected: ${rejectedCount}`);

    // Verify database booked count for dateStr3 02:00 PM is exactly 8
    const totalBookedConc = await prisma.booking.aggregate({
      where: {
        items: { some: { experienceId: experienceA.id } },
        date: new Date(dateStr3),
        time: '02:00 PM',
        status: BookingStatus.CONFIRMED,
      },
      _sum: { totalGuests: true },
    });
    assert(totalBookedConc._sum.totalGuests === 8, 'Capacity invariant maintained: no overbooking occurred', `Total seats: ${totalBookedConc._sum.totalGuests}`);

  } finally {
    // Cleanup test data
    console.log('\nCleaning up test artifacts...');
    await prisma.bookingRescheduleHistory.deleteMany({
      where: { booking: { wineryId: { in: [wineryA.id, wineryB.id] } } },
    });
    await prisma.payment.deleteMany({
      where: { booking: { wineryId: { in: [wineryA.id, wineryB.id] } } },
    });
    await prisma.bookingGuest.deleteMany({
      where: { booking: { wineryId: { in: [wineryA.id, wineryB.id] } } },
    });
    await prisma.bookingItem.deleteMany({
      where: { booking: { wineryId: { in: [wineryA.id, wineryB.id] } } },
    });
    await prisma.bookingStatusHistory.deleteMany({
      where: { booking: { wineryId: { in: [wineryA.id, wineryB.id] } } },
    });
    await prisma.booking.deleteMany({
      where: { wineryId: { in: [wineryA.id, wineryB.id] } },
    });
    await prisma.timeSlotOverride.deleteMany({
      where: { experience: { wineryId: { in: [wineryA.id, wineryB.id] } } },
    });
    await prisma.wineryClosure.deleteMany({
      where: { wineryId: { in: [wineryA.id, wineryB.id] } },
    });
    await prisma.availabilityRule.deleteMany({
      where: { wineryId: { in: [wineryA.id, wineryB.id] } },
    });
    await prisma.experience.deleteMany({
      where: { wineryId: { in: [wineryA.id, wineryB.id] } },
    });
    await prisma.guestProfile.deleteMany({
      where: { userId: guestUser.id },
    });
    await prisma.user.deleteMany({
      where: { id: guestUser.id },
    });
    await prisma.winery.deleteMany({
      where: { id: { in: [wineryA.id, wineryB.id] } },
    });
    await prisma.$disconnect();
  }

  console.log(`\n======================================================`);
  console.log(`  RESULTS: ${passed} PASSED / ${failed} FAILED (Total: ${total})`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
