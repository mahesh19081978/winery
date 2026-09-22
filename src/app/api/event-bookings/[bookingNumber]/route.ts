import { NextRequest, NextResponse } from 'next/server';
import { EventBookingService } from '@/server/services';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ bookingNumber: string }> }
) {
  try {
    const { bookingNumber } = await context.params;
    const booking = await EventBookingService.getBookingByNumber(bookingNumber);

    // Customer-facing DTO - follows existing public booking lookup convention
    // bookingNumber is treated as public identifier (similar to /api/bookings/[bookingNumber])
    const dto = {
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      totalPrice: booking.totalPrice.toString(),
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      event: {
        slug: booking.event.slug,
        title: booking.event.title,
        eventDate: booking.event.eventDate,
        timeRange: booking.event.timeRange,
        venue: booking.event.venue,
        status: booking.event.status,
      },
      schedule: {
        timeSlot: booking.eventSchedule.timeSlot,
        activity: booking.eventSchedule.activity,
      },
      tickets: booking.tickets.map((t) => ({
        quantity: t.quantity,
        unitPrice: t.unitPrice.toString(),
        ticketType: t.ticketType
          ? {
              name: t.ticketType.name,
              price: t.ticketType.price.toString(),
            }
          : null,
      })),
      guest: {
        name: booking.guestProfile.name,
        email: booking.guestProfile.user.email,
      },
      statusHistory: booking.statusHistory,
    };

    return NextResponse.json({ success: true, data: dto });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const statusCode = (error as { statusCode: number }).statusCode;
      const message = error instanceof Error ? error.message : 'Event booking not found';
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
    const message = error instanceof Error ? error.message : 'Event booking not found';
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

    const cancelled = await EventBookingService.cancelBooking(bookingNumber, reason);

    return NextResponse.json({ success: true, data: cancelled, message: 'Event booking cancelled successfully' });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const statusCode = (error as { statusCode: number }).statusCode;
      const message = error instanceof Error ? error.message : 'Failed to cancel booking';
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to cancel booking';
    // Business rule violations -> 400, not found -> 404
    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
