import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireApiPermission } from '@/lib/auth/permissions';
import { WebsiteImageRepository } from '@/server/repositories';
import { WebsiteImageService } from '@/server/services';
import { getWebsiteImageRoutes, isWebsiteImageKey } from '@/lib/website-images';

const PatchWebsiteImageSchema = z.object({
  key: z.string().trim().min(1),
  url: z.string().trim().min(1).optional(),
  altText: z.string().trim().max(300).nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  mime: z.string().trim().max(100).nullable().optional(),
  filename: z.string().trim().max(255).nullable().optional(),
  originalUrl: z.string().trim().min(1).nullable().optional(),
  cropData: z
    .object({
      cropX: z.number(),
      cropY: z.number(),
      cropWidth: z.number(),
      cropHeight: z.number(),
      zoom: z.number(),
      targetAspectRatio: z.number(),
      unit: z.enum(['pixel', 'percent']).optional(),
    })
    .nullable()
    .optional(),
});

async function resolveWineryId(sessionWineryId: string | null): Promise<string | null> {
  if (sessionWineryId) return sessionWineryId;
  return WebsiteImageRepository.findDefaultWineryId();
}

function revalidateKeyRoutes(key: string) {
  if (!isWebsiteImageKey(key)) return;
  for (const route of getWebsiteImageRoutes(key)) {
    revalidatePath(route);
  }
}

export async function GET() {
  try {
    const guard = await requireApiPermission('website.images.manage');
    if (!guard.ok) return guard.response;

    const wineryId = await resolveWineryId(guard.session.wineryId);
    if (!wineryId) {
      return NextResponse.json({ success: false, error: 'Winery context not found' }, { status: 400 });
    }

    const images = await WebsiteImageService.getAdminRecords(wineryId);

    return NextResponse.json({
      success: true,
      data: { images },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch website images';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requireApiPermission('website.images.manage');
    if (!guard.ok) return guard.response;

    const json = await request.json();
    const validated = PatchWebsiteImageSchema.parse(json);

    if (!isWebsiteImageKey(validated.key)) {
      return NextResponse.json({ success: false, error: 'Unknown website image key' }, { status: 400 });
    }

    const wineryId = await resolveWineryId(guard.session.wineryId);
    if (!wineryId) {
      return NextResponse.json({ success: false, error: 'Winery context not found' }, { status: 400 });
    }

    const updatedById = guard.session.userId ?? null;
    if (!validated.url && validated.altText === undefined) {
      return NextResponse.json(
        { success: false, error: 'Nothing to update: provide an image URL or alt text' },
        { status: 400 }
      );
    }

    const result = validated.url
      ? await WebsiteImageService.applyCustomImage({
          wineryId,
          key: validated.key,
          url: validated.url,
          altText: validated.altText,
          width: validated.width ?? null,
          height: validated.height ?? null,
          mime: validated.mime ?? null,
          filename: validated.filename ?? null,
          originalUrl: validated.originalUrl ?? null,
          cropData: validated.cropData ?? null,
          updatedById,
        })
      : await WebsiteImageService.saveAltText({
          wineryId,
          key: validated.key,
          altText: validated.altText ?? null,
          updatedById,
        });

    revalidateKeyRoutes(validated.key);

    return NextResponse.json({ success: true, data: { image: result.record } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : 'Failed to update website image';
    const status = message.startsWith('Unknown website image key') || message.startsWith('Invalid image URL') ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
