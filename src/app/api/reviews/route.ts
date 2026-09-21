import { NextRequest, NextResponse } from 'next/server';
import { ReviewService } from '@/server/services';
import { ReviewCreateSchema } from '@/server/validators';

export async function GET() {
  try {
    const reviews = await ReviewService.getApprovedReviews();
    return NextResponse.json({ success: true, data: reviews });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch reviews';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ReviewCreateSchema.parse(body);

    const review = await ReviewService.createReview(validated);
    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Failed to create review';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}