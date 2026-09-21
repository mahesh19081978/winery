import { NextRequest, NextResponse } from 'next/server';
import { GuestService } from '@/server/services';
import { GuestProfileUpdateSchema } from '@/server/validators';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Query parameter `email` is required' },
        { status: 400 }
      );
    }

    const profile = await GuestService.getGuestProfile(email);
    return NextResponse.json({ success: true, data: profile });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Guest profile not found';
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Query parameter `email` is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = GuestProfileUpdateSchema.parse(body);

    const updated = await GuestService.updateGuestProfile(email, validated);
    return NextResponse.json({ success: true, data: updated, message: 'Profile updated successfully' });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}