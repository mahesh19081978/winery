import { NextRequest, NextResponse } from 'next/server';
import { EventBookingError, GuestDeletionService } from '@/server/services';
import { requireApiPermission } from '@/lib/auth/permissions';

/**
 * Read-only inventory of everything a "Delete Guest & All Related Data" action
 * would remove - including the exact payment records linked to the guest.
 * Requires the same `guest.delete` permission as the deletion itself.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireApiPermission('guest.delete', _request);
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const impact = await GuestDeletionService.preview(guard.session, id);

    return NextResponse.json({ success: true, data: impact });
  } catch (error) {
    if (error instanceof EventBookingError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to build deletion impact';
    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
