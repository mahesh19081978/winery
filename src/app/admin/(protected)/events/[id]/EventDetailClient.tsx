'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  ExternalLink,
  FileText,
  HelpCircle,
  MapPin,
  Music,
  Star,
  Ticket,
  Users,
  Utensils,
  Wine,
} from 'lucide-react';
import { SectionCard, StatCard, StatusBadge } from '@/components/admin/UIComponents';

interface EventData {
  id: string;
  slug: string;
  title: string;
  eventDate: string;
  timeRange: string;
  venue: string;
  price: string | number;
  currency: string;
  description: string;
  shortDescription: string;
  availability: string;
  availableTickets: number;
  maxCapacity: number;
  entertainment: string | null;
  featuredImage: string;
  winesServed: string[];
  culinaryMenu: string[];
  galleryImages: string[];
  isPast: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  schedules: { id: string; timeSlot: string; activity: string; sortOrder: number }[];
  faqs: { id: string; question: string; answer: string; sortOrder: number }[];
  ticketTypes: { id: string; name: string; price: string | number; capacity: number; soldCount: number }[];
  eventBookings: {
    id: string;
    ticketCount: number;
    totalPrice: string | number;
    status: string;
    createdAt: string;
    guestProfile: {
      id: string;
      name: string;
      phone: string | null;
      user: { email: string };
    };
    ticketType: { id: string; name: string; price: string | number; capacity: number; soldCount: number } | null;
  }[];
  reviews: {
    id: string;
    authorName: string;
    rating: number;
    title: string;
    status: string;
    createdAt: string;
  }[];
  _count: { eventBookings: number; reviews: number };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EventDetailClient({ event }: { event: EventData }) {
  const ticketCapacity = event.ticketTypes.reduce((sum, ticket) => sum + ticket.capacity, 0);
  const soldTickets = event.ticketTypes.reduce((sum, ticket) => sum + ticket.soldCount, 0);
  const bookingTickets = event.eventBookings.reduce((sum, booking) => sum + booking.ticketCount, 0);
  const averageReviewRating = event.reviews.length > 0
    ? (event.reviews.reduce((sum, review) => sum + review.rating, 0) / event.reviews.length).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-stone-200/60 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/events"
            className="rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
              Domaine Élysée · Event Details
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-2xl font-medium text-stone-900 sm:text-3xl">{event.title}</h1>
              <StatusBadge status={event.status} size="md" />
              <StatusBadge status={event.availability} size="md" />
            </div>
          </div>
        </div>
        <Link
          href={`/events/${event.slug}`}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Public Page
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard title="Bookings" value={event._count.eventBookings} icon={Users} />
        <StatCard title="Tickets Booked" value={bookingTickets} icon={Ticket} />
        <StatCard title="Ticket Types" value={event.ticketTypes.length} icon={FileText} />
        <StatCard title="Capacity" value={ticketCapacity || event.maxCapacity} subtitle={`${soldTickets} sold by ticket types`} icon={Users} />
        <StatCard title="Schedules" value={event.schedules.length} icon={Clock} />
        <StatCard title="Reviews" value={event._count.reviews} subtitle={averageReviewRating ? `Avg ${averageReviewRating}/5` : undefined} icon={Star} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Event Information" description="Database-backed event details">
            <div className="space-y-5">
              <div className="rounded-xl border border-stone-200/80 bg-[#faf8f5]/50 p-4">
                <p className="text-sm leading-relaxed text-stone-700">{event.shortDescription}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-stone-400" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Date</p>
                    <p className="text-sm font-medium text-stone-900">{formatDate(event.eventDate)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 text-stone-400" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Time</p>
                    <p className="text-sm font-medium text-stone-900">{event.timeRange}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-stone-400" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Venue</p>
                    <p className="text-sm font-medium text-stone-900">{event.venue}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Ticket className="mt-0.5 h-4 w-4 text-stone-400" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Base Price</p>
                    <p className="text-sm font-medium text-stone-900">
                      ${Number(event.price).toFixed(2)} {event.currency}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] uppercase font-mono tracking-wider text-stone-500">Description</p>
                <p className="text-sm leading-relaxed text-stone-700">{event.description}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Event Schedule" description="Program entries from EventSchedule">
            {event.schedules.length === 0 ? (
              <p className="py-8 text-center text-xs text-stone-500">No schedule items configured.</p>
            ) : (
              <div className="space-y-3">
                {event.schedules.map((schedule) => (
                  <div key={schedule.id} className="flex items-start gap-4 rounded-lg border border-stone-200/80 bg-white p-3">
                    <span className="w-20 shrink-0 font-mono text-xs font-semibold text-[#6c2432]">{schedule.timeSlot}</span>
                    <p className="text-sm font-medium text-stone-800">{schedule.activity}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Ticket Types" description="Prices, capacity, and sold counts from EventTicketType">
            {event.ticketTypes.length === 0 ? (
              <p className="py-8 text-center text-xs text-stone-500">No ticket types configured.</p>
            ) : (
              <div className="overflow-x-auto -mx-5 -my-2">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-100 bg-[#faf8f5]/60 text-[10px] uppercase tracking-wider text-stone-500 font-mono">
                      <th className="px-5 py-3">Ticket</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-center">Capacity</th>
                      <th className="px-5 py-3 text-center">Sold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {event.ticketTypes.map((ticket) => (
                      <tr key={ticket.id}>
                        <td className="px-5 py-3.5 font-medium text-stone-900">{ticket.name}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-stone-700">${Number(ticket.price).toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-center text-stone-700">{ticket.capacity}</td>
                        <td className="px-5 py-3.5 text-center font-semibold text-stone-900">{ticket.soldCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Event Bookings" description="Read-only participation from existing EventBooking records">
            {event.eventBookings.length === 0 ? (
              <p className="py-8 text-center text-xs text-stone-500">
                No event bookings exist for this event yet. Full Event Bookings management remains deferred.
              </p>
            ) : (
              <div className="space-y-3">
                {event.eventBookings.map((booking) => (
                  <div key={booking.id} className="rounded-xl border border-stone-200/80 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-stone-900">{booking.guestProfile.name}</p>
                        <p className="text-[11px] text-stone-500">{booking.guestProfile.user.email}</p>
                      </div>
                      <StatusBadge status={booking.status} size="sm" />
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-stone-600 sm:grid-cols-3">
                      <span>{booking.ticketType?.name || 'Standard ticket'}</span>
                      <span>{booking.ticketCount} ticket{booking.ticketCount !== 1 ? 's' : ''}</span>
                      <span className="font-mono">${Number(booking.totalPrice).toFixed(2)}</span>
                    </div>
                    <p className="mt-2 text-[10px] font-mono text-stone-400">Booked {formatDateTime(booking.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Availability" description="Real event capacity fields">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Available Tickets</span>
                <span className="font-mono font-medium text-stone-900">{event.availableTickets}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Max Capacity</span>
                <span className="font-mono font-medium text-stone-900">{event.maxCapacity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Past Event</span>
                <span className="font-mono font-medium text-stone-900">{event.isPast ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Created</span>
                <span className="font-mono text-stone-700">{formatDateTime(event.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Updated</span>
                <span className="font-mono text-stone-700">{formatDateTime(event.updatedAt)}</span>
              </div>
            </div>
          </SectionCard>

          {event.entertainment && (
            <SectionCard title="Entertainment" description="Program performer or feature">
              <div className="flex items-start gap-3">
                <Music className="mt-0.5 h-4 w-4 text-[#6c2432]" />
                <p className="text-sm font-medium text-stone-900">{event.entertainment}</p>
              </div>
            </SectionCard>
          )}

          <SectionCard title="Wines Served" description={`${event.winesServed.length} listed selections`}>
            {event.winesServed.length === 0 ? (
              <p className="text-xs text-stone-500">No wines listed.</p>
            ) : (
              <ul className="space-y-2">
                {event.winesServed.map((wine) => (
                  <li key={wine} className="flex items-start gap-2 text-xs text-stone-700">
                    <Wine className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6c2432]" />
                    {wine}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Culinary Menu" description={`${event.culinaryMenu.length} listed items`}>
            {event.culinaryMenu.length === 0 ? (
              <p className="text-xs text-stone-500">No menu items listed.</p>
            ) : (
              <ul className="space-y-2">
                {event.culinaryMenu.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-stone-700">
                    <Utensils className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6c2432]" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="FAQs" description={`${event.faqs.length} configured questions`}>
            {event.faqs.length === 0 ? (
              <p className="text-xs text-stone-500">No FAQs configured.</p>
            ) : (
              <div className="space-y-3">
                {event.faqs.map((faq) => (
                  <div key={faq.id} className="rounded-lg border border-stone-200 bg-white p-3">
                    <div className="mb-1 flex items-start gap-2">
                      <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6c2432]" />
                      <p className="text-xs font-medium text-stone-900">{faq.question}</p>
                    </div>
                    <p className="text-xs leading-relaxed text-stone-600">{faq.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
