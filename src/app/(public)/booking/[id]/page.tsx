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
  Download,
  CalendarPlus,
  XCircle,
  ArrowLeft,
  CheckCircle,
  Phone,
  Loader2,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import { useCallback } from 'react';
import { openRazorpayCheckout, type ClientPaymentDTO } from '@/lib/payment/razorpay-client';

interface ServerBooking {
  id: string;
  bookingNumber: string;
  status: string;
  date: string;
  time: string;
  adults: number;
  children: number;
  totalGuests: number;
  subtotal: number;
  taxAmount: number;
  totalPrice: number;
  specialRequests: string | null;
  guestProfile: { name: string; phone: string | null; user: { email: string } } | null;
  items: { title: string; experience: { title: string } | null }[];
}

function formatStatus(status: string): 'Confirmed' | 'Completed' | 'Cancelled' | 'Pending' {
  switch (status) {
    case 'CONFIRMED': return 'Confirmed';
    case 'COMPLETED': return 'Completed';
    case 'CANCELLED': return 'Cancelled';
    case 'PENDING': return 'Pending';
    default: return 'Confirmed';
  }
}

export default function BookingDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [booking, setBooking] = useState<ServerBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [payments, setPayments] = useState<ClientPaymentDTO[]>([]);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const fetchPayments = useCallback(async (bookingNum: string) => {
    try {
      const res = await fetch(`/api/payments/${bookingNum}?type=EXPERIENCE`);
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setPayments(json.data);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function fetchBooking() {
      try {
        const response = await fetch(`/api/bookings/${id}`);
        const result = await response.json();

        if (!cancelled) {
          if (!response.ok || !result.success) {
            setError(result.error || 'Booking not found');
          } else {
            setBooking(result.data);
            if (result.data.bookingNumber) {
              fetchPayments(result.data.bookingNumber);
            }
          }
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load booking details');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchBooking();
    return () => { cancelled = true; };
  }, [id, fetchPayments]);

  const handlePayNow = async () => {
    if (!booking) return;
    setIsPaying(true);
    setPaymentError(null);

    const title = booking.items?.[0]?.experience?.title || booking.items?.[0]?.title || 'Estate Experience';

    const result = await openRazorpayCheckout({
      bookingType: 'EXPERIENCE',
      bookingNumber: booking.bookingNumber,
      guestName: booking.guestProfile?.name || 'Guest',
      guestEmail: booking.guestProfile?.user?.email || '',
      guestPhone: booking.guestProfile?.phone || undefined,
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

  const handleCancel = async () => {
    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by guest' })
      });

      if (response.ok) {
        setBooking((prev) => prev ? { ...prev, status: 'CANCELLED' } : prev);
        setActionNotice('Your booking has been cancelled. A confirmation email was sent.');
      } else {
        const result = await response.json();
        setActionNotice(result.error || 'Failed to cancel booking');
      }
    } catch {
      setActionNotice('Network error. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="w-full pt-20 pb-24 bg-[#faf8f5]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 text-center">
          <Loader2 className="w-8 h-8 text-[#8a3243] animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#525960]">Loading your booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="w-full pt-20 pb-24 bg-[#faf8f5]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 text-center">
          <div className="bg-white border border-[#e6dece] rounded-3xl p-10 shadow-xl">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
            <h2 className="font-serif text-2xl text-[#191c1f] mb-2">Booking Not Found</h2>
            <p className="text-sm text-[#525960] mb-6">
              {error || 'We could not locate this booking. It may have been removed or the reference is incorrect.'}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2d1117] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider hover:bg-[#461822] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const experienceTitle = booking.items?.[0]?.experience?.title
    || booking.items?.[0]?.title
    || 'Estate Experience';
  const guestName = booking.guestProfile?.name || 'Guest';
  const guestEmail = booking.guestProfile?.user?.email || '';

  return (
    <div className="w-full pt-20 pb-24 bg-[#faf8f5]">
      {/* Editorial Breadcrumb */}
      <div className="bg-[#faf8f5] border-b border-[#e6dece] py-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[#525960] hover:text-[#2d1117] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
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

        {/* Digital Boarding Pass Ticket */}
        <div className="bg-white border border-[#e6dece] rounded-3xl overflow-hidden shadow-xl">
          {/* Ticket Header */}
          <div className="bg-[#2d1117] text-[#faf8f5] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#c5a059] block font-semibold mb-1">
                Digital Guest Pass · VINORA
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl text-[#faf8f5] font-normal">
                {experienceTitle}
              </h1>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase tracking-widest text-[#e6dece]/80 block">
                Booking Reference
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-[#c5a059]">
                {booking.bookingNumber}
              </span>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="p-6 sm:p-8 space-y-8">
            {/* QR Code Presentation */}
            <div className="flex flex-col sm:flex-row items-center gap-8 justify-center p-6 bg-[#faf8f5] rounded-2xl border border-dashed border-[#c5a059]/60">
              <QRCodePlaceholder
                code={booking.bookingNumber}
                size={150}
                label="Present at Reception"
              />
              <div className="space-y-3 text-xs sm:text-sm text-[#525960] max-w-xs text-center sm:text-left">
                <h4 className="font-serif text-lg font-medium text-[#191c1f]">
                  Arrival Instructions
                </h4>
                <p className="leading-relaxed">
                  Please arrive 10 minutes prior to your allocated time. The concierge desk is located inside the stone tasting salon.
                </p>
                <div className="pt-1 flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-[#8a3243]">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Estate Concierge: +1 (555) 392-8733</span>
                </div>
              </div>
            </div>

            {/* Itinerary Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-white border border-[#e6dece] rounded-2xl text-xs">
              <div>
                <span className="text-[#525960] block uppercase tracking-wider text-[10px] mb-1">
                  Date
                </span>
                <span className="font-semibold text-sm text-[#191c1f] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#8a3243]" />
                  {booking.date}
                </span>
              </div>
              <div>
                <span className="text-[#525960] block uppercase tracking-wider text-[10px] mb-1">
                  Time
                </span>
                <span className="font-semibold text-sm text-[#191c1f] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#8a3243]" />
                  {booking.time}
                </span>
              </div>
              <div>
                <span className="text-[#525960] block uppercase tracking-wider text-[10px] mb-1">
                  Party Size
                </span>
                <span className="font-semibold text-sm text-[#191c1f] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#8a3243]" />
                  {booking.totalGuests} Guests
                </span>
              </div>
              <div>
                <span className="text-[#525960] block uppercase tracking-wider text-[10px] mb-1">
                  Lead Guest
                </span>
                <span className="font-semibold text-sm text-[#191c1f] truncate block">
                  {guestName}
                </span>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-5 bg-[#faf8f5] rounded-2xl border border-[#e6dece] space-y-2 text-xs">
              <div className="flex justify-between text-[#525960]">
                <span>Subtotal</span>
                <span>${Number(booking.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#525960]">
                <span>Tax</span>
                <span>${Number(booking.taxAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#191c1f] pt-2 border-t border-[#e6dece]">
                <span>Total</span>
                <span className="text-[#8a3243] font-serif">${Number(booking.totalPrice).toFixed(2)}</span>
              </div>
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
                    : 'Pay at Cellar Door'}
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
                    : 'No online payment recorded. Settled at the estate cellar door.'}
                </p>
              )}
            </div>

            {/* Venue & Directions */}
            <div className="p-6 bg-[#faf8f5] rounded-2xl border border-[#e6dece] space-y-2">
              <h4 className="font-serif text-base text-[#191c1f] font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#8a3243]" />
                Location & Arrival Directions
              </h4>
              <p className="text-xs text-[#525960] leading-relaxed">
                4800 Terrasses du Rêve, Coteaux de l&apos;Est. Follow the cypress-lined avenue to the main stone courtyard. Valet parking and EV charging points are available directly ahead.
              </p>
              {booking.specialRequests && (
                <div className="pt-3 border-t border-[#e6dece] text-xs">
                  <span className="font-semibold text-[#191c1f]">Special Requests: </span>
                  <span className="text-[#525960]">{booking.specialRequests}</span>
                </div>
              )}
            </div>

            {/* Guest Info */}
            {guestEmail && (
              <div className="p-5 bg-white border border-[#e6dece] rounded-2xl text-xs">
                <span className="text-[#525960] block uppercase tracking-wider text-[10px] mb-2">Guest Information</span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[#525960]">Name: </span>
                    <span className="text-[#191c1f] font-medium">{guestName}</span>
                  </div>
                  <div>
                    <span className="text-[#525960]">Email: </span>
                    <span className="text-[#191c1f] font-medium">{guestEmail}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActionNotice('Calendar invite (.ics) generated.')}
                className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl border border-[#e6dece] hover:bg-[#f4f0e8] text-xs font-semibold uppercase tracking-wider text-[#2d1117] transition-colors"
              >
                <CalendarPlus className="w-4 h-4 text-[#8a3243]" />
                <span>Add to Calendar</span>
              </button>

              <button
                type="button"
                onClick={() => setActionNotice('Digital ticket PDF download started.')}
                className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl border border-[#e6dece] hover:bg-[#f4f0e8] text-xs font-semibold uppercase tracking-wider text-[#2d1117] transition-colors"
              >
                <Download className="w-4 h-4 text-[#8a3243]" />
                <span>Download Pass</span>
              </button>

              {booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl border border-rose-200 hover:bg-rose-50 text-xs font-semibold uppercase tracking-wider text-rose-700 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
