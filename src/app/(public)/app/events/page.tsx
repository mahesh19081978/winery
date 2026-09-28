'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Ticket, 
  Sparkles, 
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

interface GuestEventBooking {
  type: 'event';
  bookingNumber: string;
  eventTitle: string;
  eventSlug: string;
  status: string;
  scheduledDate: string;
  timeRange: string;
  venue: string;
  schedule?: {
    timeSlot: string;
    activity: string;
  };
  tickets: Array<{
    name: string;
    quantity: number;
    unitPrice: string;
  }>;
  totalTickets: number;
  totalPrice: string;
  currency: string;
  createdAt: string;
  detailHref: string;
}

export default function MyEventsPage() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [eventsList, setEventsList] = useState<GuestEventBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchBookings() {
      try {
        setLoading(true);
        setError(null);
        const filter = activeTab === 'upcoming' ? 'upcoming' : 'past';
        const res = await fetch(`/api/auth/guest/bookings?type=event&filter=${filter}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error('Failed to load event bookings');
        }

        const json = await res.json();
        if (!cancelled && json.success && json.data?.items) {
          setEventsList(json.data.items);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not fetch event bookings');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBookings();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-stone-900 font-light">My Events & Gatherings</h1>
          <p className="text-stone-500 text-sm mt-1">Special harvest dinners, masterclasses, and estate member soirees</p>
        </div>
        <Link
          href="/events"
          className="px-6 py-2.5 rounded-full bg-[#8a3243] text-white text-sm font-medium hover:bg-[#732937] transition inline-flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          Browse Upcoming Events
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-5 py-2 rounded-full text-xs font-medium uppercase tracking-wider transition ${
            activeTab === 'upcoming' 
              ? 'bg-stone-900 text-white' 
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Upcoming Registrations
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-5 py-2 rounded-full text-xs font-medium uppercase tracking-wider transition ${
            activeTab === 'past' 
              ? 'bg-stone-900 text-white' 
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Past Attended
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Event List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-[#8a3243] animate-spin" />
          <span className="text-xs uppercase tracking-widest text-stone-500">Checking your event registrations…</span>
        </div>
      ) : eventsList.length === 0 ? (
        <EmptyState
          title={`No ${activeTab} events registered`}
          description={
            activeTab === 'upcoming'
              ? 'You have not reserved tickets for any upcoming dinners or masterclasses yet.'
              : 'You have not attended any past events on record.'
          }
          actionText={activeTab === 'upcoming' ? 'View Event Calendar' : undefined}
          actionHref={activeTab === 'upcoming' ? '/events' : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {eventsList.map(item => (
            <div
              key={item.bookingNumber}
              className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-[#c5a059]/40 transition"
            >
              <div className="space-y-3 max-w-xl">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-[#1e0c10] text-[#faf8f5] font-mono text-[11px] font-bold">
                    #{item.bookingNumber}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8a3243] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{item.status}</span>
                  </div>
                </div>

                <h2 className="font-serif text-2xl text-stone-900 font-normal">
                  {item.eventTitle}
                </h2>

                <div className="grid grid-cols-2 gap-3 text-xs text-stone-600 pt-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#8a3243]" />
                    <span>{new Date(item.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#8a3243]" />
                    <span>{item.timeRange || (item.schedule?.timeSlot || 'Scheduled Time')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-[#8a3243]" />
                    <span>{item.totalTickets} {item.totalTickets === 1 ? 'Ticket' : 'Tickets'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#8a3243]" />
                    <span>{item.venue || 'VINORA Estate Pavilion'}</span>
                  </div>
                </div>

                {item.schedule?.activity && (
                  <div className="text-xs text-stone-500 bg-[#faf8f5] p-2.5 rounded-xl border border-stone-100 inline-block">
                    <span className="font-medium text-stone-700">Schedule:</span> {item.schedule.activity}
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="flex flex-col items-start md:items-end justify-between gap-4 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-stone-100">
                <div className="text-right">
                  <span className="text-xs text-stone-400 block">Total Invoiced</span>
                  <span className="font-serif text-xl font-medium text-stone-900">${item.totalPrice} {item.currency}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/events/${item.eventSlug}`}
                    className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-xs font-medium uppercase tracking-wider hover:border-[#8a3243] hover:text-[#8a3243] transition inline-flex items-center gap-1.5"
                  >
                    Event Program <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
