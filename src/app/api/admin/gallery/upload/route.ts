import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 });
    }

    // Validate mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload a JPG, PNG, WebP, AVIF, or GIF.' },
        { status: 400 }
      );
    }

    // Limit to 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get file extension
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `gallery-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'gallery');
    const filePath = join(uploadDir, filename);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/gallery/${filename}`;

    return NextResponse.json({
      success: true,
      data: {
        url: publicUrl,
        filename,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
