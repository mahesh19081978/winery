import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

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
