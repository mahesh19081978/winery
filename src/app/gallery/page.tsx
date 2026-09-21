'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { mockGalleryItems } from '@/data/gallery';
import { GalleryItem } from '@/types';
import { X, ZoomIn } from 'lucide-react';

const CATEGORIES = ['All', 'Vineyard', 'Cellar', 'Wine', 'Food', 'Events', 'Sunset'] as const;

export default function GalleryPage() {
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number]>('All');
  const [activeLightboxItem, setActiveLightboxItem] = useState<GalleryItem | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveLightboxItem(null);
      }
    };
    if (activeLightboxItem) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLightboxItem]);

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'All') return mockGalleryItems;
    return mockGalleryItems.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="w-full pt-20">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 bg-[#1e0c10] text-[#faf8f5] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=2000&q=85"
          alt="Golden hour vineyard panorama"
          fill
          priority
          className="object-cover opacity-25"
        />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-[#c5a059] block mb-3 font-semibold">
            Visual Anthology
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl font-normal text-[#faf8f5] mb-4">
            The Estate Gallery
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#e6dece]/85 leading-relaxed font-light">
            Glimpses of daily life across ancient terraces, subterranean cellars, twilight banquets, and harvest mornings.
          </p>
        </div>
      </section>

      {/* Category Filter Tabs */}
      <section className="py-6 bg-white border-b border-[#e6dece] sticky top-16 z-20 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
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

          <span className="text-xs text-[#525960] hidden sm:block">
            {filteredItems.length} Photographs
          </span>
        </div>
      </section>

      {/* Masonry / Grid Gallery */}
      <section className="py-16 sm:py-24 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item, idx) => {
              const isLarge = idx % 4 === 0;
              return (
                <div
                  key={item.id}
                  onClick={() => setActiveLightboxItem(item)}
                  className={`group relative rounded-3xl overflow-hidden cursor-pointer border border-[#e6dece] shadow-sm hover:shadow-xl transition-all duration-300 ${
                    isLarge ? 'h-96 sm:h-[450px]' : 'h-80 sm:h-96'
                  }`}
                >
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1e0c10]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 text-[#faf8f5]">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#c5a059] block mb-1">
                      {item.category}
                    </span>
                    <h4 className="font-serif text-lg font-medium">{item.title}</h4>
                    <p className="text-xs text-[#e6dece]/80 line-clamp-1 mt-1 font-light">
                      {item.caption}
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-[11px] text-[#c5a059] font-medium uppercase tracking-wider">
                      <ZoomIn className="w-3.5 h-3.5" /> Tap to expand
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {activeLightboxItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e0c10]/90 backdrop-blur-md animate-in fade-in duration-200">
          <button
            type="button"
            onClick={() => setActiveLightboxItem(null)}
            className="absolute top-6 right-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none"
            aria-label="Close image lightbox"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative max-w-4xl w-full bg-[#2d1117] rounded-3xl overflow-hidden border border-[#c5a059]/40 shadow-2xl">
            <div className="relative h-[480px] sm:h-[600px] w-full">
              <Image
                src={activeLightboxItem.imageUrl}
                alt={activeLightboxItem.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-6 bg-[#2d1117] text-[#faf8f5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#c5a059] block mb-1">
                  {activeLightboxItem.category} Archive
                </span>
                <h3 className="font-serif text-2xl text-[#faf8f5] font-normal">
                  {activeLightboxItem.title}
                </h3>
                <p className="text-xs text-[#e6dece]/80 mt-1 font-light">
                  {activeLightboxItem.caption}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveLightboxItem(null)}
                className="px-6 py-2 rounded-full border border-white/20 text-white text-xs uppercase tracking-wider hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
