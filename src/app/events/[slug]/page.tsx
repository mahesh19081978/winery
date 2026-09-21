'use client';

import React, { useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { mockEvents } from '@/data/events';
import StatusBadge from '@/components/common/StatusBadge';
import EventCard from '@/components/events/EventCard';
import FAQ from '@/components/common/FAQ';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Music,
  Utensils,
  Wine,
  CheckCircle,
  Plus,
  Minus
} from 'lucide-react';

export default function EventDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const event = mockEvents.find((e) => e.slug === slug);

  const [ticketCount, setTicketCount] = useState(2);
  const [reservedSuccess, setReservedSuccess] = useState(false);

  if (!event) {
    notFound();
  }

  const subtotal = ticketCount * event.price;
  const taxes = Number((subtotal * 0.09).toFixed(2));
  const total = Number((subtotal + taxes).toFixed(2));

  const relatedEvents = mockEvents.filter((e) => e.id !== event.id).slice(0, 3);

  const handleReserve = (e: React.FormEvent) => {
    e.preventDefault();
    setReservedSuccess(true);
  };

  return (
    <div className="w-full pt-20">
      {/* Editorial Breadcrumb */}
      <div className="bg-[#faf8f5] border-b border-[#e6dece] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-[#525960] hover:text-[#2d1117] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Events Calendar</span>
          </Link>
          <StatusBadge status={event.availability} />
        </div>
      </div>

      {/* Hero */}
      <section className="relative py-20 sm:py-28 bg-[#1e0c10] text-[#faf8f5] overflow-hidden">
        <Image
          src={event.image}
          alt={event.title}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-30"
        />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wider text-[#c5a059] mb-4">
            <Calendar className="w-3.5 h-3.5" />
            <span>{event.date}</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal text-[#faf8f5] mb-6 leading-tight">
            {event.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm text-[#e6dece]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#c5a059]" />
              <span>{event.time}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#c5a059]" />
              <span>{event.venue}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Details & Ticket Box */}
      <section className="py-16 sm:py-24 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Content */}
            <div className="lg:col-span-8 space-y-12">
              <div>
                <h3 className="font-serif text-2xl text-[#191c1f] mb-4">About the Gathering</h3>
                <p className="text-base text-[#525960] leading-relaxed">
                  {event.description}
                </p>
              </div>

              {/* Schedule */}
              <div className="p-8 bg-white border border-[#e6dece] rounded-3xl shadow-sm">
                <h3 className="font-serif text-xl text-[#191c1f] mb-6">Evening Program & Schedule</h3>
                <div className="space-y-4">
                  {event.schedule.map((slot, idx) => (
                    <div key={idx} className="flex items-start gap-4 pb-3 border-b border-[#e6dece] last:border-none">
                      <span className="font-mono text-xs font-bold text-[#8a3243] uppercase tracking-wider w-20 shrink-0 mt-0.5">
                        {slot.time}
                      </span>
                      <span className="text-sm text-[#191c1f] font-medium">
                        {slot.activity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wines & Menu Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-6 bg-white border border-[#e6dece] rounded-2xl space-y-4">
                  <div className="w-9 h-9 rounded-full bg-[#f4f0e8] text-[#8a3243] flex items-center justify-center">
                    <Wine className="w-5 h-5" />
                  </div>
                  <h4 className="font-serif text-lg text-[#191c1f] font-medium">Wines Poured</h4>
                  <ul className="space-y-2 text-xs sm:text-sm text-[#525960]">
                    {event.winesServed.map((wine, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8a3243] mt-1.5 shrink-0" />
                        <span>{wine}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 bg-white border border-[#e6dece] rounded-2xl space-y-4">
                  <div className="w-9 h-9 rounded-full bg-[#f4f0e8] text-[#8a3243] flex items-center justify-center">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <h4 className="font-serif text-lg text-[#191c1f] font-medium">Culinary Menu</h4>
                  <ul className="space-y-2 text-xs sm:text-sm text-[#525960]">
                    {event.culinaryMenu.map((dish, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059] mt-1.5 shrink-0" />
                        <span>{dish}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Entertainment */}
              {event.entertainment && (
                <div className="p-6 bg-[#f4f0e8] border border-[#e6dece] rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white text-[#8a3243] flex items-center justify-center shadow-sm shrink-0">
                    <Music className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#8a3243] font-semibold block">
                      Live Performance
                    </span>
                    <h4 className="font-serif text-lg text-[#191c1f] font-medium">
                      {event.entertainment}
                    </h4>
                  </div>
                </div>
              )}

              {/* FAQs */}
              {event.faqs && event.faqs.length > 0 && <FAQ items={event.faqs} />}
            </div>

            {/* Right: Ticket Selector Card (Sticky) */}
            <div className="lg:col-span-4 sticky top-24">
              <div className="bg-white border border-[#e6dece] rounded-3xl p-8 shadow-xl">
                {reservedSuccess ? (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                      <CheckCircle className="w-7 h-7" />
                    </div>
                    <h4 className="font-serif text-2xl text-[#191c1f]">Reservation Confirmed!</h4>
                    <p className="text-xs text-[#525960] leading-relaxed">
                      We have reserved {ticketCount} guest tickets for {event.title}. Digital tickets have been added to your Wine Journey account.
                    </p>
                    <div className="pt-2 flex flex-col gap-2">
                      <Link
                        href="/app/events"
                        className="w-full py-3 rounded-full bg-[#2d1117] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider text-center"
                      >
                        View in My Events
                      </Link>
                      <button
                        type="button"
                        onClick={() => setReservedSuccess(false)}
                        className="text-xs text-[#8a3243] underline pt-2"
                      >
                        Reserve more tickets
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleReserve} className="space-y-6">
                    <div>
                      <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#8a3243] block mb-1">
                        Event Admission
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="font-serif text-4xl font-bold text-[#191c1f]">
                          ${event.price}
                        </span>
                        <span className="text-xs text-[#525960]">/ ticket</span>
                      </div>
                    </div>

                    {/* Ticket Quantity Stepper */}
                    <div className="p-4 bg-[#f4f0e8] rounded-2xl border border-[#e6dece] flex items-center justify-between">
                      <div>
                        <span className="font-medium text-xs text-[#191c1f] block uppercase tracking-wider">
                          Number of Tickets
                        </span>
                        <span className="text-[11px] text-[#525960]">
                          Max 6 tickets per guest
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={ticketCount <= 1}
                          onClick={() => setTicketCount(ticketCount - 1)}
                          className="w-8 h-8 rounded-full bg-white border border-[#e6dece] flex items-center justify-center text-[#191c1f] hover:bg-[#e6dece] disabled:opacity-40 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono font-bold text-sm text-[#191c1f]">
                          {ticketCount}
                        </span>
                        <button
                          type="button"
                          disabled={ticketCount >= 6}
                          onClick={() => setTicketCount(ticketCount + 1)}
                          className="w-8 h-8 rounded-full bg-white border border-[#e6dece] flex items-center justify-center text-[#191c1f] hover:bg-[#e6dece] disabled:opacity-40 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    <div className="space-y-2 py-3 border-y border-[#e6dece] text-xs text-[#525960]">
                      <div className="flex justify-between">
                        <span>{ticketCount} × Admission (${event.price})</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hospitality & Regional Tax (9%)</span>
                        <span>${taxes.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-[#191c1f] pt-1">
                        <span>Total Due</span>
                        <span className="text-[#8a3243]">${total.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={event.availability === 'Sold Out'}
                      className="w-full py-4 rounded-full bg-[#2d1117] hover:bg-[#461822] disabled:opacity-50 text-[#faf8f5] text-xs font-bold uppercase tracking-[0.2em] transition-all shadow-md"
                    >
                      {event.availability === 'Sold Out' ? 'Event Sold Out' : 'Reserve Your Place'}
                    </button>

                    <p className="text-[11px] text-[#525960] text-center leading-relaxed">
                      Instant digital tickets delivered upon confirmation. Seating is allocated upon arrival.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Events */}
      <section className="py-20 bg-[#f4f0e8] border-t border-[#e6dece]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8a3243] block mb-1">
                More Celebrations
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-[#191c1f]">
                Upcoming Gatherings
              </h3>
            </div>
            <Link
              href="/events"
              className="text-xs font-semibold uppercase tracking-widest text-[#8a3243] hover:underline"
            >
              View Calendar
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {relatedEvents.map((evt) => (
              <EventCard key={evt.id} event={evt} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
