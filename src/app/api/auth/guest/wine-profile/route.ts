import { NextRequest, NextResponse } from 'next/server';
import { requireGuestSession } from '@/lib/auth/guest';
import { GuestWineProfileService } from '@/server/services';
import { GuestWineProfileUpdateSchema } from '@/server/validators';

export async function GET() {
  try {
    const session = await requireGuestSession();
    const data = await GuestWineProfileService.getWineProfile(session.guestProfileId);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthenticated') {
      return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
    }
    const statusCode = (error as { statusCode?: number })?.statusCode || 500;
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: statusCode });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireGuestSession();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    // Zod strips unknown fields like guestProfileId, userId, email, role, etc.
    const validated = GuestWineProfileUpdateSchema.parse(body);

    const data = await GuestWineProfileService.updateWineProfile(session.guestProfileId, validated);

    return NextResponse.json({
      success: true,
      data,
      message: 'Wine preferences updated successfully',
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthenticated') {
      return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      const firstIssue = (error as { issues?: Array<{ message: string }> }).issues?.[0];
      return NextResponse.json(
        { success: false, error: firstIssue?.message || 'Validation failed', details: error },
        { status: 400 }
      );
    }
    const statusCode = (error as { statusCode?: number })?.statusCode || 400;
    const message = error instanceof Error ? error.message : 'Failed to update wine preferences';
    return NextResponse.json({ success: false, error: message }, { status: statusCode });
  }
}
