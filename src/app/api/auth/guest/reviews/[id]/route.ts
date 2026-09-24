import { NextRequest, NextResponse } from 'next/server';
import { requireGuestSession } from '@/lib/auth/guest';
import { GuestReviewService } from '@/server/services';

// Fetch a single review. Ownership is enforced by scoping the lookup to the
// authenticated session's guestProfileId — missing and foreign reviews both
// return 404 so existence cannot be probed.
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireGuestSession();
    const { id } = await context.params;

    const review = await GuestReviewService.getForGuest(session.guestProfileId, id);
    return NextResponse.json({ success: true, data: review });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthenticated') {
      return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
    }
    const statusCode = (error as { statusCode?: number })?.statusCode;
    const message = error instanceof Error ? error.message : 'Failed to fetch review';
    return NextResponse.json({ success: false, error: message }, { status: statusCode || 500 });
  }
}
