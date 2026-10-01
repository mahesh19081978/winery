import { NextRequest, NextResponse } from 'next/server';
import { uploadExperienceFile } from '@/lib/storage';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function POST(request: NextRequest) {
  try {
    const guard = await requireApiPermission('experiences.manage');
    if (!guard.ok) return guard.response;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 });
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload a JPG, PNG, WebP, AVIF, or GIF.' },
        { status: 400 }
      );
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit.' },
        { status: 400 }
      );
    }

    const { url, filename } = await uploadExperienceFile(file);

    return NextResponse.json({
      success: true,
      data: {
        url,
        filename,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
