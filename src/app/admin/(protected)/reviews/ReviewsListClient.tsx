'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Search,
  Star,
  Wine,
  Sparkles,
  Ticket,
  Calendar,
  X,
  XCircle,
  User,
  Clock,
  ShieldCheck,
  Check,
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

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  // Moderation state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ review: AdminReviewItem; action: 'APPROVE' | 'REJECT' } | null>(null);
  const [detailModal, setDetailModal] = useState<AdminReviewItem | null>(null);

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

  const executeModeration = async (reviewId: string, action: 'APPROVE' | 'REJECT') => {
    setActionLoadingId(reviewId);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${action.toLowerCase()} review`);
      }

      const updated: AdminReviewItem = result.data;
      setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      if (detailModal?.id === updated.id) {
        setDetailModal(updated);
      }
      setConfirmModal(null);
      setFeedback({
        type: 'success',
        message:
          action === 'APPROVE'
            ? `Review #${updated.id.slice(0, 8)} successfully approved and published.`
            : `Review #${updated.id.slice(0, 8)} successfully rejected.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : `Failed to ${action.toLowerCase()} review`,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
              VINORA • Estate Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium mt-1">Review Moderation</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Evaluate guest reviews, inspect booking verification, and moderate public visibility
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200/80 shadow-xs">
            <Star className="w-3.5 h-3.5 text-stone-500" />
            <span className="text-xs font-mono font-medium text-stone-700">{pagination.total} total</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-xs transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/90 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <p className="text-xs font-medium">{feedback.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-stone-600 transition"
            aria-label="Dismiss feedback"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <SectionCard
        title="Guest Reviews"
        description="Inspect details and moderate guest submissions for estate authenticity"
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
                className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs space-y-3 hover:border-stone-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6c2432] font-mono">
                        {review.id.slice(0, 8)}...
                      </span>
                      <StatusBadge status={review.status} />
                      <span className="text-[10px] uppercase tracking-wider text-stone-500 bg-stone-100 border border-stone-200 rounded-full px-2 py-0.5">
                        {CATEGORY_LABELS[review.category] || review.category}
                      </span>
                      {review.verified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-full px-2 py-0.5">
                          <ShieldCheck className="w-3 h-3" /> Verified Guest
                        </span>
                      )}
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

                <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailModal(review)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-600 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Inspect
                    </button>
                    {review.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setConfirmModal({ review, action: 'APPROVE' })}
                          disabled={actionLoadingId === review.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition disabled:opacity-50"
                        >
                          {actionLoadingId === review.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmModal({ review, action: 'REJECT' })}
                          disabled={actionLoadingId === review.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition disabled:opacity-50"
                        >
                          {actionLoadingId === review.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                          Reject
                        </button>
                      </>
                    )}
                  </div>
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

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    confirmModal.action === 'APPROVE'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {confirmModal.action === 'APPROVE' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-serif text-lg text-stone-900 font-medium">
                    {confirmModal.action === 'APPROVE' ? 'Approve Review' : 'Reject Review'}
                  </h3>
                  <p className="text-xs text-stone-500 font-mono">
                    ID: {confirmModal.review.id.slice(0, 8)}...
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="text-stone-400 hover:text-stone-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 text-xs text-stone-700 space-y-1">
              <p className="font-serif font-medium text-stone-900">&ldquo;{confirmModal.review.title}&rdquo;</p>
              <p className="text-stone-500">
                by {confirmModal.review.guestName || confirmModal.review.authorName} · {confirmModal.review.rating}/5 stars
              </p>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              {confirmModal.action === 'APPROVE'
                ? 'Approving this review makes it publicly visible on the estate portal, wine profiles, and experience pages according to domain rules.'
                : 'Rejecting this review marks it as REJECTED. It will remain in estate records for audit and accountability, and will NOT appear on public pages.'}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={actionLoadingId === confirmModal.review.id}
                className="px-4 py-2 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeModeration(confirmModal.review.id, confirmModal.action)}
                disabled={actionLoadingId === confirmModal.review.id}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white rounded-lg transition shadow-xs ${
                  confirmModal.action === 'APPROVE'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-rose-700 hover:bg-rose-800'
                }`}
              >
                {actionLoadingId === confirmModal.review.id && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                {confirmModal.action === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Inspection Modal */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200/80 flex items-center justify-between bg-[#fdfcfb]">
              <div className="flex items-center gap-2.5">
                <StatusBadge status={detailModal.status} />
                <span className="text-xs uppercase font-mono text-[#6c2432] font-medium tracking-wide">
                  Review Details
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="text-stone-400 hover:text-stone-600 transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-stone-800">
              {/* Header block */}
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < detailModal.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                      }`}
                    />
                  ))}
                  <span className="text-xs font-medium text-stone-700 ml-1.5">{detailModal.rating} out of 5 stars</span>
                </div>
                <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-medium">
                  {detailModal.title}
                </h2>
              </div>

              {/* Full Comment */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/70">
                <p className="text-xs uppercase font-mono tracking-wider text-stone-400 mb-2">Guest Feedback</p>
                <p className="text-sm font-serif italic text-stone-800 leading-relaxed">
                  &ldquo;{detailModal.comment}&rdquo;
                </p>
              </div>

              {/* 2-column info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-stone-200/80 space-y-2.5">
                  <div className="flex items-center gap-1.5 font-semibold text-stone-900 uppercase tracking-wider text-[11px]">
                    <User className="w-3.5 h-3.5 text-[#6c2432]" />
                    Guest Context
                  </div>
                  <div className="space-y-1 text-stone-600">
                    <div>
                      <span className="text-stone-400">Author Name:</span>{' '}
                      <span className="font-medium text-stone-900">{detailModal.authorName}</span>
                    </div>
                    {detailModal.guestName && (
                      <div>
                        <span className="text-stone-400">Profile Name:</span>{' '}
                        <span className="font-medium text-stone-900">{detailModal.guestName}</span>
                      </div>
                    )}
                    {detailModal.guestEmail && (
                      <div>
                        <span className="text-stone-400">Verified Email:</span>{' '}
                        <span className="font-mono text-stone-700">{detailModal.guestEmail}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-stone-400">Verified Visit:</span>{' '}
                      <span className="font-medium text-emerald-700">
                        {detailModal.verified ? 'Yes (Authenticated Guest)' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-stone-200/80 space-y-2.5">
                  <div className="flex items-center gap-1.5 font-semibold text-stone-900 uppercase tracking-wider text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-[#6c2432]" />
                    Target & Booking Context
                  </div>
                  <div className="space-y-1 text-stone-600">
                    <div>
                      <span className="text-stone-400">Target Name:</span>{' '}
                      <span className="font-medium text-stone-900">{detailModal.targetName}</span>
                    </div>
                    <div>
                      <span className="text-stone-400">Category:</span>{' '}
                      <span className="font-medium text-stone-900">
                        {CATEGORY_LABELS[detailModal.category] || detailModal.category}
                      </span>
                    </div>
                    {detailModal.booking && (
                      <div>
                        <span className="text-stone-400">Visit Booking:</span>{' '}
                        <span className="font-mono text-stone-900">
                          #{detailModal.booking.bookingNumber} ({formatDate(detailModal.booking.date)})
                        </span>
                      </div>
                    )}
                    {detailModal.eventBookingNumber && (
                      <div>
                        <span className="text-stone-400">Event Booking:</span>{' '}
                        <span className="font-mono text-stone-900">
                          {detailModal.eventBookingNumber}
                        </span>
                      </div>
                    )}
                    {detailModal.experience && (
                      <div>
                        <span className="text-stone-400">Experience:</span>{' '}
                        <span className="font-medium text-stone-900">{detailModal.experience.title}</span>
                      </div>
                    )}
                    {detailModal.wine && (
                      <div>
                        <span className="text-stone-400">Wine:</span>{' '}
                        <span className="font-medium text-stone-900">{detailModal.wine.name}</span>
                      </div>
                    )}
                    {detailModal.event && (
                      <div>
                        <span className="text-stone-400">Event:</span>{' '}
                        <span className="font-medium text-stone-900">{detailModal.event.title}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Timestamp block */}
              <div className="text-[11px] font-mono text-stone-400 pt-2 border-t border-stone-100 flex flex-wrap gap-4 justify-between">
                <span>Submitted: {formatDateTime(detailModal.createdAt)}</span>
                <span>Last Updated: {formatDateTime(detailModal.updatedAt)}</span>
                <span>ID: {detailModal.id}</span>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-stone-200 bg-[#fdfcfb] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="px-4 py-2 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition"
              >
                Close
              </button>
              {detailModal.status === 'PENDING' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({ review: detailModal, action: 'REJECT' });
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject Review
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({ review: detailModal, action: 'APPROVE' });
                    }}
                    className="inline-flex items-center gap-1 px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve Review
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
