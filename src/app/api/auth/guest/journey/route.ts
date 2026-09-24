import { NextRequest, NextResponse } from 'next/server';
import { requireGuestSession } from '@/lib/auth/guest';
import { GuestJourneyService } from '@/server/services';

const MAX_SEARCH_LENGTH = 200;

export async function GET(request: NextRequest) {
  try {
    // Identity is derived exclusively from the authenticated session.
    // Client-supplied guestProfileId / userId / email parameters are never read.
    const session = await requireGuestSession();

    const { searchParams } = request.nextUrl;

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1) {
      return NextResponse.json({ success: false, error: 'Invalid pagination parameters' }, { status: 400 });
    }

    const search = searchParams.get('search');
    if (search !== null && search.length > MAX_SEARCH_LENGTH) {
      return NextResponse.json({ success: false, error: 'Search term is too long' }, { status: 400 });
    }

    const result = await GuestJourneyService.listForGuest(session.guestProfileId, {
      page,
      pageSize: Math.min(pageSize, 50),
      search: search ?? undefined,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthenticated') {
      return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch wine journey';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
