import { NextRequest, NextResponse } from 'next/server';
import { EventService } from '@/server/services';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const event = await EventService.getEventBySlug(slug);
    return NextResponse.json({ success: true, data: event });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Event not found';
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
}