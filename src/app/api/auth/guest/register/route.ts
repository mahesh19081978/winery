import { NextRequest, NextResponse } from 'next/server';
import { GuestAuthService } from '@/server/services';
import { GuestRegisterSchema } from '@/server/validators';
import { GuestRateLimiter } from '@/lib/auth/guest-rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = GuestRateLimiter.isRateLimited(`register:${ip}`);
    if (rateCheck.limited) {
      return NextResponse.json(
        { success: false, error: `Too many registration attempts. Please try again in ${rateCheck.remainingSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validated = GuestRegisterSchema.parse(body);

    const guest = await GuestAuthService.register(validated);
    GuestRateLimiter.reset(`register:${ip}`);

    return NextResponse.json(
      { success: true, data: guest, message: 'Registration successful' },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ZodError') {
      const zodErr = error as { issues?: Array<{ message: string }> };
      const specificMsg = zodErr.issues?.[0]?.message || 'Validation failed';
      return NextResponse.json({ success: false, error: specificMsg, details: error }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Registration failed';
    if (message.includes('GUEST_JWT_SECRET') || message.includes('ADMIN_JWT_SECRET')) {
      console.error('[Guest Auth Error]: Server auth config error.');
      return NextResponse.json({ success: false, error: 'Authentication service temporarily unavailable due to server configuration.' }, { status: 500 });
    }
    if (message.includes('already registered') || message.includes('Already registered')) {
      return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 409 });
    }
    const status = (error as { statusCode?: number })?.statusCode || 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
