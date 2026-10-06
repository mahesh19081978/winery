import { NextRequest, NextResponse } from 'next/server';
import { EventBookingService } from '@/server/services';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireApiPermission('eventBookings.manage');
    if (!guard.ok) return guard.response;

    await EventBookingService.reconcileExpiredBookings(guard.session.wineryId || undefined);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const eventId = searchParams.get('eventId') || undefined;
    const eventScheduleId = searchParams.get('eventScheduleId') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const result = await EventBookingService.listEventBookingsAdmin({
      search,
      status,
      eventId,
      eventScheduleId,
      dateFrom,
      dateTo,
      page,
      pageSize: Math.min(pageSize, 50),
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch event bookings';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
