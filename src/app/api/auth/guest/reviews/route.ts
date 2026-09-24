import { NextRequest, NextResponse } from 'next/server';
import { requireGuestSession } from '@/lib/auth/guest';
import { GuestReviewService } from '@/server/services';
import { GuestReviewCreateSchema, GuestReviewListQuerySchema } from '@/server/validators';

// Identity is derived exclusively from the authenticated session.
// Client-supplied guestProfileId / userId / email parameters are never read.
export async function GET(request: NextRequest) {
  try {
    const session = await requireGuestSession();

    const { searchParams } = request.nextUrl;
    const query = GuestReviewListQuerySchema.parse({
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      search: searchParams.get('search') ?? undefined,
    });

    const result = await GuestReviewService.listForGuest(session.guestProfileId, query);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthenticated') {
      return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch reviews';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireGuestSession();

    const body = await request.json();
    // Zod strips unknown keys, so forged guestProfileId / userId / email /
    // status / moderation fields in the body are ignored.
    const validated = GuestReviewCreateSchema.parse(body);

    const review = await GuestReviewService.createForGuest(session, validated);
    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthenticated') {
      return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      const firstIssue = (error as { issues?: Array<{ message: string }> }).issues?.[0];
      return NextResponse.json(
        { success: false, error: firstIssue?.message || 'Validation failed' },
        { status: 400 }
      );
    }
    const statusCode = (error as { statusCode?: number })?.statusCode;
    const message = error instanceof Error ? error.message : 'Failed to submit review';
    return NextResponse.json({ success: false, error: message }, { status: statusCode || 400 });
  }
}
