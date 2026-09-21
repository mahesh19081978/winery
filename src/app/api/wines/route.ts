import { NextResponse } from 'next/server';
import { WineService } from '@/server/services';

export async function GET() {
  try {
    const wines = await WineService.getAllWines();
    return NextResponse.json({ success: true, data: wines });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch wines';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}