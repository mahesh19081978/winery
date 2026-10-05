'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Loader2, Upload, X, RefreshCw } from 'lucide-react';

interface WineImageManagerProps {
  slug: string;
  images: { id: string; url: string; altText: string | null; isPrimary: boolean; sortOrder: number }[];
  title: string;
}

export function WineImageManager({ slug, images, title }: WineImageManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [localImages, setLocalImages] = useState(images);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a JPG, PNG, WebP, AVIF, or GIF.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError('File size exceeds 10MB limit.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setError('');

    let uploadedUrl: string | null = null;
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/admin/wines/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.success) {
        throw new Error(uploadJson.error || 'Upload failed');
      }

      uploadedUrl = uploadJson.data.url;

      const setRes = await fetch(`/api/admin/wines/${slug}/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: uploadedUrl }),
      });

      const setJson = await setRes.json();
      if (!setRes.ok || !setJson.success) {
        // Upload succeeded but database update failed - clean up newly uploaded file
        await fetch('/api/admin/wines/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: uploadedUrl }),
        }).catch(() => {});
        throw new Error(setJson.error || 'Failed to update image');
      }

      setLocalImages((prev) => {
        const nonPrimary = prev.filter((img) => !img.isPrimary);
        return [{ id: 'primary', url: uploadJson.data.url, altText: null, isPrimary: true, sortOrder: 0 }, ...nonPrimary];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    setError('');

    try {
      const setRes = await fetch(`/api/admin/wines/${slug}/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: '' }),
      });

      const setJson = await setRes.json();
      if (!setRes.ok || !setJson.success) {
        throw new Error(setJson.error || 'Failed to remove image');
      }

      setLocalImages((prev) => prev.filter((img) => !img.isPrimary));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove image');
    } finally {
      setUploading(false);
    }
  };

  const primaryImage = localImages.find((img) => img.isPrimary === true);

  return (
    <div className="space-y-3">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2">
          <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <p className="text-[11px] text-rose-700">{error}</p>
        </div>
      )}

      {primaryImage ? (
        <div className="relative w-full max-w-md aspect-[16/9] rounded-lg overflow-hidden border border-stone-200/80 bg-stone-100">
          <Image
            src={primaryImage.url}
            alt={primaryImage.altText || title}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
          <span className="absolute top-2 left-2 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#6c2432] text-white">
            Primary
          </span>
        </div>
      ) : (
        <div className="w-full max-w-md aspect-[16/9] rounded-lg border border-dashed border-stone-300 bg-stone-50 flex items-center justify-center">
          <p className="text-[11px] text-stone-400">No primary image set</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : primaryImage ? (
            <RefreshCw className="w-3 h-3" />
          ) : (
            <Upload className="w-3 h-3" />
          )}
          <span>{uploading ? 'Uploading...' : primaryImage ? 'Replace Image' : 'Upload Image'}</span>
        </button>
        {primaryImage && (
          <button
            type="button"
            disabled={uploading}
            onClick={handleRemove}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-rose-600 hover:text-rose-700 transition disabled:opacity-50"
          >
            <X className="w-3 h-3" />
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
