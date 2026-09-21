'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import EventCard from '@/components/events/EventCard';
import { mockEvents } from '@/data/events';

export default function EventsPage() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const upcomingEvents = mockEvents.filter((e) => !e.isPast);
  const pastEvents = mockEvents.filter((e) => e.isPast);

  return (
    <div className="w-full pt-20">
      {/* Page Hero */}
      <section className="relative py-20 sm:py-28 bg-[#1e0c10] text-[#faf8f5] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=2000&q=85"
          alt="Lawn illuminated with string lights and evening jazz"
          fill
          priority
          className="object-cover opacity-30"
        />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-[#c5a059] block mb-3 font-semibold">
            Gatherings & Festivities
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl font-normal text-[#faf8f5] mb-4">
            Estate Events & Galas
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#e6dece]/85 leading-relaxed font-light">
            Celebrate the cycles of vine and season: live Parisian jazz upon the lawn, harvest solstice banquets, and intimate long-table dinners with Julien de Rêve.
          </p>
        </div>
      </section>

      {/* Tabs Switcher */}
      <section className="py-6 bg-white border-b border-[#e6dece] sticky top-16 z-20 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setTab('upcoming')}
            className={`px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
              tab === 'upcoming'
                ? 'bg-[#2d1117] text-[#faf8f5] shadow-sm'
                : 'bg-[#f4f0e8] text-[#525960] hover:bg-[#e6dece] hover:text-[#191c1f]'
            }`}
          >
            Upcoming Events ({upcomingEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('past')}
            className={`px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
              tab === 'past'
                ? 'bg-[#2d1117] text-[#faf8f5] shadow-sm'
                : 'bg-[#f4f0e8] text-[#525960] hover:bg-[#e6dece] hover:text-[#191c1f]'
            }`}
          >
            Past Retrospectives ({pastEvents.length})
          </button>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-16 sm:py-24 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(tab === 'upcoming' ? upcomingEvents : pastEvents).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
