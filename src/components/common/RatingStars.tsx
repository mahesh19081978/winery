'use client';

import React from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

export default function RatingStars({
  rating,
  maxStars = 5,
  size = 'md',
  showNumber = false,
  interactive = false,
  onRate
}: RatingStarsProps) {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };

  return (
    <div className="inline-flex items-center gap-1.5" aria-label={`Rating: ${rating} out of ${maxStars}`}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxStars }).map((_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= Math.round(rating);
          return (
            <button
              key={index}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onRate && onRate(starValue)}
              className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'} focus:outline-none`}
            >
              <Star
                className={`${sizeClasses[size]} ${
                  isFilled
                    ? 'fill-[#c5a059] text-[#c5a059]'
                    : 'text-[#d5c8b2] fill-transparent'
                } transition-colors`}
              />
            </button>
          );
        })}
      </div>
      {showNumber && (
        <span className="text-xs font-semibold text-[#191c1f] tracking-wide ml-0.5">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
