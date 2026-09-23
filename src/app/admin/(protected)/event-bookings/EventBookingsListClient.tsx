'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CalendarDays, Users, DollarSign, ChevronLeft, ChevronRight, Eye, Loader2, AlertCircle, Search, X, Filter, Calendar, Ticket } from 'lucide-react';
import { SectionCard, StatusBadge } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';

interface EventBookingItem {
  id: string;
  bookingNumber: string;
  status: string;
  totalPrice: number | string;
  createdAt: string;
  event: { id: string; slug: string; title: string; eventDate: string; venue: string; timeRange: string; status: string };
  eventSchedule: { id: string; timeSlot: string; activity: string } | null;
  guestProfile: { id: string; name: string; phone: string | null; user: { email: string } } | null;
  tickets: { id: string; quantity: number; unitPrice: number | string; ticketType: { id: string; name: string; price: number | string; capacity: number; soldCount: number } | null }[];
}

interface EventOption { id: string; title: string; slug: string }

export function EventBookingsListClient() {
  const [bookings, setBookings] = useState<EventBookingItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [eventId, setEventId] = useState('');
  const [events, setEvents] = useState<EventOption[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Load events for filter dropdown
  useEffect(() => {
    let cancelled = false;
    async function loadEvents() {
      try {
        const res = await fetch('/api/admin/events?pageSize=50');
        const result = await res.json();
        if (!cancelled && res.ok && result.success) {
          const opts = (result.data.events || []).map((e: { id: string; title: string; slug: string }) => ({ id: e.id, title: e.title, slug: e.slug }));
          setEvents(opts);
        } else if (!cancelled) {
          // fallback public API
          const pub = await fetch('/api/events');
          const pubRes = await pub.json();
          if (pub.ok && pubRes.success) {
            const opts2 = (pubRes.data || []).map((e: { id: string; title: string; slug: string }) => ({ id: e.id, title: e.title, slug: e.slug }));
            if (!cancelled) setEvents(opts2);
          }
        }
      } catch {}
    }
    loadEvents();
    return () => { cancelled = true; };
  }, []);

  const fetchBookings = useCallback(async (page: number, searchVal: string, statusVal: string, eventVal: string, dateFromVal: string, dateToVal: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (searchVal) params.set('search', searchVal);
      if (statusVal) params.set('status', statusVal);
      if (eventVal) params.set('eventId', eventVal);
      if (dateFromVal) params.set('dateFrom', dateFromVal);
      if (dateToVal) params.set('dateTo', dateToVal);
      const res = await fetch(`/api/admin/event-bookings?${params.toString()}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to fetch event bookings');
      setBookings(result.data.bookings);
      setPagination(result.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBookings(1, '', '', '', '', '');
  }, [fetchBookings]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    fetchBookings(1, searchInput, status, eventId, dateFrom, dateTo);
  };
  const handleStatusFilter = (val: string) => { setStatus(val); fetchBookings(1, search, val, eventId, dateFrom, dateTo); };
  const handleEventFilter = (val: string) => { setEventId(val); fetchBookings(1, search, status, val, dateFrom, dateTo); };
  const handleDateFilter = (from: string, to: string) => { setDateFrom(from); setDateTo(to); fetchBookings(1, search, status, eventId, from, to); };
  const handleClear = () => {
    setSearch(''); setSearchInput(''); setStatus(''); setEventId(''); setDateFrom(''); setDateTo('');
    fetchBookings(1, '', '', '', '', '');
  };
  const handlePageChange = (newPage: number) => fetchBookings(newPage, search, status, eventId, dateFrom, dateTo);
  const hasActiveFilters = status || eventId || dateFrom || dateTo || search;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">VINORA • Estate Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium mt-1">Event Bookings</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">Manage event reservations, guest details, and cancellations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200/80 shadow-xs">
            <CalendarDays className="w-3.5 h-3.5 text-stone-500" />
            <span className="text-xs font-mono font-medium text-stone-700">{pagination.total} total</span>
          </div>
        </div>
      </div>

      <SectionCard title="All Event Reservations" description="Search, filter, and manage event bookings (real database records)">
        {/* Search + Filter Bar */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input type="text" placeholder="Search by booking #, guest name, email, or event..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition" />
              {searchInput && (
                <button type="button" onClick={() => { setSearchInput(''); setSearch(''); fetchBookings(1, '', status, eventId, dateFrom, dateTo); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"><X className="w-3.5 h-3.5" /></button>
              )}
            </form>
            <button type="button" onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition ${showFilters || hasActiveFilters ? 'bg-[#461822]/5 border-[#461822]/20 text-[#6c2432]' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
              <Filter className="w-3.5 h-3.5" /><span>Filters</span>{hasActiveFilters && <span className="w-4 h-4 rounded-full bg-[#6c2432] text-white text-[10px] flex items-center justify-center">!</span>}
            </button>
          </div>
          {showFilters && (
            <div className="flex flex-col lg:flex-row gap-3 p-3 bg-[#faf8f5] rounded-lg border border-stone-200/80">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Status</label>
                <select value={status} onChange={(e) => handleStatusFilter(e.target.value)} className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]">
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CHECKED_IN">Checked In</option>
                  <option value="NO_SHOW">No Show</option>
                </select>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Event</label>
                <select value={eventId} onChange={(e) => handleEventFilter(e.target.value)} className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]">
                  <option value="">All Events</option>
                  {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Date From</label>
                <input type="date" value={dateFrom} onChange={(e) => handleDateFilter(e.target.value, dateTo)} className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]" />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Date To</label>
                <input type="date" value={dateTo} onChange={(e) => handleDateFilter(dateFrom, e.target.value)} className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]" />
              </div>
              {hasActiveFilters && (
                <div className="flex items-end"><button type="button" onClick={handleClear} className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition">Clear All</button></div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /><p className="text-xs text-rose-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="mt-6 flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-6 h-6 text-[#6c2432] animate-spin" /><p className="text-xs text-stone-500 font-mono">Loading event bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No event bookings found" description={search || status || eventId || dateFrom || dateTo ? "No bookings match your filters. Try adjusting search criteria." : "No event bookings have been made yet. Event bookings will appear here once guests book via the public site."} />
          </div>
        ) : (
          <>
            <div className="mt-6 overflow-x-auto -mx-5 -my-2 hidden md:block">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-100 bg-[#faf8f5]/60 text-stone-500 uppercase tracking-wider font-mono text-[10px]">
                    <th className="py-3 px-5">Booking</th>
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Schedule</th>
                    <th className="py-3 px-4 text-center">Tickets</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {bookings.map((b) => {
                    const ticketsSummary = b.tickets.map((t) => `${t.ticketType?.name || 'Ticket'} × ${t.quantity}`).join(', ') || '—';
                    const scheduleLabel = b.eventSchedule ? `${b.eventSchedule.timeSlot}` : '—';
                    return (
                      <tr key={b.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3.5 px-5"><Link href={`/admin/event-bookings/${b.bookingNumber}`} className="font-mono font-medium text-[#6c2432] hover:text-[#461822] hover:underline">{b.bookingNumber}</Link></td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-stone-900">{b.guestProfile?.name || 'Guest'}</div>
                          <div className="text-[11px] text-stone-500 truncate max-w-[140px]">{b.guestProfile?.user?.email || ''}</div>
                        </td>
                        <td className="py-3.5 px-4 font-serif text-stone-800 truncate max-w-[150px]">{b.event?.title || '—'}</td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-stone-700">{scheduleLabel}<div className="text-[11px] text-stone-500 truncate max-w-[120px]">{b.eventSchedule?.activity || ''}</div></td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap"><span className="font-medium text-stone-900">{b.tickets.reduce((s, t) => s + t.quantity, 0)}</span><div className="text-[11px] text-stone-500 truncate max-w-[120px]">{ticketsSummary}</div></td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-semibold text-stone-900">${Number(b.totalPrice).toFixed(2)}</td>
                        <td className="py-3.5 px-4 text-center"><StatusBadge status={b.status} /></td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-stone-600">{new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td className="py-3.5 px-5 text-right"><Link href={`/admin/event-bookings/${b.bookingNumber}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#6c2432] bg-[#461822]/5 border border-[#461822]/10 rounded-md hover:bg-[#461822]/10 transition"><Eye className="w-3 h-3" />View</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 space-y-3 md:hidden">
              {bookings.map((b) => {
                const ticketsSummary = b.tickets.map((t) => `${t.ticketType?.name || 'Ticket'} × ${t.quantity}`).join(', ');
                return (
                  <Link key={b.id} href={`/admin/event-bookings/${b.bookingNumber}`} className="block p-4 rounded-xl border border-stone-200/80 bg-white hover:bg-[#faf8f5] transition">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div><span className="font-mono font-medium text-[#6c2432] text-sm">{b.bookingNumber}</span><h4 className="font-serif font-medium text-stone-900 mt-0.5">{b.event?.title || 'Event'}</h4></div>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-stone-600 flex-wrap">
                      <div className="flex items-center gap-1"><Users className="w-3 h-3" />{b.guestProfile?.name || 'Guest'}</div>
                      <div className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.eventSchedule?.timeSlot || 'Schedule'}</div>
                      <div className="flex items-center gap-1"><Ticket className="w-3 h-3" />{b.tickets.reduce((s, t) => s + t.quantity, 0)} tickets</div>
                      <div className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${Number(b.totalPrice).toFixed(2)}</div>
                    </div>
                    <div className="mt-2 text-xs text-stone-500">{ticketsSummary}</div>
                  </Link>
                );
              })}
            </div>

            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4">
                <p className="text-xs text-stone-500 font-mono">Page {pagination.page} of {pagination.totalPages} • {pagination.total} bookings</p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-3.5 h-3.5" />Previous</button>
                  <button type="button" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition disabled:opacity-40 disabled:cursor-not-allowed">Next<ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
