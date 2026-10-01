import { NextRequest, NextResponse } from 'next/server';
import { WineService } from '@/server/services';
import { WineCreateSchema } from '@/server/validators';
import { requireApiPermission } from '@/lib/auth/permissions';


export async function GET(request: NextRequest) {
  try {
    const guard = await requireApiPermission('wines.manage');
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const featuredParam = searchParams.get('featured');
    const featured = featuredParam !== null ? featuredParam === 'true' : undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const result = await WineService.listWinesAdmin({
      search,
      category,
      featured,
      page,
      pageSize: Math.min(pageSize, 50),
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch wines';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireApiPermission('wines.manage');
    if (!guard.ok) return guard.response;

    const body = await request.json();
    // Strip forbidden fields unconditionally
    if ('rating' in body) delete body.rating;
    if ('reviewCount' in body) delete body.reviewCount;
    if ('id' in body) delete body.id;
    if ('wineryId' in body) delete body.wineryId;
    if ('createdAt' in body) delete body.createdAt;
    if ('updatedAt' in body) delete body.updatedAt;

    const validated = WineCreateSchema.parse(body);
    const wine = await WineService.createWine(validated);
    return NextResponse.json({ success: true, data: wine }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ZodError') {
      const zod = error as { issues?: unknown; errors?: unknown };
      return NextResponse.json({ success: false, error: 'Validation failed', details: zod.issues || zod.errors }, { status: 400 });
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const sc = (error as { statusCode: number }).statusCode;
      const msg = error instanceof Error ? error.message : 'Failed to create wine';
      return NextResponse.json({ success: false, error: msg }, { status: sc });
    }
    const message = error instanceof Error ? error.message : 'Failed to create wine';
    if (message.includes('already exists')) return NextResponse.json({ success: false, error: message }, { status: 409 });
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
