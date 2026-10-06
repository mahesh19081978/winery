import { NextResponse } from 'next/server';
import { GuestMergeService } from '@/server/services';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function GET() {
  try {
    const guard = await requireApiPermission('guests.view');
    if (!guard.ok) return guard.response;

    const wineryId =
      guard.session.role === 'SUPER_ADMIN' ? undefined : (guard.session.wineryId ?? '__no_tenant__');

    const duplicates = await GuestMergeService.getDuplicates(wineryId);

    return NextResponse.json({
      success: true,
      data: duplicates,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to detect duplicate guests';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
