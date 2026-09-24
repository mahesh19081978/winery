'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Compass,
  MapPin,
  Search,
  Star,
  Wine,
} from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

interface JourneyTastingItem {
  id: string;
  tastingDate: string;
  rating: string;
  wouldDrinkAgain: string;
  notes: string;
  tasteCharacteristics: string[];
  experienceName: string | null;
  wine: {
    id: string;
    name: string;
    slug: string;
    category: string;
  };
  wineVintageId: string;
  vintageYear: number;
  session: {
    id: string;
    sessionDate: string;
    location: string | null;
    notes: string | null;
  } | null;
  booking: {
    bookingNumber: string;
    date: string;
  } | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const DRINK_AGAIN_LABELS: Record<string, string> = {
  YES: 'Would drink again',
  MAYBE: 'Maybe again',
  NO: 'Not for me',
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatCategory(category: string): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

function formatDrinkAgain(value: string): string {
  return DRINK_AGAIN_LABELS[value] ?? value;
}

export default function WineJourneyPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<JourneyTastingItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJourney = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '10',
      });
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      const res = await fetch(`/api/auth/guest/journey?${params.toString()}`, {
        cache: 'no-store',
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to load your wine journey');
      }
      setItems(json.data?.items ?? []);
      setPagination(json.data?.pagination ?? null);
    } catch (e) {
      setItems([]);
      setPagination(null);
      setError(e instanceof Error ? e.message : 'Failed to load your wine journey');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJourney();
  }, [fetchJourney]);

  const changeSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-3xl bg-[#faf8f5] border border-stone-200/80 p-8 md:p-10 relative overflow-hidden">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/15 border border-[#c5a059]/30 text-xs font-semibold uppercase tracking-wider text-[#8a3243] mb-4">
            <Compass className="w-3.5 h-3.5 text-[#c5a059]" />
            Tasting History
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-stone-900 font-light mb-3">
            My Wine Journey
          </h1>
          <p className="text-stone-600 font-light text-base leading-relaxed">
            Every vintage tells a story of weather, soil, and craft. Follow the chronological
            chronicle of your palate discoveries across estate visits and tasting sessions.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by wine name, notes, or experience..."
            value={searchQuery}
            onChange={(e) => changeSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:border-[#8a3243] text-stone-800"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="w-8 h-8 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-[0.25em] text-stone-500">
            Loading your wine journey…
          </span>
        </div>
      ) : error ? (
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-10 text-center max-w-lg mx-auto my-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="font-serif text-xl font-medium text-stone-900 mb-2">
            Unable to load your wine journey
          </h3>
          <p className="text-sm text-stone-500 mb-6 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => fetchJourney()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2d1117] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider hover:bg-[#461822] transition"
          >
            Try Again
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Wine className="w-7 h-7" />}
          title={searchQuery ? 'No tastings match your search' : 'Your wine journey awaits'}
          description={
            searchQuery
              ? `No tasting records matched "${searchQuery}". Try a different keyword.`
              : 'Once you taste with us, your personal tasting history will appear here — notes, ratings, and the wines you loved.'
          }
          actionText={searchQuery ? undefined : 'Explore Our Wines'}
          actionHref={searchQuery ? undefined : '/wines'}
        />
      ) : (
        <section className="relative border-l-2 border-stone-200 ml-4 md:ml-6 pl-6 md:pl-10 space-y-10">
          {items.map((record) => (
            <div key={record.id} className="relative group">
              {/* Timeline node icon */}
              <div className="absolute -left-[35px] md:-left-[51px] top-1.5 w-6 h-6 rounded-full bg-[#8a3243] text-white flex items-center justify-center text-xs font-semibold ring-4 ring-[#faf8f5]">
                <Wine className="w-3 h-3" />
              </div>

              {/* Timeline Card */}
              <article className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm hover:border-[#c5a059]/50 transition">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(record.tastingDate)}</span>
                      {record.experienceName && (
                        <>
                          <span>·</span>
                          <span className="text-[#8a3243] font-medium">{record.experienceName}</span>
                        </>
                      )}
                      {record.booking && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-stone-500">
                            #{record.booking.bookingNumber}
                          </span>
                        </>
                      )}
                    </div>

                    <h2 className="font-serif text-xl md:text-2xl text-stone-900 font-normal">
                      <Link
                        href={`/wines/${record.wine.slug}`}
                        className="hover:text-[#8a3243] transition"
                      >
                        {record.wine.name}
                      </Link>
                    </h2>

                    <p className="text-xs text-stone-500">
                      Vintage {record.vintageYear} · {formatCategory(record.wine.category)}
                    </p>

                    {record.session?.location && (
                      <p className="flex items-center gap-1.5 text-xs text-stone-500 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-[#8a3243]" />
                        {record.session.location}
                      </p>
                    )}
                  </div>

                  {/* Rating & Drink-again */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 bg-[#faf8f5] px-4 py-2 rounded-2xl border border-stone-200">
                      <Star className="w-4 h-4 text-[#c5a059] fill-current" />
                      <span className="font-serif text-lg font-semibold text-stone-900">
                        {record.rating}
                      </span>
                      <span className="text-xs text-stone-400">/ 5</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#f4f0e8] border border-[#e6dece] text-[11px] font-semibold uppercase tracking-wider text-[#8a3243]">
                      {formatDrinkAgain(record.wouldDrinkAgain)}
                    </span>
                    <Link
                      href={`/wines/${record.wine.slug}`}
                      className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-xs font-medium uppercase tracking-wider hover:border-[#8a3243] hover:text-[#8a3243] transition inline-flex items-center gap-1.5"
                    >
                      View Wine <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Tasting notes & characteristics */}
                <div className="mt-6 pt-6 border-t border-stone-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <h3 className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-2">
                      My Tasting Notes
                    </h3>
                    <p className="text-stone-700 text-sm italic font-serif leading-relaxed">
                      &ldquo;{record.notes}&rdquo;
                    </p>
                  </div>
                  {record.tasteCharacteristics.length > 0 && (
                    <div>
                      <h3 className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-2">
                        Identified Notes
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {record.tasteCharacteristics.map((characteristic, i) => (
                          <span
                            key={i}
                            className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 font-medium"
                          >
                            {characteristic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {record.session?.notes && (
                  <div className="mt-4 pt-4 border-t border-stone-100">
                    <h3 className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-2">
                      Session Notes
                    </h3>
                    <p className="text-stone-600 text-xs leading-relaxed">{record.session.notes}</p>
                  </div>
                )}
              </article>
            </div>
          ))}
        </section>
      )}

      {/* Pagination */}
      {!loading && !error && pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-stone-200">
          <span className="text-xs text-stone-500 order-2 sm:order-1">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total}{' '}
            {pagination.total === 1 ? 'tasting' : 'tastings'}
          </span>
          <div className="flex items-center gap-3 order-1 sm:order-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-xs font-medium uppercase tracking-wider hover:border-[#8a3243] hover:text-[#8a3243] transition disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-xs font-medium uppercase tracking-wider hover:border-[#8a3243] hover:text-[#8a3243] transition disabled:opacity-40 disabled:pointer-events-none"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
