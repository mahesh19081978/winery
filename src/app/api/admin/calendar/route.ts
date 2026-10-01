import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function GET() {
  try {
    const guard = await requireApiPermission('calendar.view');
    if (!guard.ok) return guard.response;

    const [bookings, events, closures, rules] = await Promise.all([
      prisma.booking.findMany({
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
      prisma.event.findMany({
        include: { ticketTypes: true },
        orderBy: { eventDate: 'asc' },
      }),
      prisma.wineryClosure.findMany({
        orderBy: { startDate: 'asc' },
      }),
      prisma.availabilityRule.findMany({
        include: { experience: { select: { title: true } } },
        orderBy: { dayOfWeek: 'asc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        bookings,
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
