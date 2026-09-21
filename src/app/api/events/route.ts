import { NextResponse } from 'next/server';
import { EventService } from '@/server/services';

export async function GET() {
  try {
    const events = await EventService.getAllEvents();
    return NextResponse.json({ success: true, data: events });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch events';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}