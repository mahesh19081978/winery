import { put, del } from '@vercel/blob';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

export interface StorageUploadResult {
  url: string;
  filename: string;
}

/**
 * Uploads a file to persistent storage (Vercel Blob if token is set, or local fallback in dev).
 */
export async function uploadGalleryFile(file: File): Promise<StorageUploadResult> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filename = `gallery-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

  if (token) {
    const blob = await put(`gallery/${filename}`, file, {
      access: 'public',
      token,
      contentType: file.type,
    });
    return {
      url: blob.url,
      filename,
    };
  }

  // Fallback to local storage (for offline development without Vercel Blob token)
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'gallery');

  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  const filePath = join(uploadDir, filename);
  await writeFile(filePath, buffer);

  return {
    url: `/uploads/gallery/${filename}`,
    filename,
  };
}

export async function uploadExperienceFile(file: File): Promise<StorageUploadResult> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filename = `experience-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

  if (token) {
    const blob = await put(`experiences/${filename}`, file, {
      access: 'public',
      token,
      contentType: file.type,
    });
    return {
      url: blob.url,
      filename,
    };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'experiences');

  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  const filePath = join(uploadDir, filename);
  await writeFile(filePath, buffer);

  return {
    url: `/uploads/experiences/${filename}`,
    filename,
  };
}

export async function deleteExperienceFile(imageUrl: string): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (imageUrl.includes('blob.vercel-storage.com')) {
    if (token) {
      try {
        await del(imageUrl, { token });
      } catch (err) {
        console.error('Failed to delete blob from Vercel Blob storage:', err);
      }
    }
    return;
  }

  if (imageUrl.startsWith('/uploads/experiences/')) {
    try {
      const filename = imageUrl.replace('/uploads/experiences/', '');
      const filePath = join(process.cwd(), 'public', 'uploads', 'experiences', filename);
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    } catch (err) {
      console.error('Failed to delete local experience file:', err);
    }
  }
}

/**
 * Deletes an image from storage (Vercel Blob if blob url and token, or local fallback).
 * Never throws an unhandled error so image record deletion can succeed even if storage file is gone.
 */
export async function deleteGalleryFile(imageUrl: string): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  // Check if it's a Vercel Blob URL
  if (imageUrl.includes('blob.vercel-storage.com')) {
    if (token) {
      try {
        await del(imageUrl, { token });
      } catch (err) {
        console.error('Failed to delete blob from Vercel Blob storage:', err);
      }
    }
    return;
  }

  // Check if it's a local /uploads/gallery/ URL
  if (imageUrl.startsWith('/uploads/gallery/')) {
    try {
      const filename = imageUrl.replace('/uploads/gallery/', '');
      const filePath = join(process.cwd(), 'public', 'uploads', 'gallery', filename);
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    } catch (err) {
      console.error('Failed to delete local gallery file:', err);
    }
  }
}
