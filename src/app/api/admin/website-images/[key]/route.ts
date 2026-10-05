import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireApiPermission } from '@/lib/auth/permissions';
import { WebsiteImageRepository } from '@/server/repositories';
import { WebsiteImageService } from '@/server/services';
import { getWebsiteImageRoutes, isWebsiteImageKey } from '@/lib/website-images';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  try {
    const guard = await requireApiPermission('website.images.manage', request);
    if (!guard.ok) return guard.response;

    const { key } = await context.params;
    const decodedKey = decodeURIComponent(key);

    if (!isWebsiteImageKey(decodedKey)) {
      return NextResponse.json({ success: false, error: 'Unknown website image key' }, { status: 400 });
    }

    let wineryId = guard.session.wineryId ?? null;
    if (!wineryId) {
      wineryId = await WebsiteImageRepository.findDefaultWineryId();
    }
    if (!wineryId) {
      return NextResponse.json({ success: false, error: 'Winery context not found' }, { status: 400 });
    }

    const result = await WebsiteImageService.resetToDefault({
      wineryId,
      key: decodedKey,
      updatedById: guard.session.userId ?? null,
    });

    for (const route of getWebsiteImageRoutes(decodedKey)) {
      revalidatePath(route);
    }

    return NextResponse.json({ success: true, data: { image: result.record } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset website image';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
