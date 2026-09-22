'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import EventCard from '@/components/events/EventCard';
import { Calendar, Loader2 } from 'lucide-react';

interface ApiEvent {
  id: string;
  slug: string;
  title: string;
  eventDate: string;
  timeRange: string;
  venue: string;
  price: string | number;
  shortDescription: string;
  availability: string;
  status: string;
  isPast: boolean;
  featuredImage: string;
  schedules: { timeSlot: string; activity: string }[];
  ticketTypes: { id: string; name: string; price: string | number; capacity: number; soldCount: number }[];
}

function mapAvailability(av: string): 'Available' | 'Few Seats Left' | 'Sold Out' {
  if (av === 'SOLD_OUT') return 'Sold Out';
  if (av === 'FEW_SEATS_LEFT') return 'Few Seats Left';
  return 'Available';
}

export default function EventsPage() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchEvents() {
      try {
        const res = await fetch('/api/events');
        const result = await res.json();
        if (!cancelled) {
          if (!res.ok || !result.success) throw new Error(result.error || 'Failed to load events');
          setEvents(result.data || []);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load events');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchEvents();
    return () => { cancelled = true; };
  }, []);

  const upcomingEvents = events.filter((e) => !e.isPast && e.status !== 'COMPLETED' && e.status !== 'CANCELLED');
  const pastEvents = events.filter((e) => e.isPast || e.status === 'COMPLETED');

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
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 text-[#8a3243] animate-spin mx-auto mb-3" />
              <p className="text-sm text-[#525960]">Loading estate events...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center bg-white border border-rose-200 rounded-2xl">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          ) : (tab === 'upcoming' ? upcomingEvents.length === 0 && pastEvents.length === 0 : pastEvents.length === 0 && upcomingEvents.length === 0) ? (
            <div className="py-12 text-center bg-white border border-[#e6dece] rounded-2xl">
              <Calendar className="w-8 h-8 text-[#c5a059] mx-auto mb-3" />
              <p className="text-sm text-[#525960]">No events found. Please check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(tab === 'upcoming' ? upcomingEvents : pastEvents).map((event) => {
                const priceNum = typeof event.price === 'string' ? parseFloat(event.price) : event.price;
                const mapped = {
                  id: event.id,
                  slug: event.slug,
                  title: event.title,
                  date: new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
                  isoDate: typeof event.eventDate === 'string' ? event.eventDate.split('T')[0] : new Date(event.eventDate).toISOString().split('T')[0],
                  time: event.timeRange,
                  venue: event.venue,
                  price: priceNum,
                  shortDescription: event.shortDescription,
                  description: '',
                  availability: mapAvailability(event.availability),
                  availableTickets: event.ticketTypes.reduce((sum, tt) => sum + Math.max(0, tt.capacity - tt.soldCount), 0),
                  schedule: event.schedules,
                  winesServed: [],
                  culinaryMenu: [],
                  entertainment: '',
                  gallery: [],
                  faqs: [],
                  image: event.featuredImage || 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80',
                  isPast: event.isPast,
                };
                return <EventCard key={event.id} event={mapped as unknown as import('@/types').WineryEvent} />;
              })}
            </div>
          )}
          {!loading && !error && (
            <div className="mt-8 text-center">
              <Link href="/events" className="text-xs text-[#525960]">Showing {(tab === 'upcoming' ? upcomingEvents : pastEvents).length} events · Final availability confirmed at checkout</Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
