'use client';

import React, { useState } from 'react';
import { ThumbsUp, CheckCircle, Tag } from 'lucide-react';
import { Review } from '@/types';
import RatingStars from '../common/RatingStars';

interface ReviewCardProps {
  review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount);
  const [hasVoted, setHasVoted] = useState(false);

  const handleHelpful = () => {
    if (!hasVoted) {
      setHelpfulCount(helpfulCount + 1);
      setHasVoted(true);
    }
  };

  return (
    <div className="bg-white border border-[#e6dece] rounded-2xl p-6 shadow-sm hover:border-[#c5a059] transition-all flex flex-col justify-between">
      <div>
        {/* Author Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-serif text-lg font-medium text-[#191c1f]">
                {review.author}
              </h4>
              {review.verified && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                  <CheckCircle className="w-3 h-3" /> Verified Guest
                </span>
              )}
            </div>
            <span className="text-xs text-[#525960]">{review.date}</span>
          </div>
          <RatingStars rating={review.rating} size="sm" />
        </div>

        {/* Target Tag */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f4f0e8] text-[#8a3243] text-[11px] font-medium mb-3">
          <Tag className="w-3 h-3" />
          <span>{review.targetName}</span>
        </div>

        {/* Title & Comment */}
        <h5 className="font-serif text-base font-normal text-[#2d1117] mb-2 leading-snug">
          &ldquo;{review.title}&rdquo;
        </h5>
        <p className="text-xs sm:text-sm text-[#525960] leading-relaxed mb-4">
          {review.comment}
        </p>
      </div>

      {/* Helpful button */}
      <div className="pt-4 border-t border-[#e6dece] flex items-center justify-between text-xs text-[#525960]">
        <span className="text-[11px] uppercase tracking-wider text-[#8a3243] font-semibold">
          {review.category}
        </span>
        <button
          type="button"
          onClick={handleHelpful}
          disabled={hasVoted}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
            hasVoted
              ? 'bg-[#f4f0e8] text-[#8a3243] cursor-default'
              : 'hover:bg-[#f4f0e8] text-[#525960] hover:text-[#191c1f]'
          }`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          <span>Helpful ({helpfulCount})</span>
        </button>
      </div>
    </div>
  );
}
