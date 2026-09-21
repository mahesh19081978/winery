'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Loader2,
  MapPin,
  Search,
  Ticket,
  X,
} from 'lucide-react';
import { SectionCard, StatusBadge } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';

interface EventItem {
  id: string;
  slug: string;
  title: string;
  eventDate: string;
  timeRange: string;
  venue: string;
  price: string | number;
  currency: string;
  availability: string;
  availableTickets: number;
  maxCapacity: number;
  status: string;
  isPast: boolean;
  schedules: { id: string; timeSlot: string; activity: string; sortOrder: number }[];
  ticketTypes: { id: string; name: string; price: string | number; capacity: number; soldCount: number }[];
  _count: { eventBookings: number; reviews: number };
}

const EVENT_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];
const EVENT_AVAILABILITY = ['AVAILABLE', 'FEW_SEATS_LEFT', 'SOLD_OUT'];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function getTicketSummary(event: EventItem) {
  const capacity = event.ticketTypes.reduce((sum, ticket) => sum + ticket.capacity, 0);
  const sold = event.ticketTypes.reduce((sum, ticket) => sum + ticket.soldCount, 0);
  if (event.ticketTypes.length === 0) {
    return `${event.availableTickets}/${event.maxCapacity} tickets`;
  }
  return `${sold}/${capacity} sold · ${event.ticketTypes.length} type${event.ticketTypes.length !== 1 ? 's' : ''}`;
}

export function EventsListClient() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [availability, setAvailability] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchEvents = useCallback(async (
    page: number,
    searchVal: string,
    statusVal: string,
    availabilityVal: string,
    dateFromVal: string,
    dateToVal: string
  ) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (searchVal) params.set('search', searchVal);
      if (statusVal) params.set('status', statusVal);
      if (availabilityVal) params.set('availability', availabilityVal);
      if (dateFromVal) params.set('dateFrom', dateFromVal);
      if (dateToVal) params.set('dateTo', dateToVal);

      const response = await fetch(`/api/admin/events?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch events');
      }

      setEvents(result.data.events);
      setPagination(result.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchEvents(1, '', '', '', '', '');
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchEvents]);

  const hasActiveFilters = search || status || availability || dateFrom || dateTo;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents(1, search, status, availability, dateFrom, dateTo);
  };

  const updateFilters = (next: Partial<{
    status: string;
    availability: string;
    dateFrom: string;
    dateTo: string;
  }>) => {
    const nextStatus = next.status ?? status;
    const nextAvailability = next.availability ?? availability;
    const nextDateFrom = next.dateFrom ?? dateFrom;
    const nextDateTo = next.dateTo ?? dateTo;

    if (next.status !== undefined) setStatus(next.status);
    if (next.availability !== undefined) setAvailability(next.availability);
    if (next.dateFrom !== undefined) setDateFrom(next.dateFrom);
    if (next.dateTo !== undefined) setDateTo(next.dateTo);

    fetchEvents(1, search, nextStatus, nextAvailability, nextDateFrom, nextDateTo);
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setAvailability('');
    setDateFrom('');
    setDateTo('');
    setShowFilters(false);
    fetchEvents(1, '', '', '', '', '');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-stone-200/60 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
            Domaine Élysée · Estate Operations
          </span>
          <h1 className="mt-1 font-serif text-2xl font-medium text-stone-900 sm:text-3xl">Events</h1>
          <p className="mt-0.5 text-xs text-stone-500 sm:text-sm">
            Real event calendar, ticket types, schedules, and booking counts
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-stone-200/80 bg-white px-3 py-1.5 shadow-xs">
          <Ticket className="h-3.5 w-3.5 text-stone-500" />
          <span className="text-xs font-mono font-medium text-stone-700">{pagination.total} total</span>
        </div>
      </div>

      <SectionCard title="Event Calendar" description="Search and filter database-backed estate events">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <form onSubmit={handleSearch} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search by title, slug, venue, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-9 text-xs text-stone-800 placeholder-stone-400 transition focus:border-[#6c2432] focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    fetchEvents(1, '', status, availability, dateFrom, dateTo);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </form>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                showFilters || hasActiveFilters
                  ? 'border-[#461822]/20 bg-[#461822]/5 text-[#6c2432]'
                  : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-stone-200/80 bg-[#faf8f5] p-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Status</label>
                <select
                  value={status}
                  onChange={(e) => updateFilters({ status: e.target.value })}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                >
                  <option value="">All Statuses</option>
                  {EVENT_STATUSES.map((option) => (
                    <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Availability</label>
                <select
                  value={availability}
                  onChange={(e) => updateFilters({ availability: e.target.value })}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                >
                  <option value="">All Availability</option>
                  {EVENT_AVAILABILITY.map((option) => (
                    <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => updateFilters({ dateFrom: e.target.value })}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => updateFilters({ dateTo: e.target.value })}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                />
              </div>
              {hasActiveFilters && (
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 hover:text-stone-900"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <p className="text-xs text-rose-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="mt-6 flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#6c2432]" />
            <p className="text-xs font-mono text-stone-500">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<Ticket className="h-7 w-7" />}
              title="No events found"
              description={hasActiveFilters
                ? 'No events match the current filters.'
                : 'No events exist in the database yet.'}
            />
          </div>
        ) : (
          <>
            <div className="mt-6 hidden overflow-x-auto -mx-5 -my-2 md:block">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-100 bg-[#faf8f5]/60 text-[10px] uppercase tracking-wider text-stone-500 font-mono">
                    <th className="px-5 py-3">Event</th>
                    <th className="px-4 py-3">Date & Venue</th>
                    <th className="px-4 py-3">Schedule</th>
                    <th className="px-4 py-3">Tickets</th>
                    <th className="px-4 py-3 text-center">Bookings</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {events.map((event) => (
                    <tr key={event.id} className="transition-colors hover:bg-stone-50/80">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-stone-900">{event.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={event.status} size="sm" />
                          <StatusBadge status={event.availability} size="sm" />
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 font-medium text-stone-900">
                          <CalendarDays className="h-3 w-3 text-stone-400" />
                          {formatDate(event.eventDate)}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-stone-500">
                          <MapPin className="h-3 w-3" />
                          {event.venue}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-stone-700">
                          <Clock className="h-3 w-3 text-stone-400" />
                          {event.timeRange}
                        </div>
                        <div className="mt-1 text-[11px] text-stone-500">
                          {event.schedules.length} schedule item{event.schedules.length !== 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-medium text-stone-900">${Number(event.price).toFixed(2)}</div>
                        <div className="mt-1 text-[11px] text-stone-500">{getTicketSummary(event)}</div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-semibold text-stone-900">{event._count.eventBookings}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/admin/events/${event.id}`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-[#461822]/10 bg-[#461822]/5 px-2.5 py-1 text-[11px] font-medium text-[#6c2432] transition hover:bg-[#461822]/10"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 space-y-3 md:hidden">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/admin/events/${event.id}`}
                  className="block rounded-xl border border-stone-200/80 bg-white p-4 transition hover:bg-[#faf8f5]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-serif font-medium text-stone-900">{event.title}</h4>
                      <p className="mt-0.5 text-[11px] text-stone-500">{event.venue}</p>
                    </div>
                    <StatusBadge status={event.status} size="sm" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-stone-600">
                    <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(event.eventDate)}</span>
                    <span className="flex items-center gap-1"><Ticket className="h-3 w-3" />{event._count.eventBookings} bookings</span>
                    <span className="col-span-2 flex items-center gap-1"><Clock className="h-3 w-3" />{event.timeRange}</span>
                  </div>
                </Link>
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4">
                <p className="text-xs font-mono text-stone-500">
                  Page {pagination.page} of {pagination.totalPages} · {pagination.total} events
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchEvents(pagination.page - 1, search, status, availability, dateFrom, dateTo)}
                    disabled={pagination.page <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchEvents(pagination.page + 1, search, status, availability, dateFrom, dateTo)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
