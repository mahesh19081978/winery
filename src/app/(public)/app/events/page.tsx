'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { events } from '@/data/events';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Ticket, 
  Sparkles, 
  ArrowRight
} from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

export default function MyEventsPage() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  // Realistic mock registered events for this guest
  const myRegisteredUpcoming = [
    {
      bookingRef: 'EVT-7721',
      event: events[0], // Summer Solstice Vineyard Dinner
      tickets: 2,
      tier: 'Standard VIP Seat',
      totalPaid: 370,
      tableNumber: 'Terrace Table 14',
    }
  ];

  const myRegisteredPast = [
    {
      bookingRef: 'EVT-5510',
      event: events[2], // Cellar Masterclass
      tickets: 1,
      tier: 'Masterclass Attendee',
      totalPaid: 210,
      tableNumber: 'Cave Bench 04',
    }
  ];

  const currentList = activeTab === 'upcoming' ? myRegisteredUpcoming : myRegisteredPast;

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
          Upcoming Registrations ({myRegisteredUpcoming.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-5 py-2 rounded-full text-xs font-medium uppercase tracking-wider transition ${
            activeTab === 'past' 
              ? 'bg-stone-900 text-white' 
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Past Attended ({myRegisteredPast.length})
        </button>
      </div>

      {/* Event List */}
      {currentList.length === 0 ? (
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
          {currentList.map(item => (
            <div
              key={item.bookingRef}
              className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-[#c5a059]/40 transition"
            >
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="w-full sm:w-44 h-36 relative bg-stone-100 rounded-2xl overflow-hidden shrink-0">
                  <Image
                    src={item.event.image}
                    alt={item.event.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-sm text-white text-[10px] font-mono uppercase px-2 py-0.5 rounded">
                    #{item.bookingRef}
                  </div>
                </div>

                <div className="space-y-3 max-w-xl">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#8a3243] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{item.event.availability}</span>
                  </div>

                  <h2 className="font-serif text-2xl text-stone-900 font-normal">
                    {item.event.title}
                  </h2>

                  <div className="grid grid-cols-2 gap-3 text-xs text-stone-600 pt-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#8a3243]" />
                      <span>{item.event.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#8a3243]" />
                      <span>{item.event.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-[#8a3243]" />
                      <span>{item.tickets} {item.tickets === 1 ? 'Ticket' : 'Tickets'} ({item.tier})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#8a3243]" />
                      <span>{item.event.venue}</span>
                    </div>
                  </div>

                  <div className="text-xs text-stone-500 bg-[#faf8f5] p-2.5 rounded-xl border border-stone-100 inline-block">
                    <span className="font-medium text-stone-700">Seating:</span> {item.tableNumber}
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex flex-col items-start md:items-end justify-between gap-4 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-stone-100">
                <div className="text-right">
                  <span className="text-xs text-stone-400 block">Total Invoiced</span>
                  <span className="font-serif text-xl font-medium text-stone-900">${item.totalPaid}</span>
                </div>

                <Link
                  href={`/events/${item.event.slug}`}
                  className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-xs font-medium uppercase tracking-wider hover:border-[#8a3243] hover:text-[#8a3243] transition inline-flex items-center gap-1.5"
                >
                  Event Program & Menu <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
