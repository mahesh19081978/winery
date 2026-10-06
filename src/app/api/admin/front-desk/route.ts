import { NextResponse } from 'next/server';
import { FrontDeskService } from '@/server/services';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function GET() {
  try {
    const guard = await requireApiPermission('frontDesk.access');
    if (!guard.ok) return guard.response;

    const data = await FrontDeskService.getTodayOperations({
      role: guard.session.role,
      wineryId: guard.session.wineryId,
    });
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch front desk operations';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
