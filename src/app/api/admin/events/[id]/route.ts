import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { EventService } from '@/server/services';
import { EventUpdateSchema } from '@/server/validators';

function authCheck(session: Awaited<ReturnType<typeof AuthService.getSession>>) {
  if (!session) return { status: 401 as const, error: 'Unauthorized' };
  if (!AuthService.isStaffRole(session.role)) return { status: 403 as const, error: 'Forbidden' };
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSession();
    const auth = authCheck(session);
    if (auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { id } = await params;
    const event = await EventService.getEventAdmin(id);

    return NextResponse.json({ success: true, data: event });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch event';
    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSession();
    const auth = authCheck(session);
    if (auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { id } = await params;
    const body = await request.json();
    if ('soldCount' in body) delete body.soldCount;
    const validated = EventUpdateSchema.parse(body);
    const event = await EventService.updateEvent(id, validated);
    return NextResponse.json({ success: true, data: event });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ZodError') {
      const zod = error as { issues?: unknown; errors?: unknown };
      return NextResponse.json({ success: false, error: 'Validation failed', details: zod.issues || zod.errors }, { status: 400 });
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const sc = (error as { statusCode: number }).statusCode;
      const msg = error instanceof Error ? error.message : 'Failed to update event';
      return NextResponse.json({ success: false, error: msg }, { status: sc });
    }
    const message = error instanceof Error ? error.message : 'Failed to update event';
    if (message.includes('not found')) return NextResponse.json({ success: false, error: message }, { status: 404 });
    if (message.includes('already exists')) return NextResponse.json({ success: false, error: message }, { status: 409 });
    if (message.includes('Invalid eventDate')) return NextResponse.json({ success: false, error: message }, { status: 400 });
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
