import { NextRequest, NextResponse } from 'next/server';
import { GuestMergeService } from '@/server/services';
import { GuestMergeRequestSchema } from '@/server/validators';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function POST(request: NextRequest) {
  try {
    const guard = await requireApiPermission('guests.merge', request);
    if (!guard.ok) return guard.response;

    const wineryId =
      guard.session.role === 'SUPER_ADMIN' ? undefined : (guard.session.wineryId ?? '__no_tenant__');

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Valid JSON request body is required' },
        { status: 400 }
      );
    }

    const parsed = GuestMergeRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        { status: 400 }
      );
    }

    const result = await GuestMergeService.mergeGuests(
      parsed.data,
      guard.session.userId,
      wineryId
    );

    return NextResponse.json({
      success: true,
      message: 'Guests merged successfully',
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to merge guests';
    const status = message.includes('not found') ? 404 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
