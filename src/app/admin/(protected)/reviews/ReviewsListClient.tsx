'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Star,
  Wine,
  Sparkles,
  Ticket,
  Calendar,
} from 'lucide-react';
import { SectionCard, StatusBadge } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';

interface AdminReviewItem {
  id: string;
  authorName: string;
  guestName: string | null;
  guestEmail: string | null;
  rating: number;
  title: string;
  comment: string;
  category: string;
  targetName: string;
  status: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  booking: { bookingNumber: string; date: string; status: string } | null;
  eventBookingNumber: string | null;
  experience: { id: string; title: string; slug: string } | null;
  wine: { id: string; name: string; slug: string } | null;
  event: { id: string; title: string; slug: string; eventDate: string } | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  WINE_TASTING: 'Wine Tasting',
  VINEYARD_TOUR: 'Vineyard Tour',
  EVENTS: 'Events',
  FOOD: 'Food',
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function ReviewsListClient() {
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');

  const fetchReviews = useCallback(
    async (page: number, searchVal: string, statusVal: string, categoryVal: string) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', '20');
        if (searchVal) params.set('search', searchVal);
        if (statusVal) params.set('status', statusVal);
        if (categoryVal) params.set('category', categoryVal);

        const response = await fetch(`/api/admin/reviews?${params.toString()}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch reviews');
        }
        setReviews(result.data.items);
        setPagination(result.data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReviews(1, '', '', '');
  }, [fetchReviews]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    fetchReviews(1, searchInput, status, category);
  };
  const handleStatusFilter = (val: string) => {
    setStatus(val);
    fetchReviews(1, search, val, category);
  };
  const handleCategoryFilter = (val: string) => {
    setCategory(val);
    fetchReviews(1, search, status, val);
  };
  const handleClear = () => {
    setSearch('');
    setSearchInput('');
    setStatus('');
    setCategory('');
    fetchReviews(1, '', '', '');
  };
  const handlePageChange = (newPage: number) => fetchReviews(newPage, search, status, category);
  const hasActiveFilters = status || category || search;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
              VINORA • Estate Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium mt-1">Reviews</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Guest-submitted reviews awaiting and through estate moderation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200/80 shadow-xs">
            <Star className="w-3.5 h-3.5 text-stone-500" />
            <span className="text-xs font-mono font-medium text-stone-700">{pagination.total} total</span>
          </div>
        </div>
      </div>

      <SectionCard
        title="All Guest Reviews"
        description="Read-only visibility of reviews submitted by authenticated guests"
      >
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search title, comment, guest, or booking #..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition"
              />
            </form>
            <select
              value={status}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select
              value={category}
              onChange={(e) => handleCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
            >
              <option value="">All Categories</option>
              <option value="WINE_TASTING">Wine Tasting</option>
              <option value="VINEYARD_TOUR">Vineyard Tour</option>
              <option value="EVENTS">Events</option>
              <option value="FOOD">Food</option>
            </select>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <p className="text-xs text-rose-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="mt-6 flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-6 h-6 text-[#6c2432] animate-spin" />
            <p className="text-xs text-stone-500 font-mono">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No reviews found"
              description={
                hasActiveFilters
                  ? 'No reviews match your filters. Try adjusting search criteria.'
                  : 'Guest-submitted reviews will appear here once submitted from the guest portal.'
              }
            />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6c2432] font-mono">
                        {review.id}
                      </span>
                      <StatusBadge status={review.status} />
                      <span className="text-[10px] uppercase tracking-wider text-stone-500 bg-stone-100 border border-stone-200 rounded-full px-2 py-0.5">
                        {CATEGORY_LABELS[review.category] || review.category}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg text-stone-900 font-medium">{review.title}</h3>
                    <p className="text-xs text-stone-500">
                      by <span className="font-medium text-stone-700">{review.guestName || review.authorName}</span>
                      {review.guestEmail && <span className="text-stone-400"> · {review.guestEmail}</span>}
                    </p>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-medium text-stone-700 ml-1">{review.rating}/5</span>
                    </div>
                    <span className="text-[11px] text-stone-500 font-mono">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-stone-700 leading-relaxed italic font-serif border-l-2 border-[#c5a059]/40 pl-3">
                  &ldquo;{review.comment}&rdquo;
                </p>

                <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-stone-400">Target:</span>
                    <span className="font-medium text-stone-700">{review.targetName}</span>
                  </span>
                  {review.experience && (
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" />
                      Experience · {review.experience.title}
                    </span>
                  )}
                  {review.wine && (
                    <span className="inline-flex items-center gap-1.5">
                      <Wine className="w-3.5 h-3.5 text-[#8a3243]" />
                      Wine · {review.wine.name}
                    </span>
                  )}
                  {review.event && (
                    <span className="inline-flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5 text-[#8a3243]" />
                      Event · {review.event.title}
                    </span>
                  )}
                  {review.booking && (
                    <span className="inline-flex items-center gap-1.5 font-mono">
                      <Calendar className="w-3.5 h-3.5" />
                      #{review.booking.bookingNumber} · {formatDate(review.booking.date)}
                    </span>
                  )}
                  {!review.booking && review.eventBookingNumber && (
                    <span className="inline-flex items-center gap-1.5 font-mono">
                      <Calendar className="w-3.5 h-3.5" />
                      {review.eventBookingNumber}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4">
            <p className="text-xs text-stone-500 font-mono">
              Page {pagination.page} of {pagination.totalPages} • {pagination.total} reviews
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3 h-3" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
