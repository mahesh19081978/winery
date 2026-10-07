import { NextRequest, NextResponse } from 'next/server';
import { EventBookingService } from '@/server/services';
import { EventBookingRescheduleSchema } from '@/server/validators';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ bookingNumber: string }> }
) {
  try {
    const guard = await requireApiPermission('eventBookings.manage', request);
    if (!guard.ok) return guard.response;
    const session = guard.session;

    const { bookingNumber } = await context.params;
    const body = await request.json();
    const validated = EventBookingRescheduleSchema.parse(body);

    const updated = await EventBookingService.rescheduleBooking(
      bookingNumber,
      validated,
      session.userId,
      { role: session.role, wineryId: session.wineryId }
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Event booking rescheduled successfully',
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const statusCode = (error as { statusCode: number }).statusCode;
      const message = error instanceof Error ? error.message : 'Failed to reschedule event booking';
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }

    const message = error instanceof Error ? error.message : 'Failed to reschedule event booking';
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
