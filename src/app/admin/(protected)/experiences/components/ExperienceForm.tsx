'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, AlertCircle, Loader2, CheckCircle2, Plus, X, Upload } from 'lucide-react';
import { SectionCard } from '@/components/admin/UIComponents';

const EXPERIENCE_CATEGORIES = ['TASTING', 'TOUR', 'CULINARY', 'PRIVATE'];

const updateArray = (
  setter: React.Dispatch<React.SetStateAction<string[]>>,
  index: number,
  value: string
) => {
  setter((prev) => {
    const next = [...prev];
    next[index] = value;
    return next;
  });
};

const addArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
  setter((prev) => [...prev, '']);
};

const removeArrayItem = (
  setter: React.Dispatch<React.SetStateAction<string[]>>,
  index: number
) => {
  setter((prev) => prev.filter((_, i) => i !== index));
};

function ArrayFieldBlock({
  label,
  items,
  setter,
}: {
  label: string;
  items: string[];
  setter: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-700 mb-1.5">{label}</label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              type="text"
              value={item}
              onChange={(e) => updateArray(setter, i, e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition"
              placeholder={`${label} item ${i + 1}`}
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeArrayItem(setter, i)}
                className="p-1.5 text-stone-400 hover:text-rose-600 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => addArrayItem(setter)}
        className="mt-2 inline-flex items-center gap-1 text-xs text-[#6c2432] hover:text-[#461822] transition"
      >
        <Plus className="w-3.5 h-3.5" />
        Add item
      </button>
    </div>
  );
}

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}



export function ExperienceForm({ initialData }: { initialData?: Record<string, unknown> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [imageUrl, setImageUrl] = useState(((initialData?.images as Record<string, unknown>[])?.[0]?.url as string) || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: (initialData?.title as string) || '',
    slug: (initialData?.slug as string) || '',
    category: (initialData?.category as string) || 'TASTING',
    durationMinutes: (initialData?.durationMinutes?.toString() as string) || '',
    durationText: (initialData?.durationText as string) || '',
    price: (initialData?.price?.toString() as string) || '',
    currency: (initialData?.currency as string) || 'USD',
    shortDescription: (initialData?.shortDescription as string) || '',
    description: (initialData?.description as string) || '',
    capacity: (initialData?.capacity?.toString() as string) || '',
    minGuests: (initialData?.minGuests?.toString() as string) || '',
    maxGuests: (initialData?.maxGuests?.toString() as string) || '',
    foodPairing: (initialData?.foodPairing as string) || '',
    badge: (initialData?.badge as string) || '',
    featured: (initialData?.featured as boolean) ?? false,
    isActive: (initialData?.isActive as boolean) ?? true,
  });

  // Array fields
  const [highlights, setHighlights] = useState<string[]>((initialData?.highlights as string[])?.length ? (initialData!.highlights as string[]) : ['']);
  const [includedItems, setIncludedItems] = useState<string[]>((initialData?.includedItems as string[])?.length ? (initialData!.includedItems as string[]) : ['']);
  const [guestExpectations, setGuestExpectations] = useState<string[]>((initialData?.guestExpectations as string[])?.length ? (initialData!.guestExpectations as string[]) : ['']);
  const [importantInfo, setImportantInfo] = useState<string[]>((initialData?.importantInfo as string[])?.length ? (initialData!.importantInfo as string[]) : ['']);

  const [winesList, setWinesList] = useState<{ id: string; name: string }[]>([]);
  const [selectedWines, setSelectedWines] = useState<{ wineId: string; notes: string }[]>(
    (initialData?.includedWines as Record<string, unknown>[])?.length 
      ? (initialData!.includedWines as Record<string, unknown>[]).map((iw) => ({ 
          wineId: String(iw.wineId || (iw.wine as Record<string, unknown>)?.id), 
          notes: iw.notes ? String(iw.notes) : '' 
        }))
      : []
  );

  useEffect(() => {
    fetch('/api/admin/wines?pageSize=100')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data?.wines) {
          setWinesList(json.data.wines);
        }
      })
      .catch(err => console.error('Failed to fetch wines', err));
  }, []);

  const update = (k: string, v: string | boolean) =>
    setForm((p) => ({ ...p, [k]: v }));



  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('file', file);

      const res = await fetch('/api/admin/experiences/upload', {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || slugify(form.title),
        category: form.category,
        durationMinutes: Number(form.durationMinutes) || 60,
        durationText: form.durationText.trim() || `${form.durationMinutes || 60} Minutes`,
        price: Number(form.price) || 0,
        currency: form.currency,
        shortDescription: form.shortDescription.trim(),
        description: form.description.trim(),
        capacity: Number(form.capacity) || 12,
        minGuests: Number(form.minGuests) || 1,
        maxGuests: Number(form.maxGuests) || 12,
        foodPairing: form.foodPairing.trim() || null,
        badge: form.badge.trim() || null,
        featured: form.featured,
        isActive: form.isActive,
        highlights: highlights.map((s) => s.trim()).filter(Boolean),
        includedItems: includedItems.map((s) => s.trim()).filter(Boolean),
        guestExpectations: guestExpectations.map((s) => s.trim()).filter(Boolean),
        importantInfo: importantInfo.map((s) => s.trim()).filter(Boolean),
        includedWines: selectedWines.filter(w => w.wineId),
        images: imageUrl ? [{ url: imageUrl, isPrimary: true }] : [],
        winery: { connect: { id: 'bd1034e9-36ef-463b-a576-019e1193621f' } },
      };

      const isEdit = !!initialData;
      const url = isEdit ? `/api/admin/experiences/${initialData.slug}` : '/api/admin/experiences';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${isEdit ? 'update' : 'create'} experience`);
      }
      setSuccess(`Experience ${isEdit ? 'updated' : 'created'} successfully`);
      setTimeout(() => router.push(`/admin/experiences/${data.data.slug}`), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save experience');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-stone-200/60 pb-2">
        <Link
          href="/admin/experiences"
          className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
            VINORA · {initialData ? 'Edit Experience' : 'Create Experience'}
          </span>
          <h1 className="font-serif text-2xl font-medium text-stone-900">{initialData ? 'Edit Experience' : 'New Experience'}</h1>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-700">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <SectionCard title="Basic Information" description="Core details about the experience">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => {
                  update('title', e.target.value);
                  if (!form.slug) update('slug', slugify(e.target.value));
                }}
                placeholder="e.g. Premier Wine Tasting & Cellar Tour"
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Slug <span className="text-stone-400">(auto-generated)</span>
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => update('slug', slugify(e.target.value))}
                placeholder="auto-generated-from-title"
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition font-mono"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition"
              >
                {EXPERIENCE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0) + cat.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Short Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Short Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={form.shortDescription}
                onChange={(e) => update('shortDescription', e.target.value)}
                placeholder="A brief summary shown on cards and lists"
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition resize-none"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Full Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={5}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Detailed description of the experience..."
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition resize-none"
              />
            </div>
          </div>
        </SectionCard>

        {/* Pricing & Duration */}
        <SectionCard title="Pricing & Duration" description="Set price, duration, and guest capacity">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Price <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => update('price', e.target.value)}
                placeholder="150.00"
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Currency</label>
              <input
                type="text"
                value={form.currency}
                onChange={(e) => update('currency', e.target.value.toUpperCase())}
                placeholder="USD"
                maxLength={3}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Duration (minutes) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="15"
                value={form.durationMinutes}
                onChange={(e) => {
                  update('durationMinutes', e.target.value);
                  if (!form.durationText || form.durationText.endsWith('Minutes')) {
                    update('durationText', `${e.target.value} Minutes`);
                  }
                }}
                placeholder="75"
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Duration Text
              </label>
              <input
                type="text"
                value={form.durationText}
                onChange={(e) => update('durationText', e.target.value)}
                placeholder="75 Minutes"
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Capacity (default)
              </label>
              <input
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => update('capacity', e.target.value)}
                placeholder="12"
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Min Guests</label>
              <input
                type="number"
                min="1"
                value={form.minGuests}
                onChange={(e) => update('minGuests', e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Max Guests</label>
              <input
                type="number"
                min="1"
                value={form.maxGuests}
                onChange={(e) => update('maxGuests', e.target.value)}
                placeholder="12"
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition font-mono"
              />
            </div>
          </div>
        </SectionCard>

        {/* Content Lists */}
        <SectionCard title="Content Details" description="Highlights, included items, and guest info">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ArrayFieldBlock label="Highlights" items={highlights} setter={setHighlights} />
            <ArrayFieldBlock label="Included Items" items={includedItems} setter={setIncludedItems} />
            <ArrayFieldBlock
              label="Guest Expectations"
              items={guestExpectations}
              setter={setGuestExpectations}
            />
            <ArrayFieldBlock label="Important Info" items={importantInfo} setter={setImportantInfo} />

            {/* Food Pairing */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Food Pairing <span className="text-stone-400">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={form.foodPairing}
                onChange={(e) => update('foodPairing', e.target.value)}
                placeholder="e.g. Artisan cheese boards, charcuterie, seasonal produce"
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition resize-none"
              />
            </div>
          </div>
        </SectionCard>

        {/* Estate Wines Poured */}
        <SectionCard title="Estate Wines Poured" description="Wines included in this experience">
          <div className="space-y-2">
            {selectedWines.map((sw, index) => (
              <div key={index} className="flex gap-2 items-center">
                <div className="flex-1">
                  <select
                    value={sw.wineId}
                    onChange={(e) => {
                      const newWines = [...selectedWines];
                      newWines[index].wineId = e.target.value;
                      setSelectedWines(newWines);
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition"
                  >
                    <option value="">Select a wine...</option>
                    {winesList.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={sw.notes}
                    onChange={(e) => {
                      const newWines = [...selectedWines];
                      newWines[index].notes = e.target.value;
                      setSelectedWines(newWines);
                    }}
                    placeholder="Optional notes..."
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition"
                  />
                </div>
                <div className="flex gap-1 items-center">
                  {index > 0 && (
                    <button type="button" onClick={() => {
                      const newWines = [...selectedWines];
                      [newWines[index - 1], newWines[index]] = [newWines[index], newWines[index - 1]];
                      setSelectedWines(newWines);
                    }} className="p-1 text-stone-400 hover:text-stone-700">↑</button>
                  )}
                  {index < selectedWines.length - 1 && (
                    <button type="button" onClick={() => {
                      const newWines = [...selectedWines];
                      [newWines[index], newWines[index + 1]] = [newWines[index + 1], newWines[index]];
                      setSelectedWines(newWines);
                    }} className="p-1 text-stone-400 hover:text-stone-700">↓</button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newWines = [...selectedWines];
                    newWines.splice(index, 1);
                    setSelectedWines(newWines);
                  }}
                  className="p-2 text-stone-400 hover:text-rose-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSelectedWines([...selectedWines, { wineId: '', notes: '' }])}
              className="mt-2 inline-flex items-center gap-1 text-xs text-[#6c2432] hover:text-[#461822] transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add wine
            </button>
          </div>
        </SectionCard>

        {/* Settings */}
        <SectionCard title="Settings" description="Visibility, badge, and featured status">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Badge <span className="text-stone-400">(optional — e.g. &quot;Most Popular&quot;)</span>
              </label>
              <input
                type="text"
                value={form.badge}
                onChange={(e) => update('badge', e.target.value)}
                placeholder="Most Popular"
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition"
              />
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => update('featured', e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 text-[#6c2432] focus:ring-[#6c2432]"
                />
                <span className="text-xs font-medium text-stone-700">Featured experience</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => update('isActive', e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 text-[#6c2432] focus:ring-[#6c2432]"
                />
                <span className="text-xs font-medium text-stone-700">Active (visible to guests)</span>
              </label>
            </div>
          </div>
        </SectionCard>

        {/* Image */}
        <SectionCard title="Experience Image" description="Primary image shown on cards and detail pages">
          <div className="space-y-3">
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
                  onClick={() => setImageUrl('')}
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
                  alt="Experience preview"
                  fill
                  sizes="400px"
                  className="object-cover"
                />
              </div>
            )}
            {!imageUrl && (
              <p className="text-[11px] text-stone-400">
                No image uploaded. A fallback image will be used on public pages.
              </p>
            )}
          </div>
        </SectionCard>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/admin/experiences"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-[#461822] rounded-lg hover:bg-[#6c2432] transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {initialData ? 'Save Changes' : 'Create Experience'}
          </button>
        </div>
      </form>
    </div>
  );
}
