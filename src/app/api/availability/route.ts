import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityService } from '@/server/services';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const experienceSlug = searchParams.get('experience');
    const date = searchParams.get('date');

    if (!experienceSlug || !date) {
      return NextResponse.json(
        { success: false, error: 'Query parameters `experience` and `date` (YYYY-MM-DD) are required' },
        { status: 400 }
      );
    }

    const availability = await AvailabilityService.getAvailableSlots(experienceSlug, date);
    return NextResponse.json({ success: true, data: availability });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to calculate availability';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}