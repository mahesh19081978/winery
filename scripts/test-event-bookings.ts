import { PrismaClient, Prisma } from '@prisma/client';
import { EventBookingService } from '../src/server/services';
import { prisma as appPrisma } from '../src/lib/db';

const prisma = new PrismaClient();

const TEST_PREFIX = 'test-evt-5-8b-';

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

async function cleanup() {
  // Delete test event bookings first (cascade will handle tickets/history but we do explicit)
  await prisma.eventBookingTicket.deleteMany({
    where: { eventBooking: { bookingNumber: { startsWith: 'EVT-' } , event: { slug: { startsWith: TEST_PREFIX } } } },
  });
  await prisma.eventBookingStatusHistory.deleteMany({
    where: { eventBooking: { event: { slug: { startsWith: TEST_PREFIX } } } },
  });
  await prisma.eventBooking.deleteMany({
    where: { event: { slug: { startsWith: TEST_PREFIX } } },
  });
  // Direct cleanup by slug pattern
  const testEvents = await prisma.event.findMany({ where: { slug: { startsWith: TEST_PREFIX } }, select: { id: true } });
  const ids = testEvents.map((e) => e.id);
  if (ids.length > 0) {
    await prisma.eventTicketType.deleteMany({ where: { eventId: { in: ids } } });
    await prisma.eventSchedule.deleteMany({ where: { eventId: { in: ids } } });
    await prisma.eventFAQ.deleteMany({ where: { eventId: { in: ids } } });
    await prisma.event.deleteMany({ where: { id: { in: ids } } });
  }
  // Cleanup guest profiles/users for test emails
  const testEmails = [
    'event-test-single@example.com',
    'event-test-multi@example.com',
    'event-test-capacity@example.com',
    'event-test-concurrent-a@example.com',
    'event-test-concurrent-b@example.com',
    'event-test-concurrent-c@example.com',
    'event-test-concurrent-d@example.com',
    'event-test-cancel@example.com',
    'event-test-generic@example.com',
    'event-test-pricing@example.com',
    'event-test-guestdup@example.com',
  ];
  for (const email of testEmails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.guestProfile.deleteMany({ where: { userId: user.id } });
      // Also delete any event bookings that reference the guestProfile before deleting user?
      // guestProfile already deleted via cascade? But bookings have Restrict - need to delete bookings first
      await prisma.eventBooking.deleteMany({ where: { guestProfile: { user: { email } } } });
      try {
        await prisma.user.delete({ where: { email } });
      } catch {}
    }
  }
}

async function getWineryId(): Promise<string> {
  const winery = await prisma.winery.findFirst({ where: { slug: 'domaine-elysee' } });
  if (!winery) throw new Error('Default winery not found');
  return winery.id;
}

async function createTestEvent(opts: {
  slug: string;
  title: string;
  ticketTypes: Array<{ name: string; price: number; capacity: number }>;
  isPast?: boolean;
  status?: 'UPCOMING' | 'CANCELLED' | 'COMPLETED';
}): Promise<{ eventId: string; scheduleId: string; ticketTypes: Array<{ id: string; name: string; price: Prisma.Decimal; capacity: number; soldCount: number }> }> {
  const wineryId = await getWineryId();
  const event = await prisma.event.create({
    data: {
      wineryId,
      slug: opts.slug,
      title: opts.title,
      eventDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      timeRange: '6:00 PM – 10:00 PM',
      venue: 'Test Venue',
      price: opts.ticketTypes[0]?.price ?? 50,
      currency: 'USD',
      description: 'Test event for booking service',
      shortDescription: 'Test event short',
      availability: 'AVAILABLE',
      availableTickets: opts.ticketTypes.reduce((sum, t) => sum + t.capacity, 0),
      maxCapacity: opts.ticketTypes.reduce((sum, t) => sum + t.capacity, 0),
      featuredImage: '/test.jpg',
      winesServed: [],
      culinaryMenu: [],
      galleryImages: [],
      isPast: opts.isPast ?? false,
      status: (opts.status as unknown as import('@prisma/client').EventStatus) ?? 'UPCOMING',
      schedules: {
        create: [{ timeSlot: '6:30 PM', activity: 'Welcome', sortOrder: 0 }],
      },
      ticketTypes: {
        create: opts.ticketTypes.map((tt) => ({
          name: tt.name,
          price: tt.price,
          capacity: tt.capacity,
          soldCount: 0,
        })),
      },
    },
    include: { schedules: true, ticketTypes: true },
  });
  return {
    eventId: event.id,
    scheduleId: event.schedules[0].id,
    ticketTypes: event.ticketTypes,
  };
}

async function run() {
  console.log('=== Event Booking Service Tests (Phase 5.8B) ===');
  await cleanup();
  console.log('Cleanup done');

  // wineryId used implicitly via getWineryId in createTestEvent
  void await getWineryId();

  // Setup base event for many tests
  const baseSlug = `${TEST_PREFIX}base-${Date.now()}`;
  const base = await createTestEvent({
    slug: baseSlug,
    title: 'Test Base Event',
    ticketTypes: [
      { name: 'General Admission', price: 75.0, capacity: 20 },
      { name: 'VIP', price: 150.0, capacity: 10 },
    ],
  });
  console.log(`Base event created: ${base.eventId} schedule ${base.scheduleId}`);
  console.log(`TicketTypes: ${base.ticketTypes.map((t) => `${t.name}:${t.id} $${t.price} cap ${t.capacity}`).join(', ')}`);

  const gaId = base.ticketTypes.find((t) => t.name === 'General Admission')!.id;
  const vipId = base.ticketTypes.find((t) => t.name === 'VIP')!.id;

  // 1. Valid single-ticket booking
  try {
    const booking = await EventBookingService.createBooking({
      eventId: base.eventId,
      eventScheduleId: base.scheduleId,
      guestName: 'Single Tester',
      guestEmail: 'event-test-single@example.com',
      guestPhone: '555-0101',
      tickets: [{ eventTicketTypeId: gaId, quantity: 2 }],
    });
    assert(!!booking && booking.bookingNumber.startsWith('EVT-'), '1. Valid single-ticket booking', `bookingNumber=${booking.bookingNumber} totalPrice=${booking.totalPrice}`);
    assert(Number(booking.totalPrice) === 150.0, '1a. Server-side pricing single', `expected 150 got ${booking.totalPrice}`);
    assert(booking.tickets.length === 1 && booking.tickets[0].quantity === 2, '1b. Ticket line correct');
    // Verify soldCount
    const ttAfter = await prisma.eventTicketType.findUnique({ where: { id: gaId } });
    assert(ttAfter?.soldCount === 2, '1c. soldCount incremented', `soldCount=${ttAfter?.soldCount}`);
    // Verify status history
    assert(booking.statusHistory.length === 1 && booking.statusHistory[0].toStatus === 'CONFIRMED', '1d. Status history created');
  } catch (e) {
    assert(false, '1. Valid single-ticket booking', (e as Error).message);
  }

  // 2. Valid multi-ticket booking
  try {
    const booking = await EventBookingService.createBooking({
      eventId: base.eventId,
      eventScheduleId: base.scheduleId,
      guestName: 'Multi Tester',
      guestEmail: 'event-test-multi@example.com',
      guestPhone: '555-0102',
      tickets: [
        { eventTicketTypeId: gaId, quantity: 2 },
        { eventTicketTypeId: vipId, quantity: 1 },
      ],
    });
    assert(!!booking, '2. Valid multi-ticket booking');
    // total should be 2*75 + 1*150 = 300
    assert(Number(booking.totalPrice) === 300.0, '2a. Multi pricing correct', `got ${booking.totalPrice}`);
    assert(booking.tickets.length === 2, '2b. Two ticket lines');
    // Verify totalPrice equals sum of lines
    const sum = booking.tickets.reduce((s, t) => s + Number(t.unitPrice) * t.quantity, 0);
    assert(Number(booking.totalPrice) === sum, '2c. Total equals sum of lines', `sum=${sum} total=${booking.totalPrice}`);
    // Verify duplicate prevention - tickets via unique constraint
    const ttGa = await prisma.eventTicketType.findUnique({ where: { id: gaId } });
    const ttVip = await prisma.eventTicketType.findUnique({ where: { id: vipId } });
    assert(ttGa?.soldCount === 4, '2d. GA soldCount after multi', `soldCount=${ttGa?.soldCount}`);
    assert(ttVip?.soldCount === 1, '2e. VIP soldCount after multi', `soldCount=${ttVip?.soldCount}`);
  } catch (e) {
    assert(false, '2. Valid multi-ticket booking', (e as Error).message);
  }

  // 3. Invalid event
  try {
    await EventBookingService.createBooking({
      eventId: '00000000-0000-4000-a000-000000000000',
      eventScheduleId: base.scheduleId,
      guestName: 'Fail Tester',
      guestEmail: 'event-test-generic@example.com',
      guestPhone: '',
      tickets: [{ eventTicketTypeId: gaId, quantity: 1 }],
    });
    assert(false, '3. Invalid event should fail');
  } catch (e) {
    assert((e as Error).message.includes('not found') || (e as unknown as { statusCode: number }).statusCode === 404, '3. Invalid event rejected', (e as Error).message);
  }

  // 4. Invalid schedule
  try {
    await EventBookingService.createBooking({
      eventId: base.eventId,
      eventScheduleId: '00000000-0000-4000-a000-000000000000',
      guestName: 'Fail Tester',
      guestEmail: 'event-test-generic@example.com',
      guestPhone: '',
      tickets: [{ eventTicketTypeId: gaId, quantity: 1 }],
    });
    assert(false, '4. Invalid schedule should fail');
  } catch (e) {
    assert((e as Error).message.includes('schedule') && (e as Error).message.includes('not found'), '4. Invalid schedule rejected', (e as Error).message);
  }

  // 5. Schedule belonging to another event
  const otherEvent = await createTestEvent({
    slug: `${TEST_PREFIX}other-${Date.now()}`,
    title: 'Other Event',
    ticketTypes: [{ name: 'General Admission', price: 50, capacity: 10 }],
  });
  try {
    await EventBookingService.createBooking({
      eventId: base.eventId,
      eventScheduleId: otherEvent.scheduleId,
      guestName: 'Fail Tester',
      guestEmail: 'event-test-generic@example.com',
      guestPhone: '',
      tickets: [{ eventTicketTypeId: gaId, quantity: 1 }],
    });
    assert(false, '5. Schedule belonging to another event should fail');
  } catch (e) {
    assert((e as Error).message.includes('does not belong'), '5. Schedule ownership validated', (e as Error).message);
  }

  // 6. Invalid ticket type
  try {
    await EventBookingService.createBooking({
      eventId: base.eventId,
      eventScheduleId: base.scheduleId,
      guestName: 'Fail Tester',
      guestEmail: 'event-test-generic@example.com',
      guestPhone: '',
      tickets: [{ eventTicketTypeId: '00000000-0000-4000-a000-000000000000', quantity: 1 }],
    });
    assert(false, '6. Invalid ticket type should fail');
  } catch (e) {
    assert((e as Error).message.includes('Ticket type') && (e as Error).message.includes('not found'), '6. Invalid ticket type rejected', (e as Error).message);
  }

  // 7. Ticket type belonging to another event
  try {
    await EventBookingService.createBooking({
      eventId: base.eventId,
      eventScheduleId: base.scheduleId,
      guestName: 'Fail Tester',
      guestEmail: 'event-test-generic@example.com',
      guestPhone: '',
      tickets: [{ eventTicketTypeId: otherEvent.ticketTypes[0].id, quantity: 1 }],
    });
    assert(false, '7. Ticket type belonging to another event should fail');
  } catch (e) {
    assert((e as Error).message.includes('does not belong'), '7. Ticket type ownership validated', (e as Error).message);
  }

  // 8. Invalid quantity (0) - Zod should catch, but also test via service validator
  // Since we bypass Zod when calling service directly with quantity 0, the service will not catch via Zod, but DB? We'll test Zod schema directly.
  try {
    const { EventBookingCreateSchema } = await import('../src/server/validators');
    EventBookingCreateSchema.parse({
      eventId: base.eventId,
      eventScheduleId: base.scheduleId,
      guestName: 'Fail Tester',
      guestEmail: 'event-test-generic@example.com',
      guestPhone: '',
      tickets: [{ eventTicketTypeId: gaId, quantity: 0 }],
    });
    assert(false, '8. Invalid quantity 0 should fail via Zod');
  } catch (e) {
    assert(true, '8. Invalid quantity rejected via Zod', (e as Error).message.slice(0, 100));
  }

  // 9. Empty ticket selection
  try {
    const { EventBookingCreateSchema } = await import('../src/server/validators');
    EventBookingCreateSchema.parse({
      eventId: base.eventId,
      eventScheduleId: base.scheduleId,
      guestName: 'Fail Tester',
      guestEmail: 'event-test-generic@example.com',
      guestPhone: '',
      tickets: [],
    });
    assert(false, '9. Empty ticket selection should fail');
  } catch (e) {
    assert(true, '9. Empty ticket selection rejected', (e as Error).message.slice(0, 100));
  }

  // 10. Server-side pricing (ensure client cannot spoof price)
  try {
    // Create booking, then change ticket type price in DB, then create another booking and ensure price reflects DB current, not any client value
    // Since client cannot send unitPrice, we verify that totalPrice is based on DB.
    // Also test that if we update price, new booking uses new price.
    const pricingEvent = await createTestEvent({
      slug: `${TEST_PREFIX}pricing-${Date.now()}`,
      title: 'Pricing Test Event',
      ticketTypes: [{ name: 'General Admission', price: 100, capacity: 10 }],
    });
    const pTicketId = pricingEvent.ticketTypes[0].id;
    const b1 = await EventBookingService.createBooking({
      eventId: pricingEvent.eventId,
      eventScheduleId: pricingEvent.scheduleId,
      guestName: 'Pricing Tester',
      guestEmail: 'event-test-pricing@example.com',
      guestPhone: '',
      tickets: [{ eventTicketTypeId: pTicketId, quantity: 1 }],
    });
    assert(Number(b1.totalPrice) === 100, '10a. Initial pricing correct', `got ${b1.totalPrice}`);
    assert(Number(b1.tickets[0].unitPrice) === 100, '10b. unitPrice stored from DB', `got ${b1.tickets[0].unitPrice}`);
    // Update price
    await prisma.eventTicketType.update({ where: { id: pTicketId }, data: { price: 200 } });
    const b2 = await EventBookingService.createBooking({
      eventId: pricingEvent.eventId,
      eventScheduleId: pricingEvent.scheduleId,
      guestName: 'Pricing Tester 2',
      guestEmail: 'event-test-pricing2@example.com',
      guestPhone: '',
      tickets: [{ eventTicketTypeId: pTicketId, quantity: 1 }],
    });
    assert(Number(b2.totalPrice) === 200, '10c. Updated pricing reflects DB price', `got ${b2.totalPrice}`);
  } catch (e) {
    assert(false, '10. Server-side pricing', (e as Error).message);
  }

  // 11. Booking number generation
  try {
    const b = await EventBookingService.createBooking({
      eventId: base.eventId,
      eventScheduleId: base.scheduleId,
      guestName: 'BookingNumber Tester',
      guestEmail: 'event-test-generic@example.com',
      guestPhone: '',
      tickets: [{ eventTicketTypeId: gaId, quantity: 1 }],
    });
    assert(/^EVT-\d{4}-\d{5}$/.test(b.bookingNumber), '11. Booking number format', `got ${b.bookingNumber}`);
    const b2 = await EventBookingService.createBooking({
      eventId: base.eventId,
      eventScheduleId: base.scheduleId,
      guestName: 'BookingNumber Tester2',
      guestEmail: 'event-test-generic2@example.com',
      guestPhone: '',
      tickets: [{ eventTicketTypeId: gaId, quantity: 1 }],
    });
    assert(b.bookingNumber !== b2.bookingNumber, '11a. Booking numbers unique', `${b.bookingNumber} vs ${b2.bookingNumber}`);
  } catch (e) {
    assert(false, '11. Booking number generation', (e as Error).message);
  }

  // 12. Status history creation (already checked, but explicit)
  try {
    const historyEvent = await createTestEvent({
      slug: `${TEST_PREFIX}history-${Date.now()}`,
      title: 'History Test',
      ticketTypes: [{ name: 'General Admission', price: 50, capacity: 10 }],
    });
    const booking = await EventBookingService.createBooking({
      eventId: historyEvent.eventId,
      eventScheduleId: historyEvent.scheduleId,
      guestName: 'History Tester',
      guestEmail: 'event-test-generic@example.com',
      guestPhone: '',
      tickets: [{ eventTicketTypeId: historyEvent.ticketTypes[0].id, quantity: 1 }],
    });
    const history = await prisma.eventBookingStatusHistory.findMany({ where: { eventBookingId: booking.id } });
    assert(history.length === 1, '12. Status history created', `count=${history.length}`);
    assert(history[0].fromStatus === 'PENDING' && history[0].toStatus === 'CONFIRMED', '12a. History from PENDING to CONFIRMED');
  } catch (e) {
    assert(false, '12. Status history', (e as Error).message);
  }

  // 13. Insufficient capacity
  try {
    const capEvent = await createTestEvent({
      slug: `${TEST_PREFIX}insufficient-${Date.now()}`,
      title: 'Insufficient Capacity Event',
      ticketTypes: [{ name: 'General Admission', price: 50, capacity: 2 }],
    });
    // Book 2 (fill)
    await EventBookingService.createBooking({
      eventId: capEvent.eventId,
      eventScheduleId: capEvent.scheduleId,
      guestName: 'Cap Tester',
      guestEmail: 'event-test-capacity@example.com',
      guestPhone: '',
      tickets: [{ eventTicketTypeId: capEvent.ticketTypes[0].id, quantity: 2 }],
    });
    const ttBefore = await prisma.eventTicketType.findUnique({ where: { id: capEvent.ticketTypes[0].id } });
    assert(ttBefore?.soldCount === 2, '13a. Capacity filled', `soldCount=${ttBefore?.soldCount}`);
    // Try to book 1 more - should fail
    try {
      await EventBookingService.createBooking({
        eventId: capEvent.eventId,
        eventScheduleId: capEvent.scheduleId,
        guestName: 'Cap Tester2',
        guestEmail: 'event-test-capacity2@example.com',
        guestPhone: '',
        tickets: [{ eventTicketTypeId: capEvent.ticketTypes[0].id, quantity: 1 }],
      });
      assert(false, '13b. Over-booking should fail');
    } catch (e) {
      assert((e as Error).message.includes('Insufficient capacity'), '13b. Insufficient capacity rejected', (e as Error).message);
    }
    // Ensure no orphan records
    const orphanCheck = await prisma.eventBooking.count({ where: { eventId: capEvent.eventId, guestProfile: { user: { email: 'event-test-capacity2@example.com' } } } });
    assert(orphanCheck === 0, '13c. No orphan booking on insufficient capacity');
    const ttAfter = await prisma.eventTicketType.findUnique({ where: { id: capEvent.ticketTypes[0].id } });
    assert(ttAfter?.soldCount === 2, '13d. soldCount not incremented on failed booking');
    assert(ttAfter!.capacity - ttAfter!.soldCount >= 0, '13e. No negative availability');
  } catch (e) {
    assert(false, '13. Insufficient capacity setup', (e as Error).message);
  }

  // 14. Concurrent overbooking: capacity 4, two requests of 3 => exactly one succeeds, one fails, soldCount 3
  try {
    const concEvent = await createTestEvent({
      slug: `${TEST_PREFIX}conc-over-${Date.now()}`,
      title: 'Concurrent Overbooking Event',
      ticketTypes: [{ name: 'General Admission', price: 75, capacity: 4 }],
    });
    const concTicketId = concEvent.ticketTypes[0].id;
    const p1 = EventBookingService.createBooking({
      eventId: concEvent.eventId,
      eventScheduleId: concEvent.scheduleId,
      guestName: 'Concurrent A',
      guestEmail: 'event-test-concurrent-a@example.com',
      guestPhone: '',
      tickets: [{ eventTicketTypeId: concTicketId, quantity: 3 }],
    });
    const p2 = EventBookingService.createBooking({
      eventId: concEvent.eventId,
      eventScheduleId: concEvent.scheduleId,
      guestName: 'Concurrent B',
      guestEmail: 'event-test-concurrent-b@example.com',
      guestPhone: '',
      tickets: [{ eventTicketTypeId: concTicketId, quantity: 3 }],
    });
    const results = await Promise.allSettled([p1, p2]);
    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failedR = results.filter((r) => r.status === 'rejected');
    assert(succeeded.length === 1 && failedR.length === 1, '14. Concurrent overbooking: exactly one succeeds', `succeeded=${succeeded.length} failed=${failedR.length}`);
    if (failedR.length === 1) {
      const reason = (failedR[0] as PromiseRejectedResult).reason;
      assert((reason as Error).message.includes('Insufficient capacity'), '14a. Failed due to capacity', (reason as Error).message);
    }
    const tt = await prisma.eventTicketType.findUnique({ where: { id: concTicketId } });
    assert(tt?.soldCount === 3, '14b. soldCount = 3 after overbooking test', `soldCount=${tt?.soldCount}`);
    const bookings = await prisma.eventBooking.findMany({ where: { eventId: concEvent.eventId } });
    const totalQty = await prisma.eventBookingTicket.aggregate({
      where: { eventBookingId: { in: bookings.map((b) => b.id) } },
      _sum: { quantity: true },
    });
    assert(totalQty._sum.quantity === 3, '14c. total successful quantity = 3', `qty=${totalQty._sum.quantity}`);
    // No orphan tickets
    const allTickets = await prisma.eventBookingTicket.findMany({ where: { eventBookingId: { in: bookings.map((b) => b.id) } } });
    assert(allTickets.length === 1, '14d. No orphan tickets');
    assert(tt!.capacity - tt!.soldCount >= 0, '14e. No negative availability');
  } catch (e) {
    assert(false, '14. Concurrent overbooking', (e as Error).message);
  }

  // 15. Concurrent bookings that exactly consume capacity: capacity 4, 2+2 => both succeed, soldCount 4
  try {
    const concEvent2 = await createTestEvent({
      slug: `${TEST_PREFIX}conc-exact-${Date.now()}`,
      title: 'Concurrent Exact Capacity Event',
      ticketTypes: [{ name: 'General Admission', price: 75, capacity: 4 }],
    });
    const ticketId = concEvent2.ticketTypes[0].id;
    const p1 = EventBookingService.createBooking({
      eventId: concEvent2.eventId,
      eventScheduleId: concEvent2.scheduleId,
      guestName: 'Concurrent C',
      guestEmail: 'event-test-concurrent-c@example.com',
      guestPhone: '',
      tickets: [{ eventTicketTypeId: ticketId, quantity: 2 }],
    });
    const p2 = EventBookingService.createBooking({
      eventId: concEvent2.eventId,
      eventScheduleId: concEvent2.scheduleId,
      guestName: 'Concurrent D',
      guestEmail: 'event-test-concurrent-d@example.com',
      guestPhone: '',
      tickets: [{ eventTicketTypeId: ticketId, quantity: 2 }],
    });
    const results = await Promise.allSettled([p1, p2]);
    const succeeded = results.filter((r) => r.status === 'fulfilled');
    assert(succeeded.length === 2, '15. Concurrent exact capacity: both succeed', `succeeded=${succeeded.length}`);
    const tt = await prisma.eventTicketType.findUnique({ where: { id: ticketId } });
    assert(tt?.soldCount === 4, '15a. soldCount = 4', `soldCount=${tt?.soldCount}`);
    const bookings = await prisma.eventBooking.findMany({ where: { eventId: concEvent2.eventId } });
    assert(bookings.length === 2, '15b. Two bookings created');
  } catch (e) {
    assert(false, '15. Concurrent exact capacity', (e as Error).message);
  }

  // 16. Cancellation
  let cancelBookingNumber = '';
  let cancelEventId = '';
  let cancelTicketId = '';
  try {
    const cancelEvent = await createTestEvent({
      slug: `${TEST_PREFIX}cancel-${Date.now()}`,
      title: 'Cancellation Event',
      ticketTypes: [{ name: 'General Admission', price: 60, capacity: 10 }],
    });
    cancelEventId = cancelEvent.eventId;
    cancelTicketId = cancelEvent.ticketTypes[0].id;
    const booking = await EventBookingService.createBooking({
      eventId: cancelEvent.eventId,
      eventScheduleId: cancelEvent.scheduleId,
      guestName: 'Cancel Tester',
      guestEmail: 'event-test-cancel@example.com',
      guestPhone: '',
      tickets: [{ eventTicketTypeId: cancelTicketId, quantity: 3 }],
    });
    cancelBookingNumber = booking.bookingNumber;
    assert(booking.status === 'CONFIRMED', '16. Booking created for cancellation');
    const ttBefore = await prisma.eventTicketType.findUnique({ where: { id: cancelTicketId } });
    assert(ttBefore?.soldCount === 3, '16a. soldCount 3 before cancel');
    const cancelled = await EventBookingService.cancelBooking(cancelBookingNumber);
    assert(cancelled.status === 'CANCELLED', '16b. Booking cancelled', `status=${cancelled.status}`);
    const history = await prisma.eventBookingStatusHistory.findMany({ where: { eventBookingId: booking.id } });
    assert(history.length === 2, '16c. Status history includes cancellation', `history=${history.length}`);
    assert(history.some((h) => h.toStatus === 'CANCELLED'), '16d. History has CANCELLED');
  } catch (e) {
    assert(false, '16. Cancellation', (e as Error).message);
  }

  // 17. Capacity release after cancellation
  try {
    const ttAfter = await prisma.eventTicketType.findUnique({ where: { id: cancelTicketId } });
    assert(ttAfter?.soldCount === 0, '17. Capacity released after cancellation', `soldCount=${ttAfter?.soldCount}`);
    // Verify cannot go negative
    assert(ttAfter!.soldCount >= 0, '17a. soldCount not negative');
    // Now new booking should succeed filling capacity again
    const newBooking = await EventBookingService.createBooking({
      eventId: cancelEventId,
      eventScheduleId: (await prisma.eventSchedule.findFirst({ where: { eventId: cancelEventId } }))!.id,
      guestName: 'Cancel Tester 2',
      guestEmail: 'event-test-cancel@example.com',
      guestPhone: '',
      tickets: [{ eventTicketTypeId: cancelTicketId, quantity: 2 }],
    });
    assert(!!newBooking, '17b. New booking succeeds after capacity release');
    const ttFinal = await prisma.eventTicketType.findUnique({ where: { id: cancelTicketId } });
    assert(ttFinal?.soldCount === 2, '17c. soldCount 2 after new booking', `soldCount=${ttFinal?.soldCount}`);
  } catch (e) {
    assert(false, '17. Capacity release', (e as Error).message);
  }

  // 18. Duplicate cancellation protection
  try {
    // cancelBookingNumber already cancelled
    const ttBeforeSecond = await prisma.eventTicketType.findUnique({ where: { id: cancelTicketId } });
    const secondCancel = await EventBookingService.cancelBooking(cancelBookingNumber);
    assert(secondCancel.status === 'CANCELLED', '18. Duplicate cancellation idempotent');
    const ttAfterSecond = await prisma.eventTicketType.findUnique({ where: { id: cancelTicketId } });
    assert(ttAfterSecond?.soldCount === ttBeforeSecond?.soldCount, '18a. No double release', `before=${ttBeforeSecond?.soldCount} after=${ttAfterSecond?.soldCount}`);
    assert(ttAfterSecond!.soldCount >= 0, '18b. No negative after duplicate cancel');
    // Check status history not duplicated more than once for cancellation
    const histories = await prisma.eventBookingStatusHistory.findMany({
      where: { eventBookingId: (await prisma.eventBooking.findUnique({ where: { bookingNumber: cancelBookingNumber } }))!.id },
    });
    const cancelHistories = histories.filter((h) => h.toStatus === 'CANCELLED');
    assert(cancelHistories.length === 1, '18c. Only one CANCELLED history', `count=${cancelHistories.length}`);
  } catch (e) {
    assert(false, '18. Duplicate cancellation protection', (e as Error).message);
  }

  // Additional: Test booking retrieval
  try {
    const retrieved = await EventBookingService.getBookingByNumber(cancelBookingNumber);
    assert(!!retrieved && retrieved.bookingNumber === cancelBookingNumber, '19. Retrieval by bookingNumber', `found ${retrieved.bookingNumber}`);
    assert(retrieved.tickets.length > 0, '19a. Retrieval includes tickets');
  } catch (e) {
    assert(false, '19. Retrieval', (e as Error).message);
  }

  // Additional: Test duplicate ticket type Zod validation
  try {
    const { EventBookingCreateSchema } = await import('../src/server/validators');
    EventBookingCreateSchema.parse({
      eventId: base.eventId,
      eventScheduleId: base.scheduleId,
      guestName: 'Dup Tester',
      guestEmail: 'event-test-generic@example.com',
      guestPhone: '',
      tickets: [
        { eventTicketTypeId: gaId, quantity: 1 },
        { eventTicketTypeId: gaId, quantity: 2 },
      ],
    });
    assert(false, '20. Duplicate ticket type Zod should fail');
  } catch (e) {
    assert(true, '20. Duplicate ticket type rejected', (e as Error).message.slice(0, 80));
  }

  // Additional: Guest duplicate avoidance
  try {
    const email = 'event-test-guestdup@example.com';
    const evt = await createTestEvent({
      slug: `${TEST_PREFIX}guestdup-${Date.now()}`,
      title: 'Guest Dup Event',
      ticketTypes: [{ name: 'General', price: 40, capacity: 10 }],
    });
    await EventBookingService.createBooking({
      eventId: evt.eventId,
      eventScheduleId: evt.scheduleId,
      guestName: 'Guest Dup 1',
      guestEmail: email,
      guestPhone: '',
      tickets: [{ eventTicketTypeId: evt.ticketTypes[0].id, quantity: 1 }],
    });
    const userCountBefore = await prisma.user.count({ where: { email } });
    await EventBookingService.createBooking({
      eventId: evt.eventId,
      eventScheduleId: evt.scheduleId,
      guestName: 'Guest Dup 1',
      guestEmail: email,
      guestPhone: '',
      tickets: [{ eventTicketTypeId: evt.ticketTypes[0].id, quantity: 1 }],
    });
    const userCountAfter = await prisma.user.count({ where: { email } });
    const profileCount = await prisma.guestProfile.count({ where: { user: { email } } });
    assert(userCountBefore === 1 && userCountAfter === 1, '21. No duplicate users for same email');
    assert(profileCount === 1, '21a. No duplicate GuestProfile');
  } catch (e) {
    assert(false, '21. Guest duplicate avoidance', (e as Error).message);
  }

  // Additional: Invalid guest data (email)
  try {
    const { EventBookingCreateSchema } = await import('../src/server/validators');
    EventBookingCreateSchema.parse({
      eventId: base.eventId,
      eventScheduleId: base.scheduleId,
      guestName: 'A', // too short
      guestEmail: 'not-an-email',
      guestPhone: '',
      tickets: [{ eventTicketTypeId: gaId, quantity: 1 }],
    });
    assert(false, '22. Invalid guest data should fail');
  } catch (e) {
    assert(true, '22. Invalid guest data rejected', (e as Error).message.slice(0, 80));
  }

  // Cleanup at end (keep for inspection if needed, but clean)
  // await cleanup(); // uncomment to keep data for manual inspection
  console.log(`\n=== RESULTS: ${passed}/${total} passed, ${failed} failed ===`);
  if (failed > 0) process.exitCode = 1;
  await prisma.$disconnect();
  await appPrisma.$disconnect();
}

run().catch(async (e) => {
  console.error('Fatal error', e);
  process.exit(1);
});
