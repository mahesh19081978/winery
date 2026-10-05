'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Loader2, Upload, X } from 'lucide-react';
import { SectionCard } from '@/components/admin/UIComponents';

const CATEGORIES = ['RED', 'WHITE', 'ROSE', 'SPARKLING', 'RESERVE', 'DESSERT'];

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function WineCreateClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    category: 'RED',
    description: '',
    shortDescription: '',
    story: '',
    vineyardParcel: '',
    servingTemp: '',
    cellarPotential: '',
    featured: false,
    characteristics: '',
    images: '',
    foodPairings: '',
  });

  const update = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

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
          slug: form.slug.trim() || slugify(form.name),
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
      const res = await fetch('/api/admin/wines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        if (data.details && Array.isArray(data.details)) {
          const fe: Record<string, string> = {};
          data.details.forEach((d: { path?: string[]; message?: string }) => { const k = d.path?.[0] || 'form'; fe[k] = d.message || 'Invalid'; });
          setFieldErrors(fe);
        }
        throw new Error(data.error || 'Failed to create wine');
      }
      router.push(`/admin/wines/${data.data.slug}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-stone-200/60 pb-2">
        <Link href="/admin/wines" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">VINORA · Create Wine</span>
          <h1 className="font-serif text-2xl font-medium text-stone-900">New Wine</h1>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3"><AlertCircle className="h-4 w-4 text-rose-600" /><p className="text-xs text-rose-700">{error}</p></div>}

      <SectionCard title="Wine Information" description="Slug must be lowercase hyphenated. Rating/reviewCount are server-managed.">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Name *</label>
              <input value={form.name} onChange={(e) => { update('name', e.target.value); if (!form.slug || form.slug === slugify(form.name)) update('slug', slugify(e.target.value)); }} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#6c2432]" placeholder="Cabernet Sauvignon" />
              {fieldErrors.name && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.name}</p>}
            </div>
            <div>
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Slug *</label>
              <input value={form.slug} onChange={(e) => update('slug', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#6c2432]" placeholder="cabernet-sauvignon" />
              {fieldErrors.slug && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.slug}</p>}
            </div>
            <div>
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Category *</label>
              <select value={form.category} onChange={(e) => update('category', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs">
                {CATEGORIES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {fieldErrors.category && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.category}</p>}
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" checked={form.featured} onChange={(e) => update('featured', e.target.checked)} className="rounded" />
              <label className="text-xs text-stone-700">Featured</label>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Short Description *</label>
              <textarea value={form.shortDescription} onChange={(e) => update('shortDescription', e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" placeholder="Short description..." />
              {fieldErrors.shortDescription && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.shortDescription}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Description *</label>
              <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" placeholder="Full description..." />
              {fieldErrors.description && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.description}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Story</label>
              <textarea value={form.story} onChange={(e) => update('story', e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" placeholder="Wine story..." />
            </div>
            <div>
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Vineyard Parcel</label>
              <input value={form.vineyardParcel} onChange={(e) => update('vineyardParcel', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" placeholder="Parcel 7 — Terrasses Sud" />
            </div>
            <div>
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Serving Temp</label>
              <input value={form.servingTemp} onChange={(e) => update('servingTemp', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" placeholder="16–18°C" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Cellar Potential</label>
              <input value={form.cellarPotential} onChange={(e) => update('cellarPotential', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" placeholder="Drink now through 2042" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Characteristics (comma separated)</label>
              <input value={form.characteristics} onChange={(e) => update('characteristics', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" placeholder="Estate Grown, Old Vine" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Images (comma separated URLs)</label>
              <input value={form.images} onChange={(e) => update('images', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" placeholder="https://..." />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Food Pairings (comma separated)</label>
              <input value={form.foodPairings} onChange={(e) => update('foodPairings', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" placeholder="Ribeye, Comté" />
            </div>
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
                  No image uploaded yet. You can also specify comma-separated URLs below.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-4">
            <Link href="/admin/wines" className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50">Cancel</Link>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-[#461822] px-5 py-2 text-xs font-medium text-white hover:bg-[#6c2432] disabled:opacity-50">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Create Wine
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
