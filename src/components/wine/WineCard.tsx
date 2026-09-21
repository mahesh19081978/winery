'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bookmark, ArrowUpRight } from 'lucide-react';
import { Wine } from '@/types';
import { useGuest } from '@/context/GuestContext';
import RatingStars from '../common/RatingStars';

interface WineCardProps {
  wine: Wine;
}

export default function WineCard({ wine }: WineCardProps) {
  const { isWineSaved, toggleSavedWine } = useGuest();
  const saved = isWineSaved(wine.id);

  return (
    <div className="group bg-white border border-[#e6dece] rounded-2xl overflow-hidden hover:border-[#c5a059] transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md">
      {/* Visual Image Section */}
      <div className="relative h-72 w-full bg-[#f4f0e8] overflow-hidden">
        <Image
          src={wine.image}
          alt={wine.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1e0c10]/70 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Vintage & Category Badges */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-[#1e0c10]/80 backdrop-blur-md text-white text-[11px] font-semibold tracking-wider">
            {wine.vintage}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[#461822] text-[11px] font-medium tracking-wide">
            {wine.category}
          </span>
        </div>

        {/* Favorite Bookmark Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleSavedWine(wine.id);
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-white backdrop-blur-md text-[#2d1117] transition-colors shadow-sm"
          title={saved ? 'Remove from favorites' : 'Save to favorites'}
          aria-label={saved ? 'Remove from favorites' : 'Save to favorites'}
        >
          <Bookmark className={`w-4 h-4 ${saved ? 'fill-[#8a3243] text-[#8a3243]' : ''}`} />
        </button>

        {/* Tasting descriptor bar */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white/90 text-xs">
          <span className="truncate">{wine.vineyardParcel}</span>
          <span className="font-semibold text-[#c5a059] ml-2 shrink-0">${wine.price}</span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <RatingStars rating={wine.rating} size="sm" showNumber />
            <span className="text-[11px] text-[#525960]">({wine.reviewCount} reviews)</span>
          </div>

          <h3 className="font-serif text-xl font-medium text-[#191c1f] group-hover:text-[#6c2432] transition-colors mb-2 leading-snug">
            <Link href={`/wines/${wine.slug}`}>{wine.name}</Link>
          </h3>

          <p className="text-xs sm:text-sm text-[#525960] line-clamp-2 leading-relaxed mb-4">
            {wine.shortDescription}
          </p>

          {/* Flavor Tags */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {wine.characteristics.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-full bg-[#f4f0e8] text-[#461822] text-[10px] uppercase tracking-wider font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="pt-4 border-t border-[#e6dece] flex items-center justify-between">
          <Link
            href={`/wines/${wine.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#8a3243] hover:text-[#2d1117] transition-colors"
          >
            <span>View Wine</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            href={`/book?experience=exp-signature-tasting`}
            className="text-[11px] font-medium text-[#525960] hover:text-[#191c1f] transition-colors underline"
          >
            Taste at Estate
          </Link>
        </div>
      </div>
    </div>
  );
}
