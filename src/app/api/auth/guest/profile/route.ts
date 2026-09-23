import { NextRequest, NextResponse } from 'next/server';
import { GuestService, GuestAuthService } from '@/server/services';
import { GuestProfileUpdateSchema } from '@/server/validators';
import { requireGuestSession } from '@/lib/auth/guest';

export async function GET() {
  try {
    const session = await requireGuestSession();
    // Identity is derived exclusively from the server-side session.
    const profile = await GuestAuthService.getCurrentGuest();
    if (!profile || profile.email !== session.email || profile.role !== 'GUEST') {
      return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
    }
    return NextResponse.json({ success: true, data: profile });
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireGuestSession();
    const current = await GuestAuthService.getCurrentGuest();
    if (!current || current.email !== session.email || current.role !== 'GUEST') {
      return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await request.json();
    const validated = GuestProfileUpdateSchema.parse(body);

    await GuestService.updateGuestProfile(session.email, validated);
    const updated = await GuestAuthService.getCurrentGuest();
    if (!updated || updated.email !== session.email) {
      return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
    }
    return NextResponse.json({ success: true, data: updated, message: 'Profile updated successfully' });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthenticated') {
      return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error }, { status: 400 });
    }
    const statusCode = (error as { statusCode?: number })?.statusCode || 400;
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    return NextResponse.json({ success: false, error: message }, { status: statusCode });
  }
}
