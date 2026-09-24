'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  MessageSquare,
  Plus,
  Sparkles,
  Star,
  Ticket,
  Wine,
} from 'lucide-react';
import RatingStars from '@/components/common/RatingStars';
import EmptyState from '@/components/common/EmptyState';

interface GuestReviewItem {
  id: string;
  rating: number;
  title: string;
  comment: string;
  category: string;
  targetName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  booking: { bookingNumber: string; date: string; status: string } | null;
  experience: { id: string; title: string; slug: string } | null;
  wine: { id: string; name: string; slug: string } | null;
  event: { id: string; title: string; slug: string } | null;
  eventBookingNumber: string | null;
}

interface EligibleReviewTarget {
  type: 'VISIT';
  bookingId: string;
  bookingNumber: string;
  visitDate: string;
  time: string;
  status: string;
  experience: { id: string; title: string; slug: string } | null;
  wines: { id: string; name: string; slug: string }[];
  targetName: string;
  alreadyReviewed: boolean;
  review: { id: string; status: string } | null;
}

interface EligibleEventReviewTarget {
  type: 'EVENT';
  eventBookingId: string;
  eventBookingNumber: string;
  eventDate: string;
  timeRange: string;
  status: string;
  event: { id: string; title: string; slug: string };
  targetName: string;
  alreadyReviewed: boolean;
  review: { id: string; status: string } | null;
}

type EligibleTarget = EligibleReviewTarget | EligibleEventReviewTarget;

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const CATEGORY_OPTIONS = [
  { value: 'WINE_TASTING', label: 'Wine Tasting' },
  { value: 'VINEYARD_TOUR', label: 'Vineyard Tour' },
  { value: 'EVENTS', label: 'Events' },
  { value: 'FOOD', label: 'Food' },
] as const;

const STATUS_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'In Moderation' },
  { value: 'APPROVED', label: 'Published' },
  { value: 'REJECTED', label: 'Not Published' },
] as const;

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: 'In Moderation',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  APPROVED: {
    label: 'Published',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'Not Published',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
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

function categoryLabel(value: string): string {
  return CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? value;
}

export default function MyReviewsPage() {
  const [reviews, setReviews] = useState<GuestReviewItem[]>([]);
  const [reviewsPagination, setReviewsPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  const [eligible, setEligible] = useState<EligibleTarget[]>([]);
  const [eligibleLoading, setEligibleLoading] = useState(true);

  const [formTarget, setFormTarget] = useState<EligibleTarget | null>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [category, setCategory] = useState<string>('WINE_TASTING');
  const [selectedWineId, setSelectedWineId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAuthError(false);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/auth/guest/reviews?${params.toString()}`, {
        cache: 'no-store',
      });
      if (res.status === 401) {
        setAuthError(true);
        setReviews([]);
        setReviewsPagination(null);
        return;
      }
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to load your reviews');
      }
      setReviews(json.data?.items ?? []);
      setReviewsPagination(json.data?.pagination ?? null);
    } catch (e) {
      setReviews([]);
      setReviewsPagination(null);
      setError(e instanceof Error ? e.message : 'Failed to load your reviews');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  const fetchEligible = useCallback(async () => {
    setEligibleLoading(true);
    try {
      const res = await fetch('/api/auth/guest/reviews/eligible?pageSize=50', {
        cache: 'no-store',
      });
      if (res.status === 401) {
        setEligible([]);
        return;
      }
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
        data?: {
          items?: Array<Omit<EligibleReviewTarget, 'type'>>;
          events?: Array<Omit<EligibleEventReviewTarget, 'type'>>;
        };
      } | null;
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to load eligible visits');
      }
      const visitItems: EligibleTarget[] = (json.data?.items ?? []).map((item) => ({
        ...item,
        type: 'VISIT' as const,
        wines: item.wines ?? [],
      }));
      const eventItems: EligibleTarget[] = (json.data?.events ?? []).map((item) => ({
        ...item,
        type: 'EVENT' as const,
      }));
      setEligible([...visitItems, ...eventItems]);
    } catch {
      setEligible([]);
    } finally {
      setEligibleLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEligible();
  }, [fetchEligible]);

  const writableTargets = eligible.filter((item) => !item.alreadyReviewed);

  const openForm = (target: EligibleTarget) => {
    setFormTarget(target);
    setRating(5);
    setTitle('');
    setComment('');
    setCategory(target.type === 'EVENT' ? 'EVENTS' : 'WINE_TASTING');
    setSelectedWineId('');
    setFormError(null);
  };

  const closeForm = () => {
    if (submitting) return;
    setFormTarget(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTarget) return;
    setFormError(null);

    if (title.trim().length < 3) {
      setFormError('Title must be at least 3 characters.');
      return;
    }
    if (comment.trim().length < 10) {
      setFormError('Review must be at least 10 characters.');
      return;
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setFormError('Rating must be between 1 and 5.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        rating,
        title: title.trim(),
        comment: comment.trim(),
        category,
      };
      if (formTarget.type === 'EVENT') {
        payload.eventBookingNumber = formTarget.eventBookingNumber;
      } else {
        payload.bookingNumber = formTarget.bookingNumber;
        if (selectedWineId) payload.wineId = selectedWineId;
      }

      const res = await fetch('/api/auth/guest/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        setAuthError(true);
        setFormError('Your session has expired. Please sign in again.');
        return;
      }
      if (res.status === 409) {
        setFormError(json?.error || 'You have already reviewed this visit.');
        return;
      }
      if (res.status === 403 || res.status === 404) {
        setFormError(json?.error || 'This visit is no longer eligible for review.');
        return;
      }
      if (!res.ok || !json?.success) {
        setFormError(json?.error || 'Failed to submit your review.');
        return;
      }

      setFormTarget(null);
      setSuccessNotice(
        'Your review has been submitted and is pending estate moderation.'
      );
      setTimeout(() => setSuccessNotice(null), 6000);
      await Promise.all([fetchReviews(), fetchEligible()]);
    } catch {
      setFormError('Failed to submit your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-3xl bg-[#faf8f5] border border-stone-200/80 p-8 md:p-10 relative overflow-hidden">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/15 border border-[#c5a059]/30 text-xs font-semibold uppercase tracking-wider text-[#8a3243] mb-4">
            <MessageSquare className="w-3.5 h-3.5 text-[#c5a059]" />
            Guest Reviews
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-stone-900 font-light mb-3">
            My Guest Reviews
          </h1>
          <p className="text-stone-600 font-light text-base leading-relaxed">
            Reflections and feedback shared with our winemaking team. Reviews of completed
            visits await your thoughts and are published once moderated by the estate.
          </p>
        </div>
      </div>

      {successNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {authError && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Your session has expired. Please sign in to view and write reviews.</span>
          </div>
          <Link
            href="/login?next=/app/reviews"
            className="px-5 py-2 rounded-full bg-[#2d1117] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider hover:bg-[#461822] transition self-start sm:self-auto"
          >
            Sign In
          </Link>
        </div>
      )}

      {/* B. Reviews You Can Write */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl text-stone-900 font-normal">
              Reviews You Can Write
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Completed visits eligible for your review
            </p>
          </div>
        </div>

        {eligibleLoading ? (
          <div className="flex items-center gap-3 py-8 text-stone-500">
            <div className="w-6 h-6 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs uppercase tracking-[0.25em]">Loading eligible visits…</span>
          </div>
        ) : writableTargets.length === 0 ? (
          <div className="bg-gradient-to-r from-[#faf8f5] to-[#f4ede3] rounded-3xl p-6 md:p-8 border border-stone-200 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8a3243]">
                <Sparkles className="w-4 h-4 text-[#c5a059]" /> All Caught Up
              </div>
              <h3 className="font-serif text-xl text-stone-900 font-normal">
                No visits awaiting your review
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Once you complete a visit with us, it will appear here so you can share your
                experience with fellow connoisseurs.
              </p>
            </div>
            <Link
              href="/experiences"
              className="px-6 py-2.5 rounded-full bg-stone-900 text-white text-xs font-medium uppercase tracking-wider hover:bg-stone-800 transition shrink-0"
            >
              Explore Experiences
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {writableTargets.map((target) => (
              <div
                key={target.type === 'EVENT' ? target.eventBookingId : target.bookingId}
                className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm hover:border-[#c5a059]/40 transition space-y-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-stone-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {formatDate(target.type === 'EVENT' ? target.eventDate : target.visitDate)}
                    </span>
                    <span>·</span>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{target.type === 'EVENT' ? target.timeRange : target.time}</span>
                    <span>·</span>
                    <span className="font-mono">
                      #{target.type === 'EVENT' ? target.eventBookingNumber : target.bookingNumber}
                    </span>
                    {target.type === 'EVENT' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#8a3243]/10 text-[#8a3243] text-[10px] font-semibold uppercase tracking-wider">
                        <Ticket className="w-3 h-3" /> Event
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-lg text-stone-900 font-medium">
                    {target.targetName}
                  </h3>
                  {target.type === 'VISIT' && target.experience && (
                    <p className="text-xs text-stone-500">
                      Experience · {target.experience.title}
                    </p>
                  )}
                  {target.type === 'VISIT' && target.wines.length > 0 && (
                    <p className="text-xs text-stone-500 inline-flex items-center gap-1.5">
                      <Wine className="w-3.5 h-3.5 text-[#8a3243]" />
                      {target.wines.length} wine{target.wines.length === 1 ? '' : 's'} available to review
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openForm(target)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#8a3243] text-white text-xs font-medium uppercase tracking-wider hover:bg-[#732937] transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Write a Review
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* A. My Reviews */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl text-stone-900 font-normal">My Reviews</h2>
            <p className="text-xs text-stone-500 mt-1">
              Submitted reviews and their moderation status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="review-status-filter"
              className="text-xs font-medium uppercase tracking-wider text-stone-500"
            >
              Status
            </label>
            <select
              id="review-status-filter"
              value={statusFilter}
              onChange={(e) => changeStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm bg-white"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-8 h-8 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs uppercase tracking-[0.25em] text-stone-500">
              Loading your reviews…
            </span>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-10 text-center max-w-lg mx-auto my-4">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-xl font-medium text-stone-900 mb-2">
              Unable to load your reviews
            </h3>
            <p className="text-sm text-stone-500 mb-6 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={() => fetchReviews()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2d1117] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider hover:bg-[#461822] transition"
            >
              Try Again
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={<Star className="w-7 h-7" />}
            title={statusFilter ? 'No reviews with this status' : 'No reviews submitted yet'}
            description={
              statusFilter
                ? 'You have no reviews matching the selected moderation status.'
                : 'Complete a visit, then share your experience — your submitted reviews and their moderation status will appear here.'
            }
            actionText={statusFilter ? undefined : 'View Eligible Visits'}
            onAction={statusFilter ? undefined : () => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {reviews.map((review) => {
              const badge = STATUS_BADGES[review.status] ?? STATUS_BADGES.PENDING;
              return (
                <article
                  key={review.id}
                  className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm space-y-4 hover:border-[#c5a059]/40 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#8a3243]">
                          {review.targetName}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <h3 className="font-serif text-xl text-stone-900 font-medium">
                        {review.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <RatingStars rating={review.rating} size="sm" />
                      <span className="text-xs text-stone-400 font-medium">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                  </div>

                  <p className="text-stone-700 text-sm leading-relaxed italic font-serif">
                    &ldquo;{review.comment}&rdquo;
                  </p>

                  <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-[#8a3243]" />
                        {categoryLabel(review.category)}
                      </span>
                      {review.experience && (
                        <span className="inline-flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" />
                          {review.experience.title}
                        </span>
                      )}
                      {review.wine && (
                        <span className="inline-flex items-center gap-1.5">
                          <Wine className="w-3.5 h-3.5 text-[#8a3243]" />
                          {review.wine.name}
                        </span>
                      )}
                      {review.event && (
                        <span className="inline-flex items-center gap-1.5">
                          <Ticket className="w-3.5 h-3.5 text-[#8a3243]" />
                          {review.event.title}
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
                    {review.verified && (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified Estate Guest
                      </span>
                    )}
                  </div>

                  {review.status === 'PENDING' && (
                    <p className="text-xs text-stone-400 leading-relaxed">
                      This review is awaiting moderation by the estate. It will appear on
                      public wine and experience pages once approved.
                    </p>
                  )}
                  {review.status === 'REJECTED' && (
                    <p className="text-xs text-stone-400 leading-relaxed">
                      This review was not approved for public display by the estate moderation
                      team.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && reviewsPagination && reviewsPagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-stone-200">
            <span className="text-xs text-stone-500 order-2 sm:order-1">
              Page {reviewsPagination.page} of {reviewsPagination.totalPages} ·{' '}
              {reviewsPagination.total} {reviewsPagination.total === 1 ? 'review' : 'reviews'}
            </span>
            <div className="flex items-center gap-3 order-1 sm:order-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={reviewsPagination.page <= 1}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-xs font-medium uppercase tracking-wider hover:border-[#8a3243] hover:text-[#8a3243] transition disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={reviewsPagination.page >= reviewsPagination.totalPages}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-xs font-medium uppercase tracking-wider hover:border-[#8a3243] hover:text-[#8a3243] transition disabled:opacity-40 disabled:pointer-events-none"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* C. Review Form Modal */}
      {formTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-stone-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-2xl text-stone-900 font-normal">
                  Share Your Experience
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  {formTarget.targetName} ·{' '}
                  {formatDate(
                    formTarget.type === 'EVENT' ? formTarget.eventDate : formTarget.visitDate
                  )}{' '}
                  · #{formTarget.type === 'EVENT' ? formTarget.eventBookingNumber : formTarget.bookingNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                disabled={submitting}
                className="text-stone-400 hover:text-stone-700 p-2"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                  Overall Rating
                </label>
                <div className="flex items-center gap-2">
                  <RatingStars rating={rating} interactive onRate={setRating} size="lg" />
                  <span className="text-sm font-serif font-semibold text-stone-900 ml-2">
                    {rating} of 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="review-category"
                  className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5"
                >
                  Category
                </label>
                <select
                  id="review-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm bg-white"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {formTarget.type === 'VISIT' && formTarget.wines.length > 0 && (
                <div>
                  <label
                    htmlFor="review-wine"
                    className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5"
                  >
                    Wine (optional)
                  </label>
                  <select
                    id="review-wine"
                    value={selectedWineId}
                    onChange={(e) => setSelectedWineId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm bg-white"
                  >
                    <option value="">Overall visit (no specific wine)</option>
                    {formTarget.wines.map((wine) => (
                      <option key={wine.id} value={wine.id}>
                        {wine.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-stone-400 mt-1">
                    Only wines from this visit can be selected.
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="review-title"
                  className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5"
                >
                  Headline / Title
                </label>
                <input
                  id="review-title"
                  type="text"
                  required
                  minLength={3}
                  maxLength={191}
                  placeholder="e.g. Unparalleled barrel tasting in Rutherford"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="review-comment"
                  className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5"
                >
                  Your Review
                </label>
                <textarea
                  id="review-comment"
                  required
                  rows={4}
                  minLength={10}
                  maxLength={5000}
                  placeholder="Describe your impressions of the estate, wines sampled, service, and ambiance..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm"
                />
                <p className="text-[11px] text-stone-400 mt-1">{comment.trim().length} characters</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-full border border-stone-300 text-stone-700 text-xs font-medium uppercase tracking-wider hover:bg-stone-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#8a3243] text-white text-xs font-medium uppercase tracking-wider hover:bg-[#732937] transition shadow-sm disabled:opacity-60 disabled:pointer-events-none"
                >
                  {submitting && (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {submitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
