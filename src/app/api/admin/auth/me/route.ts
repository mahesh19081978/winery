import { NextResponse } from 'next/server';
import { AdminAuthService } from '@/server/services';

export async function GET() {
  try {
    const admin = await AdminAuthService.getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthenticated or unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: true, data: admin });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve session';
    if (message.includes('ADMIN_JWT_SECRET')) {
      console.error('[Admin Auth Error]: Server authentication configuration error.');
      return NextResponse.json(
        { success: false, error: 'Authentication service temporarily unavailable due to server configuration.' },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}