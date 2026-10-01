import { NextRequest, NextResponse } from 'next/server';
import { BookingService } from '@/server/services';
import { BookingStatusUpdateSchema } from '@/server/validators';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ bookingNumber: string }> }
) {
  try {
    const guard = await requireApiPermission('bookings.manage', request);
    if (!guard.ok) return guard.response;
    const session = guard.session;

    const { bookingNumber } = await context.params;
    const body = await request.json();
    const validated = BookingStatusUpdateSchema.parse(body);

    const updated = await BookingService.updateBookingStatus(
      bookingNumber,
      validated.status,
      session.userId,
      validated.notes
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update booking status';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
