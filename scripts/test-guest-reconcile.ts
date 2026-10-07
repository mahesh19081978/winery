import { prisma } from '../src/lib/db';
import { GuestBookingService } from '../src/server/services';
import { BookingStatus } from '@prisma/client';

const TEST_PREFIX = 'test-guest-reconcile-';
let passed = 0;
let failed = 0;
function ok(msg: string) { console.log(`✅ ${msg}`); passed++; }
function fail(msg: string, e?: unknown) { console.log(`❌ ${msg}${e ? ': ' + (e instanceof Error ? e.message : String(e)) : ''}`); failed++; }
function assert(cond: boolean, msg: string) { if (cond) ok(msg); else fail(msg); }

async function cleanup() {
  // 1. Delete events and event bookings with TEST_PREFIX
  const events = await prisma.event.findMany({
    where: { slug: { startsWith: TEST_PREFIX } },
    select: { id: true },
  });
  const eventIds = events.map(e => e.id);
  if (eventIds.length > 0) {
    const eventBookings = await prisma.eventBooking.findMany({
      where: { eventId: { in: eventIds } },
      select: { id: true },
    });
    const ebIds = eventBookings.map(b => b.id);
    if (ebIds.length > 0) {
      await prisma.eventBookingStatusHistory.deleteMany({
        where: { eventBookingId: { in: ebIds } },
      });
      await prisma.eventBookingTicket.deleteMany({
        where: { eventBookingId: { in: ebIds } },
      });
      await prisma.eventBooking.deleteMany({
        where: { id: { in: ebIds } },
      });
    }
    await prisma.eventSchedule.deleteMany({ where: { eventId: { in: eventIds } } });
    await prisma.eventTicketType.deleteMany({ where: { eventId: { in: eventIds } } });
    await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
  }

  // 2. Delete experiences and bookings with TEST_PREFIX
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

  // 3. Delete users and guest profiles with TEST_PREFIX
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
  console.log('=== Guest Booking List Reconciliation Regression Suite ===\n');
  await cleanup();

  // Find winery
  const winery = await prisma.winery.findFirst({
    select: { id: true, timezone: true },
  });
  if (!winery) {
    throw new Error('No winery found in database');
  }

  // Use a date and time guaranteed to have passed in winery timezone
  const tz = winery.timezone || 'America/Los_Angeles';
  const now = new Date();
  const currentHourInLA = parseInt(
    now.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', hour12: false })
  );
  // If current local hour is < 2 (e.g. 12:45 AM), an experience with 60m min duration
  // starting at 00:01 ends at 01:01 AM (in the future). In that case, use yesterday.
  const targetDate = currentHourInLA >= 2 ? now : new Date(now.getTime() - 86400000);
  const dateStr = targetDate.toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
  const bookingDate = new Date(`${dateStr}T00:00:00.000Z`);

  const pastTime = '00:01';
  const pastTimeRange = '12:01 AM - 12:15 AM';

  // Create Experience
  const exp = await prisma.experience.create({
    data: {
      wineryId: winery.id,
      title: 'Regression Tasting Experience',
      slug: `${TEST_PREFIX}exp-${Date.now()}`,
      category: 'TASTING',
      durationMinutes: 30,
      durationText: '30 Minutes',
      price: 50,
      currency: 'USD',
      shortDescription: 'Regression test experience',
      description: 'Detailed description for regression test',
      capacity: 10,
      minGuests: 1,
      maxGuests: 10,
      isActive: true,
    },
  });

  // Create Event with Schedule
  const evt = await prisma.event.create({
    data: {
      wineryId: winery.id,
      title: 'Regression Evening Gala',
      slug: `${TEST_PREFIX}evt-${Date.now()}`,
      description: 'Regression test event',
      shortDescription: 'Short description for regression test',
      eventDate: bookingDate,
      timeRange: pastTimeRange,
      venue: 'Main Cellar',
      featuredImage: '/images/test-event.jpg',
      availableTickets: 50,
      maxCapacity: 50,
      price: 100,
      currency: 'USD',
      status: 'UPCOMING',
      schedules: {
        create: [{ timeSlot: '12:01 AM - 12:15 AM', activity: 'Tasting', sortOrder: 0 }],
      },
    },
    include: { schedules: true },
  });

  // Create Guest A
  const userA = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}guestA-${Date.now()}@example.com`,
      role: 'GUEST',
    },
  });
  const guestA = await prisma.guestProfile.create({
    data: {
      userId: userA.id,
      name: 'Guest Alice',
    },
  });

  // Create Guest B
  const userB = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}guestB-${Date.now()}@example.com`,
      role: 'GUEST',
    },
  });
  const guestB = await prisma.guestProfile.create({
    data: {
      userId: userB.id,
      name: 'Guest Bob',
    },
  });

  // Setup Case 1: Guest A with CONFIRMED past Experience Booking scheduled earlier today
  const bNumberExpConfirmed = `EXP-A1-${Date.now()}`;
  const bookingExpConfirmed = await prisma.booking.create({
    data: {
      bookingNumber: bNumberExpConfirmed,
      wineryId: winery.id,
      guestProfileId: guestA.id,
      date: bookingDate,
      time: pastTime,
      adults: 1,
      totalGuests: 1,
      subtotal: 50,
      taxAmount: 0,
      totalPrice: 50,
      status: BookingStatus.CONFIRMED,
      items: {
        create: [{
          title: exp.title,
          itemType: 'EXPERIENCE',
          unitPrice: 50,
          quantity: 1,
          totalPrice: 50,
          experienceId: exp.id,
        }],
      },
    },
  });

  // Setup Case 2: Guest A with CHECKED_IN past Experience Booking scheduled earlier today
  const bNumberExpCheckedIn = `EXP-A2-${Date.now()}`;
  const bookingExpCheckedIn = await prisma.booking.create({
    data: {
      bookingNumber: bNumberExpCheckedIn,
      wineryId: winery.id,
      guestProfileId: guestA.id,
      date: bookingDate,
      time: pastTime,
      adults: 1,
      totalGuests: 1,
      subtotal: 50,
      taxAmount: 0,
      totalPrice: 50,
      status: BookingStatus.CHECKED_IN,
      items: {
        create: [{
          title: exp.title,
          itemType: 'EXPERIENCE',
          unitPrice: 50,
          quantity: 1,
          totalPrice: 50,
          experienceId: exp.id,
        }],
      },
    },
  });

  // Setup Case 3: Guest A with CONFIRMED past Event Booking earlier today
  const bNumberEvtConfirmed = `EVT-A3-${Date.now()}`;
  const bookingEvtConfirmed = await prisma.eventBooking.create({
    data: {
      bookingNumber: bNumberEvtConfirmed,
      eventId: evt.id,
      eventScheduleId: evt.schedules[0].id,
      guestProfileId: guestA.id,
      totalPrice: 100,
      status: BookingStatus.CONFIRMED,
    },
  });

  // Setup Case 4: Guest B with CONFIRMED past Experience Booking earlier today
  const bNumberExpB = `EXP-B1-${Date.now()}`;
  const bookingExpB = await prisma.booking.create({
    data: {
      bookingNumber: bNumberExpB,
      wineryId: winery.id,
      guestProfileId: guestB.id,
      date: bookingDate,
      time: pastTime,
      adults: 1,
      totalGuests: 1,
      subtotal: 50,
      taxAmount: 0,
      totalPrice: 50,
      status: BookingStatus.CONFIRMED,
      items: {
        create: [{
          title: exp.title,
          itemType: 'EXPERIENCE',
          unitPrice: 50,
          quantity: 1,
          totalPrice: 50,
          experienceId: exp.id,
        }],
      },
    },
  });

  console.log('--- 1. Testing Case 1: CONFIRMED Experience Booking Reconciles to NO_SHOW ---');
  // First, verify Upcoming list for Guest A
  const upcomingA = await GuestBookingService.listForGuest(guestA.id, { filter: 'upcoming' });
  const inUpcomingExp1 = upcomingA.items.find(i => i.bookingNumber === bNumberExpConfirmed);
  assert(!inUpcomingExp1, 'Case 1: Expired CONFIRMED experience booking is NOT in upcoming list after request');

  const refreshedExp1 = await prisma.booking.findUnique({ where: { id: bookingExpConfirmed.id } });
  assert(refreshedExp1?.status === BookingStatus.NO_SHOW, 'Case 1: DB status transitioned to NO_SHOW');

  const pastA = await GuestBookingService.listForGuest(guestA.id, { filter: 'past' });
  const inPastExp1 = pastA.items.find(i => i.bookingNumber === bNumberExpConfirmed);
  assert(!!inPastExp1 && inPastExp1.status === BookingStatus.NO_SHOW, 'Case 1: Appears in Past list as NO_SHOW');

  console.log('\n--- 2. Testing Case 2: CHECKED_IN Experience Booking Reconciles to COMPLETED ---');
  const inUpcomingExp2 = upcomingA.items.find(i => i.bookingNumber === bNumberExpCheckedIn);
  assert(!inUpcomingExp2, 'Case 2: Expired CHECKED_IN experience booking is NOT in upcoming list');

  const refreshedExp2 = await prisma.booking.findUnique({ where: { id: bookingExpCheckedIn.id } });
  assert(refreshedExp2?.status === BookingStatus.COMPLETED, 'Case 2: DB status transitioned to COMPLETED');

  const inPastExp2 = pastA.items.find(i => i.bookingNumber === bNumberExpCheckedIn);
  assert(!!inPastExp2 && inPastExp2.status === BookingStatus.COMPLETED, 'Case 2: Appears in Past list as COMPLETED');

  console.log('\n--- 3. Testing Case 3: Same-Day Event Booking Reconciles to NO_SHOW ---');
  const inUpcomingEvt = upcomingA.items.find(i => i.bookingNumber === bNumberEvtConfirmed);
  assert(!inUpcomingEvt, 'Case 3: Expired CONFIRMED event booking is NOT in upcoming list');

  const refreshedEvt = await prisma.eventBooking.findUnique({ where: { id: bookingEvtConfirmed.id } });
  assert(refreshedEvt?.status === BookingStatus.NO_SHOW, 'Case 3: DB status transitioned to NO_SHOW');

  const inPastEvt = pastA.items.find(i => i.bookingNumber === bNumberEvtConfirmed);
  assert(!!inPastEvt && inPastEvt.status === BookingStatus.NO_SHOW, 'Case 3: Appears in Past list as NO_SHOW');

  console.log('\n--- 4. Testing Case 4: Cross-Guest Isolation ---');
  // Check Guest B's booking status: should STILL be CONFIRMED because only Guest A made requests!
  const bBooking = await prisma.booking.findUnique({ where: { id: bookingExpB.id } });
  assert(bBooking?.status === BookingStatus.CONFIRMED, 'Case 4: Guest B booking remains CONFIRMED (untouched by Guest A request)');

  // Now when Guest B requests their list, ONLY THEN does it reconcile
  const pastB = await GuestBookingService.listForGuest(guestB.id, { filter: 'past' });
  const inPastB = pastB.items.find(i => i.bookingNumber === bNumberExpB);
  assert(!!inPastB && inPastB.status === BookingStatus.NO_SHOW, 'Case 4: Guest B booking reconciles when Guest B requests');

  const bBookingAfter = await prisma.booking.findUnique({ where: { id: bookingExpB.id } });
  assert(bBookingAfter?.status === BookingStatus.NO_SHOW, 'Case 4: Guest B DB status is now NO_SHOW');

  console.log('\n--- 5. Testing Case 5: Idempotency & Status History Records ---');
  const historiesBefore = await prisma.bookingStatusHistory.findMany({
    where: { bookingId: bookingExpConfirmed.id },
  });
  assert(historiesBefore.length === 1, `Case 5: Exactly 1 status history record created (got ${historiesBefore.length})`);
  assert(historiesBefore[0].changedBy === 'SYSTEM_RECONCILIATION', 'Case 5: changedBy is SYSTEM_RECONCILIATION');

  // Request Guest A list again (repeat calls)
  await GuestBookingService.listForGuest(guestA.id);
  await GuestBookingService.listForGuest(guestA.id, { filter: 'upcoming' });
  await GuestBookingService.listForGuest(guestA.id, { filter: 'past' });

  const historiesAfter = await prisma.bookingStatusHistory.findMany({
    where: { bookingId: bookingExpConfirmed.id },
  });
  assert(historiesAfter.length === 1, `Case 5: Exactly 1 status history record after multiple repeat requests (got ${historiesAfter.length})`);

  console.log(`\nTests finished: ${passed} passed, ${failed} failed.`);
  await cleanup();
}

main().catch(async (e) => {
  console.error('Test execution failed:', e);
  await cleanup().catch(() => {});
  process.exit(1);
});
