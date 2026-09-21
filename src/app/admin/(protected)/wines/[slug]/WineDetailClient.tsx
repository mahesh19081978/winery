'use client';

import React from 'react';
import Link from 'next/link';
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

export function WineDetailClient({ wine }: { wine: WineData }) {
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
                Domaine Élysée • Wine Details
              </span>
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
      </div>

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
          <SectionCard title="Vintages" description={`Wine vintages and tasting data (${wine.vintages.length})`}>
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
                      <span className="text-sm font-serif font-medium text-stone-900">
                        ${Number(vintage.price).toFixed(2)}
                      </span>
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
    </div>
  );
}
