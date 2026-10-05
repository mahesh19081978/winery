import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { requireApiPermission } from '@/lib/auth/permissions';
import { uploadWebsiteImageBuffer } from '@/lib/storage';
import { WEBSITE_IMAGES, isWebsiteImageKey, type WebsiteImageKey } from '@/lib/website-images';
import { getImageDimensions } from '@/lib/image-dimensions';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

interface CropPayload {
  key: WebsiteImageKey;
  sourceUrl: string; // URL of original image or /images/...
  crop: {
    cropX: number; // percentage (0 - 100) or pixel
    cropY: number; // percentage (0 - 100) or pixel
    cropWidth: number;
    cropHeight: number;
    zoom: number;
    targetAspectRatio: number;
    unit?: 'pixel' | 'percent';
  };
}

async function fetchOrReadImageBuffer(url: string): Promise<Buffer> {
  // If local public URL
  if (url.startsWith('/uploads/') || url.startsWith('/images/')) {
    const cleanPath = url.split('?')[0];
    const filePath = join(process.cwd(), 'public', cleanPath.replace(/^\//, ''));
    if (!existsSync(filePath)) {
      throw new Error(`Local file not found: ${url}`);
    }
    return await readFile(filePath);
  }

  // If remote URL (e.g. Vercel Blob)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch source image from storage (${res.status})`);
    }
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  throw new Error(`Unsupported source URL scheme: ${url}`);
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireApiPermission('website.images.manage');
    if (!guard.ok) return guard.response;

    const body = (await request.json()) as CropPayload;
    if (!body || !body.key || !body.sourceUrl || !body.crop) {
      return NextResponse.json(
        { success: false, error: 'Missing required crop parameters (key, sourceUrl, crop)' },
        { status: 400 }
      );
    }

    if (!isWebsiteImageKey(body.key)) {
      return NextResponse.json({ success: false, error: 'Unknown website image key' }, { status: 400 });
    }

    const def = WEBSITE_IMAGES[body.key];
    const sourceBuffer = await fetchOrReadImageBuffer(body.sourceUrl);

    // Get source dimensions
    const meta = await sharp(sourceBuffer).metadata();
    const sourceWidth = meta.width;
    const sourceHeight = meta.height;

    if (!sourceWidth || !sourceHeight) {
      return NextResponse.json(
        { success: false, error: 'Unable to read source image dimensions' },
        { status: 400 }
      );
    }

    // Convert crop coordinates to pixels based on unit
    let leftPx = 0;
    let topPx = 0;
    let widthPx = sourceWidth;
    let heightPx = sourceHeight;

    const { crop } = body;
    if (crop.unit === 'pixel') {
      leftPx = Math.round(crop.cropX);
      topPx = Math.round(crop.cropY);
      widthPx = Math.round(crop.cropWidth);
      heightPx = Math.round(crop.cropHeight);
    } else {
      // Percentage (0 - 100)
      leftPx = Math.round((crop.cropX / 100) * sourceWidth);
      topPx = Math.round((crop.cropY / 100) * sourceHeight);
      widthPx = Math.round((crop.cropWidth / 100) * sourceWidth);
      heightPx = Math.round((crop.cropHeight / 100) * sourceHeight);
    }

    // Clamp boundaries
    leftPx = Math.max(0, Math.min(leftPx, sourceWidth - 1));
    topPx = Math.max(0, Math.min(topPx, sourceHeight - 1));
    widthPx = Math.max(1, Math.min(widthPx, sourceWidth - leftPx));
    heightPx = Math.max(1, Math.min(heightPx, sourceHeight - topPx));

    // Determine target output size from registry
    const targetOutput = def.outputDimensions || { width: 1920, height: 1080 };
    // Keep output dimensions sharp and appropriate (not upscaling beyond reasonable limits)
    const outWidth = Math.min(targetOutput.width, Math.max(widthPx, 800));
    const outHeight = Math.round(outWidth / def.targetAspectRatio);

    // Crop and convert to high quality WebP
    const croppedBuffer = await sharp(sourceBuffer)
      .extract({ left: leftPx, top: topPx, width: widthPx, height: heightPx })
      .resize(outWidth, outHeight, {
        fit: 'cover',
        withoutEnlargement: false,
      })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();

    const croppedResult = await uploadWebsiteImageBuffer(
      croppedBuffer,
      `website-crop-${body.key.toLowerCase().replace(/_/g, '-')}`,
      'image/webp',
      'webp'
    );

    const dims = getImageDimensions(croppedBuffer) || { width: outWidth, height: outHeight };

    return NextResponse.json({
      success: true,
      data: {
        url: croppedResult.url,
        filename: croppedResult.filename,
        width: dims.width,
        height: dims.height,
        mime: 'image/webp',
        originalUrl: body.sourceUrl,
        cropData: {
          cropX: crop.cropX,
          cropY: crop.cropY,
          cropWidth: crop.cropWidth,
          cropHeight: crop.cropHeight,
          zoom: crop.zoom,
          targetAspectRatio: def.targetAspectRatio,
          unit: crop.unit || 'percent',
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Crop processing failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
