import { NextRequest, NextResponse } from 'next/server';
import { TastingService } from '@/server/services';
import { TastingSessionCreateSchema } from '@/server/validators';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function POST(request: NextRequest) {
  try {
    const guard = await requireApiPermission('tastings.manage');
    if (!guard.ok) return guard.response;

    const body = await request.json();
    const validated = TastingSessionCreateSchema.parse(body);
    const tastingSession = await TastingService.startSessionForBooking(validated, {
      role: guard.session.role,
      wineryId: guard.session.wineryId,
    });

    return NextResponse.json({ success: true, data: tastingSession }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Failed to start tasting session';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
