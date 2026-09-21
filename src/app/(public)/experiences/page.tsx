'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import ExperienceCard from '@/components/experiences/ExperienceCard';
import { mockExperiences } from '@/data/experiences';

const CATEGORIES = ['All', 'Tasting', 'Tour', 'Culinary', 'Private'] as const;

export default function ExperiencesPage() {
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number]>('All');

  const filteredExperiences = useMemo(() => {
    if (selectedCategory === 'All') return mockExperiences;
    return mockExperiences.filter((e) => e.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="w-full pt-20">
      {/* Page Hero */}
      <section className="relative py-20 sm:py-28 bg-[#1e0c10] text-[#faf8f5] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=2000&q=85"
          alt="Estate tasting salon overlooking terrace"
          fill
          priority
          className="object-cover opacity-25"
        />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-[#c5a059] block mb-3 font-semibold">
            Estate Hospitality
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl font-normal text-[#faf8f5] mb-4">
            Curated Experiences
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#e6dece]/85 leading-relaxed font-light">
            From leisurely vineyard picnics beneath century-old olive groves to deep descents into vaulted 18th-century chalk cellars.
          </p>
        </div>
      </section>

      {/* Category Filter Navigation */}
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
            {filteredExperiences.length} Curated Experiences
          </span>
        </div>
      </section>

      {/* Experiences Grid */}
      <section className="py-16 sm:py-24 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredExperiences.map((exp) => (
              <ExperienceCard key={exp.id} experience={exp} />
            ))}
          </div>
        </div>
      </section>

      {/* Private Groups & Bespoke Concierge Callout */}
      <section className="py-16 bg-[#2d1117] text-[#faf8f5] border-t border-[#461822]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#c5a059] block">
            Private Celebrations & Gatherings
          </span>
          <h3 className="font-serif text-2xl sm:text-4xl text-[#faf8f5]">
            Planning a private celebration or corporate retreat?
          </h3>
          <p className="text-sm text-[#e6dece]/80 max-w-xl mx-auto leading-relaxed">
            Our sommelier and culinary team create bespoke private dining feasts, sunset pavilion buyouts, and personalized barrel blending tournaments for up to 60 guests.
          </p>
          <div className="pt-2">
            <a
              href="mailto:concierge@domaine-elysee.com"
              className="inline-flex items-center px-6 py-3 rounded-full bg-[#c5a059] hover:bg-[#d6b774] text-[#1e0c10] text-xs font-bold uppercase tracking-wider transition-colors shadow-md"
            >
              Inquire with Private Events Concierge
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
