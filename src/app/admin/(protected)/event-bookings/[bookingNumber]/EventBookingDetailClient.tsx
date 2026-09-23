'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Clock, Users, Mail, Phone, MapPin, Ticket, AlertCircle, Loader2, XCircle } from 'lucide-react';
import { SectionCard, StatusBadge } from '@/components/admin/UIComponents';

interface DetailBooking {
  id: string;
  bookingNumber: string;
  status: string;
  totalPrice: number | string;
  createdAt: string;
  updatedAt: string;
  event: { id: string; slug: string; title: string; eventDate: string; timeRange: string; venue: string; status: string; availability: string; isPast: boolean; featuredImage: string };
  eventSchedule: { id: string; timeSlot: string; activity: string; sortOrder: number };
  guestProfile: { id: string; name: string; phone: string | null; user: { email: string; id: string } };
  tickets: { id: string; quantity: number; unitPrice: number | string; eventTicketTypeId: string | null; ticketType: { id: string; name: string; price: number | string; capacity: number; soldCount: number } | null }[];
  statusHistory: { id: string; fromStatus: string; toStatus: string; changedBy: string | null; notes: string | null; createdAt: string }[];
}

export function EventBookingDetailClient({ bookingNumber }: { bookingNumber: string }) {
  const [booking, setBooking] = useState<DetailBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchBooking = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/event-bookings/${bookingNumber}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to load booking');
      setBooking(result.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  }, [bookingNumber]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBooking();
  }, [fetchBooking]);

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/admin/event-bookings/${bookingNumber}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason || 'Cancelled by admin' }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to cancel booking');
      setShowCancelConfirm(false);
      setCancelReason('');
      await fetchBooking();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-6 h-6 text-[#6c2432] animate-spin" />
        <p className="text-xs text-stone-500 font-mono">Loading event booking...</p>
      </div>
    );
  }
  if (error || !booking) {
    return (
      <div className="space-y-6">
        <Link href="/admin/event-bookings" className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700"><ArrowLeft className="w-4 h-4" />Back to Event Bookings</Link>
        <div className="bg-white border border-rose-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
          <h2 className="font-serif text-xl text-stone-900 mb-1">Booking Not Found</h2>
          <p className="text-xs text-stone-600">{error || `No booking found for ${bookingNumber}`}</p>
          <Link href="/admin/event-bookings" className="mt-4 inline-flex px-4 py-2 rounded-lg bg-[#2d1117] text-white text-xs font-medium">Back to List</Link>
        </div>
      </div>
    );
  }

  const isCancellable = booking.status === 'CONFIRMED' || booking.status === 'PENDING';
  const totalTickets = booking.tickets.reduce((s, t) => s + t.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
        <div className="flex items-center gap-3">
          <Link href="/admin/event-bookings" className="p-2 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <div className="flex items-center gap-2.5"><span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">VINORA • Event Booking Details</span></div>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium">{booking.bookingNumber}</h1>
              <StatusBadge status={booking.status} size="md" />
            </div>
          </div>
        </div>
        {isCancellable && (
          <button type="button" onClick={() => setShowCancelConfirm(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition">
            <XCircle className="w-3.5 h-3.5" />Cancel Booking
          </button>
        )}
      </div>

      {cancelError && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" /><p className="text-xs text-rose-700">{cancelError}</p>
        </div>
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/50" onClick={() => setShowCancelConfirm(false)} />
          <div className="relative bg-white rounded-xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0"><AlertCircle className="w-5 h-5" /></div>
              <div className="flex-1">
                <h3 className="font-medium text-stone-900">Cancel Event Booking?</h3>
                <p className="text-xs text-stone-600 mt-1">You are about to cancel <span className="font-mono font-medium text-stone-900">{booking.bookingNumber}</span> for event <strong>{booking.event.title}</strong> with <strong>{totalTickets} ticket(s)</strong> for guest <strong>{booking.guestProfile?.name}</strong>.</p>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-3">This will release ticket capacity (soldCount will decrease) and create a cancellation history entry. This cannot be undone.</p>
                <div className="mt-3">
                  <label className="text-[11px] uppercase font-mono tracking-wider text-stone-500">Cancellation reason (optional)</label>
                  <input type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Admin cancellation - guest request" className="mt-1 w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCancelConfirm(false)} disabled={cancelling} className="px-4 py-2 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-50">Keep Booking</button>
              <button type="button" onClick={handleCancel} disabled={cancelling} className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5">{cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Confirm Cancellation</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Booking Overview" description="Reservation details and scheduling">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3"><CalendarDays className="w-4 h-4 text-stone-400 mt-0.5" /><div><p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Booking Number</p><p className="text-sm font-mono font-medium text-stone-900">{booking.bookingNumber}</p></div></div>
                <div className="flex items-start gap-3"><CalendarDays className="w-4 h-4 text-stone-400 mt-0.5" /><div><p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Created</p><p className="text-sm text-stone-900">{new Date(booking.createdAt).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div></div>
                <div className="flex items-start gap-3"><Clock className="w-4 h-4 text-stone-400 mt-0.5" /><div><p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Last Updated</p><p className="text-sm text-stone-900">{new Date(booking.updatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p></div></div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3"><Ticket className="w-4 h-4 text-stone-400 mt-0.5" /><div><p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Event Status</p><p className="text-sm text-stone-900">{booking.event?.status || '—'}</p></div></div>
                <div className="flex items-start gap-3"><Users className="w-4 h-4 text-stone-400 mt-0.5" /><div><p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Total Price (authoritative)</p><p className="text-sm font-mono font-semibold text-stone-900">${Number(booking.totalPrice).toFixed(2)}</p></div></div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Event" description="Linked event and schedule information">
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-stone-200/80 bg-[#faf8f5]/40">
                <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Event</p>
                <Link href={`/admin/events/${booking.event?.id}`} className="font-serif font-medium text-[#6c2432] hover:underline block mt-1">{booking.event?.title || 'Unknown Event'}</Link>
                <p className="text-xs text-stone-600 mt-1">{booking.event?.venue || ''} • {booking.event?.timeRange || ''}</p>
                <p className="text-xs text-stone-500 mt-1">{booking.event ? new Date(booking.event.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}</p>
                <Link href={`/admin/events/${booking.event?.id}`} className="mt-3 inline-flex text-xs text-[#6c2432] hover:underline">View Event →</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-stone-200/60 bg-white">
                  <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Schedule</p>
                  <p className="text-sm font-medium text-stone-900 mt-1">{booking.eventSchedule?.timeSlot || '—'}</p>
                  <p className="text-xs text-stone-600">{booking.eventSchedule?.activity || 'No activity'}</p>
                </div>
                <div className="p-3 rounded-lg border border-stone-200/60 bg-white">
                  <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Venue / Location</p>
                  <p className="text-sm text-stone-900 mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-stone-400" />{booking.event?.venue || '—'}</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Guest" description="Guest profile and CRM link">
            <div className="space-y-4">
              {booking.guestProfile ? (
                <div className="p-4 rounded-xl border border-stone-200/80 bg-[#faf8f5]/40">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#461822]/10 border border-[#461822]/20 flex items-center justify-center text-[#6c2432] font-serif font-medium text-sm">{booking.guestProfile.name?.charAt(0)?.toUpperCase() || 'G'}</div>
                    <div className="flex-1">
                      <p className="font-medium text-stone-900">{booking.guestProfile.name}</p>
                      <p className="text-[10px] uppercase font-mono text-stone-500">Guest Profile</p>
                    </div>
                    <Link href={`/admin/guests/${booking.guestProfile.id}`} className="text-xs font-medium text-[#6c2432] bg-white border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-50">View CRM</Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-stone-600"><Mail className="w-3.5 h-3.5 text-stone-400" />{booking.guestProfile.user?.email || 'No email'}</div>
                    <div className="flex items-center gap-2 text-sm text-stone-600"><Phone className="w-3.5 h-3.5 text-stone-400" />{booking.guestProfile.phone || 'No phone'}</div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-stone-500 italic">No guest profile linked</p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Tickets" description="Ticket type, quantity, unit price, line total (authoritative)">
            <div className="overflow-x-auto -mx-5 -my-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-100 bg-[#faf8f5]/60 text-stone-500 uppercase tracking-wider font-mono text-[10px]">
                    <th className="py-3 px-5">Ticket Type</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-5 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {booking.tickets.map((t) => {
                    const lineTotal = Number(t.unitPrice) * t.quantity;
                    return (
                      <tr key={t.id} className="hover:bg-stone-50/80">
                        <td className="py-3.5 px-5"><div className="font-medium text-stone-900">{t.ticketType?.name || 'Ticket'}</div><div className="text-[11px] text-stone-500 font-mono">Capacity: {t.ticketType?.capacity ?? '—'} • Sold: {t.ticketType?.soldCount ?? '—'} • Remaining: {t.ticketType ? Math.max(0, t.ticketType.capacity - t.ticketType.soldCount) : '—'}</div></td>
                        <td className="py-3.5 px-4 text-center text-stone-700">{t.quantity}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-stone-700">${Number(t.unitPrice).toFixed(2)}</td>
                        <td className="py-3.5 px-5 text-right font-mono font-semibold text-stone-900">${lineTotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-4 bg-[#faf8f5] border border-stone-200 rounded-xl flex items-center justify-between">
              <span className="text-sm font-medium text-stone-900">Authoritative Total</span>
              <span className="text-lg font-serif font-medium text-stone-900">${Number(booking.totalPrice).toFixed(2)}</span>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Capacity After Action" description="Real ticket availability from EventTicketType">
            <div className="space-y-3">
              {booking.tickets.map((t) => {
                const tt = t.ticketType;
                if (!tt) return null;
                const remaining = Math.max(0, tt.capacity - tt.soldCount);
                return (
                  <div key={t.id} className="p-3 rounded-lg border border-stone-200/60 bg-white">
                    <p className="text-xs font-medium text-stone-900">{tt.name}</p>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <div><span className="text-[10px] uppercase font-mono text-stone-500 block">Capacity</span><span className="font-mono font-medium">{tt.capacity}</span></div>
                      <div><span className="text-[10px] uppercase font-mono text-stone-500 block">Sold</span><span className="font-mono font-medium text-[#6c2432]">{tt.soldCount}</span></div>
                      <div><span className="text-[10px] uppercase font-mono text-stone-500 block">Remaining</span><span className="font-mono font-medium text-emerald-700">{remaining}</span></div>
                    </div>
                  </div>
                );
              })}
              <p className="text-[11px] text-stone-500 italic">Derived from real EventTicketType values. Updates after cancellation reflect database state.</p>
            </div>
          </SectionCard>

          <SectionCard title="Status History" description="Chronological status changes">
            <div className="space-y-0">
              {booking.statusHistory.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-4 text-center">No status changes recorded</p>
              ) : (
                booking.statusHistory.map((entry, idx) => (
                  <div key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {idx < booking.statusHistory.length - 1 && <div className="absolute left-[7px] top-5 bottom-0 w-px bg-stone-200" />}
                    <div className="w-3.5 h-3.5 rounded-full bg-[#461822]/10 border-2 border-[#461822]/30 shrink-0 mt-0.5 relative z-10" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-xs font-medium text-stone-900">{entry.fromStatus.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-stone-400">→</span>
                        <span className="text-xs font-medium text-stone-900">{entry.toStatus.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-stone-500">{new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {entry.changedBy && <span className="text-[10px] font-mono text-stone-400">by {entry.changedBy}</span>}
                      </div>
                      {entry.notes && <p className="text-[11px] text-stone-600 mt-1 italic">{entry.notes}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="Quick Actions" description="Operational shortcuts">
            <div className="space-y-2">
              <Link href={`/admin/events/${booking.event?.id || ''}`} className="flex items-center justify-between p-3 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs">
                <span className="font-medium text-stone-900">View Event</span><span className="text-stone-500">→</span>
              </Link>
              {booking.guestProfile?.id && (
                <Link href={`/admin/guests/${booking.guestProfile.id}`} className="flex items-center justify-between p-3 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs">
                  <span className="font-medium text-stone-900">View Guest CRM</span><span className="text-stone-500">→</span>
                </Link>
              )}
              <Link href="/admin/event-bookings" className="flex items-center justify-between p-3 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs">
                <span className="font-medium text-stone-900">Back to Event Bookings</span><span className="text-stone-500">→</span>
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
