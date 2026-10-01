import { NextRequest, NextResponse } from 'next/server';
import { TastingService } from '@/server/services';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireApiPermission('tastings.manage');
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const tastingSession = await TastingService.getTastingSessionAdmin(id);

    return NextResponse.json({ success: true, data: tastingSession });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch tasting session';
    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
