import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/auth/permissions';
import { uploadWebsiteImageFile } from '@/lib/storage';
import { getImageDimensions, exceedsMaxDimension, MAX_WEBSITE_IMAGE_DIMENSION } from '@/lib/image-dimensions';

const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const guard = await requireApiPermission('website.images.manage');
    if (!guard.ok) return guard.response;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 });
    }

    if (!VALID_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload a JPG, PNG, WebP, AVIF, or GIF.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: 'File size exceeds 10MB limit.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dimensions = getImageDimensions(buffer);

    if (dimensions && exceedsMaxDimension(dimensions)) {
      return NextResponse.json(
        {
          success: false,
          error: `Image dimensions are too large (${dimensions.width}x${dimensions.height}). Maximum edge is ${MAX_WEBSITE_IMAGE_DIMENSION}px.`,
        },
        { status: 400 }
      );
    }

    const { url, filename } = await uploadWebsiteImageFile(file);

    return NextResponse.json({
      success: true,
      data: {
        url,
        filename,
        width: dimensions ? dimensions.width : null,
        height: dimensions ? dimensions.height : null,
        mime: file.type,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
