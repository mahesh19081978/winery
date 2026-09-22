import { NextResponse } from 'next/server';
import { GuestAuthService } from '@/server/services';

export async function GET() {
  try {
    const guest = await GuestAuthService.getCurrentGuest();
    if (!guest) {
      return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
    }
    // Never expose passwordHash
    return NextResponse.json({ success: true, data: guest });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve session';
    if (message.includes('GUEST_JWT_SECRET') || message.includes('ADMIN_JWT_SECRET')) {
      console.error('[Guest Auth Error]: Server auth config error.');
      return NextResponse.json({ success: false, error: 'Authentication service temporarily unavailable due to server configuration.' }, { status: 500 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
