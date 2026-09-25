'use client';

import React, { useState, useEffect } from 'react';
import { useGuest } from '@/context/GuestContext';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import StatusBadge from '@/components/common/StatusBadge';
import EventCard from '@/components/events/EventCard';
import FAQ from '@/components/common/FAQ';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Music,
  Utensils,
  Wine,
  CheckCircle,
  Plus,
  Minus,
  Loader2,
  AlertCircle,
  User,
  Mail,
  Phone,
  CreditCard,
} from 'lucide-react';
import { openRazorpayCheckout } from '@/lib/payment/razorpay-client';

interface ApiTicketType {
  id: string;
  name: string;
  price: string | number;
  capacity: number;
  soldCount: number;
  eventId: string;
}
interface ApiSchedule {
  id: string;
  timeSlot: string;
  activity: string;
  sortOrder: number;
}
interface ApiEvent {
  id: string;
  wineryId: string;
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
  schedules: ApiSchedule[];
  faqs: { question: string; answer: string; sortOrder: number }[];
  ticketTypes: ApiTicketType[];
}

function formatEventDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}
function mapAvailabilityBadge(av: string): string {
  if (av === 'SOLD_OUT') return 'Sold Out';
  if (av === 'FEW_SEATS_LEFT') return 'Few Seats Left';
  return 'Available';
}
function isEventBookable(event: ApiEvent): { bookable: boolean; reason?: string } {
  if (event.isPast) return { bookable: false, reason: 'This event has already taken place.' };
  if (event.status === 'CANCELLED') return { bookable: false, reason: 'This event has been cancelled.' };
  if (event.status === 'COMPLETED') return { bookable: false, reason: 'This event is completed.' };
  if (event.availability === 'SOLD_OUT') {
    // Check if all ticket types sold out
    const allSoldOut = event.ticketTypes.length > 0 && event.ticketTypes.every((tt) => tt.soldCount >= tt.capacity);
    if (allSoldOut) return { bookable: false, reason: 'This event is sold out.' };
  }
  return { bookable: true };
}

export default function EventDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [allEvents, setAllEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking flow state
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({});
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [step, setStep] = useState<'schedule' | 'tickets' | 'guest' | 'review'>('schedule');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successBooking, setSuccessBooking] = useState<{ bookingNumber: string; totalPrice: string; status: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'PAY_ON_ARRIVAL'>('ONLINE');
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [pendingBookingNumber, setPendingBookingNumber] = useState<string | null>(null);

  // Authenticated guest prefill
  const { profile, isAuthenticated, isLoading: guestLoading } = useGuest();
  useEffect(() => {
    if (!guestLoading && isAuthenticated && profile) {
      if (!guestName && profile.name && profile.name !== 'Guest') setGuestName(profile.name);
      if (!guestEmail && profile.email) setGuestEmail(profile.email);
      if (!guestPhone && profile.phone) setGuestPhone(profile.phone);
    }
  }, [guestLoading, isAuthenticated, profile, guestName, guestEmail, guestPhone]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    async function fetchData() {
      try {
        setLoading(true);
        const [eventRes, listRes] = await Promise.all([
          fetch(`/api/events/${slug}`),
          fetch('/api/events'),
        ]);
        const eventResult = await eventRes.json();
        const listResult = await listRes.json();
        if (!cancelled) {
          if (!eventRes.ok || !eventResult.success) {
            setError(eventResult.error || 'Event not found');
          } else {
            setEvent(eventResult.data);
            if (eventResult.data?.schedules?.length > 0) {
              setSelectedScheduleId(eventResult.data.schedules[0].id);
            }
          }
          if (listRes.ok && listResult.success) {
            setAllEvents(listResult.data || []);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load event');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="w-full pt-20 pb-24 bg-[#faf8f5] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#8a3243] animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#525960]">Loading event details...</p>
        </div>
      </div>
    );
  }
  if (error || !event) {
    return (
      <div className="w-full pt-20 pb-24 bg-[#faf8f5] min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 text-center">
          <div className="bg-white border border-[#e6dece] rounded-3xl p-10 shadow-xl">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
            <h2 className="font-serif text-2xl text-[#191c1f] mb-2">Event Not Found</h2>
            <p className="text-sm text-[#525960] mb-6">{error || 'We could not locate this event.'}</p>
            <Link href="/events" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2d1117] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider hover:bg-[#461822] transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const bookable = isEventBookable(event);
  const relatedEvents = allEvents.filter((e) => e.id !== event.id).slice(0, 3);

  const selectedTicketsArray = Object.entries(ticketQuantities)
    .filter(([, qty]) => qty > 0)
    .map(([ticketTypeId, qty]) => {
      const tt = event.ticketTypes.find((t) => t.id === ticketTypeId);
      return { ticketTypeId, quantity: qty, ticketType: tt };
    });

  const hasTicketsSelected = selectedTicketsArray.length > 0;
  const displayTotal = selectedTicketsArray.reduce((sum, item) => {
    const price = item.ticketType ? Number(item.ticketType.price) : 0;
    return sum + price * item.quantity;
  }, 0);
  const hasValidGuest = guestName.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim());

  const isScheduleValid = !!selectedScheduleId;
  const canSubmit = isScheduleValid && hasTicketsSelected && hasValidGuest && !submitting && bookable.bookable;

  const handleQuantityChange = (ticketTypeId: string, delta: number) => {
    // Prevent duplicate selections handled by map; qty 0 means removed
    setTicketQuantities((prev) => {
      const current = prev[ticketTypeId] || 0;
      const next = Math.max(0, Math.min(30, current + delta));
      if (next === 0) {
        const { [ticketTypeId]: _omit, ...rest } = prev;
        void _omit;
        return rest;
      }
      return { ...prev, [ticketTypeId]: next };
    });
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    setFieldErrors({});
    setSubmitError(null);
    // Client validation UX only - server is authoritative
    const errors: Record<string, string> = {};
    if (!selectedScheduleId) errors.schedule = 'Please select a schedule.';
    if (!hasTicketsSelected) errors.tickets = 'Please select at least one ticket.';
    if (guestName.trim().length < 2) errors.guestName = 'Guest name must be at least 2 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) errors.guestEmail = 'Valid email is required.';
    // Check duplicate ticket selections already prevented by map
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.schedule) setStep('schedule');
      else if (errors.tickets) setStep('tickets');
      else if (errors.guestName || errors.guestEmail) setStep('guest');
      return;
    }

    setPaymentNotice(null);

    let targetBookingNumber = pendingBookingNumber;
    let targetTotalPrice = displayTotal.toFixed(2);

    // 1. Create booking in DB if not already created
    if (!targetBookingNumber) {
      const payload = {
        eventId: event.id,
        eventScheduleId: selectedScheduleId,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim() || undefined,
        paymentMethod,
        tickets: selectedTicketsArray.map((t) => ({
          eventTicketTypeId: t.ticketTypeId,
          quantity: t.quantity,
        })),
      };

      setSubmitting(true);
      try {
        const res = await fetch('/api/event-bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          const msg = result.error || 'Failed to create booking';
          if (res.status === 409 || msg.includes('Insufficient capacity') || msg.includes('no longer available')) {
            setSubmitError('Those tickets are no longer available in the selected quantity. Please review availability and try again.');
          } else {
            setSubmitError(msg);
          }
          setSubmitting(false);
          return;
        }

        const data = result.data as { bookingNumber: string; totalPrice: string; status: string };
        targetBookingNumber = data.bookingNumber;
        targetTotalPrice = data.totalPrice;
        setPendingBookingNumber(data.bookingNumber);

        if (paymentMethod === 'PAY_ON_ARRIVAL') {
          setSuccessBooking({ bookingNumber: data.bookingNumber, totalPrice: data.totalPrice, status: data.status });
          setSubmitting(false);
          return;
        }
      } catch {
        setSubmitError('Network error. Please check your connection and try again.');
        setSubmitting(false);
        return;
      }
    }

    if (!targetBookingNumber) {
      setSubmitting(false);
      return;
    }

    if (paymentMethod === 'PAY_ON_ARRIVAL') {
      setSuccessBooking({ bookingNumber: targetBookingNumber, totalPrice: targetTotalPrice, status: 'CONFIRMED' });
      setSubmitting(false);
      return;
    }

    // 2. Launch Razorpay Checkout
    setSubmitting(true);
    const checkoutResult = await openRazorpayCheckout({
      bookingType: 'EVENT',
      bookingNumber: targetBookingNumber,
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim(),
      guestPhone: guestPhone.trim() || undefined,
      title: event.title,
      onSuccess: () => {
        setSuccessBooking({
          bookingNumber: targetBookingNumber!,
          totalPrice: targetTotalPrice,
          status: 'CONFIRMED',
        });
      },
      onFailure: (err) => {
        setSubmitError(err);
      },
      onDismiss: () => {
        setPaymentNotice(
          'Your tickets are held as Pending. You can complete payment below, or choose to pay at the venue upon arrival.'
        );
      },
    });

    if (checkoutResult.success) {
      setSuccessBooking({
        bookingNumber: targetBookingNumber,
        totalPrice: targetTotalPrice,
        status: 'CONFIRMED',
      });
    }

    setSubmitting(false);
  };

  const selectedSchedule = event.schedules.find((s) => s.id === selectedScheduleId) || null;

  const scheduleStepDone = isScheduleValid;
  const ticketsStepDone = hasTicketsSelected;
  const guestStepDone = hasValidGuest;

  return (
    <div className="w-full pt-20">
      {/* Editorial Breadcrumb */}
      <div className="bg-[#faf8f5] border-b border-[#e6dece] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs">
          <Link href="/events" className="inline-flex items-center gap-1.5 text-[#525960] hover:text-[#2d1117] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Events Calendar</span>
          </Link>
          <StatusBadge status={mapAvailabilityBadge(event.availability)} />
        </div>
      </div>

      {/* Hero */}
      <section className="relative py-20 sm:py-28 bg-[#1e0c10] text-[#faf8f5] overflow-hidden">
        <Image src={event.featuredImage || 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=2000&q=85'} alt={event.title} fill priority sizes="100vw" className="object-cover opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wider text-[#c5a059] mb-4">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatEventDate(event.eventDate)}</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal text-[#faf8f5] mb-6 leading-tight">{event.title}</h1>
          <div className="flex flex-wrap items-center gap-6 text-sm text-[#e6dece]">
            <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-[#c5a059]" /><span>{event.timeRange}</span></div>
            <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[#c5a059]" /><span>{event.venue}</span></div>
          </div>
          {!bookable.bookable && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-900/50 border border-rose-800 text-xs text-[#e6dece]">
              <AlertCircle className="w-4 h-4 text-rose-300" />
              <span>{bookable.reason}</span>
            </div>
          )}
        </div>
      </section>

      {/* Main Details & Ticket Box */}
      <section className="py-16 sm:py-24 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Content */}
            <div className="lg:col-span-8 space-y-12">
              <div>
                <h3 className="font-serif text-2xl text-[#191c1f] mb-4">About the Gathering</h3>
                <p className="text-base text-[#525960] leading-relaxed">{event.description}</p>
              </div>

              {/* Schedule Overview */}
              <div className="p-8 bg-white border border-[#e6dece] rounded-3xl shadow-sm">
                <h3 className="font-serif text-xl text-[#191c1f] mb-6">Evening Program & Schedule</h3>
                <div className="space-y-4">
                  {event.schedules.map((slot) => (
                    <div key={slot.id} className="flex items-start gap-4 pb-3 border-b border-[#e6dece] last:border-none">
                      <span className="font-mono text-xs font-bold text-[#8a3243] uppercase tracking-wider w-20 shrink-0 mt-0.5">{slot.timeSlot}</span>
                      <span className="text-sm text-[#191c1f] font-medium">{slot.activity}</span>
                    </div>
                  ))}
                  {event.schedules.length === 0 && <p className="text-xs text-[#525960]">Schedule to be announced.</p>}
                </div>
              </div>

              {/* Wines & Menu Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-6 bg-white border border-[#e6dece] rounded-2xl space-y-4">
                  <div className="w-9 h-9 rounded-full bg-[#f4f0e8] text-[#8a3243] flex items-center justify-center"><Wine className="w-5 h-5" /></div>
                  <h4 className="font-serif text-lg text-[#191c1f] font-medium">Wines Poured</h4>
                  <ul className="space-y-2 text-xs sm:text-sm text-[#525960]">
                    {event.winesServed.length > 0 ? event.winesServed.map((wine, idx) => (
                      <li key={idx} className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#8a3243] mt-1.5 shrink-0" /><span>{wine}</span></li>
                    )) : <li className="text-xs text-[#525960]">Curated selection from the estate cellars.</li>}
                  </ul>
                </div>
                <div className="p-6 bg-white border border-[#e6dece] rounded-2xl space-y-4">
                  <div className="w-9 h-9 rounded-full bg-[#f4f0e8] text-[#8a3243] flex items-center justify-center"><Utensils className="w-5 h-5" /></div>
                  <h4 className="font-serif text-lg text-[#191c1f] font-medium">Culinary Menu</h4>
                  <ul className="space-y-2 text-xs sm:text-sm text-[#525960]">
                    {event.culinaryMenu.length > 0 ? event.culinaryMenu.map((dish, idx) => (
                      <li key={idx} className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#c5a059] mt-1.5 shrink-0" /><span>{dish}</span></li>
                    )) : <li className="text-xs text-[#525960]">Seasonal menu curated by the estate kitchen.</li>}
                  </ul>
                </div>
              </div>

              {event.entertainment && (
                <div className="p-6 bg-[#f4f0e8] border border-[#e6dece] rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white text-[#8a3243] flex items-center justify-center shadow-sm shrink-0"><Music className="w-6 h-6" /></div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#8a3243] font-semibold block">Live Performance</span>
                    <h4 className="font-serif text-lg text-[#191c1f] font-medium">{event.entertainment}</h4>
                  </div>
                </div>
              )}

              {event.faqs && event.faqs.length > 0 && <FAQ items={event.faqs.map((f) => ({ question: f.question, answer: f.answer }))} />}

              {event.galleryImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {event.galleryImages.slice(0, 3).map((img, idx) => (
                    <div key={idx} className="relative h-40 rounded-2xl overflow-hidden bg-[#f4f0e8]"><Image src={img} alt={`${event.title} gallery ${idx + 1}`} fill className="object-cover" sizes="(max-width:768px) 50vw, 33vw" /></div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Booking Card (Sticky) */}
            <div className="lg:col-span-4 sticky top-24">
              <div className="bg-white border border-[#e6dece] rounded-3xl p-6 sm:p-8 shadow-xl">
                {successBooking ? (
                  <div className="text-center py-6 space-y-5">
                    <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200"><CheckCircle className="w-7 h-7" /></div>
                    <div>
                      <h4 className="font-serif text-2xl text-[#191c1f]">Reservation Confirmed!</h4>
                      <p className="text-xs text-[#525960] leading-relaxed mt-2">Your booking <span className="font-mono font-bold text-[#8a3243]">{successBooking.bookingNumber}</span> is confirmed for {event.title}.</p>
                      <div className="mt-4 p-4 bg-[#faf8f5] rounded-2xl border border-[#e6dece] text-left text-xs space-y-2">
                        <div className="flex justify-between"><span className="text-[#525960]">Event</span><span className="font-medium text-[#191c1f] text-right">{event.title}</span></div>
                        {selectedSchedule && <div className="flex justify-between"><span className="text-[#525960]">Schedule</span><span className="font-medium text-[#191c1f]">{selectedSchedule.timeSlot} · {selectedSchedule.activity}</span></div>}
                        <div className="flex justify-between"><span className="text-[#525960]">Tickets</span><span className="font-medium text-[#191c1f]">{selectedTicketsArray.map((t) => `${t.ticketType?.name} × ${t.quantity}`).join(', ')}</span></div>
                        <div className="flex justify-between font-bold pt-2 border-t border-[#e6dece]"><span>Total</span><span className="text-[#8a3243]">${Number(successBooking.totalPrice).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-[#525960]">Status</span><span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] uppercase font-semibold">{successBooking.status}</span></div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link href={`/event-booking/${successBooking.bookingNumber}`} className="w-full py-3 rounded-full bg-[#2d1117] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider text-center hover:bg-[#461822] transition-colors">View Booking Details</Link>
                      <button type="button" onClick={() => setSuccessBooking(null)} className="text-xs text-[#8a3243] underline pt-1">Make another reservation</button>
                      {isAuthenticated && (
                        <Link href="/guest/profile" className="text-xs text-[#525960] underline text-center pt-0.5 hover:text-[#2d1117]">My Wine Journey Account</Link>
                      )}
                    </div>
                  </div>
                ) : !bookable.bookable ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200"><AlertCircle className="w-6 h-6" /></div>
                    <h4 className="font-serif text-xl text-[#191c1f]">Booking Unavailable</h4>
                    <p className="text-xs text-[#525960] leading-relaxed">{bookable.reason}</p>
                    <Link href="/events" className="inline-flex px-6 py-2.5 rounded-full bg-[#f4f0e8] text-xs font-semibold uppercase tracking-wider text-[#525960] border border-[#e6dece]">Explore Other Events</Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Progress indicator */}
                    <div className="flex items-center justify-between">
                      {(['schedule','tickets','guest','review'] as const).map((s, idx) => {
                        const active = step === s;
                        const done = (s === 'schedule' && scheduleStepDone && step !== 'schedule') || (s === 'tickets' && ticketsStepDone && step !== 'tickets') || (s === 'guest' && guestStepDone && step === 'review');
                        return (
                          <div key={s} className="flex items-center gap-1">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border ${active ? 'bg-[#2d1117] text-white border-[#2d1117]' : done ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-[#f4f0e8] text-[#525960] border-[#e6dece]'}`}>{done ? '✓' : idx + 1}</div>
                            {idx < 3 && <div className="w-6 sm:w-8 h-px bg-[#e6dece] mx-1" />}
                          </div>
                        );
                      })}
                    </div>

                    {submitError && (
                      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-medium text-rose-800">Booking could not be completed</p>
                          <p className="text-rose-700 mt-1 leading-relaxed">{submitError}</p>
                          {submitError.includes('no longer available') && <p className="text-rose-600 mt-2">Please review your ticket quantities and try again.</p>}
                        </div>
                      </div>
                    )}

                    {/* Step: Schedule */}
                    {step === 'schedule' && (
                      <div className="space-y-4">
                        <div>
                          <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#8a3243] block mb-1">Step 1 — Select Schedule</span>
                          <h3 className="font-serif text-lg font-medium text-[#191c1f]">Choose your time</h3>
                          <p className="text-[11px] text-[#525960] mt-1">Select an available schedule. Date: {formatEventDate(event.eventDate)}</p>
                        </div>
                        <div className="space-y-2">
                          {event.schedules.map((s) => {
                            const isSelected = selectedScheduleId === s.id;
                            return (
                              <button key={s.id} type="button" onClick={() => { setSelectedScheduleId(s.id); setFieldErrors((prev) => ({ ...prev, schedule: '' })); }} className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${isSelected ? 'border-[#8a3243] bg-[#f4f0e8]/60 shadow-sm' : 'border-[#e6dece] bg-white hover:border-[#c5a059]'}`}>
                                <div>
                                  <span className="font-mono text-xs font-bold text-[#8a3243] tracking-wider block">{s.timeSlot}</span>
                                  <span className="text-sm font-medium text-[#191c1f] mt-1 block">{s.activity}</span>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#8a3243] border-[#8a3243] text-white' : 'border-[#e6dece] bg-white'}`}>{isSelected && <CheckCircle className="w-3 h-3" />}</div>
                              </button>
                            );
                          })}
                        </div>
                        {fieldErrors.schedule && <p className="text-xs text-rose-600">{fieldErrors.schedule}</p>}
                        <button type="button" disabled={!isScheduleValid} onClick={() => setStep('tickets')} className="w-full py-3 rounded-full bg-[#2d1117] hover:bg-[#461822] disabled:opacity-40 text-[#faf8f5] text-xs font-bold uppercase tracking-[0.2em] transition-colors">Continue to Tickets</button>
                      </div>
                    )}

                    {/* Step: Tickets */}
                    {step === 'tickets' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#8a3243] block mb-1">Step 2 — Tickets</span>
                            <h3 className="font-serif text-lg font-medium text-[#191c1f]">Select quantity</h3>
                          </div>
                          <button type="button" onClick={() => setStep('schedule')} className="text-xs text-[#8a3243] underline">Back</button>
                        </div>
                        <div className="space-y-3">
                          {event.ticketTypes.map((tt) => {
                            const qty = ticketQuantities[tt.id] || 0;
                            const isSoldOut = tt.soldCount >= tt.capacity;
                            const priceNum = Number(tt.price);
                            return (
                              <div key={tt.id} className={`p-4 rounded-2xl border flex flex-col gap-3 ${isSoldOut ? 'bg-stone-50 border-stone-200 opacity-60' : qty > 0 ? 'bg-white border-[#8a3243] shadow-sm' : 'bg-[#faf8f5] border-[#e6dece]'}`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <span className="font-medium text-sm text-[#191c1f] block">{tt.name}</span>
                                    <span className="font-serif font-bold text-[#8a3243] text-base">${priceNum.toFixed(2)} <span className="text-xs font-normal text-[#525960]">/ ticket</span></span>
                                    {isSoldOut ? <span className="mt-1 inline-flex px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] uppercase font-semibold">Sold Out</span> : <span className="mt-1 inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] uppercase font-semibold">Available</span>}
                                  </div>
                                  {!isSoldOut && (
                                    <div className="flex items-center gap-2">
                                      <button type="button" disabled={qty <= 0} onClick={() => handleQuantityChange(tt.id, -1)} className="w-8 h-8 rounded-full bg-white border border-[#e6dece] flex items-center justify-center text-[#191c1f] hover:bg-[#e6dece] disabled:opacity-40"><Minus className="w-3.5 h-3.5" /></button>
                                      <span className="font-mono font-bold text-sm w-6 text-center">{qty}</span>
                                      <button type="button" disabled={qty >= 30} onClick={() => handleQuantityChange(tt.id, 1)} className="w-8 h-8 rounded-full bg-white border border-[#e6dece] flex items-center justify-center text-[#191c1f] hover:bg-[#e6dece] disabled:opacity-40"><Plus className="w-3.5 h-3.5" /></button>
                                    </div>
                                  )}
                                </div>
                                {qty > 0 && <div className="text-xs text-[#525960] flex justify-between pt-2 border-t border-[#e6dece]"><span>{qty} × ${priceNum.toFixed(2)}</span><span className="font-medium text-[#191c1f]">${(qty * priceNum).toFixed(2)}</span></div>}
                              </div>
                            );
                          })}
                        </div>
                        {fieldErrors.tickets && <p className="text-xs text-rose-600">{fieldErrors.tickets}</p>}
                        {/* Order summary display only (server authoritative) */}
                        <div className="p-4 bg-[#f4f0e8] rounded-2xl border border-[#e6dece] space-y-2">
                          <div className="flex justify-between text-xs text-[#525960]"><span>Selected tickets</span><span>{selectedTicketsArray.reduce((s, t) => s + t.quantity, 0)} guests</span></div>
                          <div className="flex justify-between text-sm font-bold text-[#191c1f] pt-2 border-t border-[#e6dece]"><span>Displayed total</span><span className="text-[#8a3243]">${displayTotal.toFixed(2)}</span></div>
                          <p className="text-[10px] text-[#525960] leading-relaxed">Total shown for display only. Final availability and price confirmed at booking.</p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setStep('guest')} disabled={!hasTicketsSelected} className="flex-1 py-3 rounded-full bg-[#2d1117] hover:bg-[#461822] disabled:opacity-40 text-[#faf8f5] text-xs font-bold uppercase tracking-[0.2em]">Continue</button>
                        </div>
                      </div>
                    )}

                    {/* Step: Guest */}
                    {step === 'guest' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#8a3243] block mb-1">Step 3 — Guest Information</span>
                            <h3 className="font-serif text-lg font-medium text-[#191c1f]">Your details</h3>
                          </div>
                          <button type="button" onClick={() => setStep('tickets')} className="text-xs text-[#8a3243] underline">Back</button>
                        </div>
                        {isAuthenticated && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                            <span className="font-semibold">VINORA Guest Member (Auto-Filled)</span>
                            <span className="text-emerald-600 ml-auto hidden sm:block">Fields pre-filled from your account</span>
                          </div>
                        )}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Full Name *</label>
                            <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Eleanor de Rêve" className="w-full bg-[#f4f0e8] border border-[#e6dece] rounded-xl px-4 py-3 text-sm text-[#191c1f] focus:outline-none focus:border-[#8a3243] focus:bg-white" />
                            {fieldErrors.guestName && <p className="text-xs text-rose-600 mt-1">{fieldErrors.guestName}</p>}
                          </div>
                          <div>
                            <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email *</label>
                            <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="eleanor@example.com" className="w-full bg-[#f4f0e8] border border-[#e6dece] rounded-xl px-4 py-3 text-sm text-[#191c1f] focus:outline-none focus:border-[#8a3243] focus:bg-white" />
                            {fieldErrors.guestEmail && <p className="text-xs text-rose-600 mt-1">{fieldErrors.guestEmail}</p>}
                          </div>
                          <div>
                            <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone (optional)</label>
                            <input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+1 (707) 000-0000" className="w-full bg-[#f4f0e8] border border-[#e6dece] rounded-xl px-4 py-3 text-sm text-[#191c1f] focus:outline-none focus:border-[#8a3243] focus:bg-white" />
                          </div>
                        </div>
                        <button type="button" onClick={() => setStep('review')} disabled={!hasValidGuest} className="w-full py-3 rounded-full bg-[#2d1117] hover:bg-[#461822] disabled:opacity-40 text-[#faf8f5] text-xs font-bold uppercase tracking-[0.2em]">Review Booking</button>
                      </div>
                    )}


                    {/* Step: Review */}
                    {step === 'review' && (
                      <div className="space-y-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#8a3243] block mb-1">Step 4 — Review</span>
                            <h3 className="font-serif text-lg font-medium text-[#191c1f]">Confirm your booking</h3>
                          </div>
                          <button type="button" onClick={() => setStep('guest')} className="text-xs text-[#8a3243] underline">Back</button>
                        </div>
                        <div className="p-5 bg-[#faf8f5] rounded-2xl border border-[#e6dece] space-y-4">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[#8a3243] font-semibold block">Event</span>
                            <span className="font-serif text-base font-medium text-[#191c1f]">{event.title}</span>
                            <span className="text-xs text-[#525960] block">{formatEventDate(event.eventDate)} · {event.timeRange} · {event.venue}</span>
                          </div>
                          <div className="pt-3 border-t border-[#e6dece]">
                            <span className="text-[10px] uppercase tracking-wider text-[#8a3243] font-semibold block">Schedule</span>
                            {selectedSchedule ? <span className="text-sm text-[#191c1f]">{selectedSchedule.timeSlot} — {selectedSchedule.activity}</span> : <span className="text-xs text-rose-600">No schedule selected</span>}
                          </div>
                          <div className="pt-3 border-t border-[#e6dece]">
                            <span className="text-[10px] uppercase tracking-wider text-[#8a3243] font-semibold block">Tickets</span>
                            <div className="mt-2 space-y-1.5">
                              {selectedTicketsArray.map((t) => (
                                <div key={t.ticketTypeId} className="flex justify-between text-xs">
                                  <span className="text-[#525960]">{t.ticketType?.name} × {t.quantity}</span>
                                  <span className="text-[#191c1f] font-medium">${(Number(t.ticketType?.price || 0) * t.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                              <div className="flex justify-between text-sm font-bold pt-2 border-t border-[#e6dece]"><span>Total (display)</span><span className="text-[#8a3243]">${displayTotal.toFixed(2)}</span></div>
                              <p className="text-[10px] text-[#525960]">Final availability and authoritative total confirmed on submission.</p>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-[#e6dece]">
                            <span className="text-[10px] uppercase tracking-wider text-[#8a3243] font-semibold block">Guest</span>
                            <span className="text-sm text-[#191c1f] block">{guestName}</span>
                            <span className="text-xs text-[#525960] block">{guestEmail}{guestPhone ? ` · ${guestPhone}` : ''}</span>
                          </div>
                        </div>

                        {/* Payment Method Selection */}
                        <div className="space-y-3">
                          <span className="text-xs uppercase tracking-wider font-semibold text-[#191c1f] block">
                            Select Payment Method
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div
                              onClick={() => {
                                setPaymentMethod('ONLINE');
                                setSubmitError(null);
                              }}
                              className={`cursor-pointer p-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                                paymentMethod === 'ONLINE'
                                  ? 'border-[#8a3243] bg-[#f4f0e8]/60 shadow-sm ring-1 ring-[#8a3243]/20'
                                  : 'border-[#e6dece] hover:border-[#c5a059] bg-white'
                              }`}
                            >
                              <div className="p-1.5 rounded-lg bg-white border border-[#e6dece] text-[#8a3243] shrink-0 mt-0.5">
                                <CreditCard className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#191c1f]">
                                    Pay Online
                                  </h4>
                                  <span className="px-1.5 py-0.2 rounded-full bg-[#8a3243]/10 text-[#8a3243] text-[8px] font-bold uppercase tracking-wider">
                                    Instant
                                  </span>
                                </div>
                                <p className="text-[10px] text-[#525960] mt-0.5 leading-relaxed">
                                  Razorpay (Cards, UPI, Netbanking).
                                </p>
                              </div>
                            </div>

                            <div
                              onClick={() => {
                                setPaymentMethod('PAY_ON_ARRIVAL');
                                setSubmitError(null);
                                setPaymentNotice(null);
                              }}
                              className={`cursor-pointer p-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                                paymentMethod === 'PAY_ON_ARRIVAL'
                                  ? 'border-[#8a3243] bg-[#f4f0e8]/60 shadow-sm ring-1 ring-[#8a3243]/20'
                                  : 'border-[#e6dece] hover:border-[#c5a059] bg-white'
                              }`}
                            >
                              <div className="p-1.5 rounded-lg bg-white border border-[#e6dece] text-[#525960] shrink-0 mt-0.5">
                                <Wine className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#191c1f]">
                                  Pay at Venue
                                </h4>
                                <p className="text-[10px] text-[#525960] mt-0.5 leading-relaxed">
                                  Settle upon arrival at event check-in.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Payment Notice / Retry Callout */}
                        {paymentNotice && (
                          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <p className="font-semibold text-amber-950 text-[11px]">Payment Action Required</p>
                              <p className="text-amber-800 text-[11px] leading-relaxed">{paymentNotice}</p>
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={!canSubmit || submitting}
                          onClick={handleSubmit}
                          className="w-full py-4 rounded-full bg-[#2d1117] hover:bg-[#461822] disabled:opacity-50 text-[#faf8f5] text-xs font-bold uppercase tracking-[0.2em] transition-all shadow-md inline-flex items-center justify-center gap-2"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : (
                            <span>
                              {paymentMethod === 'ONLINE'
                                ? `Pay with Razorpay · $${displayTotal.toFixed(2)}`
                                : 'Confirm Reservation'}
                            </span>
                          )}
                        </button>
                        <p className="text-[11px] text-[#525960] text-center leading-relaxed">
                          {paymentMethod === 'ONLINE'
                            ? 'Secure 256-bit encrypted gateway payment powered by Razorpay.'
                            : 'Reserve your tickets now. Settle balance at estate check-in.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Events */}
      {relatedEvents.length > 0 && (
        <section className="py-20 bg-[#f4f0e8] border-t border-[#e6dece]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-12">
              <div>
                <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8a3243] block mb-1">More Celebrations</span>
                <h3 className="font-serif text-2xl sm:text-3xl text-[#191c1f]">Upcoming Gatherings</h3>
              </div>
              <Link href="/events" className="text-xs font-semibold uppercase tracking-widest text-[#8a3243] hover:underline">View Calendar</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedEvents.slice(0, 3).map((evt) => {
                const priceNum = typeof evt.price === 'string' ? parseFloat(evt.price as string) : evt.price as number;
                const mapped = {
                  id: evt.id,
                  slug: evt.slug,
                  title: evt.title,
                  date: formatEventDate(evt.eventDate),
                  isoDate: typeof evt.eventDate === 'string' ? (evt.eventDate as string).split('T')[0] : new Date(evt.eventDate).toISOString().split('T')[0],
                  time: evt.timeRange,
                  venue: evt.venue,
                  price: priceNum,
                  shortDescription: evt.shortDescription,
                  description: '',
                  availability: mapAvailabilityBadge(evt.availability),
                  availableTickets: evt.ticketTypes.reduce((sum, tt) => sum + Math.max(0, tt.capacity - tt.soldCount), 0),
                  schedule: evt.schedules,
                  winesServed: [],
                  culinaryMenu: [],
                  entertainment: '',
                  gallery: [],
                  faqs: [],
                  image: evt.featuredImage || 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80',
                  isPast: evt.isPast,
                };
                return <EventCard key={evt.id} event={mapped as unknown as import('@/types').WineryEvent} />;
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
