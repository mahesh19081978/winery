import { NextRequest, NextResponse } from 'next/server';
import { WineService } from '@/server/services';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const wine = await WineService.getWineBySlug(slug);
    return NextResponse.json({ success: true, data: wine });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Wine not found';
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
}