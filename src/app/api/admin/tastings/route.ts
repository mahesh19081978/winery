import { NextRequest, NextResponse } from 'next/server';
import { TastingService } from '@/server/services';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireApiPermission('tastings.manage');
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const hasBooking = searchParams.get('hasBooking') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const session = guard.session;
    const wineryId = session.role === 'SUPER_ADMIN' ? undefined : (session.wineryId ?? '__no_tenant__');

    const result = await TastingService.listTastingSessions({
      search,
      dateFrom,
      dateTo,
      hasBooking,
      wineryId,
      page,
      pageSize: Math.min(pageSize, 50),
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch tasting sessions';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
