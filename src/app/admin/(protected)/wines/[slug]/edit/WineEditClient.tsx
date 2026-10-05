'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Loader2, Upload, X } from 'lucide-react';
import { SectionCard } from '@/components/admin/UIComponents';

const CATEGORIES = ['RED', 'WHITE', 'ROSE', 'SPARKLING', 'RESERVE', 'DESSERT'];

export function WineEditClient({ wine }: { wine: { id: string; slug: string; name: string; category: string; description: string; shortDescription: string; story: string | null; vineyardParcel: string | null; servingTemp: string | null; cellarPotential: string | null; featured: boolean; characteristics: string[]; images: { url: string; isPrimary?: boolean }[]; foodPairings: { dishName: string }[] } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const initialPrimary = wine.images.find(i => i.isPrimary)?.url || wine.images[0]?.url || '';
  const [imageUrl, setImageUrl] = useState(initialPrimary);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    slug: wine.slug,
    name: wine.name,
    category: wine.category,
    description: wine.description,
    shortDescription: wine.shortDescription,
    story: wine.story || '',
    vineyardParcel: wine.vineyardParcel || '',
    servingTemp: wine.servingTemp || '',
    cellarPotential: wine.cellarPotential || '',
    featured: wine.featured,
    characteristics: wine.characteristics.join(', '),
    images: wine.images.map(i => i.url).filter(u => u !== initialPrimary).join(', '),
    foodPairings: wine.foodPairings.map(f => f.dishName).join(', '),
  });

  const update = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

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

    try {
      const data = new FormData();
      data.append('file', file);

      const res = await fetch('/api/admin/wines/upload', {
        method: 'POST',
        body: data,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Upload failed');
      }

      setImageUrl(json.data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setFieldErrors({});
    try {
        const manualImages = form.images ? form.images.split(',').map(s => s.trim()).filter(Boolean).map(url => ({ url })) : [];
        const allImages = imageUrl
          ? [{ url: imageUrl, isPrimary: true }, ...manualImages.filter(i => i.url !== imageUrl)]
          : manualImages;

        const payload: Record<string, unknown> = {
          slug: form.slug.trim(),
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim(),
          shortDescription: form.shortDescription.trim(),
          story: form.story.trim() || null,
          vineyardParcel: form.vineyardParcel.trim() || null,
          servingTemp: form.servingTemp.trim() || null,
          cellarPotential: form.cellarPotential.trim() || null,
          featured: form.featured,
          characteristics: form.characteristics ? form.characteristics.split(',').map(s => s.trim()).filter(Boolean) : [],
          images: allImages,
          foodPairings: form.foodPairings ? form.foodPairings.split(',').map(s => s.trim()).filter(Boolean).map(dishName => ({ dishName })) : [],
        };
      const res = await fetch(`/api/admin/wines/${wine.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        if (data.details && Array.isArray(data.details)) {
          const fe: Record<string, string> = {};
          data.details.forEach((d: { path?: string[]; message?: string }) => { const k = d.path?.[0] || 'form'; fe[k] = d.message || 'Invalid'; });
          setFieldErrors(fe);
        }
        throw new Error(data.error || 'Failed to update wine');
      }
      const newSlug = data.data.slug || form.slug;
      router.push(`/admin/wines/${newSlug}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-stone-200/60 pb-2">
        <Link href={`/admin/wines/${wine.slug}`} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">VINORA · Edit Wine</span>
          <h1 className="font-serif text-2xl font-medium text-stone-900">{wine.name}</h1>
        </div>
      </div>
      {error && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3"><AlertCircle className="h-4 w-4 text-rose-600" /><p className="text-xs text-rose-700">{error}</p></div>}
      <SectionCard title="Wine Information" description="Slug change will update the public URL.">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Name *</label>
              <input value={form.name} onChange={(e) => update('name', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" />
              {fieldErrors.name && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.name}</p>}
            </div>
            <div>
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Slug *</label>
              <input value={form.slug} onChange={(e) => update('slug', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" />
              {fieldErrors.slug && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.slug}</p>}
            </div>
            <div>
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Category *</label>
              <select value={form.category} onChange={(e) => update('category', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs">
                {CATEGORIES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" checked={form.featured} onChange={(e) => update('featured', e.target.checked)} className="rounded" />
              <label className="text-xs text-stone-700">Featured</label>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Short Description *</label>
              <textarea value={form.shortDescription} onChange={(e) => update('shortDescription', e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" />
              {fieldErrors.shortDescription && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.shortDescription}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Description *</label>
              <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" />
              {fieldErrors.description && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.description}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Story</label>
              <textarea value={form.story} onChange={(e) => update('story', e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" />
            </div>
            <div><label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Vineyard Parcel</label><input value={form.vineyardParcel} onChange={(e) => update('vineyardParcel', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" /></div>
            <div><label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Serving Temp</label><input value={form.servingTemp} onChange={(e) => update('servingTemp', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" /></div>
            <div className="sm:col-span-2"><label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Cellar Potential</label><input value={form.cellarPotential} onChange={(e) => update('cellarPotential', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" /></div>
            <div className="sm:col-span-2"><label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Characteristics (comma separated)</label><input value={form.characteristics} onChange={(e) => update('characteristics', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" /></div>
            <div className="sm:col-span-2"><label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Images (comma separated URLs)</label><input value={form.images} onChange={(e) => update('images', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" /></div>
            <div className="sm:col-span-2"><label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Food Pairings (comma separated)</label><input value={form.foodPairings} onChange={(e) => update('foodPairings', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" /></div>
          </div>
          <div className="pt-2">
            <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600 block mb-2">Wine Image</label>
            <div className="space-y-3 rounded-lg border border-stone-200/80 bg-stone-50/50 p-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>{uploading ? 'Uploading...' : imageUrl ? 'Replace Image' : 'Upload Image'}</span>
                </button>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 transition"
                  >
                    <X className="w-3 h-3" />
                    Remove
                  </button>
                )}
              </div>
              {imageUrl && (
                <div className="relative w-full max-w-sm aspect-[16/9] rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                  <Image
                    src={imageUrl}
                    alt="Wine preview"
                    fill
                    sizes="400px"
                    className="object-cover"
                  />
                </div>
              )}
              {!imageUrl && (
                <p className="text-[11px] text-stone-400">
                  No primary image set. You can upload an image or specify comma-separated URLs below.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-4">
            <Link href={`/admin/wines/${wine.slug}`} className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50">Cancel</Link>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-[#461822] px-5 py-2 text-xs font-medium text-white hover:bg-[#6c2432] disabled:opacity-50">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save Changes
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
