'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleCheck,
  Clock,
  FileText,
  GlassWater,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Star,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { SectionCard, StatCard, StatusBadge } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

interface FrontDeskBooking {
  id: string;
  bookingNumber: string;
  date: string;
  time: string;
  adults: number;
  children: number;
  totalGuests: number;
  totalPrice: string | number;
  currency: string;
  status: BookingStatus;
  specialRequests: string | null;
  dietaryRequirements: string | null;
  createdAt: string;
  guestProfile: {
    id: string;
    name: string;
    phone: string | null;
    dietaryPreferences: string | null;
    notes: string | null;
    user: { email: string };
    winePreference: {
      favoriteVarietals: string[];
      preferredSweetness: string | null;
      preferredBody: string | null;
      preferredAcidity: string | null;
      favoriteWine: { name: string; slug: string; category: string } | null;
    } | null;
    _count: {
      bookings: number;
      tastingSessions: number;
      tastingRecords: number;
      reviews: number;
    };
  };
  items: {
    id: string;
    title: string;
    itemType: string;
    quantity: number;
    experience: { id: string; title: string; slug: string } | null;
  }[];
  attendees: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    isPrimary: boolean;
    dietaryNotes: string | null;
  }[];
  statusHistory: {
    id: string;
    fromStatus: BookingStatus;
    toStatus: BookingStatus;
    changedBy: string | null;
    notes: string | null;
    createdAt: string;
  }[];
  tastingSessions: {
    id: string;
    sessionDate: string;
    location: string | null;
    notes: string | null;
    createdAt: string;
    records: {
      id: string;
      wineNameSnapshot: string;
      vintageYear: number;
      rating: string | number;
      notes: string;
      wouldDrinkAgain: string;
      tastedAt: string;
      wineVintage: {
        wine: { id: string; name: string; slug: string; category: string };
      };
    }[];
  }[];
}

interface FrontDeskData {
  winery: { id: string; name: string; timezone: string } | null;
  date: string;
  timezone: string;
  summary: {
    totalBookings: number;
    awaitingArrival: number;
    upcomingArrivals: number;
    checkedIn: number;
    noShows: number;
    completed: number;
  };
  todayArrivals: FrontDeskBooking[];
  upcomingArrivals: FrontDeskBooking[];
  checkedIn: FrontDeskBooking[];
  noShows: FrontDeskBooking[];
  completed: FrontDeskBooking[];
  allBookings: FrontDeskBooking[];
}

type DialogAction = 'CHECKED_IN' | 'COMPLETED';

function getExperienceTitle(booking: FrontDeskBooking) {
  return booking.items[0]?.experience?.title || booking.items[0]?.title || 'Estate Experience';
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', {
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
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusTime(booking: FrontDeskBooking, status: BookingStatus) {
  return booking.statusHistory.find((entry) => entry.toStatus === status)?.createdAt;
}

function buildTimeline(booking: FrontDeskBooking) {
  const tastingSession = booking.tastingSessions[0];
  const firstRecord = tastingSession?.records[0];
  return [
    {
      label: 'Booking confirmed',
      at: booking.statusHistory.find((entry) => entry.toStatus === 'CONFIRMED')?.createdAt || booking.createdAt,
      complete: Boolean(booking.statusHistory.find((entry) => entry.toStatus === 'CONFIRMED') || booking.createdAt),
    },
    {
      label: 'Guest checked in',
      at: getStatusTime(booking, 'CHECKED_IN'),
      complete: ['CHECKED_IN', 'COMPLETED'].includes(booking.status),
    },
    {
      label: 'Tasting started',
      at: tastingSession?.sessionDate,
      complete: Boolean(tastingSession),
    },
    {
      label: 'Tasting records added',
      at: firstRecord?.tastedAt,
      complete: Boolean(firstRecord),
    },
    {
      label: 'Visit completed',
      at: getStatusTime(booking, 'COMPLETED'),
      complete: booking.status === 'COMPLETED',
    },
  ];
}

function MiniTimeline({ booking }: { booking: FrontDeskBooking }) {
  return (
    <div className="space-y-0">
      {buildTimeline(booking).map((event, index) => (
        <div key={event.label} className="relative flex gap-3 pb-3 last:pb-0">
          {index < 4 && <div className="absolute left-[7px] top-5 bottom-0 w-px bg-stone-200" />}
          <div
            className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 mt-0.5 relative z-10 ${
              event.complete
                ? 'bg-[#6c2432] border-[#6c2432]'
                : 'bg-white border-stone-300'
            }`}
          />
          <div className="min-w-0">
            <p className={`text-xs font-medium ${event.complete ? 'text-stone-900' : 'text-stone-400'}`}>
              {event.label}
            </p>
            {event.at && (
              <p className="text-[10px] font-mono text-stone-500 mt-0.5">{formatDateTime(event.at)}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function BookingQuickFacts({ booking }: { booking: FrontDeskBooking }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
      <div className="flex items-center gap-2 text-stone-600">
        <Clock className="w-3.5 h-3.5 text-stone-400" />
        <span>{booking.time}</span>
      </div>
      <div className="flex items-center gap-2 text-stone-600">
        <Users className="w-3.5 h-3.5 text-stone-400" />
        <span>{booking.totalGuests} guests</span>
      </div>
      <div className="flex items-center gap-2 text-stone-600 min-w-0">
        <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
        <span className="truncate">{booking.guestProfile.user.email}</span>
      </div>
      <div className="flex items-center gap-2 text-stone-600">
        <Phone className="w-3.5 h-3.5 text-stone-400" />
        <span>{booking.guestProfile.phone || 'No phone'}</span>
      </div>
    </div>
  );
}

function OperationalBookingCard({
  booking,
  onAction,
  onStartTasting,
  startingSession,
}: {
  booking: FrontDeskBooking;
  onAction: (booking: FrontDeskBooking, action: DialogAction) => void;
  onStartTasting: (booking: FrontDeskBooking) => void;
  startingSession: string;
}) {
  const tastingSession = booking.tastingSessions[0];
  const checkedInAt = getStatusTime(booking, 'CHECKED_IN');

  return (
    <div className="rounded-xl border border-stone-200/80 bg-white p-4 hover:bg-[#faf8f5]/40 transition">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Link
              href={`/admin/bookings/${booking.bookingNumber}`}
              className="font-mono text-sm font-semibold text-[#6c2432] hover:underline"
            >
              {booking.bookingNumber}
            </Link>
            <StatusBadge status={booking.status} size="sm" />
            {tastingSession && (
              <Link
                href={`/admin/tastings/${tastingSession.id}`}
                className="inline-flex items-center gap-1 rounded-full border border-[#461822]/10 bg-[#461822]/5 px-2 py-0.5 text-[10px] font-medium text-[#6c2432] hover:bg-[#461822]/10"
              >
                <GlassWater className="w-3 h-3" />
                Tasting active
              </Link>
            )}
          </div>
          <h3 className="font-serif text-base font-medium text-stone-900">{booking.guestProfile.name}</h3>
          <p className="text-xs text-stone-500 mt-0.5">{getExperienceTitle(booking)}</p>
          <div className="mt-3">
            <BookingQuickFacts booking={booking} />
          </div>
          {(booking.dietaryRequirements || booking.specialRequests || booking.guestProfile.notes) && (
            <div className="mt-3 grid gap-2 text-xs">
              {booking.dietaryRequirements && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                  Dietary: {booking.dietaryRequirements}
                </p>
              )}
              {booking.specialRequests && (
                <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-stone-700">
                  Request: {booking.specialRequests}
                </p>
              )}
              {booking.guestProfile.notes && (
                <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-stone-700">
                  CRM note: {booking.guestProfile.notes}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 lg:w-48">
          <Link
            href={`/admin/guests/${booking.guestProfile.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Guest CRM
          </Link>
          <Link
            href={`/admin/bookings/${booking.bookingNumber}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
          >
            <FileText className="w-3.5 h-3.5" />
            Booking
          </Link>
          {booking.status === 'CONFIRMED' && (
            <button
              type="button"
              onClick={() => onAction(booking, 'CHECKED_IN')}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6c2432] px-3 py-2 text-xs font-semibold text-white hover:bg-[#461822]"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Check In
            </button>
          )}
          {booking.status === 'CHECKED_IN' && !tastingSession && (
            <button
              type="button"
              onClick={() => onStartTasting(booking)}
              disabled={startingSession === booking.bookingNumber}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6c2432] px-3 py-2 text-xs font-semibold text-white hover:bg-[#461822] disabled:opacity-60"
            >
              {startingSession === booking.bookingNumber ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <GlassWater className="w-3.5 h-3.5" />
              )}
              Start Tasting
            </button>
          )}
          {booking.status === 'CHECKED_IN' && (
            <button
              type="button"
              onClick={() => onAction(booking, 'COMPLETED')}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              <CircleCheck className="w-3.5 h-3.5" />
              Complete Visit
            </button>
          )}
        </div>
      </div>

      {booking.status === 'CHECKED_IN' && (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 border-t border-stone-100 pt-4">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                Tasting Workspace
              </p>
              {checkedInAt && <span className="text-[10px] font-mono text-stone-400">Checked in {formatDateTime(checkedInAt)}</span>}
            </div>
            {tastingSession ? (
              <div className="rounded-lg border border-stone-200 bg-[#faf8f5]/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      Session started {formatDateTime(tastingSession.sessionDate)}
                    </p>
                    <p className="text-xs text-stone-500">
                      {tastingSession.records.length} wine{tastingSession.records.length !== 1 ? 's' : ''} recorded
                    </p>
                  </div>
                  <Link
                    href={`/admin/tastings/${tastingSession.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#461822]/10 bg-white px-3 py-1.5 text-xs font-medium text-[#6c2432] hover:bg-[#461822]/5"
                  >
                    Open Tasting
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                {tastingSession.records.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-500">
                    No tasting records yet. Staff tasting-record entry is coming soon; existing record creation remains guarded by explicit vintage validation.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {tastingSession.records.map((record) => (
                      <div key={record.id} className="rounded-lg border border-stone-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-stone-900">{record.wineNameSnapshot}</p>
                            <p className="text-[11px] text-stone-500">
                              {record.wineVintage.wine.category} · Vintage {record.vintageYear}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-mono text-stone-800">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            {Number(record.rating).toFixed(1)}
                          </div>
                        </div>
                        {record.notes && <p className="mt-2 text-xs italic text-stone-600">{record.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-4 text-center">
                <GlassWater className="w-6 h-6 text-stone-300 mx-auto mb-2" />
                <p className="text-xs text-stone-500">No tasting session has been started for this checked-in booking.</p>
              </div>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-2">Timeline</p>
            <MiniTimeline booking={booking} />
          </div>
        </div>
      )}
    </div>
  );
}

function BookingTable({
  title,
  description,
  bookings,
  emptyTitle,
  emptyDescription,
  onAction,
  onStartTasting,
  startingSession,
}: {
  title: string;
  description: string;
  bookings: FrontDeskBooking[];
  emptyTitle: string;
  emptyDescription: string;
  onAction: (booking: FrontDeskBooking, action: DialogAction) => void;
  onStartTasting: (booking: FrontDeskBooking) => void;
  startingSession: string;
}) {
  return (
    <SectionCard title={title} description={description}>
      {bookings.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="w-7 h-7" />}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <OperationalBookingCard
              key={booking.id}
              booking={booking}
              onAction={onAction}
              onStartTasting={onStartTasting}
              startingSession={startingSession}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function ActionDialog({
  booking,
  action,
  error,
  updating,
  onClose,
  onConfirm,
}: {
  booking: FrontDeskBooking | null;
  action: DialogAction | null;
  error: string;
  updating: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!booking || !action) return null;

  const isCheckIn = action === 'CHECKED_IN';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 bg-[#faf8f5] px-5 py-4">
          <div>
            <h3 className="font-serif text-lg font-medium text-stone-900">
              {isCheckIn ? 'Check In Guest' : 'Complete Visit'}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">{booking.bookingNumber}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-stone-200 bg-[#faf8f5]/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-serif text-base font-medium text-stone-900">{booking.guestProfile.name}</p>
                <p className="text-xs text-stone-500">{getExperienceTitle(booking)}</p>
              </div>
              <StatusBadge status={booking.status} size="sm" />
            </div>
            <div className="mt-3">
              <BookingQuickFacts booking={booking} />
            </div>
          </div>

          <div className="grid gap-2 text-xs">
            {booking.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2">
                <span className="font-medium text-stone-800">{item.title}</span>
                <span className="font-mono text-stone-500">x{item.quantity}</span>
              </div>
            ))}
          </div>

          {(booking.dietaryRequirements || booking.specialRequests || booking.guestProfile.notes) && (
            <div className="space-y-2 text-xs">
              {booking.dietaryRequirements && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                  Dietary: {booking.dietaryRequirements}
                </p>
              )}
              {booking.specialRequests && (
                <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-stone-700">
                  Request: {booking.specialRequests}
                </p>
              )}
              {booking.guestProfile.notes && (
                <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-stone-700">
                  CRM note: {booking.guestProfile.notes}
                </p>
              )}
            </div>
          )}

          {!isCheckIn && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">
              This will move the booking from CHECKED_IN to COMPLETED and preserve the status history.
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-stone-100 bg-[#faf8f5] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={updating}
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={updating}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6c2432] px-4 py-2 text-xs font-semibold text-white hover:bg-[#461822] disabled:opacity-60"
          >
            {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isCheckIn ? <UserCheck className="w-3.5 h-3.5" /> : <CircleCheck className="w-3.5 h-3.5" />}
            {isCheckIn ? 'Confirm Check-In' : 'Complete Visit'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FrontDeskClient() {
  const router = useRouter();
  const [data, setData] = useState<FrontDeskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [dialogBooking, setDialogBooking] = useState<FrontDeskBooking | null>(null);
  const [dialogAction, setDialogAction] = useState<DialogAction | null>(null);
  const [actionError, setActionError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [startingSession, setStartingSession] = useState('');

  const loadFrontDesk = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/front-desk');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load front desk');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFrontDesk();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadFrontDesk]);

  const selectedSummary = useMemo(() => data?.summary, [data]);

  const openAction = (booking: FrontDeskBooking, action: DialogAction) => {
    setDialogBooking(booking);
    setDialogAction(action);
    setActionError('');
  };

  const closeAction = () => {
    if (updating) return;
    setDialogBooking(null);
    setDialogAction(null);
    setActionError('');
  };

  const confirmAction = async () => {
    if (!dialogBooking || !dialogAction) return;

    setUpdating(true);
    setActionError('');

    try {
      const response = await fetch(`/api/admin/bookings/${dialogBooking.bookingNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: dialogAction,
          notes: dialogAction === 'CHECKED_IN'
            ? 'Guest checked in from Front Desk'
            : 'Visit completed from Front Desk',
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update booking');
      }

      closeAction();
      await loadFrontDesk(true);
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUpdating(false);
    }
  };

  const startTasting = async (booking: FrontDeskBooking) => {
    setStartingSession(booking.bookingNumber);
    setError('');

    try {
      const response = await fetch('/api/admin/tastings/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingNumber: booking.bookingNumber,
          notes: `Started from Front Desk for ${getExperienceTitle(booking)}`,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start tasting');
      }

      await loadFrontDesk(true);
      router.push(`/admin/tastings/${result.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setStartingSession('');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-[#6c2432]" />
        <p className="text-xs font-mono text-stone-500">Loading front desk...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-stone-200/60 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
              VINORA · Front Desk
            </span>
          </div>
          <h1 className="mt-1 font-serif text-2xl font-medium text-stone-900 sm:text-3xl">
            Today&apos;s Operations
          </h1>
          <p className="mt-0.5 text-xs text-stone-500 sm:text-sm">
            {data ? `${formatDate(data.date)} · ${data.timezone}` : 'Daily booking, check-in, tasting, and completion workflow'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadFrontDesk(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-50 disabled:opacity-60"
        >
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {data && selectedSummary && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <StatCard title="Bookings" value={selectedSummary.totalBookings} icon={CalendarDays} />
            <StatCard title="Arrivals" value={selectedSummary.awaitingArrival} icon={Users} />
            <StatCard title="Upcoming" value={selectedSummary.upcomingArrivals} icon={Clock} />
            <StatCard title="Checked In" value={selectedSummary.checkedIn} icon={UserCheck} />
            <StatCard title="Completed" value={selectedSummary.completed} icon={CheckCircle2} />
            <StatCard title="No-Shows" value={selectedSummary.noShows} icon={AlertCircle} />
          </div>

          <BookingTable
            title="Today&apos;s Arrivals"
            description="Confirmed and pending bookings awaiting front-desk action"
            bookings={data.todayArrivals}
            emptyTitle="No arrivals waiting"
            emptyDescription="There are no pending or confirmed bookings for today."
            onAction={openAction}
            onStartTasting={startTasting}
            startingSession={startingSession}
          />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <BookingTable
              title="Upcoming Arrivals"
              description="Later confirmed or pending bookings for today"
              bookings={data.upcomingArrivals}
              emptyTitle="No upcoming arrivals"
              emptyDescription="No later arrivals are scheduled for the remainder of today."
              onAction={openAction}
              onStartTasting={startTasting}
              startingSession={startingSession}
            />

            <BookingTable
              title="Currently Checked-In"
              description="Active visits ready for tasting or completion"
              bookings={data.checkedIn}
              emptyTitle="No active checked-in visits"
              emptyDescription="Checked-in guests will appear here once arrivals are processed."
              onAction={openAction}
              onStartTasting={startTasting}
              startingSession={startingSession}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <BookingTable
              title="Completed Today"
              description="Visits completed through the booking status workflow"
              bookings={data.completed}
              emptyTitle="No completed visits yet"
              emptyDescription="Completed visits move here after staff confirms completion."
              onAction={openAction}
              onStartTasting={startTasting}
              startingSession={startingSession}
            />

            <BookingTable
              title="No-Shows"
              description="Bookings already marked with the existing NO_SHOW status"
              bookings={data.noShows}
              emptyTitle="No no-shows today"
              emptyDescription="Bookings marked NO_SHOW will appear here."
              onAction={openAction}
              onStartTasting={startTasting}
              startingSession={startingSession}
            />
          </div>
        </>
      )}

      <ActionDialog
        booking={dialogBooking}
        action={dialogAction}
        error={actionError}
        updating={updating}
        onClose={closeAction}
        onConfirm={confirmAction}
      />
    </div>
  );
}
