import { NextRequest, NextResponse } from 'next/server';
import { WineService } from '@/server/services';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireApiPermission } from '@/lib/auth/permissions';
import { deleteWineFile } from '@/lib/storage';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const guard = await requireApiPermission('wines.manage', request);
    if (!guard.ok) return guard.response;

    const { slug } = await context.params;
    const body = await request.json() as { url?: string };
    const url = body.url?.trim() || '';

    const wine = await WineService.getWineBySlugAdmin(slug);
    if (!wine) {
      return NextResponse.json({ success: false, error: 'Wine not found' }, { status: 404 });
    }

    let oldStorageUrlToDelete: string | null = null;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Find current primary image if one exists
      const existingPrimary = await tx.wineImage.findFirst({
        where: { wineId: wine.id, isPrimary: true },
        orderBy: { sortOrder: 'asc' },
      });

      if (url) {
        // SETTING / REPLACING IMAGE
        if (existingPrimary) {
          oldStorageUrlToDelete = existingPrimary.url;
          await tx.wineImage.update({
            where: { id: existingPrimary.id },
            data: { url },
          });
        } else {
          await tx.wineImage.create({
            data: {
              wineId: wine.id,
              url,
              isPrimary: true,
              sortOrder: 0,
            },
          });
        }

        // Ensure only the intended primary record is marked primary
        const primaryId = existingPrimary?.id;
        if (primaryId) {
          await tx.wineImage.updateMany({
            where: {
              wineId: wine.id,
              id: { not: primaryId },
              isPrimary: true,
            },
            data: { isPrimary: false },
          });
        } else {
          // If a new one was created, ensure other records are not primary
          await tx.wineImage.updateMany({
            where: {
              wineId: wine.id,
              url: { not: url },
              isPrimary: true,
            },
            data: { isPrimary: false },
          });
        }
      } else {
        // REMOVING IMAGE: remove only the current primary WineImage
        if (existingPrimary) {
          oldStorageUrlToDelete = existingPrimary.url;
          await tx.wineImage.delete({
            where: { id: existingPrimary.id },
          });
        }
      }
    });

    // Delete the replaced/removed physical image from storage only AFTER the database operation succeeds
    if (oldStorageUrlToDelete && oldStorageUrlToDelete !== url) {
      await deleteWineFile(oldStorageUrlToDelete);
    }

    return NextResponse.json({ success: true, data: { url } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to set wine image';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
