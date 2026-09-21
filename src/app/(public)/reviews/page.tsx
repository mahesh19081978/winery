'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import ReviewCard from '@/components/reviews/ReviewCard';
import RatingStars from '@/components/common/RatingStars';
import { useGuest } from '@/context/GuestContext';
import { MessageSquarePlus, CheckCircle } from 'lucide-react';

const REVIEW_CATEGORIES = ['All', 'Wine Tasting', 'Vineyard Tour', 'Events', 'Food'] as const;

export default function ReviewsPage() {
  const { reviews, addReview } = useGuest();
  const [selectedCategory, setSelectedCategory] = useState<typeof REVIEW_CATEGORIES[number]>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form states
  const [author, setAuthor] = useState('');
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState<'Wine Tasting' | 'Vineyard Tour' | 'Events' | 'Food'>('Wine Tasting');
  const [targetName, setTargetName] = useState('Signature Estate Wine Tasting');

  const filteredReviews = useMemo(() => {
    if (selectedCategory === 'All') return reviews;
    return reviews.filter((r) => r.category === selectedCategory);
  }, [reviews, selectedCategory]);

  const avgRating = (reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)).toFixed(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addReview({
      author: author || 'Visiting Guest',
      title,
      comment,
      rating,
      category,
      targetName
    });
    setModalOpen(false);
    setSubmitSuccess(true);
    // Reset
    setTitle('');
    setComment('');
  };

  return (
    <div className="w-full pt-20 pb-24">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 bg-[#1e0c10] text-[#faf8f5] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=2000&q=85"
          alt="Guests enjoying wine tasting on terrace"
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
              onClick={() => setModalOpen(true)}
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
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Thank you! Your review has been added to the guestbook and your wine journey.
            </span>
            <button
              onClick={() => setSubmitSuccess(false)}
              className="font-bold text-emerald-900"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Reviews Grid */}
      <section className="py-16 sm:py-24 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredReviews.map((rev) => (
              <ReviewCard key={rev.id} review={rev} />
            ))}
          </div>
        </div>
      </section>

      {/* Submit Review Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e0c10]/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#faf8f5] rounded-3xl p-6 sm:p-8 border border-[#e6dece] shadow-2xl my-8">
            <h3 className="font-serif text-2xl text-[#191c1f] mb-1">Share Your Visit</h3>
            <p className="text-xs text-[#525960] mb-6">
              Your feedback enriches our wine craft and guides future guests.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                  className="w-full bg-white border border-[#e6dece] rounded-xl px-4 py-2.5 text-sm text-[#191c1f]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1">
                    Experience Type
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as 'Wine Tasting' | 'Vineyard Tour' | 'Events' | 'Food')}
                    className="w-full bg-white border border-[#e6dece] rounded-xl px-3 py-2 text-sm text-[#191c1f]"
                  >
                    <option value="Wine Tasting">Wine Tasting</option>
                    <option value="Vineyard Tour">Vineyard Tour</option>
                    <option value="Events">Events</option>
                    <option value="Food">Food</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1">
                    Specific Experience / Wine
                  </label>
                  <input
                    type="text"
                    required
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    placeholder="e.g. Signature Tasting"
                    className="w-full bg-white border border-[#e6dece] rounded-xl px-4 py-2.5 text-sm text-[#191c1f]"
                  />
                </div>
              </div>

              <div className="p-4 bg-white border border-[#e6dece] rounded-2xl flex items-center justify-between">
                <span className="text-xs uppercase font-semibold text-[#191c1f]">
                  Rating Score
                </span>
                <RatingStars rating={rating} size="lg" interactive onRate={(r) => setRating(r)} />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1">
                  Review Headline
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. An ethereal afternoon in the vines"
                  className="w-full bg-white border border-[#e6dece] rounded-xl px-4 py-2.5 text-sm text-[#191c1f]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1">
                  Your Impressions
                </label>
                <textarea
                  rows={4}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Reflections on the wines, service, atmosphere, and pairings..."
                  className="w-full bg-white border border-[#e6dece] rounded-xl px-4 py-2.5 text-sm text-[#191c1f]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e6dece]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-[#e6dece] text-xs font-semibold text-[#525960]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#2d1117] text-white text-xs font-semibold uppercase tracking-wider"
                >
                  Post Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
