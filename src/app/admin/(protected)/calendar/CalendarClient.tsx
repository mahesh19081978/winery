'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Ticket,
  Sparkles,
  MapPin,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { SectionCard, StatCard, StatusBadge } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';
import { useIsMounted } from '@/hooks/useIsMounted';

interface BookingCalendarItem {
  id: string;
  bookingNumber: string;
  date: string;
  time: string;
  adults: number;
  totalGuests: number;
  totalPrice: number;
  status: string;
  guestProfile: {
    name: string;
    phone: string | null;
    user: { email: string };
  } | null;
  items: {
    experience: { title: string; slug: string; durationMinutes: number } | null;
  }[];
}

interface EventCalendarItem {
  id: string;
  slug: string;
  title: string;
  eventDate: string;
  timeRange: string;
  venue: string;
  price: number;
  status: string;
  availableTickets: number;
  maxCapacity: number;
}

export function CalendarClient() {
  const mounted = useIsMounted();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState<BookingCalendarItem[]>([]);
  const [events, setEvents] = useState<EventCalendarItem[]>([]);
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 9, 1)); // October 2026 where estate data is centered
  const [selectedDay, setSelectedDay] = useState<string>('2026-10-04');
  const [filterType, setFilterType] = useState<'ALL' | 'BOOKINGS' | 'EVENTS'>('ALL');

  const fetchCalendar = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/calendar');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load calendar schedule');
      setBookings(json.data.bookings || []);
      setEvents(json.data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching calendar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/admin/calendar');
        const json = await res.json();
        if (!cancelled) {
          if (!res.ok) throw new Error(json.error || 'Failed to load calendar schedule');
          setBookings(json.data.bookings || []);
          setEvents(json.data.events || []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error fetching calendar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const jumpToToday = () => {
    setCurrentDate(new Date());
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedDay(todayStr);
  };

  // Calendar matrix calculations
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Group events and bookings by date string YYYY-MM-DD
  const dateMap = useMemo(() => {
    const map = new Map<string, { bookings: BookingCalendarItem[]; events: EventCalendarItem[] }>();

    bookings.forEach((b) => {
      const dStr = b.date.split('T')[0];
      if (!map.has(dStr)) map.set(dStr, { bookings: [], events: [] });
      map.get(dStr)!.bookings.push(b);
    });

    events.forEach((e) => {
      const dStr = e.eventDate.split('T')[0];
      if (!map.has(dStr)) map.set(dStr, { bookings: [], events: [] });
      map.get(dStr)!.events.push(e);
    });

    return map;
  }, [bookings, events]);

  // Selected day items
  const selectedDayData = useMemo(() => {
    const data = dateMap.get(selectedDay) || { bookings: [], events: [] };
    let filteredBookings = data.bookings;
    let filteredEvents = data.events;

    if (filterType === 'BOOKINGS') filteredEvents = [];
    if (filterType === 'EVENTS') filteredBookings = [];

    return { bookings: filteredBookings, events: filteredEvents };
  }, [dateMap, selectedDay, filterType]);

  const selectedDateFormatted = useMemo(() => {
    if (!selectedDay) return '';
    const [y, m, d] = selectedDay.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDay]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
              Operations
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-mono text-stone-500">Master Schedule</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium mt-1">
            Estate Calendar
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Synchronized timeline of reservations, tastings, tours, and vineyard celebrations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchCalendar}
            disabled={mounted ? loading : false}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-medium transition shadow-2xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading && mounted ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={jumpToToday}
            className="px-3 py-1.5 rounded-lg border border-[#aa853e]/40 bg-[#faf8f5] text-[#6c2432] hover:bg-[#461822]/10 text-xs font-semibold transition shadow-2xs"
          >
            Today
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Bookings"
          value={bookings.length}
          subtitle="All confirmed and scheduled"
          icon={CalendarIcon}
        />
        <StatCard
          title="Scheduled Events"
          value={events.length}
          subtitle="Masterclasses & dinners"
          icon={Ticket}
        />
        <StatCard
          title="Selected Day Items"
          value={selectedDayData.bookings.length + selectedDayData.events.length}
          subtitle={selectedDay}
          icon={Clock}
        />
        <StatCard
          title="Expected Guests"
          value={selectedDayData.bookings.reduce((sum, b) => sum + b.totalGuests, 0)}
          subtitle="For active day selection"
          icon={Users}
        />
      </div>

      {/* Main Calendar View: Month Grid + Day Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Month Calendar Matrix (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8">
          <SectionCard
            title={monthName}
            description="Select any day to inspect cellar bookings and event line-ups"
            action={
              <div className="flex items-center gap-1.5">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 transition"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 transition"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            }
          >
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-stone-500">
                <Loader2 className="w-6 h-6 animate-spin text-[#6c2432] mb-2" />
                <span className="text-xs">Loading operational calendar...</span>
              </div>
            ) : (
              <div>
                {/* Day-of-week header */}
                <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] font-semibold text-stone-500 uppercase pb-2 border-b border-stone-100">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                {/* Day cells grid */}
                <div className="grid grid-cols-7 gap-1.5 pt-2">
                  {/* Empty cells for offset */}
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[70px] rounded-lg bg-stone-50/40 border border-transparent" />
                  ))}

                  {/* Day cells */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const dayData = dateMap.get(dateStr);
                    const bCount = dayData?.bookings.length || 0;
                    const eCount = dayData?.events.length || 0;
                    const isSelected = selectedDay === dateStr;

                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelectedDay(dateStr)}
                        className={`min-h-[74px] p-1.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#6c2432] bg-[#461822]/5 ring-2 ring-[#6c2432]/30 shadow-xs'
                            : 'border-stone-200/70 hover:border-[#aa853e] hover:bg-[#faf8f5]/60 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-mono font-medium ${
                              isSelected
                                ? 'text-[#6c2432] font-bold'
                                : 'text-stone-700'
                            }`}
                          >
                            {dayNum}
                          </span>
                          {(bCount > 0 || eCount > 0) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#aa853e]" />
                          )}
                        </div>

                        <div className="space-y-1 mt-1">
                          {bCount > 0 && (
                            <div className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60 truncate flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 shrink-0" />
                              <span>{bCount} {bCount === 1 ? 'booking' : 'bookings'}</span>
                            </div>
                          )}
                          {eCount > 0 && (
                            <div className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-indigo-50 text-indigo-800 border border-indigo-200/60 truncate flex items-center gap-1">
                              <Ticket className="w-2.5 h-2.5 shrink-0" />
                              <span>{eCount} {eCount === 1 ? 'event' : 'events'}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Day Schedule Inspector (5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          <SectionCard
            title={selectedDateFormatted || 'Select a date'}
            description="Daily operational line-up"
            action={
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`px-2 py-0.5 rounded ${
                    filterType === 'ALL'
                      ? 'bg-[#6c2432] text-white font-medium'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('BOOKINGS')}
                  className={`px-2 py-0.5 rounded ${
                    filterType === 'BOOKINGS'
                      ? 'bg-[#6c2432] text-white font-medium'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Bookings
                </button>
                <button
                  onClick={() => setFilterType('EVENTS')}
                  className={`px-2 py-0.5 rounded ${
                    filterType === 'EVENTS'
                      ? 'bg-[#6c2432] text-white font-medium'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Events
                </button>
              </div>
            }
          >
            {selectedDayData.bookings.length === 0 && selectedDayData.events.length === 0 ? (
              <EmptyState
                icon={<CalendarIcon className="w-7 h-7" />}
                title="No operational items"
                description={`No reservations or vineyard events scheduled for ${selectedDay}.`}
                actionText="Open Front Desk"
                actionHref="/admin/front-desk"
              />
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {/* Events */}
                {selectedDayData.events.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-xl border border-indigo-200/80 bg-indigo-50/30 hover:bg-indigo-50/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                          Estate Event
                        </span>
                        <h4 className="font-serif font-medium text-sm text-stone-900 mt-1 leading-snug">
                          {evt.title}
                        </h4>
                      </div>
                      <StatusBadge status={evt.status} size="sm" />
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-stone-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span className="font-mono">{evt.timeRange}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        <span>{evt.venue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-stone-400" />
                        <span>{evt.availableTickets} / {evt.maxCapacity} seats available</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-indigo-100 flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-stone-900">${Number(evt.price).toFixed(2)}</span>
                      <Link
                        href={`/admin/events/${evt.id}`}
                        className="text-[#6c2432] hover:text-[#461822] font-medium hover:underline text-xs"
                      >
                        Manage Event &rarr;
                      </Link>
                    </div>
                  </div>
                ))}

                {/* Bookings */}
                {selectedDayData.bookings.map((bk) => {
                  const experienceTitle = bk.items[0]?.experience?.title || 'Estate Tasting Experience';
                  return (
                    <div
                      key={bk.id}
                      className="p-3.5 rounded-xl border border-stone-200/80 bg-white hover:bg-[#faf8f5]/40 transition-colors shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold text-[#6c2432]">
                              {bk.bookingNumber}
                            </span>
                            <StatusBadge status={bk.status} size="sm" />
                          </div>
                          <h4 className="font-serif font-medium text-sm text-stone-900 mt-1">
                            {bk.guestProfile?.name || 'Guest'}
                          </h4>
                          <p className="text-xs text-stone-500 mt-0.5">{experienceTitle}</p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-600 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          <span>{bk.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-stone-400" />
                          <span>{bk.totalGuests} guests</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold text-stone-900">
                          ${Number(bk.totalPrice).toFixed(2)}
                        </span>
                        <Link
                          href={`/admin/bookings/${bk.bookingNumber}`}
                          className="text-[#6c2432] hover:text-[#461822] font-medium hover:underline text-xs"
                        >
                          View Details &rarr;
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
