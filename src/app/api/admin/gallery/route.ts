import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireApiPermission } from '@/lib/auth/permissions';

const CreateGalleryImageSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(100),
  category: z.string().trim().min(2, 'Category is required'),
  imageUrl: z.string().trim().min(1, 'Image URL is required'),
  caption: z.string().trim().max(1000).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const guard = await requireApiPermission('gallery.manage');
    if (!guard.ok) return guard.response;

    const images = await prisma.galleryImage.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      data: {
        images,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch gallery images';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireApiPermission('gallery.manage');
    if (!guard.ok) return guard.response;
    const session = guard.session;

    const json = await request.json();
    const validated = CreateGalleryImageSchema.parse(json);

    // Get staff winery
    let wineryId = session.wineryId ?? null;
    if (!wineryId) {
      const winery = await prisma.winery.findFirst({ select: { id: true } });
      wineryId = winery?.id ?? null;
    }

    if (!wineryId) {
      return NextResponse.json({ success: false, error: 'Winery context not found' }, { status: 400 });
    }

    // Check title uniqueness within winery
    const existing = await prisma.galleryImage.findFirst({
      where: {
        wineryId,
        title: validated.title,
      },
    });

    let title = validated.title;
    if (existing) {
      title = `${title} (${Date.now().toString().slice(-4)})`;
    }

    const image = await prisma.galleryImage.create({
      data: {
        wineryId,
        title,
        category: validated.category,
        imageUrl: validated.imageUrl,
        caption: validated.caption || null,
        sortOrder: validated.sortOrder,
        isActive: validated.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      data: { image },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Failed to create gallery image';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
