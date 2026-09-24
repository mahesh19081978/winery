'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Sparkles,
  Ticket,
  Users,
  Wine,
} from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';

type TypeFilter = 'all' | 'experience' | 'event';
type TimeFilter = 'all' | 'upcoming' | 'past' | 'cancelled';

interface ExperienceBookingSummary {
  type: 'experience';
  bookingNumber: string;
  experienceName: string;
  status: string;
  scheduledDate: string;
  time: string;
  adults: number;
  children: number;
  totalGuests: number;
  subtotal: string;
  taxAmount: string;
  totalPrice: string;
  currency: string;
  createdAt: string;
  detailHref: string;
}

interface EventBookingSummary {
  type: 'event';
  bookingNumber: string;
  eventTitle: string;
  eventSlug: string;
  status: string;
  scheduledDate: string;
  timeRange: string;
  venue: string;
  schedule: { timeSlot: string; activity: string };
  tickets: Array<{ name: string; quantity: number; unitPrice: string }>;
  totalTickets: number;
  totalPrice: string;
  currency: string;
  createdAt: string;
  detailHref: string;
}

type BookingSummary = ExperienceBookingSummary | EventBookingSummary;

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const TYPE_TABS: Array<{ label: string; value: TypeFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Experiences', value: 'experience' },
  { label: 'Events', value: 'event' },
];

const TIME_TABS: Array<{ label: string; value: TimeFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Past', value: 'past' },
  { label: 'Cancelled', value: 'cancelled' },
];

function formatStatus(status: string): string {
  switch (status) {
    case 'CONFIRMED':
      return 'Confirmed';
    case 'PENDING':
      return 'Pending';
    case 'CANCELLED':
      return 'Cancelled';
    case 'COMPLETED':
      return 'Completed';
    case 'CHECKED_IN':
      return 'Checked In';
    case 'NO_SHOW':
      return 'No Show';
    default:
      return status;
  }
}

function formatDate(dateStr: string): string {
  try {
    const d =
      dateStr.length >= 10 ? new Date(`${dateStr.slice(0, 10)}T00:00:00`) : new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatCreated(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatMoney(currency: string, amount: string): string {
  const value = Number(amount);
  const formatted = Number.isFinite(value) ? value.toFixed(2) : amount;
  if (currency === 'USD') return `$${formatted}`;
  return `${currency} ${formatted}`;
}

function tabClasses(active: boolean): string {
  return `px-4 sm:px-5 py-2 rounded-full text-xs font-medium uppercase tracking-wider transition shrink-0 ${
    active
      ? 'bg-stone-900 text-white'
      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
  }`;
}

function ExperienceCard({ booking }: { booking: ExperienceBookingSummary }) {
  return (
    <article className="bg-white rounded-3xl p-6 md:p-7 border border-stone-200/80 shadow-sm hover:border-[#c5a059]/40 transition">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f4f0e8] text-[#8a3243] text-[10px] font-semibold uppercase tracking-wider">
              <Wine className="w-3 h-3" />
              Experience
            </span>
            <span className="font-mono text-[11px] text-stone-500">#{booking.bookingNumber}</span>
            <StatusBadge status={formatStatus(booking.status)} />
          </div>

          <h2 className="font-serif text-xl md:text-2xl text-stone-900 font-normal break-words">
            {booking.experienceName}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-stone-600 pt-1">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#8a3243] shrink-0" />
              {formatDate(booking.scheduledDate)}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#8a3243] shrink-0" />
              {booking.time}
            </span>
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#8a3243] shrink-0" />
              {booking.adults} {booking.adults === 1 ? 'adult' : 'adults'}
              {booking.children > 0 ? ` · ${booking.children} ${booking.children === 1 ? 'child' : 'children'}` : ''}
            </span>
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8a3243] shrink-0" />
              {booking.totalGuests} total {booking.totalGuests === 1 ? 'guest' : 'guests'}
            </span>
          </div>

          <p className="text-[11px] text-stone-400">Booked on {formatCreated(booking.createdAt)}</p>
        </div>

        <div className="flex flex-col items-start md:items-end justify-between gap-4 shrink-0 pt-4 md:pt-0 md:pl-6 border-t md:border-t-0 md:border-l border-stone-100 md:min-w-[170px]">
          <div className="md:text-right">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 block">
              Total Amount
            </span>
            <span className="font-serif text-xl text-stone-900">
              {formatMoney(booking.currency, booking.totalPrice)}
            </span>
          </div>

          <Link
            href={booking.detailHref}
            className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-xs font-medium uppercase tracking-wider hover:border-[#8a3243] hover:text-[#8a3243] transition inline-flex items-center gap-1.5"
          >
            View Booking <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function EventCard({ booking }: { booking: EventBookingSummary }) {
  return (
    <article className="bg-white rounded-3xl p-6 md:p-7 border border-stone-200/80 shadow-sm hover:border-[#c5a059]/40 transition">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2d1117] text-[#c5a059] text-[10px] font-semibold uppercase tracking-wider">
              <Ticket className="w-3 h-3" />
              Event
            </span>
            <span className="font-mono text-[11px] text-stone-500">#{booking.bookingNumber}</span>
            <StatusBadge status={formatStatus(booking.status)} />
          </div>

          <h2 className="font-serif text-xl md:text-2xl text-stone-900 font-normal break-words">
            {booking.eventTitle}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-stone-600 pt-1">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#8a3243] shrink-0" />
              {formatDate(booking.scheduledDate)}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#8a3243] shrink-0" />
              {booking.timeRange}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#8a3243] shrink-0" />
              {booking.venue}
            </span>
            <span className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-[#8a3243] shrink-0" />
              {booking.totalTickets} {booking.totalTickets === 1 ? 'ticket' : 'tickets'} · {booking.schedule.timeSlot}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {booking.tickets.map((ticket) => (
              <span
                key={ticket.name}
                className="inline-flex items-center gap-1.5 text-[11px] text-stone-600 bg-[#faf8f5] border border-stone-100 rounded-full px-3 py-1"
              >
                {ticket.name}
                <span className="font-semibold text-[#8a3243]">× {ticket.quantity}</span>
              </span>
            ))}
          </div>

          <p className="text-[11px] text-stone-400">Booked on {formatCreated(booking.createdAt)}</p>
        </div>

        <div className="flex flex-col items-start md:items-end justify-between gap-4 shrink-0 pt-4 md:pt-0 md:pl-6 border-t md:border-t-0 md:border-l border-stone-100 md:min-w-[170px]">
          <div className="md:text-right">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 block">
              Total Amount
            </span>
            <span className="font-serif text-xl text-stone-900">
              {formatMoney(booking.currency, booking.totalPrice)}
            </span>
          </div>

          <Link
            href={booking.detailHref}
            className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-xs font-medium uppercase tracking-wider hover:border-[#8a3243] hover:text-[#8a3243] transition inline-flex items-center gap-1.5"
          >
            View Event Booking <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function emptyCopy(type: TypeFilter, time: TimeFilter): { title: string; description: string } {
  if (time === 'cancelled') {
    return {
      title: 'No cancelled bookings',
      description: 'None of your reservations or event bookings have been cancelled.',
    };
  }
  if (time === 'past') {
    return {
      title: 'No past bookings',
      description: 'Your completed visits and attended events will appear here.',
    };
  }
  if (time === 'upcoming') {
    return {
      title: 'No upcoming bookings',
      description: 'Reserve an experience or grab tickets to an event to get started.',
    };
  }
  if (type === 'experience') {
    return {
      title: 'No experience bookings yet',
      description: 'Your estate visits and tasting experiences will appear here once reserved.',
    };
  }
  if (type === 'event') {
    return {
      title: 'No event bookings yet',
      description: 'Your wine dinner and masterclass tickets will appear here once reserved.',
    };
  }
  return {
    title: 'No bookings yet',
    description: 'Your reservations and wine experiences with VINORA will appear here.',
  };
}

export default function MyBookingsPage() {
  const [type, setType] = useState<TypeFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<BookingSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type,
        filter: timeFilter,
        page: String(page),
        pageSize: '10',
      });
      const res = await fetch(`/api/auth/guest/bookings?${params.toString()}`, {
        cache: 'no-store',
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to load your bookings');
      }
      setItems(json.data?.items ?? []);
      setPagination(json.data?.pagination ?? null);
    } catch (e) {
      setItems([]);
      setPagination(null);
      setError(e instanceof Error ? e.message : 'Failed to load your bookings');
    } finally {
      setLoading(false);
    }
  }, [type, timeFilter, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBookings();
  }, [fetchBookings]);

  const changeType = (value: TypeFilter) => {
    setType(value);
    setPage(1);
  };

  const changeTime = (value: TimeFilter) => {
    setTimeFilter(value);
    setPage(1);
  };

  const empty = emptyCopy(type, timeFilter);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-stone-900 font-light">My Bookings</h1>
          <p className="text-stone-500 text-sm mt-1">
            Your reservations and wine experiences with VINORA.
          </p>
        </div>
        <Link
          href="/book"
          className="px-6 py-2.5 rounded-full bg-[#8a3243] text-white text-sm font-medium hover:bg-[#732937] transition inline-flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          Book New Experience
        </Link>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3">
          <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mr-1 hidden sm:inline">
            Show
          </span>
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => changeType(tab.value)}
              className={tabClasses(type === tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 pb-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mr-1 hidden sm:inline">
            When
          </span>
          {TIME_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => changeTime(tab.value)}
              className={tabClasses(timeFilter === tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="w-8 h-8 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-[0.25em] text-stone-500">
            Loading your bookings…
          </span>
        </div>
      ) : error ? (
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-10 text-center max-w-lg mx-auto my-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="font-serif text-xl font-medium text-stone-900 mb-2">
            Unable to load bookings
          </h3>
          <p className="text-sm text-stone-500 mb-6 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => fetchBookings()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2d1117] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider hover:bg-[#461822] transition"
          >
            Try Again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div>
          <EmptyState
            icon={<Calendar className="w-7 h-7" />}
            title={empty.title}
            description={empty.description}
            actionText="Book an Experience"
            actionHref="/book"
          />
          <div className="text-center -mt-4">
            <Link
              href="/events"
              className="text-xs font-semibold uppercase tracking-wider text-[#8a3243] hover:text-[#732937] transition"
            >
              Browse Upcoming Events →
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {items.map((booking) =>
            booking.type === 'experience' ? (
              <ExperienceCard key={booking.bookingNumber} booking={booking} />
            ) : (
              <EventCard key={booking.bookingNumber} booking={booking} />
            )
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-stone-200">
          <span className="text-xs text-stone-500 order-2 sm:order-1">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total}{' '}
            {pagination.total === 1 ? 'booking' : 'bookings'}
          </span>
          <div className="flex items-center gap-3 order-1 sm:order-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-xs font-medium uppercase tracking-wider hover:border-[#8a3243] hover:text-[#8a3243] transition disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-xs font-medium uppercase tracking-wider hover:border-[#8a3243] hover:text-[#8a3243] transition disabled:opacity-40 disabled:pointer-events-none"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
