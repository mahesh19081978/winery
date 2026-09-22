'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import QRCodePlaceholder from '@/components/booking/QRCodePlaceholder';
import StatusBadge from '@/components/common/StatusBadge';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  CheckCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface EventBookingDetail {
  bookingNumber: string;
  status: string;
  totalPrice: string;
  createdAt: string;
  updatedAt: string;
  event: { slug: string; title: string; eventDate: string; timeRange: string; venue: string; status: string };
  schedule: { timeSlot: string; activity: string };
  tickets: { quantity: number; unitPrice: string; ticketType: { name: string; price: string } | null }[];
  guest: { name: string; email: string };
  statusHistory: { fromStatus: string; toStatus: string; createdAt: string; notes: string | null }[];
}

function formatStatus(status: string): string {
  switch (status) {
    case 'CONFIRMED': return 'Confirmed';
    case 'PENDING': return 'Pending';
    case 'CANCELLED': return 'Cancelled';
    case 'COMPLETED': return 'Completed';
    case 'CHECKED_IN': return 'Checked In';
    case 'NO_SHOW': return 'No Show';
    default: return status;
  }
}
function formatDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); } catch { return dateStr; }
}

export default function EventBookingDetailPage() {
  const params = useParams();
  const bookingNumber = params?.bookingNumber as string;

  const [booking, setBooking] = useState<EventBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingNumber) return;
    let cancelled = false;
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/event-bookings/${bookingNumber}`);
        const result = await res.json();
        if (!cancelled) {
          if (!res.ok || !result.success) setError(result.error || 'Booking not found');
          else setBooking(result.data);
        }
      } catch {
        if (!cancelled) setError('Failed to load booking');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchBooking();
    return () => { cancelled = true; };
  }, [bookingNumber]);

  if (loading) {
    return (
      <div className="w-full pt-20 pb-24 bg-[#faf8f5] min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 text-center">
          <Loader2 className="w-8 h-8 text-[#8a3243] animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#525960]">Loading booking details...</p>
        </div>
      </div>
    );
  }
  if (error || !booking) {
    return (
      <div className="w-full pt-20 pb-24 bg-[#faf8f5] min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 text-center">
          <div className="bg-white border border-[#e6dece] rounded-3xl p-10 shadow-xl">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
            <h2 className="font-serif text-2xl text-[#191c1f] mb-2">Event Booking Not Found</h2>
            <p className="text-sm text-[#525960] mb-6">{error || 'We could not locate this booking number.'}</p>
            <Link href="/events" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2d1117] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider hover:bg-[#461822]"> <ArrowLeft className="w-4 h-4" /> Back to Events</Link>
          </div>
        </div>
      </div>
    );
  }

  const totalGuests = booking.tickets.reduce((s, t) => s + t.quantity, 0);

  return (
    <div className="w-full pt-20 pb-24 bg-[#faf8f5] min-h-screen">
      <div className="bg-[#faf8f5] border-b border-[#e6dece] py-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs">
          <Link href="/events" className="inline-flex items-center gap-1.5 text-[#525960] hover:text-[#2d1117]"><ArrowLeft className="w-4 h-4" /><span>Back to Events</span></Link>
          <StatusBadge status={formatStatus(booking.status)} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">
        <div className="text-center mb-8">
          <span className="text-xs uppercase tracking-[0.3em] font-semibold text-[#8a3243] block mb-2">Event Booking Confirmation</span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#191c1f]">Your reservation is confirmed</h1>
          <p className="text-sm text-[#525960] mt-2">Booking reference <span className="font-mono font-bold text-[#8a3243]">{booking.bookingNumber}</span></p>
        </div>

        <div className="bg-white border border-[#e6dece] rounded-3xl overflow-hidden shadow-xl">
          <div className="bg-[#2d1117] text-[#faf8f5] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#c5a059] block font-semibold mb-1">Digital Pass · Val de Rêve Estate</span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#faf8f5] font-normal">{booking.event.title}</h2>
              <p className="text-xs text-[#e6dece]/80 mt-1">{formatDate(booking.event.eventDate)} · {booking.event.timeRange}</p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase tracking-widest text-[#e6dece]/80 block">Booking Reference</span>
              <span className="font-mono text-sm sm:text-base font-bold text-[#c5a059]">{booking.bookingNumber}</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            <div className="flex flex-col sm:flex-row items-center gap-8 justify-center p-6 bg-[#faf8f5] rounded-2xl border border-dashed border-[#c5a059]/60">
              <QRCodePlaceholder code={booking.bookingNumber} size={150} label="Present at entrance" />
              <div className="space-y-3 text-xs sm:text-sm text-[#525960] max-w-xs text-center sm:text-left">
                <h4 className="font-serif text-lg font-medium text-[#191c1f]">Arrival Instructions</h4>
                <p className="leading-relaxed">Please present this digital pass at the estate entrance. Arrive 10 minutes prior to your schedule.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-white border border-[#e6dece] rounded-2xl text-xs">
              <div><span className="text-[#525960] block uppercase tracking-wider text-[10px] mb-1">Date</span><span className="font-semibold text-sm text-[#191c1f] flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[#8a3243]" />{formatDate(booking.event.eventDate)}</span></div>
              <div><span className="text-[#525960] block uppercase tracking-wider text-[10px] mb-1">Schedule</span><span className="font-semibold text-sm text-[#191c1f] flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[#8a3243]" />{booking.schedule.timeSlot}</span><span className="text-[11px] text-[#525960] block">{booking.schedule.activity}</span></div>
              <div><span className="text-[#525960] block uppercase tracking-wider text-[10px] mb-1">Venue</span><span className="font-semibold text-sm text-[#191c1f] flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#8a3243]" />{booking.event.venue}</span></div>
              <div><span className="text-[#525960] block uppercase tracking-wider text-[10px] mb-1">Guests</span><span className="font-semibold text-sm text-[#191c1f] flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-[#8a3243]" />{totalGuests} Guests</span></div>
            </div>

            <div className="p-5 bg-[#faf8f5] rounded-2xl border border-[#e6dece] space-y-2">
              <h4 className="font-serif text-sm font-medium text-[#191c1f] mb-3">Ticket Details</h4>
              {booking.tickets.map((t, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="text-[#525960]">{t.ticketType?.name || 'Ticket'} × {t.quantity}</span>
                  <span className="text-[#191c1f] font-medium">@ ${Number(t.unitPrice).toFixed(2)} → ${(Number(t.unitPrice) * t.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-base font-bold text-[#191c1f] pt-3 border-t border-[#e6dece]"><span>Total</span><span className="text-[#8a3243] font-serif">${Number(booking.totalPrice).toFixed(2)}</span></div>
              <p className="text-[10px] text-[#525960]">Payment not required now. Pay at estate on arrival. Authoritative total from server.</p>
            </div>

            <div className="p-5 bg-white border border-[#e6dece] rounded-2xl text-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><span className="text-[#525960] block uppercase tracking-wider text-[10px] mb-1">Guest Name</span><span className="font-medium text-[#191c1f]">{booking.guest.name}</span></div>
              <div><span className="text-[#525960] block uppercase tracking-wider text-[10px] mb-1">Email</span><span className="font-medium text-[#191c1f]">{booking.guest.email}</span></div>
              <div><span className="text-[#525960] block uppercase tracking-wider text-[10px] mb-1">Booking Date</span><span className="font-medium text-[#191c1f]">{new Date(booking.createdAt).toLocaleDateString()}</span></div>
              <div><span className="text-[#525960] block uppercase tracking-wider text-[10px] mb-1">Status</span><span className="inline-flex px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] uppercase font-semibold">{formatStatus(booking.status)}</span></div>
            </div>

            {booking.statusHistory.length > 0 && (
              <div className="p-5 bg-[#f4f0e8] rounded-2xl border border-[#e6dece]">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-3 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#8a3243]" /> Status History</h4>
                <div className="space-y-2">
                  {booking.statusHistory.map((h, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-white rounded-xl px-3 py-2 border border-[#e6dece]">
                      <span className="text-[#525960]">{h.fromStatus} → <span className="font-medium text-[#191c1f]">{h.toStatus}</span></span>
                      <span className="text-[11px] text-[#525960]">{new Date(h.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/events" className="flex-1 py-3 rounded-full bg-[#2d1117] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider text-center hover:bg-[#461822]">Explore More Events</Link>
              <Link href="/" className="flex-1 py-3 rounded-full border border-[#e6dece] text-xs font-semibold uppercase tracking-wider text-center hover:bg-[#f4f0e8]">Back to Home</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
