import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/server/services';
import { AdminLoginSchema } from '@/server/validators';
import { RateLimiter } from '@/lib/auth/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = RateLimiter.isRateLimited(ip);
    if (rateCheck.limited) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please try again in ${rateCheck.remainingSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validated = AdminLoginSchema.parse(body);

    const admin = await AdminAuthService.login(validated);
    RateLimiter.reset(ip);

    return NextResponse.json({
      success: true,
      data: admin,
      message: 'Authentication successful',
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      const zodErr = error as { issues?: Array<{ message: string }> };
      const specificMsg = zodErr.issues?.[0]?.message || 'Validation failed';
      return NextResponse.json({ success: false, error: specificMsg, details: error }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Authentication failed';
    if (message.includes('ADMIN_JWT_SECRET')) {
      console.error('[Admin Auth Error]: Server authentication configuration error.');
      return NextResponse.json(
        { success: false, error: 'Authentication service temporarily unavailable due to server configuration.' },
        { status: 500 }
      );
    }
    const status = message.includes('Access denied') ? 403 : 401;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}