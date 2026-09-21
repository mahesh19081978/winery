import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { BookingService } from '@/server/services';
import { BookingStatusUpdateSchema } from '@/server/validators';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ bookingNumber: string }> }
) {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

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
