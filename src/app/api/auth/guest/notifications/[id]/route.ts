import { NextRequest, NextResponse } from 'next/server';
import { requireGuestSession } from '@/lib/auth/guest';
import { GuestNotificationService } from '@/server/services';
import { guestNotificationActionSchema } from '@/server/validators';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireGuestSession();
    const { id } = await context.params;

    const notification = await GuestNotificationService.getForGuest(session, id);
    return NextResponse.json({ success: true, data: notification });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthenticated') {
      return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
    }
    const statusCode = (error as { statusCode?: number })?.statusCode;
    const message = error instanceof Error ? error.message : 'Failed to fetch notification';
    return NextResponse.json({ success: false, error: message }, { status: statusCode || 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireGuestSession();
    const { id } = await context.params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON request body' }, { status: 400 });
    }

    const parseResult = guestNotificationActionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action payload. Supported actions: MARK_READ',
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const updated = await GuestNotificationService.markAsRead(session, id);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthenticated') {
      return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
    }
    const statusCode = (error as { statusCode?: number })?.statusCode;
    const message = error instanceof Error ? error.message : 'Failed to update notification';
    return NextResponse.json({ success: false, error: message }, { status: statusCode || 500 });
  }
}
