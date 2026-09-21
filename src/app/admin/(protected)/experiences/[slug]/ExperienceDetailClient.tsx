'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  Users,
  DollarSign,
  Star,
  Tag,
  CheckCircle,
  HelpCircle,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { SectionCard, StatusBadge } from '@/components/admin/UIComponents';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ExperienceData {
  id: string;
  slug: string;
  title: string;
  category: string;
  durationMinutes: number;
  durationText: string;
  price: number;
  currency: string;
  shortDescription: string;
  description: string;
  rating: number;
  reviewCount: number;
  capacity: number;
  minGuests: number;
  maxGuests: number;
  foodPairing: string | null;
  highlights: string[];
  includedItems: string[];
  guestExpectations: string[];
  importantInfo: string[];
  featured: boolean;
  badge: string | null;
  isActive: boolean;
  images: { id: string; url: string; altText: string | null; isPrimary: boolean; sortOrder: number }[];
  faqs: { id: string; question: string; answer: string; sortOrder: number }[];
  timelines: { id: string; timeRange: string; title: string; description: string; sortOrder: number }[];
  includedWines: {
    id: string;
    notes: string | null;
    sortOrder: number;
    wine: {
      id: string;
      name: string;
      slug: string;
      category: string;
      vintages: { id: string; vintageYear: number; price: number }[];
      images: { id: string; url: string }[];
    };
  }[];
  availabilityRules: {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotInterval: number;
    capacity: number;
    isActive: boolean;
  }[];
  timeSlotOverrides: {
    id: string;
    date: string;
    time: string;
    capacity: number;
    isBlocked: boolean;
    reason: string | null;
  }[];
  _count: { bookingItems: number; reviews: number };
}

export function ExperienceDetailClient({ experience }: { experience: ExperienceData }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/experiences"
            className="p-2 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
                Domaine Élysée • Experience Details
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium">
                {experience.title}
              </h1>
              <StatusBadge status={experience.isActive ? 'ACTIVE' : 'INACTIVE'} size="md" />
              {experience.featured && (
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
          <SectionCard title="Basic Information" description="Core experience configuration and pricing">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Tag className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Category</p>
                    <StatusBadge status={experience.category} size="md" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Duration</p>
                    <p className="text-sm font-medium text-stone-900">{experience.durationText}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Price</p>
                    <p className="text-sm font-serif font-medium text-stone-900">${Number(experience.price).toFixed(2)} {experience.currency}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Capacity</p>
                    <p className="text-sm font-medium text-stone-900">
                      {experience.capacity} guests
                      <span className="text-stone-500 text-xs ml-1">({experience.minGuests}–{experience.maxGuests})</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Star className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Rating</p>
                    <p className="text-sm font-medium text-stone-900">
                      {Number(experience.rating).toFixed(1)} ({experience.reviewCount} reviews)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BookOpen className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Total Bookings</p>
                    <p className="text-sm font-medium text-stone-900">{experience._count.bookingItems}</p>
                  </div>
                </div>
                {experience.badge && (
                  <div className="flex items-start gap-3">
                    <Tag className="w-4 h-4 text-stone-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Badge</p>
                      <p className="text-sm font-medium text-stone-900">{experience.badge}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-stone-100">
              <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-1">Short Description</p>
              <p className="text-sm text-stone-700">{experience.shortDescription}</p>
            </div>

            <div className="mt-4 pt-4 border-t border-stone-100">
              <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-1">Full Description</p>
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{experience.description}</p>
            </div>
          </SectionCard>

          {/* Experience Content */}
          <SectionCard title="Experience Content" description="Highlights, inclusions, and guest information">
            <div className="space-y-4">
              {experience.highlights.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-2">Highlights</p>
                  <ul className="space-y-1.5">
                    {experience.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {experience.includedItems.length > 0 && (
                <div className="pt-4 border-t border-stone-100">
                  <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-2">Included Items</p>
                  <ul className="space-y-1.5">
                    {experience.includedItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                        <CheckCircle className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {experience.foodPairing && (
                <div className="pt-4 border-t border-stone-100">
                  <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-1">Food Pairing</p>
                  <p className="text-sm text-stone-700">{experience.foodPairing}</p>
                </div>
              )}

              {experience.guestExpectations.length > 0 && (
                <div className="pt-4 border-t border-stone-100">
                  <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-2">What to Expect</p>
                  <ul className="space-y-1.5">
                    {experience.guestExpectations.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                        <CheckCircle className="w-3.5 h-3.5 text-sky-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {experience.importantInfo.length > 0 && (
                <div className="pt-4 border-t border-stone-100">
                  <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-2">Important Information</p>
                  <ul className="space-y-1.5">
                    {experience.importantInfo.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Images */}
          {experience.images.length > 0 && (
            <SectionCard title="Images" description={`Configured experience images (${experience.images.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {experience.images.map((img) => (
                  <div key={img.id} className="relative rounded-lg overflow-hidden border border-stone-200/80 bg-stone-100 aspect-[4/3]">
                    <img
                      src={img.url}
                      alt={img.altText || experience.title}
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

          {/* FAQs */}
          {experience.faqs.length > 0 && (
            <SectionCard title="FAQs" description={`Frequently asked questions (${experience.faqs.length})`}>
              <div className="space-y-3">
                {experience.faqs.map((faq) => (
                  <div key={faq.id} className="p-3 rounded-lg border border-stone-200/80 bg-[#faf8f5]/40">
                    <p className="text-sm font-medium text-stone-900">{faq.question}</p>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Wines */}
          {experience.includedWines.length > 0 && (
            <SectionCard title="Wines" description={`Wines associated with this experience (${experience.includedWines.length})`}>
              <div className="space-y-3">
                {experience.includedWines.map((ew) => (
                  <div key={ew.id} className="flex items-center gap-3 p-3 rounded-lg border border-stone-200/80 bg-white">
                    {ew.wine.images[0] && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                        <img src={ew.wine.images[0].url} alt={ew.wine.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-serif font-medium text-stone-900">{ew.wine.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={ew.wine.category} />
                        {ew.wine.vintages.length > 0 && (
                          <span className="text-[10px] font-mono text-stone-500">
                            {ew.wine.vintages.map(v => v.vintageYear).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    {ew.notes && (
                      <p className="text-[11px] text-stone-500 italic max-w-[200px] truncate">{ew.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Timeline */}
          {experience.timelines.length > 0 && (
            <SectionCard title="Schedule" description="Experience timeline and flow">
              <div className="space-y-0">
                {experience.timelines.map((t, idx) => (
                  <div key={t.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {idx < experience.timelines.length - 1 && (
                      <div className="absolute left-[7px] top-5 bottom-0 w-px bg-stone-200" />
                    )}
                    <div className="w-3.5 h-3.5 rounded-full bg-[#461822]/10 border-2 border-[#461822]/30 shrink-0 mt-0.5 relative z-10" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-mono text-stone-500">{t.timeRange}</span>
                        <span className="text-sm font-medium text-stone-900">{t.title}</span>
                      </div>
                      <p className="text-xs text-stone-600 mt-0.5">{t.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Right Column: Availability Rules */}
        <div className="space-y-6">
          {/* Availability Rules */}
          <SectionCard title="Availability Rules" description="Configured time slot rules by day of week">
            {experience.availabilityRules.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-xs text-stone-400">No availability rules configured</p>
              </div>
            ) : (
              <div className="space-y-2">
                {experience.availabilityRules.map((rule) => (
                  <div key={rule.id} className="p-3 rounded-lg border border-stone-200/80 bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-stone-900">{DAY_NAMES[rule.dayOfWeek]}</span>
                      <StatusBadge status={rule.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-stone-600 font-mono">
                      <span>{rule.startTime} – {rule.endTime}</span>
                      <span>•</span>
                      <span>{rule.slotInterval}min slots</span>
                      <span>•</span>
                      <span>{rule.capacity} pax</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Time Slot Overrides */}
          <SectionCard title="Time Slot Overrides" description="Date-specific capacity adjustments and blocks">
            {experience.timeSlotOverrides.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-xs text-stone-400">No time slot overrides configured</p>
              </div>
            ) : (
              <div className="space-y-2">
                {experience.timeSlotOverrides.map((ov) => (
                  <div key={ov.id} className="p-3 rounded-lg border border-stone-200/80 bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-stone-900">
                        {new Date(ov.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <StatusBadge status={ov.isBlocked ? 'BLOCKED' : 'ACTIVE'} size="sm" />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-stone-600 font-mono">
                      <span>{ov.time}</span>
                      <span>•</span>
                      <span>{ov.capacity} pax</span>
                    </div>
                    {ov.reason && (
                      <p className="text-[11px] text-stone-500 mt-1 italic">{ov.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Coming Soon Notice */}
          <SectionCard title="Management Actions" description="Experience configuration operations">
            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-stone-200/60 bg-stone-50/70 opacity-85 cursor-not-allowed">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-stone-600">Edit Experience</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-stone-200 text-stone-600">
                    Coming Soon
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">Modify experience details, pricing, and content</p>
              </div>
              <div className="p-3 rounded-lg border border-stone-200/60 bg-stone-50/70 opacity-85 cursor-not-allowed">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-stone-600">Manage Availability</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-stone-200 text-stone-600">
                    Coming Soon
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">Configure availability rules and time slot overrides</p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
