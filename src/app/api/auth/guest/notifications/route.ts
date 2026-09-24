import { NextRequest, NextResponse } from 'next/server';
import { requireGuestSession } from '@/lib/auth/guest';
import { GuestNotificationService } from '@/server/services';
import { guestNotificationListQuerySchema, guestNotificationBatchActionSchema } from '@/server/validators';

export async function GET(request: NextRequest) {
  try {
    const session = await requireGuestSession();

    const { searchParams } = request.nextUrl;
    const rawType = searchParams.get('type') ?? undefined;
    const rawPage = searchParams.get('page') ?? undefined;
    const rawPageSize = searchParams.get('pageSize') ?? undefined;

    const parseResult = guestNotificationListQuerySchema.safeParse({
      type: rawType,
      page: rawPage,
      pageSize: rawPageSize,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const result = await GuestNotificationService.listForGuest(session, parseResult.data);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthenticated') {
      return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireGuestSession();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON request body' }, { status: 400 });
    }

    const parseResult = guestNotificationBatchActionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action payload. Supported actions: MARK_ALL_READ',
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const result = await GuestNotificationService.markAllAsRead(session);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthenticated') {
      return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Failed to mark notifications read';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
