import { NextRequest, NextResponse } from 'next/server';
import { AdminReviewService } from '@/server/services';
import { AdminReviewModerationSchema } from '@/server/validators';
import { requireApiPermission } from '@/lib/auth/permissions';


export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireApiPermission('reviews.view');
    if (!guard.ok) return guard.response;
    const session = guard.session;

    const { id } = await params;
    const review = await AdminReviewService.getById(id, session!);

    return NextResponse.json({ success: true, data: review });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const sc = (error as { statusCode: number }).statusCode;
      const msg = error instanceof Error ? error.message : 'Failed to fetch review';
      return NextResponse.json({ success: false, error: msg }, { status: sc });
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch review';
    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireApiPermission('reviews.moderate', request);
    if (!guard.ok) return guard.response;
    const session = guard.session;

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const validated = AdminReviewModerationSchema.parse(body);
    const updated = await AdminReviewService.moderateReview(id, validated, session!);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ZodError') {
      const zod = error as { issues?: unknown; errors?: unknown; message?: string };
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: zod.issues || zod.errors },
        { status: 400 }
      );
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const sc = (error as { statusCode: number }).statusCode;
      const msg = error instanceof Error ? error.message : 'Failed to moderate review';
      return NextResponse.json({ success: false, error: msg }, { status: sc });
    }
    const message = error instanceof Error ? error.message : 'Failed to moderate review';
    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
