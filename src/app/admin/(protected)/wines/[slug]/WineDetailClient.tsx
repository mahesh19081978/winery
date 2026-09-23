'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Tag,
  Star,
  Droplets,
  Thermometer,
  Clock,
  BookOpen,
  Layers,
  Utensils,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { SectionCard, StatusBadge } from '@/components/admin/UIComponents';

interface VintageData {
  id: string;
  vintageYear: number;
  price: number;
  currency: string;
  alcohol: string;
  oakAging: string | null;
  tastingNotes: string | null;
  aromaTags: string[];
  body: number;
  acidity: number;
  sweetness: number;
  tannin: number;
  isAvailable: boolean;
  inventoryCount: number;
  tastingRecords: { id: string; rating: number; notes: string | null }[];
}

interface ExperienceRef {
  id: string;
  title: string;
  slug: string;
}

interface ExperienceWineData {
  id: string;
  notes: string | null;
  sortOrder: number;
  experience: ExperienceRef;
}

interface ReviewData {
  id: string;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
}

interface WineImageData {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

interface FoodPairingData {
  id: string;
  dishName: string;
  description: string | null;
}

interface WineData {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  shortDescription: string;
  story: string | null;
  vineyardParcel: string | null;
  servingTemp: string | null;
  cellarPotential: string | null;
  featured: boolean;
  rating: number;
  reviewCount: number;
  characteristics: string[];
  createdAt: string;
  vintages: VintageData[];
  images: WineImageData[];
  foodPairings: FoodPairingData[];
  experienceWines: ExperienceWineData[];
  reviews: ReviewData[];
  _count: { reviews: number; experienceWines: number; favoredByGuests: number };
}

const TASTE_LABELS: Record<string, string> = {
  body: 'Body',
  acidity: 'Acidity',
  sweetness: 'Sweetness',
  tannin: 'Tannin',
};

function TasteBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-medium text-stone-600 w-16">{label}</span>
      <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#6c2432]/70 rounded-full transition-all"
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-stone-500 w-6 text-right">{value}/10</span>
    </div>
  );
}

export function WineDetailClient({ wine: initialWine }: { wine: WineData }) {
  const [wine, setWine] = useState<WineData>(initialWine);
  const router = useRouter();
  const [globalMsg, setGlobalMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/wines/${initialWine.slug}`);
      const j = await res.json();
      if (res.ok) setWine(j.data);
    } finally { setRefreshing(false); }
  };

  const handleDeleteWine = async () => {
    if (!confirm(`Delete wine "${wine.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/wines/${wine.slug}`, { method: 'DELETE' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Delete failed');
      router.push('/admin/wines');
    } catch (err) {
      setGlobalMsg({ type: 'error', text: err instanceof Error ? err.message : 'Delete failed' });
    }
  };

  // Vintage CRUD
  const [showVintage, setShowVintage] = useState(false);
  const [editingVintage, setEditingVintage] = useState<VintageData | null>(null);
  const [vintageForm, setVintageForm] = useState({ vintageYear: '', price: '', currency: 'USD', alcohol: '', oakAging: '', tastingNotes: '', aromaTags: '', body: '5', acidity: '5', sweetness: '2', tannin: '5', isAvailable: true, inventoryCount: '0' });
  const [vintageLoading, setVintageLoading] = useState(false);
  const [vintageError, setVintageError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const openVintageCreate = () => {
    setEditingVintage(null);
    setVintageForm({ vintageYear: String(new Date().getFullYear()), price: '', currency: 'USD', alcohol: '', oakAging: '', tastingNotes: '', aromaTags: '', body: '5', acidity: '5', sweetness: '2', tannin: '5', isAvailable: true, inventoryCount: '0' });
    setVintageError(''); setFieldErrors({}); setShowVintage(true);
  };
  const openVintageEdit = (v: VintageData) => {
    setEditingVintage(v);
    setVintageForm({ vintageYear: String(v.vintageYear), price: String(v.price), currency: v.currency, alcohol: v.alcohol, oakAging: v.oakAging || '', tastingNotes: v.tastingNotes || '', aromaTags: v.aromaTags.join(', '), body: String(v.body), acidity: String(v.acidity), sweetness: String(v.sweetness), tannin: String(v.tannin), isAvailable: v.isAvailable, inventoryCount: String(v.inventoryCount) });
    setVintageError(''); setFieldErrors({}); setShowVintage(true);
  };

  const submitVintage = async (e: React.FormEvent) => {
    e.preventDefault();
    setVintageLoading(true); setVintageError(''); setFieldErrors({});
    try {
      const payload: Record<string, unknown> = {
        vintageYear: Number(vintageForm.vintageYear),
        price: Number(vintageForm.price),
        currency: vintageForm.currency || 'USD',
        alcohol: vintageForm.alcohol,
        oakAging: vintageForm.oakAging || null,
        tastingNotes: vintageForm.tastingNotes || null,
        aromaTags: vintageForm.aromaTags ? vintageForm.aromaTags.split(',').map(s => s.trim()).filter(Boolean) : [],
        body: Number(vintageForm.body),
        acidity: Number(vintageForm.acidity),
        sweetness: Number(vintageForm.sweetness),
        tannin: Number(vintageForm.tannin),
        isAvailable: vintageForm.isAvailable,
        inventoryCount: Number(vintageForm.inventoryCount),
      };
      const url = editingVintage ? `/api/admin/wines/${wine.slug}/vintages/${editingVintage.id}` : `/api/admin/wines/${wine.slug}/vintages`;
      const method = editingVintage ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) {
        if (j.details && Array.isArray(j.details)) {
          const fe: Record<string, string> = {};
          j.details.forEach((d: { path?: string[]; message?: string }) => { const k = d.path?.[0] || 'form'; fe[k] = d.message || 'Invalid'; });
          setFieldErrors(fe);
        }
        throw new Error(j.error || 'Failed');
      }
      setShowVintage(false);
      setGlobalMsg({ type: 'success', text: editingVintage ? 'Vintage updated' : 'Vintage created' });
      await refresh();
      setTimeout(() => setGlobalMsg(null), 3000);
    } catch (err) { setVintageError(err instanceof Error ? err.message : 'Failed'); } finally { setVintageLoading(false); }
  };

  const deleteVintage = async (v: VintageData) => {
    if (!confirm(`Delete vintage ${v.vintageYear}? This cannot be undone. If historical tasting records exist, deletion will be blocked (409).`)) return;
    try {
      const res = await fetch(`/api/admin/wines/${wine.slug}/vintages/${v.id}`, { method: 'DELETE' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Delete failed');
      setGlobalMsg({ type: 'success', text: `Vintage ${v.vintageYear} deleted` });
      await refresh();
    } catch (err) { setGlobalMsg({ type: 'error', text: err instanceof Error ? err.message : 'Delete failed' }); }
  };

  const availableVintages = wine.vintages.filter((v) => v.isAvailable);
  const totalInventory = wine.vintages.reduce((sum, v) => sum + v.inventoryCount, 0);
  const avgTastingRating =
    wine.reviews.length > 0
      ? (wine.reviews.reduce((sum, r) => sum + r.rating, 0) / wine.reviews.length).toFixed(1)
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/wines"
            className="p-2 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
                VINORA • Wine Details
              </span>
              {refreshing && <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-400" />}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium">
                {wine.name}
              </h1>
              <StatusBadge status={wine.category} size="md" />
              {wine.featured && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60">
                  Featured
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/wines/${wine.slug}/edit`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-700 hover:bg-stone-50">
            <Pencil className="w-3.5 h-3.5" />Edit
          </Link>
          <button onClick={handleDeleteWine} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 hover:bg-rose-100">
            <Trash2 className="w-3.5 h-3.5" />Delete
          </button>
        </div>
      </div>

      {globalMsg && (
        <div className={`flex items-center gap-2 rounded-lg border p-3 ${globalMsg.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          {globalMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <p className="text-xs flex-1">{globalMsg.text}</p>
          <button onClick={() => setGlobalMsg(null)}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <SectionCard title="Basic Information" description="Core wine details and classification">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Tag className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Category</p>
                    <StatusBadge status={wine.category} size="md" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Rating</p>
                    <p className="text-sm font-medium text-stone-900">
                      {Number(wine.rating).toFixed(1)} ({wine.reviewCount} reviews)
                    </p>
                  </div>
                </div>
                {wine.vineyardParcel && (
                  <div className="flex items-start gap-3">
                    <Droplets className="w-4 h-4 text-stone-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Vineyard Parcel</p>
                      <p className="text-sm font-medium text-stone-900">{wine.vineyardParcel}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {wine.servingTemp && (
                  <div className="flex items-start gap-3">
                    <Thermometer className="w-4 h-4 text-stone-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Serving Temperature</p>
                      <p className="text-sm font-medium text-stone-900">{wine.servingTemp}</p>
                    </div>
                  </div>
                )}
                {wine.cellarPotential && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-stone-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Cellar Potential</p>
                      <p className="text-sm font-medium text-stone-900">{wine.cellarPotential}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Layers className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Vintages</p>
                    <p className="text-sm font-medium text-stone-900">
                      {wine.vintages.length} total
                      {availableVintages.length > 0 && (
                        <span className="text-stone-500 text-xs ml-1">
                          ({availableVintages.length} available)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-stone-100">
              <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-1">Short Description</p>
              <p className="text-sm text-stone-700">{wine.shortDescription}</p>
            </div>

            <div className="mt-4 pt-4 border-t border-stone-100">
              <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-1">Full Description</p>
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{wine.description}</p>
            </div>

            {wine.story && (
              <div className="mt-4 pt-4 border-t border-stone-100">
                <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-1">Wine Story</p>
                <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap italic">{wine.story}</p>
              </div>
            )}

            {wine.characteristics.length > 0 && (
              <div className="mt-4 pt-4 border-t border-stone-100">
                <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-2">Characteristics</p>
                <div className="flex flex-wrap gap-1.5">
                  {wine.characteristics.map((char, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#461822]/5 text-[#6c2432] border border-[#461822]/10"
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          {/* Images */}
          {wine.images.length > 0 && (
            <SectionCard title="Images" description={`Wine images (${wine.images.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {wine.images.map((img) => (
                  <div key={img.id} className="relative rounded-lg overflow-hidden border border-stone-200/80 bg-stone-100 aspect-[4/3]">
                    <img
                      src={img.url}
                      alt={img.altText || wine.name}
                      className="w-full h-full object-cover"
                    />
                    {img.isPrimary && (
                      <span className="absolute top-2 left-2 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#6c2432] text-white">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Food Pairings */}
          {wine.foodPairings.length > 0 && (
            <SectionCard title="Food Pairings" description={`Suggested food pairings (${wine.foodPairings.length})`}>
              <div className="space-y-2">
                {wine.foodPairings.map((fp) => (
                  <div key={fp.id} className="flex items-start gap-3 p-3 rounded-lg border border-stone-200/80 bg-white">
                    <Utensils className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-stone-900">{fp.dishName}</p>
                      {fp.description && (
                        <p className="text-xs text-stone-600 mt-0.5">{fp.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Reviews */}
          {wine.reviews.length > 0 && (
            <SectionCard title="Recent Reviews" description={`Latest approved reviews (${wine.reviews.length})`}>
              <div className="space-y-3">
                {wine.reviews.map((review) => (
                  <div key={review.id} className="p-3 rounded-lg border border-stone-200/80 bg-[#faf8f5]/40">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-stone-900">{review.authorName}</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-stone-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-stone-400">
                        {new Date(review.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    {review.title && (
                      <p className="text-sm font-medium text-stone-800">{review.title}</p>
                    )}
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">{review.comment}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Right Column: Vintages & Experiences */}
        <div className="space-y-6">
          {/* Vintages */}
          <SectionCard title="Vintages" description={`Wine vintages and tasting data (${wine.vintages.length})`} action={<button onClick={openVintageCreate} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#461822] text-white text-xs font-medium hover:bg-[#6c2432]"><Plus className="w-3.5 h-3.5" />Add Vintage</button>}>
            {wine.vintages.length === 0 ? (
              <div className="text-center py-6">
                <Layers className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-xs text-stone-400">No vintages recorded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {wine.vintages.map((vintage) => (
                  <div key={vintage.id} className="p-3 rounded-lg border border-stone-200/80 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-medium text-stone-900">{vintage.vintageYear}</span>
                        <StatusBadge
                          status={vintage.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
                          size="sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-serif font-medium text-stone-900">
                          ${Number(vintage.price).toFixed(2)}
                        </span>
                        <button onClick={() => openVintageEdit(vintage)} className="p-1 rounded hover:bg-stone-100 text-stone-500"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteVintage(vintage)} className="p-1 rounded hover:bg-rose-50 text-stone-500 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-stone-600 mb-2">
                      <div>
                        <span className="text-stone-400">Alcohol:</span>{' '}
                        <span className="font-medium">{vintage.alcohol}</span>
                      </div>
                      <div>
                        <span className="text-stone-400">Inventory:</span>{' '}
                        <span className="font-medium">{vintage.inventoryCount}</span>
                      </div>
                      {vintage.oakAging && (
                        <div className="col-span-2">
                          <span className="text-stone-400">Oak:</span>{' '}
                          <span className="font-medium">{vintage.oakAging}</span>
                        </div>
                      )}
                    </div>

                    {/* Taste Profile */}
                    <div className="pt-2 border-t border-stone-100 space-y-1.5">
                      {(['body', 'acidity', 'sweetness', 'tannin'] as const).map((key) => (
                        <TasteBar
                          key={key}
                          label={TASTE_LABELS[key]}
                          value={vintage[key]}
                        />
                      ))}
                    </div>

                    {vintage.tastingNotes && (
                      <div className="mt-2 pt-2 border-t border-stone-100">
                        <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-0.5">Tasting Notes</p>
                        <p className="text-xs text-stone-600 italic leading-relaxed">{vintage.tastingNotes}</p>
                      </div>
                    )}

                    {vintage.aromaTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {vintage.aromaTags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-50 text-amber-700 border border-amber-200/60"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {vintage.tastingRecords.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-stone-100">
                        <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-1">
                          Tasting Records ({vintage.tastingRecords.length})
                        </p>
                        <div className="space-y-1">
                          {vintage.tastingRecords.map((tr) => (
                            <div key={tr.id} className="flex items-center gap-2 text-[11px]">
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-2.5 h-2.5 ${i < tr.rating ? 'text-amber-500 fill-amber-500' : 'text-stone-300'}`}
                                  />
                                ))}
                              </div>
                              {tr.notes && (
                                <span className="text-stone-500 italic truncate max-w-[150px]">{tr.notes}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Experience Relationships */}
          <SectionCard
            title="Experiences"
            description={`Related tasting experiences (${wine.experienceWines.length})`}
          >
            {wine.experienceWines.length === 0 ? (
              <div className="text-center py-6">
                <BookOpen className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-xs text-stone-400">Not included in any experiences</p>
              </div>
            ) : (
              <div className="space-y-2">
                {wine.experienceWines.map((ew) => (
                  <Link
                    key={ew.id}
                    href={`/admin/experiences/${ew.experience.slug}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-stone-200/80 bg-white hover:bg-[#faf8f5] transition group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#461822]/10 flex items-center justify-center text-[#6c2432] shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 group-hover:text-[#6c2432] transition">
                        {ew.experience.title}
                      </p>
                      {ew.notes && (
                        <p className="text-[11px] text-stone-500 italic truncate">{ew.notes}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Summary Stats */}
          <SectionCard title="Summary" description="Wine collection overview">
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0">
                <span className="text-xs text-stone-500">Total Vintages</span>
                <span className="text-xs font-mono font-medium text-stone-900">{wine.vintages.length}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0">
                <span className="text-xs text-stone-500">Available Vintages</span>
                <span className="text-xs font-mono font-medium text-stone-900">{availableVintages.length}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0">
                <span className="text-xs text-stone-500">Total Inventory</span>
                <span className="text-xs font-mono font-medium text-stone-900">{totalInventory}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0">
                <span className="text-xs text-stone-500">Approved Reviews</span>
                <span className="text-xs font-mono font-medium text-stone-900">{wine._count.reviews}</span>
              </div>
              {avgTastingRating && (
                <div className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0">
                  <span className="text-xs text-stone-500">Avg. Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-mono font-medium text-stone-900">{avgTastingRating}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0">
                <span className="text-xs text-stone-500">Experience Links</span>
                <span className="text-xs font-mono font-medium text-stone-900">{wine._count.experienceWines}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-stone-500">Guest Favorites</span>
                <span className="text-xs font-mono font-medium text-stone-900">{wine._count.favoredByGuests}</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Vintage Dialog */}
      {showVintage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between"><h3 className="font-serif font-medium text-stone-900">{editingVintage ? 'Edit Vintage' : 'Add Vintage'}</h3><button onClick={() => setShowVintage(false)}><X className="h-4 w-4" /></button></div>
            {vintageError && <div className="mb-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700"><AlertCircle className="h-3.5 w-3.5" />{vintageError}</div>}
            <form onSubmit={submitVintage} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Vintage Year *</label><input type="number" value={vintageForm.vintageYear} onChange={(e) => setVintageForm(p => ({ ...p, vintageYear: e.target.value }))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" placeholder="2024" />{fieldErrors.vintageYear && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.vintageYear}</p>}</div>
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Price *</label><input type="number" step="0.01" value={vintageForm.price} onChange={(e) => setVintageForm(p => ({ ...p, price: e.target.value }))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" placeholder="95" />{fieldErrors.price && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.price}</p>}</div>
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Currency</label><input value={vintageForm.currency} onChange={(e) => setVintageForm(p => ({ ...p, currency: e.target.value }))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" placeholder="USD" /></div>
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Alcohol *</label><input value={vintageForm.alcohol} onChange={(e) => setVintageForm(p => ({ ...p, alcohol: e.target.value }))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" placeholder="14.5%" />{fieldErrors.alcohol && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.alcohol}</p>}</div>
                <div className="col-span-2"><label className="text-[11px] uppercase font-mono text-stone-600">Oak Aging</label><input value={vintageForm.oakAging} onChange={(e) => setVintageForm(p => ({ ...p, oakAging: e.target.value }))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" placeholder="22 months in French oak" /></div>
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Body (1-10)</label><input type="number" min="1" max="10" value={vintageForm.body} onChange={(e) => setVintageForm(p => ({ ...p, body: e.target.value }))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Acidity (1-10)</label><input type="number" min="1" max="10" value={vintageForm.acidity} onChange={(e) => setVintageForm(p => ({ ...p, acidity: e.target.value }))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Sweetness (1-10)</label><input type="number" min="1" max="10" value={vintageForm.sweetness} onChange={(e) => setVintageForm(p => ({ ...p, sweetness: e.target.value }))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Tannin (1-10)</label><input type="number" min="1" max="10" value={vintageForm.tannin} onChange={(e) => setVintageForm(p => ({ ...p, tannin: e.target.value }))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Inventory</label><input type="number" min="0" value={vintageForm.inventoryCount} onChange={(e) => setVintageForm(p => ({ ...p, inventoryCount: e.target.value }))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
                <div className="flex items-end gap-2 pb-1"><input type="checkbox" checked={vintageForm.isAvailable} onChange={(e) => setVintageForm(p => ({ ...p, isAvailable: e.target.checked }))} className="rounded" /><label className="text-xs text-stone-700">Available</label></div>
              </div>
              <div><label className="text-[11px] uppercase font-mono text-stone-600">Tasting Notes</label><textarea value={vintageForm.tastingNotes} onChange={(e) => setVintageForm(p => ({ ...p, tastingNotes: e.target.value }))} rows={2} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
              <div><label className="text-[11px] uppercase font-mono text-stone-600">Aroma Tags (comma separated)</label><input value={vintageForm.aromaTags} onChange={(e) => setVintageForm(p => ({ ...p, aromaTags: e.target.value }))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" placeholder="Blackcurrant, Violet" /></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowVintage(false)} className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs">Cancel</button><button type="submit" disabled={vintageLoading} className="inline-flex items-center gap-2 rounded-lg bg-[#461822] px-5 py-2 text-xs text-white disabled:opacity-50">{vintageLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{editingVintage ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
