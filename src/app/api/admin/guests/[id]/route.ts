import { NextRequest, NextResponse } from 'next/server';
import { EventBookingError, GuestDeletionService, GuestService } from '@/server/services';
import { AdminGuestUpdateSchema, GuestDeletionConfirmSchema } from '@/server/validators';
import { requireApiPermission } from '@/lib/auth/permissions';

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof EventBookingError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
  }
  const message = error instanceof Error ? error.message : fallback;
  if (message.includes('not found')) {
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireApiPermission('guests.view');
    if (!guard.ok) return guard.response;

    const wineryId = guard.session.role === 'SUPER_ADMIN' ? undefined : (guard.session.wineryId ?? '__no_tenant__');
    const { id } = await params;
    const guest = await GuestService.getGuestAdmin(id, wineryId);

    return NextResponse.json({ success: true, data: guest });
  } catch (error: unknown) {
    return errorResponse(error, 'Failed to fetch guest');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireApiPermission('guests.edit', request);
    if (!guard.ok) return guard.response;

    const wineryId = guard.session.role === 'SUPER_ADMIN' ? undefined : (guard.session.wineryId ?? '__no_tenant__');
    const { id } = await params;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Valid JSON request body is required' },
        { status: 400 }
      );
    }

    const parsed = AdminGuestUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        { status: 400 }
      );
    }

    const updated = await GuestService.updateGuestAdmin(id, parsed.data, wineryId);

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Guest profile updated successfully',
    });
  } catch (error: unknown) {
    return errorResponse(error, 'Failed to update guest');
  }
}

/**
 * Destructive: erases the guest and every record the schema links to them in a
 * single Prisma transaction. Requires `guest.delete` (SUPER_ADMIN) and an
 * explicit `confirmation: "DELETE"` in the body.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireApiPermission('guest.delete', request);
    if (!guard.ok) return guard.response;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'A JSON body with a `confirmation` field is required' },
        { status: 400 }
      );
    }

    const parsed = GuestDeletionConfirmSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'A JSON body with a `confirmation` field is required' },
        { status: 400 }
      );
    }

    const { id } = await params;
    const result = await GuestDeletionService.delete(guard.session, id, parsed.data);

    return NextResponse.json({
      success: true,
      data: {
        guestId: id,
        deleted: result.deleted,
        impact: result.impact,
      },
      message: 'Guest and all related data permanently deleted',
    });
  } catch (error) {
    return errorResponse(error, 'Failed to delete guest');
  }
}
