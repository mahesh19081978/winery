import { NextRequest, NextResponse } from 'next/server';
import { requireGuestSession } from '@/lib/auth/guest';
import { GuestReviewService } from '@/server/services';

// Returns only the authenticated guest's completed visits that are eligible
// for review, with existing-review state attached (alreadyReviewed).
export async function GET(request: NextRequest) {
  try {
    const session = await requireGuestSession();

    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1) {
      return NextResponse.json({ success: false, error: 'Invalid pagination parameters' }, { status: 400 });
    }

    const result = await GuestReviewService.listEligibleForGuest(session.guestProfileId, {
      page,
      pageSize: Math.min(pageSize, 50),
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthenticated') {
      return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch eligible reviews';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
