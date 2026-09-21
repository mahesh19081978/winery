import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { GuestService } from '@/server/services';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

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
      page,
      pageSize: Math.min(pageSize, 50),
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch guests';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
