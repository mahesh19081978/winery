import { NextRequest, NextResponse } from 'next/server';
import { GuestTagService } from '@/server/services';
import { GuestTagCreateSchema } from '@/server/validators';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireApiPermission('guests.view');
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(request.url);
    const queryWineryId = searchParams.get('wineryId');

    const wineryId =
      guard.session.role === 'SUPER_ADMIN'
        ? queryWineryId || guard.session.wineryId || ''
        : guard.session.wineryId ?? '';

    if (!wineryId) {
      return NextResponse.json({ success: true, data: [] });
    }

    const tags = await GuestTagService.listTags(wineryId);
    return NextResponse.json({ success: true, data: tags });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch guest tags';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireApiPermission('guests.edit', request);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(request.url);
    const queryWineryId = searchParams.get('wineryId');

    const wineryId =
      guard.session.role === 'SUPER_ADMIN'
        ? queryWineryId || guard.session.wineryId || ''
        : guard.session.wineryId ?? '';

    if (!wineryId) {
      return NextResponse.json(
        { success: false, error: 'A winery context is required to create tags' },
        { status: 400 }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Valid JSON required' }, { status: 400 });
    }

    const parsed = GuestTagCreateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const tag = await GuestTagService.createTag(wineryId, parsed.data);
    return NextResponse.json({ success: true, data: tag }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create guest tag';
    if (message.includes('unique') || message.includes('Unique')) {
      return NextResponse.json(
        { success: false, error: 'A tag with this name already exists in this winery' },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
