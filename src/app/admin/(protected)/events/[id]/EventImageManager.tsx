'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Loader2, Upload, X, RefreshCw } from 'lucide-react';

interface EventImageManagerProps {
  eventId: string;
  featuredImage: string;
  title: string;
  onImageUpdated?: (newUrl: string) => void;
}

export function EventImageManager({ eventId, featuredImage, title, onImageUpdated }: EventImageManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [currentImage, setCurrentImage] = useState(featuredImage);
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

      const uploadRes = await fetch('/api/admin/events/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.success) {
        throw new Error(uploadJson.error || 'Upload failed');
      }

      uploadedUrl = uploadJson.data.url;

      const updateRes = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featuredImage: uploadedUrl }),
      });

      const updateJson = await updateRes.json();
      if (!updateRes.ok || !updateJson.success) {
        // Upload succeeded but database update failed - clean up newly uploaded file
        await fetch('/api/admin/events/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: uploadedUrl }),
        }).catch(() => {});
        throw new Error(updateJson.error || 'Failed to update event image');
      }

      setCurrentImage(uploadJson.data.url);
      if (onImageUpdated) onImageUpdated(uploadJson.data.url);
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
      const updateRes = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featuredImage: '' }),
      });

      const updateJson = await updateRes.json();
      if (!updateRes.ok || !updateJson.success) {
        throw new Error(updateJson.error || 'Failed to remove event image');
      }

      setCurrentImage('');
      if (onImageUpdated) onImageUpdated('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove image');
    } finally {
      setUploading(false);
    }
  };

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

      {currentImage ? (
        <div className="relative w-full max-w-md aspect-[16/9] rounded-lg overflow-hidden border border-stone-200/80 bg-stone-100">
          <Image
            src={currentImage}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
          <span className="absolute top-2 left-2 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#6c2432] text-white">
            Featured
          </span>
        </div>
      ) : (
        <div className="w-full max-w-md aspect-[16/9] rounded-lg border border-dashed border-stone-300 bg-stone-50 flex items-center justify-center">
          <p className="text-[11px] text-stone-400">No image set (fallback used on public pages)</p>
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
          ) : currentImage ? (
            <RefreshCw className="w-3 h-3" />
          ) : (
            <Upload className="w-3 h-3" />
          )}
          <span>{uploading ? 'Uploading...' : currentImage ? 'Replace Image' : 'Upload Image'}</span>
        </button>
        {currentImage && (
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
