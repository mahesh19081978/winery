'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import WineCard from '@/components/wine/WineCard';
import { mockWines } from '@/data/wines';
import { WineCategory } from '@/types';
import { SlidersHorizontal } from 'lucide-react';

const CATEGORIES: ('All' | WineCategory)[] = ['All', 'Red', 'White', 'Rosé', 'Sparkling', 'Reserve'];
const SORT_OPTIONS = [
  { label: 'Featured Vintages', value: 'featured' },
  { label: 'Highest Rated', value: 'rating' },
  { label: 'Vintage (Newest)', value: 'vintage-desc' },
  { label: 'Price (High to Low)', value: 'price-desc' },
  { label: 'Price (Low to High)', value: 'price-asc' }
];

export default function WinesPage() {
  const [selectedCategory, setSelectedCategory] = useState<'All' | WineCategory>('All');
  const [selectedSort, setSelectedSort] = useState('featured');

  const filteredWines = useMemo(() => {
    let list = [...mockWines];

    if (selectedCategory !== 'All') {
      list = list.filter((w) => w.category === selectedCategory);
    }

    if (selectedSort === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (selectedSort === 'vintage-desc') {
      list.sort((a, b) => b.vintage - a.vintage);
    } else if (selectedSort === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (selectedSort === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else {
      // featured default
      list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    return list;
  }, [selectedCategory, selectedSort]);

  return (
    <div className="w-full pt-20">
      {/* Page Hero */}
      <section className="relative py-20 sm:py-28 bg-[#1e0c10] text-[#faf8f5] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=2000&q=85"
          alt="Vintage cellar collection"
          fill
          priority
          className="object-cover opacity-25"
        />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-[#c5a059] block mb-3 font-semibold">
            The Cellar Allocation
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl font-normal text-[#faf8f5] mb-4">
            The Wine Collection
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#e6dece]/85 leading-relaxed font-light">
            Bottled with patience and organic stewardship. Each cuvée is an unadulterated portrait of sun, slope, and ancient chalk bedrock.
          </p>
        </div>
      </section>

      {/* Filter & Sorting Controls */}
      <section className="py-8 bg-white border-b border-[#e6dece] sticky top-16 z-20 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
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

          {/* Sort Selector */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <SlidersHorizontal className="w-4 h-4 text-[#8a3243]" />
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="bg-[#f4f0e8] border border-[#e6dece] rounded-full px-4 py-2 text-xs font-medium text-[#191c1f] focus:outline-none focus:border-[#8a3243]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-[#525960] shrink-0 font-medium">
              {filteredWines.length} {filteredWines.length === 1 ? 'Wine' : 'Wines'}
            </span>
          </div>
        </div>
      </section>

      {/* Wine Grid */}
      <section className="py-16 sm:py-24 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredWines.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-serif text-2xl text-[#525960]">No wines found in this category.</p>
              <button
                onClick={() => setSelectedCategory('All')}
                className="mt-4 px-6 py-2 rounded-full bg-[#2d1117] text-white text-xs font-semibold uppercase tracking-wider"
              >
                Show All Wines
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredWines.map((wine) => (
                <WineCard key={wine.id} wine={wine} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
