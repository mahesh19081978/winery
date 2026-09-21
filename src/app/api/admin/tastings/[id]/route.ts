import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { TastingService } from '@/server/services';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

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
