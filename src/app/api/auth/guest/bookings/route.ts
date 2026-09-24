import { NextRequest, NextResponse } from 'next/server';
import { requireGuestSession } from '@/lib/auth/guest';
import { GuestBookingService } from '@/server/services';

const VALID_TYPES = new Set(['all', 'experience', 'event']);
const VALID_FILTERS = new Set(['all', 'upcoming', 'past', 'cancelled']);

export async function GET(request: NextRequest) {
  try {
    const session = await requireGuestSession();

    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type') || 'all';
    const filter = searchParams.get('filter') || 'all';

    if (!VALID_TYPES.has(type) || !VALID_FILTERS.has(filter)) {
      return NextResponse.json({ success: false, error: 'Invalid query parameters' }, { status: 400 });
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1) {
      return NextResponse.json({ success: false, error: 'Invalid pagination parameters' }, { status: 400 });
    }

    const result = await GuestBookingService.listForGuest(session.guestProfileId, {
      type: type as 'all' | 'experience' | 'event',
      filter: filter === 'all' ? undefined : (filter as 'upcoming' | 'past' | 'cancelled'),
      page,
      pageSize: Math.min(pageSize, 50),
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthenticated') {
      return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch bookings';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
