import { NextRequest, NextResponse } from 'next/server';
import { EventBookingService } from '@/server/services';
import { EventBookingCreateSchema } from '@/server/validators';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = EventBookingCreateSchema.parse(body);

    const booking = await EventBookingService.createBooking(validated);

    // Build customer-facing DTO (avoid leaking internal IDs unnecessarily)
    const dto = {
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      totalPrice: booking.totalPrice.toString(),
      createdAt: booking.createdAt,
      event: booking.event,
      eventSchedule: booking.eventSchedule,
      tickets: booking.tickets.map((t) => ({
        quantity: t.quantity,
        unitPrice: t.unitPrice.toString(),
        ticketType: t.ticketType,
      })),
    };

    return NextResponse.json({ success: true, data: dto }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: (error as { issues?: unknown; errors?: unknown }).issues || (error as { errors?: unknown }).errors || error },
        { status: 400 }
      );
    }

    if (error && typeof error === 'object' && 'statusCode' in error) {
      const statusCode = (error as { statusCode: number }).statusCode;
      const message = error instanceof Error ? error.message : 'Failed to create event booking';
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }

    const message = error instanceof Error ? error.message : 'Failed to create event booking';
    // Map known business errors to appropriate status
    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    if (message.includes('Insufficient capacity')) {
      return NextResponse.json({ success: false, error: message }, { status: 409 });
    }
    if (message.includes('does not belong') || message.includes('not bookable') || message.includes('Duplicate ticket')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
