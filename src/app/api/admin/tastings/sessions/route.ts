import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { TastingService } from '@/server/services';
import { TastingSessionCreateSchema } from '@/server/validators';

export async function POST(request: NextRequest) {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = TastingSessionCreateSchema.parse(body);
    const tastingSession = await TastingService.startSessionForBooking(validated);

    return NextResponse.json({ success: true, data: tastingSession }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Failed to start tasting session';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
