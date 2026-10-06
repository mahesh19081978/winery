import { NextRequest, NextResponse } from 'next/server';
import { EventBookingService } from '@/server/services';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ bookingNumber: string }> }
) {
  try {
    const guard = await requireApiPermission('eventBookings.manage');
    if (!guard.ok) return guard.response;

    const { bookingNumber } = await context.params;
    const booking = await EventBookingService.getEventBookingAdmin(bookingNumber, {
      role: guard.session.role,
      wineryId: guard.session.wineryId,
    });

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
      payments: booking.payments,
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
    const guard = await requireApiPermission('eventBookings.manage', request);
    if (!guard.ok) return guard.response;

    const { bookingNumber } = await context.params;
    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body?.reason;
    } catch {
      // body optional
    }

    const cancelled = await EventBookingService.cancelBookingAdmin(bookingNumber, reason, {
      role: guard.session.role,
      wineryId: guard.session.wineryId,
    });

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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ bookingNumber: string }> }
) {
  try {
    const guard = await requireApiPermission('eventBookings.manage', request);
    if (!guard.ok) return guard.response;
    const session = guard.session;

    const { bookingNumber } = await context.params;
    const body = await request.json();
    const { BookingStatusUpdateSchema } = await import('@/server/validators');
    const validated = BookingStatusUpdateSchema.parse(body);

    const updated = await EventBookingService.updateBookingStatus(
      bookingNumber,
      validated.status,
      session.userId,
      validated.notes,
      { role: session.role, wineryId: session.wineryId }
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const statusCode = (error as { statusCode: number }).statusCode;
      const message = error instanceof Error ? error.message : 'Failed to update event booking status';
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to update event booking status';
    const status = message.includes('not found') ? 404 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
