import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { AdminReviewService } from '@/server/services';

// Read-only visibility of submitted guest reviews for authorized staff.
// No approval/rejection workflow in this module — status is displayed as stored.
export async function GET(request: NextRequest) {
  try {
    const session = await AuthService.getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }
    if (status && !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status filter' }, { status: 400 });
    }
    if (
      category &&
      !['WINE_TASTING', 'VINEYARD_TOUR', 'EVENTS', 'FOOD'].includes(category)
    ) {
      return NextResponse.json({ success: false, error: 'Invalid category filter' }, { status: 400 });
    }

    const result = await AdminReviewService.list({
      search,
      status,
      category,
      page,
      pageSize: Math.min(pageSize, 50),
      wineryId: session.wineryId || undefined,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch reviews';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
