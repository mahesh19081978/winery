import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const where: { isActive: boolean; category?: string } = {
      isActive: true,
    };

    if (category && category !== 'All') {
      where.category = category;
    }

    const images = await prisma.galleryImage.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        category: true,
        imageUrl: true,
        caption: true,
        sortOrder: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        images: images.map((img) => ({
          id: img.id,
          title: img.title,
          category: img.category,
          imageUrl: img.imageUrl,
          caption: img.caption || '',
          sortOrder: img.sortOrder,
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch gallery images';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
