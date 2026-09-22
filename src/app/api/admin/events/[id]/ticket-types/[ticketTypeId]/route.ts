import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { EventService } from '@/server/services';
import { EventTicketTypeUpdateSchema } from '@/server/validators';

function authCheck(session: Awaited<ReturnType<typeof AuthService.getSession>>) {
  if (!session) return { status: 401 as const, error: 'Unauthorized' };
  if (!AuthService.isStaffRole(session.role)) return { status: 403 as const, error: 'Forbidden' };
  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ticketTypeId: string }> }
) {
  try {
    const session = await AuthService.getSession();
    const auth = authCheck(session);
    if (auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    const { id, ticketTypeId } = await params;
    const body = await request.json();
    if ('soldCount' in body) delete body.soldCount;
    const validated = EventTicketTypeUpdateSchema.parse(body);
    const ticket = await EventService.updateTicketType(id, ticketTypeId, validated);
    return NextResponse.json({ success: true, data: ticket });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ZodError') {
      const zod = error as { issues?: unknown };
      return NextResponse.json({ success: false, error: 'Validation failed', details: zod.issues }, { status: 400 });
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const sc = (error as { statusCode: number }).statusCode;
      const msg = error instanceof Error ? error.message : 'Failed';
      return NextResponse.json({ success: false, error: msg }, { status: sc });
    }
    const message = error instanceof Error ? error.message : 'Failed to update ticket type';
    if (message.includes('not found')) return NextResponse.json({ success: false, error: message }, { status: 404 });
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; ticketTypeId: string }> }
) {
  try {
    const session = await AuthService.getSession();
    const auth = authCheck(session);
    if (auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    const { id, ticketTypeId } = await params;
    await EventService.deleteTicketType(id, ticketTypeId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const sc = (error as { statusCode: number }).statusCode;
      const msg = error instanceof Error ? error.message : 'Failed';
      return NextResponse.json({ success: false, error: msg }, { status: sc });
    }
    const message = error instanceof Error ? error.message : 'Failed to delete ticket type';
    if (message.includes('not found')) return NextResponse.json({ success: false, error: message }, { status: 404 });
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
