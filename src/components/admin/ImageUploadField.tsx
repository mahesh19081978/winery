'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, Trash2, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react';

export interface UploadedImageResult {
  url: string;
  filename: string;
  width: number | null;
  height: number | null;
  mime: string | null;
}

interface ImageUploadFieldProps {
  previewUrl?: string | null;
  previewAlt?: string;
  uploadUrl?: string;
  onUpload: (result: UploadedImageResult) => void | Promise<void>;
  onRemove?: () => void;
  disabled?: boolean;
  uploading?: boolean;
  error?: string | null;
  guidance?: string;
  uploadLabel?: string;
  removeLabel?: string;
  aspectClassName?: string;
  onCropClick?: () => void;
  cropLabel?: string;
}

const MAX_DIMENSION = 6000;
const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024;

function readDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

export function ImageUploadField({
  previewUrl,
  previewAlt = '',
  uploadUrl = '/api/admin/website-images/upload',
  onUpload,
  onRemove,
  disabled = false,
  uploading = false,
  error = null,
  guidance,
  uploadLabel = 'Upload / Replace',
  removeLabel = 'Reset',
  aspectClassName = 'aspect-16/9',
  onCropClick,
  cropLabel = 'Adjust Crop',
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    setLocalError('');

    if (!VALID_TYPES.includes(file.type)) {
      setLocalError('Please upload a JPG, PNG, WebP, AVIF, or GIF.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setLocalError('File size exceeds the 10MB limit.');
      return;
    }

    const dimensions = await readDimensions(file);
    if (dimensions && (dimensions.width > MAX_DIMENSION || dimensions.height > MAX_DIMENSION)) {
      setLocalError(`Image is too large (${dimensions.width}x${dimensions.height}). Maximum edge is ${MAX_DIMENSION}px.`);
      return;
    }

    try {
      const data = new FormData();
      data.append('file', file);
      const res = await fetch(uploadUrl, { method: 'POST', body: data });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Upload failed');
      }
      await onUpload({
        url: json.data.url,
        filename: json.data.filename,
        width: json.data.width ?? null,
        height: json.data.height ?? null,
        mime: json.data.mime ?? null,
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'File upload failed');
    }
  };

  const displayedError = localError || error || '';

  return (
    <div className="space-y-2">
      <div className={`relative w-full ${aspectClassName} rounded-xl overflow-hidden bg-stone-100 border border-stone-200`}>
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={previewAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 gap-1">
            <ImageIcon className="w-7 h-7" />
            <span className="text-[11px]">No image</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-stone-900/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={VALID_TYPES.join(',')}
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || uploading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-medium transition shadow-2xs disabled:opacity-60"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{uploading ? 'Uploading...' : uploadLabel}</span>
        </button>
        {onCropClick && previewUrl && (
          <button
            type="button"
            onClick={onCropClick}
            disabled={disabled || uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c5a059]/40 bg-[#c5a059]/10 text-[#461822] hover:bg-[#c5a059]/20 text-xs font-medium transition shadow-2xs disabled:opacity-60"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#8a3243]" />
            <span>{cropLabel}</span>
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled || uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-500 hover:text-rose-600 hover:border-rose-200 text-xs font-medium transition shadow-2xs disabled:opacity-60"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{removeLabel}</span>
          </button>
        )}
      </div>

      {guidance && !displayedError && (
        <p className="text-[11px] text-stone-400 leading-relaxed">{guidance}</p>
      )}
      {displayedError && (
        <p className="text-[11px] text-rose-600 flex items-start gap-1.5 leading-relaxed">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{displayedError}</span>
        </p>
      )}
    </div>
  );
}
