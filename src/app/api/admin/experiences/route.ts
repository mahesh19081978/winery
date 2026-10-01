import { NextRequest, NextResponse } from 'next/server';
import { ExperienceService } from '@/server/services';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireApiPermission('experiences.view');
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const isActiveParam = searchParams.get('isActive');
    const isActive = isActiveParam !== null ? isActiveParam === 'true' : undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const result = await ExperienceService.listExperiencesAdmin({
      search,
      category,
      isActive,
      page,
      pageSize: Math.min(pageSize, 50),
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch experiences';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireApiPermission('experiences.manage');
    if (!guard.ok) return guard.response;

    const body = await request.json() as Record<string, unknown>;

    // Build slug from title if not provided
    const title = String(body.title ?? '').trim();
    const slug = String(body.slug ?? '').trim() ||
      title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const wineryId =
      typeof body.wineryId === 'string' && body.wineryId
        ? body.wineryId
        : 'bd1034e9-36ef-463b-a576-019e1193621f';

    const payload: Record<string, unknown> = {
      title,
      slug,
      category: body.category as import('@prisma/client').ExperienceCategory,
      durationMinutes: Number(body.durationMinutes) || 60,
      durationText: String(body.durationText ?? `${Number(body.durationMinutes) || 60} Minutes`).trim(),
      price: Number(body.price) || 0,
      currency: String(body.currency ?? 'USD'),
      shortDescription: String(body.shortDescription ?? '').trim(),
      description: String(body.description ?? '').trim(),
      capacity: Number(body.capacity) || 12,
      minGuests: Number(body.minGuests) || 1,
      maxGuests: Number(body.maxGuests) || 12,
      foodPairing: body.foodPairing ? String(body.foodPairing) : null,
      badge: body.badge ? String(body.badge) : null,
      featured: Boolean(body.featured),
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      highlights: Array.isArray(body.highlights) ? (body.highlights as string[]) : [],
      includedItems: Array.isArray(body.includedItems) ? (body.includedItems as string[]) : [],
      guestExpectations: Array.isArray(body.guestExpectations) ? (body.guestExpectations as string[]) : [],
      importantInfo: Array.isArray(body.importantInfo) ? (body.importantInfo as string[]) : [],
      winery: { connect: { id: wineryId } },
    };

    if (Array.isArray(body.images) && (body.images as unknown[]).length > 0) {
      payload.images = {
        createMany: {
          data: (body.images as { url: string; altText?: string }[]).map((image, index) => ({
            url: image.url,
            altText: image.altText || null,
            isPrimary: index === 0,
            sortOrder: index,
          })),
        },
      };
    }

    if (Array.isArray(body.includedWines) && body.includedWines.length > 0) {
      payload.includedWines = {
        create: (body.includedWines as { wineId: string; notes?: string }[]).map((w, index) => ({
          wine: { connect: { id: w.wineId } },
          notes: w.notes || null,
          sortOrder: index,
        })),
      };
    }

    const result = await ExperienceService.createExperience(payload);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create experience';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

