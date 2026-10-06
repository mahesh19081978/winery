import { NextRequest, NextResponse } from 'next/server';
import { GuestService } from '@/server/services';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireApiPermission('guests.view');
    if (!guard.ok) return guard.response;

    const wineryId = guard.session.role === 'SUPER_ADMIN' ? undefined : (guard.session.wineryId ?? '__no_tenant__');

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const hasBookings = searchParams.get('hasBookings') || undefined;
    const hasTastings = searchParams.get('hasTastings') || undefined;
    const hasReviews = searchParams.get('hasReviews') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const result = await GuestService.listGuests({
      search,
      hasBookings,
      hasTastings,
      hasReviews,
      wineryId,
      page,
      pageSize: Math.min(pageSize, 50),
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch guests';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
