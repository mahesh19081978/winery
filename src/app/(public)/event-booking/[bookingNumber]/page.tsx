'use client';

import React, { useState, useEffect } from 'react';
import { useGuest } from '@/context/GuestContext';
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
  CreditCard,
} from 'lucide-react';
import { useCallback } from 'react';
import { openRazorpayCheckout, type ClientPaymentDTO } from '@/lib/payment/razorpay-client';

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
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [payments, setPayments] = useState<ClientPaymentDTO[]>([]);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const { isAuthenticated } = useGuest();

  const fetchPayments = useCallback(async (bookingNum: string) => {
    try {
      const res = await fetch(`/api/payments/${bookingNum}?type=EVENT`);
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setPayments(json.data);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    if (!bookingNumber) return;
    let cancelled = false;
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/event-bookings/${bookingNumber}`);
        const result = await res.json();
        if (!cancelled) {
          if (!res.ok || !result.success) {
            setError(result.error || 'Booking not found');
          } else {
            setBooking(result.data);
            if (result.data.bookingNumber) {
              fetchPayments(result.data.bookingNumber);
            }
          }
        }
      } catch {
        if (!cancelled) setError('Failed to load booking');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchBooking();
    return () => { cancelled = true; };
  }, [bookingNumber, fetchPayments]);

  const handlePayNow = async () => {
    if (!booking) return;
    setIsPaying(true);
    setPaymentError(null);

    const title = booking.event.title || 'Special Event Booking';

    const result = await openRazorpayCheckout({
      bookingType: 'EVENT',
      bookingNumber: booking.bookingNumber,
      guestName: booking.guest.name || 'Guest',
      guestEmail: booking.guest.email || '',
      title,
      onSuccess: () => {
        setBooking((prev) => (prev ? { ...prev, status: 'CONFIRMED' } : prev));
        setActionNotice('Payment confirmed successfully via Razorpay! Your reservation is confirmed.');
        fetchPayments(booking.bookingNumber);
      },
      onFailure: (err) => {
        setPaymentError(err);
      },
      onDismiss: () => {
        setPaymentError('Payment window closed. Your reservation remains Pending.');
      },
    });

    if (result.success) {
      setBooking((prev) => (prev ? { ...prev, status: 'CONFIRMED' } : prev));
      fetchPayments(booking.bookingNumber);
    }
    setIsPaying(false);
  };

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
        {actionNotice && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              {actionNotice}
            </span>
            <button
              onClick={() => setActionNotice(null)}
              className="text-emerald-900 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Payment Pending Banner with Razorpay Checkout */}
        {booking.status === 'PENDING' && (
          <div className="mb-6 p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="font-semibold text-sm text-amber-950">Payment Pending</h3>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Your reservation is held, but online payment has not yet been completed. Pay now for immediate confirmation pass.
              </p>
              {paymentError && <p className="text-xs text-rose-600 font-medium pt-1">{paymentError}</p>}
            </div>
            <button
              type="button"
              disabled={isPaying}
              onClick={handlePayNow}
              className="shrink-0 px-6 py-3 rounded-full bg-[#8a3243] hover:bg-[#722937] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md inline-flex items-center gap-2 disabled:opacity-50"
            >
              {isPaying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Pay Now · ${Number(booking.totalPrice).toFixed(2)}</span>
                </>
              )}
            </button>
          </div>
        )}

        <div className="text-center mb-8">
          <span className="text-xs uppercase tracking-[0.3em] font-semibold text-[#8a3243] block mb-2">Event Booking {booking.status === 'PENDING' ? 'Summary' : 'Confirmation'}</span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#191c1f]">
            {booking.status === 'PENDING' ? 'Your reservation is pending payment' : 'Your reservation is confirmed'}
          </h1>
          <p className="text-sm text-[#525960] mt-2">Booking reference <span className="font-mono font-bold text-[#8a3243]">{booking.bookingNumber}</span></p>
        </div>

        <div className="bg-white border border-[#e6dece] rounded-3xl overflow-hidden shadow-xl">
          <div className="bg-[#2d1117] text-[#faf8f5] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#c5a059] block font-semibold mb-1">Digital Pass · VINORA</span>
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
              <p className="text-[10px] text-[#525960]">
                {booking.status === 'PENDING'
                  ? 'Payment pending. Complete online checkout using the button above or pay upon arrival if allowed.'
                  : payments.some((p) => p.status === 'PAID')
                  ? 'Paid in full via Razorpay online checkout.'
                  : 'Pay at estate on arrival. Authoritative total from server.'}
              </p>
            </div>

            {/* Payment Summary */}
            <div className="p-5 bg-white border border-[#e6dece] rounded-2xl text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#191c1f] flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#8a3243]" />
                  Payment Status
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  booking.status === 'CONFIRMED' && payments.some((p) => p.status === 'PAID')
                    ? 'bg-emerald-100 text-emerald-800'
                    : booking.status === 'PENDING'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-[#f4f0e8] text-[#525960]'
                }`}>
                  {payments.some((p) => p.status === 'PAID')
                    ? 'Paid via Razorpay'
                    : booking.status === 'PENDING'
                    ? 'Payment Pending'
                    : 'Pay at Estate Door'}
                </span>
              </div>
              {payments.filter((p) => p.status === 'PAID').map((p) => (
                <div key={p.id} className="pt-2 text-[11px] text-[#525960] flex flex-wrap items-center justify-between gap-2 border-t border-[#e6dece]/60">
                  <span>Paid: <strong>${p.amount} {p.currency}</strong></span>
                  {p.providerPaymentId && <span>Ref: <code className="font-mono text-[#8a3243] text-[10px]">{p.providerPaymentId}</code></span>}
                  <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
              {payments.length === 0 && (
                <p className="text-[11px] text-[#525960] leading-relaxed">
                  {booking.status === 'PENDING'
                    ? 'Online checkout pending. Use the button above to complete payment.'
                    : 'No online payment recorded. Settled at the estate entrance.'}
                </p>
              )}
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
            {isAuthenticated && (
              <div className="text-center pt-1">
                <Link href="/guest/profile" className="text-xs text-[#525960] underline hover:text-[#2d1117]">My Wine Journey Account</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
