import { NextRequest, NextResponse } from 'next/server';
import { BookingService } from '@/server/services';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ bookingNumber: string }> }
) {
  try {
    const { bookingNumber } = await context.params;
    const booking = await BookingService.getBookingByNumber(bookingNumber);
    return NextResponse.json({ success: true, data: booking });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Booking not found';
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ bookingNumber: string }> }
) {
  try {
    const { bookingNumber } = await context.params;
    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // Body is optional on delete
    }

    const cancelled = await BookingService.cancelBooking(bookingNumber, reason);
    return NextResponse.json({ success: true, data: cancelled, message: 'Booking cancelled successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to cancel booking';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}