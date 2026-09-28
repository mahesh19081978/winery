import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { deleteGalleryFile } from '@/lib/storage';

const UpdateGalleryImageSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(100).optional(),
  category: z.string().trim().min(2, 'Category is required').optional(),
  imageUrl: z.string().trim().min(1, 'Image URL is required').optional(),
  caption: z.string().trim().max(1000).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const json = await request.json();
    const validated = UpdateGalleryImageSchema.parse(json);

    const existing = await prisma.galleryImage.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Gallery image not found' }, { status: 404 });
    }

    const updated = await prisma.galleryImage.update({
      where: { id },
      data: {
        ...(validated.title !== undefined ? { title: validated.title } : {}),
        ...(validated.category !== undefined ? { category: validated.category } : {}),
        ...(validated.imageUrl !== undefined ? { imageUrl: validated.imageUrl } : {}),
        ...(validated.caption !== undefined ? { caption: validated.caption } : {}),
        ...(validated.sortOrder !== undefined ? { sortOrder: validated.sortOrder } : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      data: { image: updated },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Failed to update gallery image';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.galleryImage.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Gallery image not found' }, { status: 404 });
    }

    await prisma.galleryImage.delete({
      where: { id },
    });

    // Delete image from storage (Vercel Blob / local) if applicable
    if (existing.imageUrl) {
      await deleteGalleryFile(existing.imageUrl);
    }

    return NextResponse.json({
      success: true,
      message: 'Gallery image deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete gallery image';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
