import { NextRequest, NextResponse } from 'next/server';
import { TastingService } from '@/server/services';
import { TastingRecordCreateSchema } from '@/server/validators';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Query parameter `email` is required' },
        { status: 400 }
      );
    }

    const tastings = await TastingService.getGuestTastings(email);
    return NextResponse.json({ success: true, data: tastings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch tastings';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = TastingRecordCreateSchema.parse(body);

    const record = await TastingService.createTastingRecord(validated);
    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Failed to create tasting record';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}