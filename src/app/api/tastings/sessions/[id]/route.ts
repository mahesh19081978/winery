import { NextRequest, NextResponse } from 'next/server';
import { TastingService } from '@/server/services';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await TastingService.getTastingSession(id);
    return NextResponse.json({ success: true, data: session });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Tasting session not found';
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
}