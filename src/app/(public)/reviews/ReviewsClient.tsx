'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ReviewCard from '@/components/reviews/ReviewCard';
import RatingStars from '@/components/common/RatingStars';
import { useGuest } from '@/context/GuestContext';
import {
  MessageSquarePlus,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  User,
  Lock,
  X,
} from 'lucide-react';
import { Review } from '@/types';

const REVIEW_CATEGORIES = ['All', 'Wine Tasting', 'Vineyard Tour', 'Events', 'Food'] as const;

const CATEGORY_MAP_TO_UI: Record<string, 'Wine Tasting' | 'Vineyard Tour' | 'Events' | 'Food'> = {
  WINE_TASTING: 'Wine Tasting',
  VINEYARD_TOUR: 'Vineyard Tour',
  EVENTS: 'Events',
  FOOD: 'Food',
};

const CATEGORY_MAP_TO_API: Record<string, 'WINE_TASTING' | 'VINEYARD_TOUR' | 'EVENTS' | 'FOOD'> = {
  'Wine Tasting': 'WINE_TASTING',
  'Vineyard Tour': 'VINEYARD_TOUR',
  Events: 'EVENTS',
  Food: 'FOOD',
};

interface ApiReview {
  id: string;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  category: string;
  targetName: string;
  createdAt: string;
  verified?: boolean;
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

export default function ReviewsClient({ hero }: { hero: { url: string; alt: string } }) {
  const { isAuthenticated, profile } = useGuest();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<typeof REVIEW_CATEGORIES[number]>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Authenticated guest eligible targets
  const [eligibleTargets, setEligibleTargets] = useState<EligibleTarget[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [selectedTargetKey, setSelectedTargetKey] = useState<string>('');
  const [selectedWineId, setSelectedWineId] = useState<string>('');

  // Form states
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState<'Wine Tasting' | 'Vineyard Tour' | 'Events' | 'Food'>('Wine Tasting');

  // Fetch approved reviews from /api/reviews
  useEffect(() => {
    let cancelled = false;
    async function loadReviews() {
      try {
        setLoading(true);
        const res = await fetch('/api/reviews', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load reviews');
        const data = await res.json();
        if (!cancelled && data.success && Array.isArray(data.data)) {
          const mapped: Review[] = data.data.map((r: ApiReview) => ({
            id: r.id,
            author: r.authorName || 'Estate Guest',
            date: new Date(r.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            rating: r.rating,
            title: r.title,
            comment: r.comment,
            category: CATEGORY_MAP_TO_UI[r.category] || 'Wine Tasting',
            targetName: r.targetName,
            verified: Boolean(r.verified),
            helpfulCount: 0,
          }));
          setReviews(mapped);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load reviews');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReviews();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch eligible visits/events for authenticated guest when modal opens or auth changes
  useEffect(() => {
    let cancelled = false;
    async function loadEligible() {
      if (!isAuthenticated) {
        setEligibleTargets([]);
        return;
      }
      setLoadingEligible(true);
      try {
        const res = await fetch('/api/auth/guest/reviews/eligible?pageSize=50', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json.success && json.data) {
          const visitItems: EligibleTarget[] = (json.data.items ?? []).map(
            (item: Omit<EligibleReviewTarget, 'type'>) => ({
              ...item,
              type: 'VISIT' as const,
              wines: item.wines ?? [],
            })
          );
          const eventItems: EligibleTarget[] = (json.data.events ?? []).map(
            (item: Omit<EligibleEventReviewTarget, 'type'>) => ({
              ...item,
              type: 'EVENT' as const,
            })
          );
          const allEligible = [...visitItems, ...eventItems];
          setEligibleTargets(allEligible);

          // Default selection to first unreviewed target
          const firstUnreviewed = allEligible.find((t) => !t.alreadyReviewed);
          if (firstUnreviewed) {
            const key = firstUnreviewed.type === 'EVENT' ? `event:${firstUnreviewed.eventBookingNumber}` : `visit:${firstUnreviewed.bookingNumber}`;
            setSelectedTargetKey(key);
            if (firstUnreviewed.type === 'EVENT') {
              setCategory('Events');
            } else {
              setCategory('Wine Tasting');
            }
          }
        }
      } catch {
        // eligible fetch failed or unauthenticated
      } finally {
        if (!cancelled) setLoadingEligible(false);
      }
    }

    loadEligible();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, modalOpen]);

  const filteredReviews = useMemo(() => {
    if (selectedCategory === 'All') return reviews;
    return reviews.filter((r) => r.category === selectedCategory);
  }, [reviews, selectedCategory]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  const unreviewedTargets = eligibleTargets.filter((t) => !t.alreadyReviewed);

  const currentSelectedTarget = useMemo(() => {
    if (!selectedTargetKey) return unreviewedTargets[0] || null;
    const [type, num] = selectedTargetKey.split(':');
    if (type === 'event') {
      return eligibleTargets.find((t) => t.type === 'EVENT' && t.eventBookingNumber === num) || null;
    }
    return eligibleTargets.find((t) => t.type === 'VISIT' && t.bookingNumber === num) || null;
  }, [selectedTargetKey, eligibleTargets, unreviewedTargets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isAuthenticated) {
      setFormError('Please sign in or create a guest account to share your estate review.');
      return;
    }

    if (!currentSelectedTarget) {
      setFormError('Please select a completed visit or event to review.');
      return;
    }

    if (title.trim().length < 3) {
      setFormError('Title must be at least 3 characters.');
      return;
    }

    if (comment.trim().length < 10) {
      setFormError('Impressions must be at least 10 characters.');
      return;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        rating,
        title: title.trim(),
        comment: comment.trim(),
        category: CATEGORY_MAP_TO_API[category],
      };

      if (currentSelectedTarget.type === 'EVENT') {
        payload.eventBookingNumber = currentSelectedTarget.eventBookingNumber;
      } else {
        payload.bookingNumber = currentSelectedTarget.bookingNumber;
        if (selectedWineId) payload.wineId = selectedWineId;
      }

      const res = await fetch('/api/auth/guest/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setModalOpen(false);
      setSubmitSuccess(true);
      setTitle('');
      setComment('');
      setSelectedWineId('');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full pt-20 pb-24">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 bg-[#1e0c10] text-[#faf8f5] overflow-hidden">
        <Image
          src={hero.url}
          alt={hero.alt}
          fill
          priority
          className="object-cover opacity-25"
        />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-[#c5a059] block mb-3 font-semibold">
            Testimonials & Impressions
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl font-normal text-[#faf8f5] mb-4">
            Guest Reflections
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#e6dece]/85 leading-relaxed font-light">
            Memories preserved across sunset tastings, masterclasses, and vineyard walks.
          </p>
        </div>
      </section>

      {/* Aggregate Rating Scoreboard */}
      <section className="py-12 bg-white border-b border-[#e6dece]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#faf8f5] border border-[#e6dece] rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div>
                <span className="font-serif text-5xl sm:text-6xl font-bold text-[#191c1f]">
                  {avgRating}
                </span>
                <span className="text-xs text-[#525960] block mt-1">out of 5.0 rating</span>
              </div>
              <div className="space-y-1">
                <RatingStars rating={Number(avgRating)} size="lg" />
                <p className="text-xs text-[#525960]">
                  Based on {reviews.length} verified estate guest reviews
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider transition-all shadow-md"
            >
              <MessageSquarePlus className="w-4 h-4 text-[#c5a059]" />
              <span>Share Your Experience</span>
            </button>
          </div>
        </div>
      </section>

      {/* Filter Navigation */}
      <section className="py-6 bg-white border-b border-[#e6dece] sticky top-16 z-20 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {REVIEW_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-[#2d1117] text-[#faf8f5] shadow-sm'
                    : 'bg-[#f4f0e8] text-[#525960] hover:bg-[#e6dece] hover:text-[#191c1f]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <span className="text-xs text-[#525960] hidden sm:block">
            {filteredReviews.length} Reviews
          </span>
        </div>
      </section>

      {/* Success alert banner if just submitted */}
      {submitSuccess && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              Thank you! Your review has been submitted for moderation and will appear on the guestbook once approved by our sommelier team.
            </span>
            <button
              onClick={() => setSubmitSuccess(false)}
              className="font-bold text-emerald-900 ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Reviews Grid */}
      <section className="py-16 sm:py-24 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-[#8a3243] animate-spin" />
              <span className="text-xs uppercase tracking-widest text-[#525960]">Loading estate reflections…</span>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#e6dece] p-8 max-w-lg mx-auto">
              <Sparkles className="w-10 h-10 text-[#c5a059] mx-auto mb-3" />
              <h3 className="font-serif text-xl font-medium text-[#191c1f] mb-2">No Reviews Found</h3>
              <p className="text-xs text-[#525960] mb-6">
                Be the first guest to share your tasting impressions or cellar tour reflection in this category.
              </p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="px-6 py-2.5 rounded-full bg-[#8a3243] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#732937] transition"
              >
                Share First Review
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredReviews.map((rev) => (
                <ReviewCard key={rev.id} review={rev} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Submit Review Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1e0c10]/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#faf8f5] rounded-3xl p-6 sm:p-8 border border-[#e6dece] shadow-2xl my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h3 className="font-serif text-2xl text-[#191c1f]">Share Your Experience</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[#525960] hover:text-[#191c1f] p-1 rounded-lg transition"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#525960] mb-5">
              Reflections on estate tastings and events enrich our craft and guide fellow guests.
            </p>

            {/* CASE 1: Unauthenticated Guest */}
            {!isAuthenticated ? (
              <div className="space-y-6 py-4">
                <div className="p-6 rounded-2xl bg-white border border-[#e6dece] text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#f4f0e8] text-[#8a3243] mx-auto flex items-center justify-center">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif text-lg text-[#191c1f] font-medium">
                    Guest Account Required
                  </h4>
                  <p className="text-xs text-[#525960] leading-relaxed max-w-sm mx-auto">
                    To maintain the integrity of our guestbook, reviews can only be submitted by verified guests who have visited the estate or attended an estate event.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <Link
                    href="/login?redirect=/reviews"
                    className="w-full sm:flex-1 py-3 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider text-center transition shadow-md"
                  >
                    Sign In to Review
                  </Link>
                  <Link
                    href="/register?redirect=/reviews"
                    className="w-full sm:flex-1 py-3 rounded-full border border-[#8a3243] text-[#8a3243] hover:bg-[#f4f0e8] text-xs font-semibold uppercase tracking-wider text-center transition"
                  >
                    Create Guest Account
                  </Link>
                </div>
              </div>
            ) : loadingEligible ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#525960]">
                <Loader2 className="w-6 h-6 animate-spin text-[#8a3243]" />
                <span className="text-xs uppercase tracking-widest">Checking eligible visits…</span>
              </div>
            ) : unreviewedTargets.length === 0 ? (
              /* CASE 2: Authenticated but No Unreviewed Completed Visits */
              <div className="space-y-6 py-4">
                <div className="p-6 rounded-2xl bg-white border border-[#e6dece] text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#f4f0e8] text-[#c5a059] mx-auto flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif text-lg text-[#191c1f] font-medium">
                    No Completed Visits Awaiting Review
                  </h4>
                  <p className="text-xs text-[#525960] leading-relaxed max-w-sm mx-auto">
                    {eligibleTargets.length > 0
                      ? 'You have already shared reflections for your completed estate visits and events. Thank you for your feedback!'
                      : 'Reviews are reserved for guests who have experienced an estate tasting flight or event. Once your reservation is completed, you can share your reflection here.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <Link
                    href="/book"
                    className="w-full sm:flex-1 py-3 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider text-center transition shadow-md"
                  >
                    Reserve a Tasting
                  </Link>
                  <Link
                    href="/app/reviews"
                    className="w-full sm:flex-1 py-3 rounded-full border border-[#8a3243] text-[#8a3243] hover:bg-[#f4f0e8] text-xs font-semibold uppercase tracking-wider text-center transition"
                  >
                    View My Reviews
                  </Link>
                </div>
              </div>
            ) : (
              /* CASE 3: Authenticated with Eligible Completed Visits */
              <div>
                <div className="mb-4 p-3 rounded-xl bg-white border border-[#e6dece] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#8a3243]" />
                    <span className="text-[#191c1f] font-medium">{profile?.name}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Verified Estate Guest
                  </span>
                </div>

                {formError && (
                  <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Target selection */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1">
                      Select Completed Visit / Event <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={selectedTargetKey}
                      onChange={(e) => {
                        const newKey = e.target.value;
                        setSelectedTargetKey(newKey);
                        setSelectedWineId('');
                        if (newKey.startsWith('event:')) {
                          setCategory('Events');
                        } else {
                          setCategory('Wine Tasting');
                        }
                      }}
                      className="w-full bg-white border border-[#e6dece] rounded-xl px-3 py-2.5 text-xs text-[#191c1f] focus:outline-none focus:ring-2 focus:ring-[#8a3243]/30"
                    >
                      {unreviewedTargets.map((target) => {
                        const isEvent = target.type === 'EVENT';
                        const key = isEvent ? `event:${target.eventBookingNumber}` : `visit:${target.bookingNumber}`;
                        const dateStr = new Date(isEvent ? target.eventDate : target.visitDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        });
                        const label = isEvent
                          ? `Event: ${target.targetName} (${dateStr} · #${target.eventBookingNumber})`
                          : `Visit: ${target.targetName} (${dateStr} · #${target.bookingNumber})`;
                        return (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Optional Wine selection for visits */}
                  {currentSelectedTarget && currentSelectedTarget.type === 'VISIT' && currentSelectedTarget.wines.length > 0 && (
                    <div>
                      <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1">
                        Specific Wine Tasted (Optional)
                      </label>
                      <select
                        value={selectedWineId}
                        onChange={(e) => setSelectedWineId(e.target.value)}
                        className="w-full bg-white border border-[#e6dece] rounded-xl px-3 py-2.5 text-xs text-[#191c1f] focus:outline-none focus:ring-2 focus:ring-[#8a3243]/30"
                      >
                        <option value="">Entire Experience / Flight</option>
                        {currentSelectedTarget.wines.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Category */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1">
                      Category <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as 'Wine Tasting' | 'Vineyard Tour' | 'Events' | 'Food')}
                      className="w-full bg-white border border-[#e6dece] rounded-xl px-3 py-2.5 text-xs text-[#191c1f] focus:outline-none focus:ring-2 focus:ring-[#8a3243]/30"
                    >
                      <option value="Wine Tasting">Wine Tasting</option>
                      <option value="Vineyard Tour">Vineyard Tour</option>
                      <option value="Events">Events</option>
                      <option value="Food">Food</option>
                    </select>
                  </div>

                  {/* Rating */}
                  <div className="p-4 bg-white border border-[#e6dece] rounded-2xl flex items-center justify-between">
                    <span className="text-xs uppercase font-semibold text-[#191c1f]">
                      Overall Rating
                    </span>
                    <RatingStars rating={rating} size="lg" interactive onRate={(r) => setRating(r)} />
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1">
                      Review Headline <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={191}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. An ethereal afternoon in the vines"
                      className="w-full bg-white border border-[#e6dece] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#191c1f] focus:outline-none focus:ring-2 focus:ring-[#8a3243]/30"
                    >
                    </input>
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1">
                      Your Impressions <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={4}
                      required
                      minLength={10}
                      maxLength={5000}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Reflections on the wines, service, atmosphere, and pairings (minimum 10 characters)..."
                      className="w-full bg-white border border-[#e6dece] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#191c1f] focus:outline-none focus:ring-2 focus:ring-[#8a3243]/30"
                    />
                  </div>

                  <p className="text-[11px] text-[#525960]">
                    Your review will be submitted for moderation and published to the estate guestbook upon sommelier review.
                  </p>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e6dece]">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      disabled={submitting}
                      className="px-5 py-2.5 rounded-full border border-[#e6dece] text-xs font-semibold text-[#525960] hover:bg-[#e6dece] transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 rounded-full bg-[#2d1117] hover:bg-[#461822] text-white text-xs font-semibold uppercase tracking-wider transition disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{submitting ? 'Submitting…' : 'Post Review'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
