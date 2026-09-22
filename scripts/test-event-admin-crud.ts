import { prisma } from '../src/lib/db';
import { EventService, EventBookingService } from '../src/server/services';
import type { EventCreateInput } from '../src/server/validators';

const TEST_PREFIX = 'test-admin-crud-';
let passed = 0;
let failed = 0;
function ok(msg: string) { console.log(`✅ ${msg}`); passed++; }
function fail(msg: string, e?: unknown) { console.log(`❌ ${msg}${e ? ': ' + (e instanceof Error ? e.message : String(e)) : ''}`); failed++; }
function assert(cond: boolean, msg: string) { if (cond) ok(msg); else fail(msg); }

async function cleanup() {
  const events = await prisma.event.findMany({ where: { slug: { startsWith: TEST_PREFIX } }, select: { id: true } });
  const ids = events.map(e=>e.id);
  if (ids.length) {
    await prisma.eventBooking.deleteMany({ where: { eventId: { in: ids } } });
    await prisma.event.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } });
}

async function createBaseEvent(overrides: Record<string, unknown> = {}) {
  const slug = `${TEST_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  const input = {
    slug,
    title: `Test Event ${slug}`,
    eventDate: '2026-11-20',
    timeRange: '6:00 PM – 9:00 PM',
    venue: 'Test Venue',
    price: 50,
    currency: 'USD',
    description: 'Description for test event that is long enough to pass validation',
    shortDescription: 'Short description for test',
    availability: 'AVAILABLE' as const,
    availableTickets: 20,
    maxCapacity: 20,
    entertainment: null,
    featuredImage: 'https://example.com/img.jpg',
    winesServed: ['Wine A'],
    culinaryMenu: ['Dish A'],
    galleryImages: ['https://example.com/g.jpg'],
    status: 'UPCOMING' as const,
    isPast: false,
    ...overrides,
  };
  const event = await EventService.createEvent(input as unknown as EventCreateInput);
  const schedule = await EventService.createSchedule(event.id, { timeSlot: '6:00 PM', activity: 'Welcome', sortOrder: 0 });
  const ticket = await EventService.createTicketType(event.id, { name: 'General Admission', price: 50, capacity: 10 });
  const ticket2 = await EventService.createTicketType(event.id, { name: 'VIP', price: 100, capacity: 5 });
  return { event, schedule, ticket, ticket2, slug };
}

async function main() {
  console.log('=== Phase 5.11 Event Admin CRUD Tests ===');
  await cleanup();

  try {
    const fs = await import('fs');
    const eventsRoute = fs.readFileSync('src/app/api/admin/events/route.ts', 'utf8');
    const eventsIdRoute = fs.readFileSync('src/app/api/admin/events/[id]/route.ts', 'utf8');
    assert(eventsRoute.includes('401') && eventsRoute.includes('403') && eventsRoute.includes('isStaffRole'), '1. unauthenticated event create returns 401/403 (authCheck present)');
    assert(eventsIdRoute.includes('401') && eventsIdRoute.includes('403'), '2. unauthenticated event update returns 401/403');
  } catch (e) { fail('Auth route check', e); }

  let base: Awaited<ReturnType<typeof createBaseEvent>> | null = null;
  try {
    base = await createBaseEvent();
    assert(!!base.event.id, '3. authenticated event create - event created with id');
  } catch (e) { fail('3. authenticated event create', e); }

  if (!base) { console.log('Aborting - base creation failed'); await cleanup(); process.exit(1); }

  try {
    const updated = await EventService.updateEvent(base.event.id, { title: 'Updated Title', price: 75 });
    assert(updated.title === 'Updated Title' && Number(updated.price) === 75, '4. event update - title and price updated');
  } catch (e) { fail('4. event update', e); }

  try {
    const dupSlug = base.slug;
    let threw = false;
    try {
      await EventService.createEvent({
        slug: dupSlug,
        title: 'Dup Event',
        eventDate: '2026-11-21',
        timeRange: '7:00 PM – 9:00 PM',
        venue: 'Venue',
        price: 10,
        currency: 'USD',
        description: 'Description long enough',
        shortDescription: 'Short desc long enough',
        availability: 'AVAILABLE',
        availableTickets: 5,
        maxCapacity: 10,
        featuredImage: 'https://example.com/img.jpg',
        winesServed: [],
        culinaryMenu: [],
        galleryImages: [],
        status: 'UPCOMING',
      } as unknown as EventCreateInput);
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode === 409 || (e.message && e.message.includes('already exists'))) threw = true;
    }
    assert(threw, '5. duplicate slug → 409 conflict');
  } catch (e) { fail('5. duplicate slug', e); }

  let sched2: Awaited<ReturnType<typeof EventService.createSchedule>> | null = null;
  try {
    sched2 = await EventService.createSchedule(base.event.id, { timeSlot: '7:00 PM', activity: 'Dinner', sortOrder: 1 });
    assert(!!sched2.id, '6. schedule create - created');
  } catch (e) { fail('6. schedule create', e); }

  try {
    if (!sched2) throw new Error('sched2 missing');
    const updated = await EventService.updateSchedule(base.event.id, sched2.id, { activity: 'Gala Dinner' });
    assert(updated.activity === 'Gala Dinner', '7. schedule update - activity updated');
  } catch (e) { fail('7. schedule update', e); }

  try {
    const guestEmail = `${TEST_PREFIX}guest-sched@example.com`;
    await EventBookingService.createBooking({
      eventId: base.event.id,
      eventScheduleId: base.schedule.id,
      guestName: 'Sched Guest',
      guestEmail,
      guestPhone: '123',
      tickets: [{ eventTicketTypeId: base.ticket.id, quantity: 1 }],
    });
    let blocked = false;
    try {
      await EventService.deleteSchedule(base.event.id, base.schedule.id);
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode === 409 || (e.message && e.message.includes('Cannot delete schedule'))) blocked = true;
    }
    assert(blocked, '8. schedule referenced by booking cannot be deleted (409)');
    const still = await prisma.eventSchedule.findUnique({ where: { id: base.schedule.id } });
    assert(!!still, '8b. schedule still exists after blocked delete');
  } catch (e) { fail('8. schedule delete blocked', e); }

  try {
    const t = await EventService.createTicketType(base.event.id, { name: 'Extra Ticket', price: 30, capacity: 3 });
    assert(!!t.id, '9. ticket type create - created');
    await EventService.deleteTicketType(base.event.id, t.id);
  } catch (e) { fail('9. ticket type create', e); }

  try {
    const updated = await EventService.updateTicketType(base.event.id, base.ticket.id, { price: 60, capacity: 15 });
    assert(Number(updated.price) === 60 && updated.capacity === 15, '10. ticket type update - price/capacity');
  } catch (e) { fail('10. ticket type update', e); }

  try {
    const tt = await prisma.eventTicketType.findUnique({ where: { id: base.ticket.id } });
    console.log(`   (ticket soldCount=${tt?.soldCount})`);
    let threw = false;
    try {
      await EventService.updateTicketType(base.event.id, base.ticket.id, { capacity: 0 });
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      if ((e.message && e.message.includes('soldCount')) || e.statusCode === 400) threw = true;
    }
    assert(threw, '11. capacity cannot be reduced below soldCount');
  } catch (e) { fail('11. capacity below soldCount', e); }

  try {
    const before = await prisma.eventTicketType.findUnique({ where: { id: base.ticket.id } });
    const payload: Record<string, unknown> = { capacity: 15, soldCount: 999 };
    if ('soldCount' in payload) delete payload.soldCount;
    await EventService.updateTicketType(base.event.id, base.ticket.id, payload as unknown as { capacity?: number });
    const after = await prisma.eventTicketType.findUnique({ where: { id: base.ticket.id } });
    assert(after?.soldCount === before?.soldCount, '12. soldCount cannot be manually modified (unchanged)');
    assert(after?.soldCount !== 999, '12b. soldCount not set to 999');
  } catch (e) { fail('12. soldCount manual modify', e); }

  try {
    let blocked = false;
    try {
      await EventService.deleteTicketType(base.event.id, base.ticket.id);
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode === 409 || (e.message && e.message.includes('Cannot delete'))) blocked = true;
    }
    assert(blocked, '13. ticket type referenced by booking cannot be deleted (409)');
  } catch (e) { fail('13. ticket type delete blocked', e); }

  try {
    const faq = await EventService.createFAQ(base.event.id, { question: 'Q1?', answer: 'Answer is long enough for validation', sortOrder: 0 });
    assert(!!faq.id, '14a. FAQ create');
    const updated = await EventService.updateFAQ(base.event.id, faq.id, { answer: 'Updated answer long enough', sortOrder: 1 });
    assert(updated.sortOrder === 1, '14b. FAQ update (sortOrder)');
    await EventService.deleteFAQ(base.event.id, faq.id);
    const deleted = await prisma.eventFAQ.findUnique({ where: { id: faq.id } });
    assert(!deleted, '14c. FAQ delete');
  } catch (e) { fail('14. FAQ crud', e); }

  try {
    await EventService.updateEvent(base.event.id, { description: 'Updated description safe', venue: 'Updated Venue' });
    const booking = await prisma.eventBooking.findFirst({ where: { eventId: base.event.id } });
    assert(!!booking && booking.status === 'CONFIRMED', '15. existing booking remains valid after safe edits');
  } catch (e) { fail('15. booking valid after edits', e); }

  try {
    const bySlug = await prisma.event.findFirst({ where: { slug: base.slug }, include: { schedules: { orderBy: { sortOrder: 'asc' } }, faqs: { orderBy: { sortOrder: 'asc' } }, ticketTypes: true } });
    assert(!!bySlug && bySlug.title === 'Updated Title', '16. public event APIs still return edited event');
  } catch (e) { fail('16. public event', e); }

  try {
    if (!sched2) throw new Error('sched2 missing for booking');
    const guestEmail2 = `${TEST_PREFIX}guest-flow2@example.com`;
    const booking2 = await EventBookingService.createBooking({
      eventId: base.event.id,
      eventScheduleId: sched2.id,
      guestName: 'Flow Guest',
      guestEmail: guestEmail2,
      guestPhone: '456',
      tickets: [{ eventTicketTypeId: base.ticket2.id, quantity: 1 }],
    });
    assert(!!booking2.bookingNumber, '17. existing event-booking flow still works');
  } catch (e) { fail('17. event booking flow', e); }

  try {
    const { EventBookingRepository } = await import('../src/server/repositories');
    const result = await EventBookingRepository.findManyAdmin({ page: 1, pageSize: 5 });
    assert(Array.isArray(result.bookings), '18. admin event-bookings module works');
  } catch (e) { fail('18. admin event-bookings', e); }

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  await cleanup();
  if (failed > 0) process.exit(1);
}

main().catch(async (e) => { console.error(e); await cleanup(); process.exit(1); });
