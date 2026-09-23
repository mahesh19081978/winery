'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Mail,
  Phone,
  FileText,
  Wine,
  Star,
  ThumbsUp,
  ThumbsDown,
  Minus,
  BookOpen,
} from 'lucide-react';
import { SectionCard, StatusBadge } from '@/components/admin/UIComponents';

interface TastingRecordData {
  id: string;
  wineNameSnapshot: string;
  vintageYear: number;
  experienceName: string | null;
  rating: number;
  tasteCharacteristics: string[];
  notes: string;
  wouldDrinkAgain: string;
  body: number;
  acidity: number;
  sweetness: number;
  tannin: number;
  tastedAt: string;
  createdAt: string;
  wineVintage: {
    id: string;
    vintageYear: number;
    price: number;
    alcohol: string;
    oakAging: string | null;
    tastingNotes: string | null;
    aromaTags: string[];
    wine: {
      name: string;
      slug: string;
      varietal: string;
      region: string;
    };
  };
}

interface TastingSessionData {
  id: string;
  sessionDate: string;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  guestProfile: {
    id: string;
    name: string;
    phone: string | null;
    user: {
      email: string;
    };
  };
  booking: {
    id: string;
    bookingNumber: string;
    date: string;
    time: string;
    status: string;
    totalGuests: number;
    items: {
      title: string;
      experience: {
        title: string;
        slug: string;
      } | null;
    }[];
  } | null;
  records: TastingRecordData[];
}

interface TastingDetailClientProps {
  session: TastingSessionData;
  adminEmail: string;
  adminRole: string;
}

function SensoryBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-mono tracking-wider text-stone-500">{label}</span>
        <span className="text-xs font-mono font-medium text-stone-900">{value}/10</span>
      </div>
      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#6c2432] rounded-full transition-all"
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
}

function DrinkAgainBadge({ preference }: { preference: string }) {
  const config = {
    YES: { icon: ThumbsUp, label: 'Yes', style: 'bg-emerald-50 text-emerald-800 border-emerald-200/80' },
    MAYBE: { icon: Minus, label: 'Maybe', style: 'bg-amber-50 text-amber-800 border-amber-200/80' },
    NO: { icon: ThumbsDown, label: 'No', style: 'bg-rose-50 text-rose-800 border-rose-200/80' },
  };
  const c = config[preference as keyof typeof config] || config.MAYBE;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full border ${c.style}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

export function TastingDetailClient({ session }: TastingDetailClientProps) {
  const avgRating = session.records.length > 0
    ? (session.records.reduce((sum, r) => sum + Number(r.rating), 0) / session.records.length).toFixed(1)
    : null;

  const drinkAgainCount = {
    YES: session.records.filter((r) => r.wouldDrinkAgain === 'YES').length,
    MAYBE: session.records.filter((r) => r.wouldDrinkAgain === 'MAYBE').length,
    NO: session.records.filter((r) => r.wouldDrinkAgain === 'NO').length,
  };

  const uniqueWines = new Set(session.records.map((r) => r.wineVintage.wine.name)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/tastings"
            className="p-2 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
                VINORA • Tasting Session
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium">
                {session.guestProfile.name}
              </h1>
              <StatusBadge status="COMPLETED" size="md" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Session Overview */}
          <SectionCard title="Session Overview" description="Tasting session details and scheduling">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CalendarDays className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Session Date</p>
                    <p className="text-sm font-medium text-stone-900">
                      {new Date(session.sessionDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Time</p>
                    <p className="text-sm font-medium text-stone-900">
                      {new Date(session.sessionDate).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                {session.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-stone-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Location</p>
                      <p className="text-sm font-medium text-stone-900">{session.location}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <BookOpen className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Wines Tasted</p>
                    <p className="text-sm font-medium text-stone-900">
                      {session.records.length} records • {uniqueWines} unique wines
                    </p>
                  </div>
                </div>
                {avgRating && (
                  <div className="flex items-start gap-3">
                    <Star className="w-4 h-4 text-stone-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Average Rating</p>
                      <p className="text-sm font-medium text-stone-900">
                        {avgRating} <span className="text-stone-400">/ 5.0</span>
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Session Notes</p>
                    <p className="text-sm text-stone-700">{session.notes || 'No notes recorded'}</p>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Guest Information */}
          <SectionCard title="Guest Information" description="Primary guest details for this session">
            <div className="p-4 rounded-xl border border-stone-200/80 bg-[#faf8f5]/40">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#461822]/10 border border-[#461822]/20 flex items-center justify-center text-[#6c2432] font-serif font-medium text-sm">
                  {session.guestProfile.name?.charAt(0)?.toUpperCase() || 'G'}
                </div>
                <div>
                  <p className="font-medium text-stone-900">{session.guestProfile.name}</p>
                  <p className="text-[10px] uppercase font-mono text-stone-500">Guest</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  {session.guestProfile.user.email}
                </div>
                {session.guestProfile.phone && (
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    {session.guestProfile.phone}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Booking Relationship */}
          {session.booking && (
            <SectionCard title="Associated Booking" description="Linked reservation details">
              <div className="p-4 rounded-xl border border-stone-200/80 bg-[#faf8f5]/40">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/bookings/${session.booking.bookingNumber}`}
                      className="font-mono font-medium text-[#6c2432] hover:text-[#461822] hover:underline text-sm"
                    >
                      {session.booking.bookingNumber}
                    </Link>
                    <StatusBadge status={session.booking.status} size="sm" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-[10px] uppercase font-mono text-stone-500">Booking Date</p>
                    <p className="font-medium text-stone-900">
                      {new Date(session.booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-mono text-stone-500">Time</p>
                    <p className="font-medium text-stone-900">{session.booking.time}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-mono text-stone-500">Guests</p>
                    <p className="font-medium text-stone-900">{session.booking.totalGuests}</p>
                  </div>
                </div>
                {session.booking.items.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-stone-200/60">
                    <p className="text-[10px] uppercase font-mono text-stone-500 mb-1">Experience</p>
                    <p className="text-sm font-serif text-stone-900">
                      {session.booking.items[0]?.experience?.title || session.booking.items[0]?.title || 'Estate Tasting'}
                    </p>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* Tasting Records */}
          <SectionCard
            title="Tasting Records"
            description={`${session.records.length} wine${session.records.length !== 1 ? 's' : ''} tasted in this session`}
          >
            {session.records.length === 0 ? (
              <div className="text-center py-8">
                <Wine className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-xs text-stone-500">No tasting records in this session</p>
              </div>
            ) : (
              <div className="space-y-4">
                {session.records.map((record) => (
                  <div
                    key={record.id}
                    className="p-4 rounded-xl border border-stone-200/80 bg-white hover:bg-[#faf8f5]/40 transition"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h4 className="font-serif font-medium text-stone-900 text-sm">
                          {record.wineNameSnapshot}
                        </h4>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {record.wineVintage.wine.varietal} • {record.wineVintage.wine.region}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-stone-500">
                            Vintage {record.vintageYear}
                          </span>
                          {record.experienceName && (
                            <>
                              <span className="text-stone-300">•</span>
                              <span className="text-[10px] font-mono text-stone-500">
                                {record.experienceName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-mono font-semibold text-sm text-stone-900">
                            {Number(record.rating).toFixed(1)}
                          </span>
                        </div>
                        <DrinkAgainBadge preference={record.wouldDrinkAgain} />
                      </div>
                    </div>

                    {/* Taste Characteristics */}
                    {record.tasteCharacteristics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {record.tasteCharacteristics.map((char) => (
                          <span
                            key={char}
                            className="px-2 py-0.5 text-[10px] font-medium bg-[#461822]/5 text-[#6c2432] border border-[#461822]/10 rounded-full"
                          >
                            {char}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Sensory Profile */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <SensoryBar label="Body" value={record.body} />
                      <SensoryBar label="Acidity" value={record.acidity} />
                      <SensoryBar label="Sweetness" value={record.sweetness} />
                      <SensoryBar label="Tannin" value={record.tannin} />
                    </div>

                    {/* Vintage Details */}
                    <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/60 mb-3">
                      <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-2">Vintage Details</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-stone-500">Year:</span>
                          <span className="ml-1 font-medium text-stone-900">{record.wineVintage.vintageYear}</span>
                        </div>
                        <div>
                          <span className="text-stone-500">ABV:</span>
                          <span className="ml-1 font-medium text-stone-900">{record.wineVintage.alcohol}</span>
                        </div>
                        {record.wineVintage.oakAging && (
                          <div className="col-span-2">
                            <span className="text-stone-500">Oak:</span>
                            <span className="ml-1 font-medium text-stone-900">{record.wineVintage.oakAging}</span>
                          </div>
                        )}
                      </div>
                      {record.wineVintage.aromaTags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {record.wineVintage.aromaTags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 text-[9px] font-medium bg-white text-stone-600 border border-stone-200 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {record.notes && (
                      <div>
                        <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-1">Tasting Notes</p>
                        <p className="text-xs text-stone-700 italic leading-relaxed">{record.notes}</p>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="mt-3 pt-2 border-t border-stone-100 flex items-center gap-3 text-[10px] text-stone-400 font-mono">
                      <span>Tasted: {new Date(record.tastedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span>Recorded: {new Date(record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Column: Summary */}
        <div className="space-y-6">
          {/* Session Summary */}
          <SectionCard title="Session Summary" description="Quick overview of tasting metrics">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[#faf8f5] border border-stone-200/60 text-center">
                  <p className="text-2xl font-serif font-medium text-stone-900">{session.records.length}</p>
                  <p className="text-[10px] uppercase font-mono text-stone-500">Total Records</p>
                </div>
                <div className="p-3 rounded-lg bg-[#faf8f5] border border-stone-200/60 text-center">
                  <p className="text-2xl font-serif font-medium text-stone-900">{uniqueWines}</p>
                  <p className="text-[10px] uppercase font-mono text-stone-500">Unique Wines</p>
                </div>
              </div>

              {avgRating && (
                <div className="p-3 rounded-lg bg-[#faf8f5] border border-stone-200/60 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <p className="text-2xl font-serif font-medium text-stone-900">{avgRating}</p>
                    <span className="text-sm text-stone-400">/ 5.0</span>
                  </div>
                  <p className="text-[10px] uppercase font-mono text-stone-500 mt-1">Average Rating</p>
                </div>
              )}

              <div className="border-t border-stone-100 pt-4">
                <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-3">Drink Again</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="w-3 h-3 text-emerald-600" />
                      <span className="text-xs text-stone-700">Yes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{
                            width: session.records.length > 0
                              ? `${(drinkAgainCount.YES / session.records.length) * 100}%`
                              : '0%',
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono text-stone-600 w-6 text-right">{drinkAgainCount.YES}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Minus className="w-3 h-3 text-amber-600" />
                      <span className="text-xs text-stone-700">Maybe</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{
                            width: session.records.length > 0
                              ? `${(drinkAgainCount.MAYBE / session.records.length) * 100}%`
                              : '0%',
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono text-stone-600 w-6 text-right">{drinkAgainCount.MAYBE}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ThumbsDown className="w-3 h-3 text-rose-600" />
                      <span className="text-xs text-stone-700">No</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{
                            width: session.records.length > 0
                              ? `${(drinkAgainCount.NO / session.records.length) * 100}%`
                              : '0%',
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono text-stone-600 w-6 text-right">{drinkAgainCount.NO}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-stone-100 pt-4">
                <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-2">Wines Tasted</p>
                <div className="space-y-2">
                  {Array.from(new Map(session.records.map((r) => [r.wineVintage.wine.name, r])).values()).map((record) => (
                    <div key={record.id} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-stone-200/60">
                      <Wine className="w-3.5 h-3.5 text-[#6c2432] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-stone-900 truncate">{record.wineNameSnapshot}</p>
                        <p className="text-[10px] text-stone-500">{record.wineVintage.vintageYear}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-mono text-stone-700">{Number(record.rating).toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Session Metadata */}
          <SectionCard title="Session Metadata" description="System timestamps and identifiers">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Session ID</span>
                <span className="font-mono text-stone-700 text-[10px]">{session.id.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Created</span>
                <span className="font-mono text-stone-700">
                  {new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Updated</span>
                <span className="font-mono text-stone-700">
                  {new Date(session.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
