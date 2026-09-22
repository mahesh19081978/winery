import { NextResponse } from 'next/server';
import { GuestAuthService } from '@/server/services';

export async function POST() {
  try {
    await GuestAuthService.logout();
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Logout failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
