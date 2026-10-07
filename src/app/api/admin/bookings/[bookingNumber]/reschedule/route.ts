import { NextRequest, NextResponse } from 'next/server';
import { BookingService } from '@/server/services';
import { BookingRescheduleSchema } from '@/server/validators';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ bookingNumber: string }> }
) {
  try {
    const guard = await requireApiPermission('bookings.manage', request);
    if (!guard.ok) return guard.response;
    const session = guard.session;

    const { bookingNumber } = await context.params;
    const body = await request.json();
    const validated = BookingRescheduleSchema.parse(body);

    const updated = await BookingService.rescheduleBooking(
      bookingNumber,
      validated,
      session.userId,
      { role: session.role, wineryId: session.wineryId }
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Booking rescheduled successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reschedule booking';
    const status = message.includes('Forbidden')
      ? 403
      : message.includes('not found')
      ? 404
      : message.includes('Insufficient capacity')
      ? 409
      : 400;

    return NextResponse.json({ success: false, error: message }, { status });
  }
}
