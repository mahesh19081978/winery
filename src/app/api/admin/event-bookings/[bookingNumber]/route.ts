import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { EventBookingService } from '@/server/services';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ bookingNumber: string }> }
) {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingNumber } = await context.params;
    const booking = await EventBookingService.getEventBookingAdmin(bookingNumber);

    // Admin-safe DTO (no passwords, session data, etc.)
    const dto = {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      totalPrice: booking.totalPrice,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      event: booking.event,
      eventSchedule: booking.eventSchedule,
      guestProfile: booking.guestProfile,
      tickets: booking.tickets,
      statusHistory: booking.statusHistory,
    };

    return NextResponse.json({ success: true, data: dto });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const statusCode = (error as { statusCode: number }).statusCode;
      const message = error instanceof Error ? error.message : 'Event booking not found';
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch event booking';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ bookingNumber: string }> }
) {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingNumber } = await context.params;
    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body?.reason;
    } catch {
      // body optional
    }

    const cancelled = await EventBookingService.cancelBookingAdmin(bookingNumber, reason);

    return NextResponse.json({ success: true, data: cancelled, message: 'Event booking cancelled successfully' });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const statusCode = (error as { statusCode: number }).statusCode;
      const message = error instanceof Error ? error.message : 'Failed to cancel booking';
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to cancel booking';
    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
