import { NextRequest, NextResponse } from 'next/server';
import { GuestService } from '@/server/services';
import { requireApiPermission } from '@/lib/auth/permissions';
import { z } from 'zod';

const CreateGuestNoteSchema = z.object({
  content: z.string().min(1, 'Note content cannot be empty').max(5000, 'Note content is too long'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireApiPermission('guests.edit', request);
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const authorId = guard.session.userId;
    const wineryId = guard.session.role === 'SUPER_ADMIN' ? undefined : (guard.session.wineryId ?? '__no_tenant__');

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Valid JSON request body is required' },
        { status: 400 }
      );
    }

    const parsed = CreateGuestNoteSchema.safeParse(rawBody);
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

    const note = await GuestService.addNoteAdmin(id, parsed.data.content, authorId, wineryId);

    return NextResponse.json({
      success: true,
      data: note,
      message: 'Note added successfully',
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add note';
    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
