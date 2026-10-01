import { NextRequest, NextResponse } from 'next/server';
import { WineService } from '@/server/services';
import { WineUpdateSchema } from '@/server/validators';
import { requireApiPermission } from '@/lib/auth/permissions';


export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const guard = await requireApiPermission('wines.manage', request);
    if (!guard.ok) return guard.response;

    const { slug } = await context.params;
    const wine = await WineService.getWineBySlugAdmin(slug);
    return NextResponse.json({ success: true, data: wine });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Wine not found';
    if (message.includes('not found')) return NextResponse.json({ success: false, error: message }, { status: 404 });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const guard = await requireApiPermission('wines.manage', request);
    if (!guard.ok) return guard.response;

    const { slug } = await context.params;
    const body = await request.json();
    if ('rating' in body) delete body.rating;
    if ('reviewCount' in body) delete body.reviewCount;
    if ('id' in body) delete body.id;
    if ('wineryId' in body) delete body.wineryId;
    if ('createdAt' in body) delete body.createdAt;
    if ('updatedAt' in body) delete body.updatedAt;

    const validated = WineUpdateSchema.parse(body);
    const wine = await WineService.updateWine(slug, validated);
    return NextResponse.json({ success: true, data: wine });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ZodError') {
      const zod = error as { issues?: unknown; errors?: unknown };
      return NextResponse.json({ success: false, error: 'Validation failed', details: zod.issues || zod.errors }, { status: 400 });
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const sc = (error as { statusCode: number }).statusCode;
      const msg = error instanceof Error ? error.message : 'Failed to update wine';
      return NextResponse.json({ success: false, error: msg }, { status: sc });
    }
    const message = error instanceof Error ? error.message : 'Failed to update wine';
    if (message.includes('not found')) return NextResponse.json({ success: false, error: message }, { status: 404 });
    if (message.includes('already exists')) return NextResponse.json({ success: false, error: message }, { status: 409 });
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const guard = await requireApiPermission('wines.manage');
    if (!guard.ok) return guard.response;

    const { slug } = await context.params;
    await WineService.deleteWine(slug);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const sc = (error as { statusCode: number }).statusCode;
      const msg = error instanceof Error ? error.message : 'Failed to delete wine';
      return NextResponse.json({ success: false, error: msg }, { status: sc });
    }
    const message = error instanceof Error ? error.message : 'Failed to delete wine';
    if (message.includes('not found')) return NextResponse.json({ success: false, error: message }, { status: 404 });
    if (message.includes('Cannot delete')) return NextResponse.json({ success: false, error: message }, { status: 409 });
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
