import { NextResponse } from 'next/server';
import { GuestAuthService } from '@/server/services';
import { ConciergeSession } from '@/lib/auth/concierge-session';

export async function POST() {
  try {
    await GuestAuthService.logout();
    await ConciergeSession.resetSession();
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Logout failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
