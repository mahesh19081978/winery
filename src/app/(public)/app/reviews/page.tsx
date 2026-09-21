'use client';

import { useState } from 'react';
import { useGuest } from '@/context/GuestContext';
import { reviews as staticReviews } from '@/data/reviews';
import { mockExperiences } from '@/data/experiences';
import { 
  ThumbsUp, 
  Plus, 
  CheckCircle2, 
  Sparkles, 
} from 'lucide-react';
import RatingStars from '@/components/common/RatingStars';
import EmptyState from '@/components/common/EmptyState';

export default function MyReviewsPage() {
  const { profile, reviews, addReview } = useGuest();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Combine reviews written by this user or static Eleanor reviews
  const allReviews = reviews.length > 0 ? reviews : staticReviews;
  const myReviews = allReviews.filter(r => r.author === profile.name || r.id === 'rev-1');

  // Form states for new review
  const [targetExpId, setTargetExpId] = useState(mockExperiences[0].id);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const exp = mockExperiences.find(e => e.id === targetExpId);

    addReview({
      author: profile.name,
      rating,
      title,
      comment,
      category: 'Wine Tasting',
      targetName: exp?.title || 'Estate Tasting',
    });

    setIsModalOpen(false);
    setTitle('');
    setComment('');
    setSuccessNotice('Your review has been submitted for estate verification and published.');
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-stone-900 font-light">My Guest Reviews</h1>
          <p className="text-stone-500 text-sm mt-1">Reflections and feedback shared with our winemaking team and fellow connoisseurs</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 rounded-full bg-[#8a3243] text-white text-sm font-medium hover:bg-[#732937] transition inline-flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" /> Write a Review
        </button>
      </div>

      {successNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Pending Review Prompt Card */}
      <div className="bg-gradient-to-r from-[#faf8f5] to-[#f4ede3] rounded-3xl p-6 md:p-8 border border-stone-200 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8a3243]">
            <Sparkles className="w-4 h-4 text-[#c5a059]" /> Recently Visited
          </div>
          <h2 className="font-serif text-2xl text-stone-900 font-normal">
            How was your Private Cellar & Barrel Tasting?
          </h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            Your host Sommelier Jean-Luc would love your thoughts on the 2024 Cabernet Franc cask sampling.
          </p>
        </div>
        <button
          onClick={() => {
            setTargetExpId(mockExperiences[1].id);
            setIsModalOpen(true);
          }}
          className="px-6 py-2.5 rounded-full bg-stone-900 text-white text-xs font-medium uppercase tracking-wider hover:bg-stone-800 transition shrink-0"
        >
          Share Thoughts
        </button>
      </div>

      {/* My Submitted Reviews */}
      {myReviews.length === 0 ? (
        <EmptyState
          title="No reviews published yet"
          description="You have not published any estate reviews yet. Help other guests discover our exceptional tastings."
          actionText="Review an Experience"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {myReviews.map(review => (
            <div
              key={review.id}
              className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm space-y-4 hover:border-[#c5a059]/40 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#8a3243] mb-1">
                    {review.targetName}
                  </div>
                  <h3 className="font-serif text-xl text-stone-900 font-medium">
                    {review.title}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <RatingStars rating={review.rating} size="sm" />
                  <span className="text-xs text-stone-400 font-medium">
                    {review.date}
                  </span>
                </div>
              </div>

              <p className="text-stone-700 text-sm leading-relaxed italic font-serif">
                &ldquo;{review.comment}&rdquo;
              </p>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-stone-600 font-medium">Verified Estate Guest</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{review.helpfulCount} guests found this helpful</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Write Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-stone-200 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-2xl text-stone-900 font-normal">Share Your Experience</h3>
                <p className="text-xs text-stone-500 mt-0.5">Your reflection helps our cellar team preserve perfection</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                  Select Experience
                </label>
                <select
                  value={targetExpId}
                  onChange={(e) => setTargetExpId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm bg-white"
                >
                  {mockExperiences.map(exp => (
                    <option key={exp.id} value={exp.id}>{exp.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                  Overall Rating
                </label>
                <div className="flex items-center gap-2">
                  <RatingStars rating={rating} interactive onRate={setRating} size="lg" />
                  <span className="text-sm font-serif font-semibold text-stone-900 ml-2">{rating} of 5 Stars</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                  Headline / Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unparalleled barrel tasting in Rutherford"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                  Your Review
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your impressions of the estate, wines sampled, service, and ambiance..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-stone-300 text-stone-700 text-xs font-medium uppercase tracking-wider hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#8a3243] text-white text-xs font-medium uppercase tracking-wider hover:bg-[#732937] transition shadow-sm"
                >
                  Publish Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
