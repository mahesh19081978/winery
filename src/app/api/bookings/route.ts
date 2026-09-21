import { NextRequest, NextResponse } from 'next/server';
import { BookingService } from '@/server/services';
import { BookingCreateSchema } from '@/server/validators';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = BookingCreateSchema.parse(body);

    const booking = await BookingService.createBooking(validated);
    return NextResponse.json({ success: true, data: booking }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Failed to create booking';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}