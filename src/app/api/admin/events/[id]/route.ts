import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { EventService } from '@/server/services';

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
    const event = await EventService.getEventAdmin(id);

    return NextResponse.json({ success: true, data: event });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch event';
    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
