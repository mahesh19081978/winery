import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function GET() {
  try {
    const guard = await requireApiPermission('calendar.view');
    if (!guard.ok) return guard.response;

    const { EventBookingService, BookingService } = await import('@/server/services');
    await Promise.all([
      EventBookingService.reconcileExpiredBookings(guard.session.wineryId || undefined),
      BookingService.reconcileExpiredBookings(guard.session.wineryId || undefined),
    ]);

    const isSuperAdmin = guard.session.role === 'SUPER_ADMIN';
    const wineryId = isSuperAdmin ? undefined : (guard.session.wineryId ?? '__no_tenant__');

    const [bookings, eventBookings, events, closures, rules] = await Promise.all([
      prisma.booking.findMany({
        where: wineryId ? { wineryId } : {},
        include: {
          guestProfile: {
            select: { name: true, phone: true, user: { select: { email: true } } },
          },
          items: {
            include: { experience: { select: { title: true, slug: true, durationMinutes: true } } },
          },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.eventBooking.findMany({
        where: wineryId ? { event: { wineryId } } : {},
        include: {
          event: {
            select: { id: true, title: true, slug: true, eventDate: true, timeRange: true, venue: true },
          },
          eventSchedule: {
            select: { id: true, timeSlot: true, activity: true },
          },
          guestProfile: {
            select: { name: true, phone: true, user: { select: { email: true } } },
          },
          tickets: {
            include: { ticketType: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.event.findMany({
        where: wineryId ? { wineryId } : {},
        include: { ticketTypes: true },
        orderBy: { eventDate: 'asc' },
      }),
      prisma.wineryClosure.findMany({
        where: wineryId ? { wineryId } : {},
        orderBy: { startDate: 'asc' },
      }),
      prisma.availabilityRule.findMany({
        where: wineryId ? { wineryId } : {},
        include: { experience: { select: { title: true } } },
        orderBy: { dayOfWeek: 'asc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        bookings,
        eventBookings,
        events,
        closures,
        rules,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch calendar data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
