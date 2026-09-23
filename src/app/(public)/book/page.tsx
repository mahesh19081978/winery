'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useBooking } from '@/context/BookingContext';
import { mockExperiences } from '@/data/experiences';
import BookingStepper from '@/components/booking/BookingStepper';
import QRCodePlaceholder from '@/components/booking/QRCodePlaceholder';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  Wine,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  Loader2
} from 'lucide-react';

const STEPS = [
  'Experience',
  'Date',
  'Time',
  'Guests',
  'Details',
  'Review',
  'Confirmed'
];

const TIME_SLOTS = [
  '10:00 AM',
  '12:00 PM',
  '2:00 PM',
  '4:00 PM',
  '6:00 PM'
];

interface ServerBooking {
  id: string;
  bookingNumber: string;
  status: string;
  totalPrice: number;
  subtotal: number;
  taxAmount: number;
  date: string;
  time: string;
  adults: number;
  children: number;
  totalGuests: number;
  guestProfile?: { name: string; user?: { email: string } };
  items?: { title: string }[];
}

function BookingContent() {
  const searchParams = useSearchParams();
  const initialExpId = searchParams.get('experience') || mockExperiences[0].id;

  const {
    currentBooking,
    updateBooking,
    calculatePricing,
    getExperienceSlug
  } = useBooking();

  const [step, setStep] = useState(1);
  const [createdBooking, setCreatedBooking] = useState<ServerBooking | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedExp =
    mockExperiences.find((e) => e.id === currentBooking.experienceId) ||
    mockExperiences.find((e) => e.id === initialExpId) ||
    mockExperiences[0];

  const { basePrice, taxAmount, totalPrice } = calculatePricing();

  const availableDates = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    const iso = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    const dayNum = d.getDate();
    return { iso, dayName, monthName, dayNum };
  });

  const handleNext = async () => {
    if (step < 6) {
      setStep(step + 1);
    } else if (step === 6) {
      await handleSubmitBooking();
    }
  };

  const handleSubmitBooking = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const experienceSlug = getExperienceSlug();

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experienceSlug,
          date: currentBooking.date,
          time: currentBooking.time,
          adults: currentBooking.adults,
          children: currentBooking.children,
          guestName: currentBooking.guestName,
          guestEmail: currentBooking.guestEmail,
          guestPhone: currentBooking.guestPhone || '',
          specialRequests: currentBooking.specialRequests || '',
          dietaryRequirements: ''
        })
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.error || 'Failed to create booking. Please try again.';
        setSubmitError(errorMsg);
        return;
      }

      setCreatedBooking(result.data);
      setStep(7);
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step > 1 && step < 7) {
      setStep(step - 1);
      setSubmitError(null);
    }
  };

  const serverBookingNumber = createdBooking?.bookingNumber || createdBooking?.id;
  const serverTotal = createdBooking ? Number(createdBooking.totalPrice) : totalPrice;

  return (
    <div className="w-full pt-20 pb-24 bg-[#faf8f5]">
      {/* Header Banner */}
      <div className="py-12 text-center max-w-4xl mx-auto px-4">
        <span className="text-xs uppercase tracking-[0.3em] font-semibold text-[#8a3243] block mb-2">
          Reserve Your Visit
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-normal text-[#191c1f]">
          Experience VINORA
        </h1>
      </div>

      {/* Stepper Indicator */}
      <BookingStepper currentStep={step} steps={STEPS} />

      {/* Step Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-white border border-[#e6dece] rounded-3xl p-6 sm:p-10 shadow-xl">
          {/* STEP 1: CHOOSE EXPERIENCE */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl text-[#191c1f] mb-1">
                  Step 1 — Choose Your Experience
                </h2>
                <p className="text-xs sm:text-sm text-[#525960]">
                  Select the winery tasting flight, cellar exploration, or culinary experience you wish to enjoy.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockExperiences.map((exp) => {
                  const isSelected = currentBooking.experienceId === exp.id;
                  return (
                    <div
                      key={exp.id}
                      onClick={() => updateBooking({ experienceId: exp.id })}
                      className={`cursor-pointer p-5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#8a3243] bg-[#f4f0e8]/50 shadow-md ring-2 ring-[#8a3243]/20'
                          : 'border-[#e6dece] hover:border-[#c5a059] bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a3243]">
                            {exp.category}
                          </span>
                          <span className="font-serif font-bold text-lg text-[#191c1f]">
                            ${exp.price}{' '}
                            <span className="text-xs font-normal text-[#525960]">/ guest</span>
                          </span>
                        </div>
                        <h3 className="font-serif text-lg font-medium text-[#191c1f] mb-1">
                          {exp.title}
                        </h3>
                        <p className="text-xs text-[#525960] line-clamp-2 leading-relaxed mb-3">
                          {exp.shortDescription}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#e6dece] flex items-center justify-between text-xs text-[#525960]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {exp.duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <Wine className="w-3.5 h-3.5" /> {exp.winesCount} Wines
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: CHOOSE DATE */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl text-[#191c1f] mb-1">
                  Step 2 — Select Date
                </h2>
                <p className="text-xs sm:text-sm text-[#525960]">
                  Choose an upcoming date for your reservation at the estate. Past dates are unavailable.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                {availableDates.map((item) => {
                  const isSelected = currentBooking.date === item.iso;
                  return (
                    <button
                      key={item.iso}
                      type="button"
                      onClick={() => updateBooking({ date: item.iso })}
                      className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center ${
                        isSelected
                          ? 'bg-[#2d1117] text-[#faf8f5] border-[#2d1117] shadow-md ring-2 ring-[#c5a059]/40'
                          : 'bg-[#faf8f5] border-[#e6dece] text-[#191c1f] hover:border-[#8a3243]'
                      }`}
                    >
                      <span className={`text-[11px] uppercase tracking-wider font-semibold ${isSelected ? 'text-[#c5a059]' : 'text-[#8a3243]'}`}>
                        {item.dayName}
                      </span>
                      <span className="font-serif text-2xl font-bold my-1">
                        {item.dayNum}
                      </span>
                      <span className="text-[10px] uppercase text-[#525960]">
                        {item.monthName}
                      </span>
                    </button>
                  );
                })}
              </div>

              {currentBooking.date && (
                <div className="p-4 bg-[#f4f0e8] rounded-xl text-xs text-[#461822] flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#8a3243]" />
                  <span>Selected Date: <strong>{currentBooking.date}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: CHOOSE TIME */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl text-[#191c1f] mb-1">
                  Step 3 — Choose Time Slot
                </h2>
                <p className="text-xs sm:text-sm text-[#525960]">
                  Available tasting sessions for {selectedExp.title} on {currentBooking.date || 'your selected date'}.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {TIME_SLOTS.map((slot) => {
                  const isSelected = currentBooking.time === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => updateBooking({ time: slot })}
                      className={`py-5 px-4 rounded-2xl border text-center transition-all ${
                        isSelected
                          ? 'bg-[#2d1117] text-[#c5a059] border-[#2d1117] font-bold shadow-md ring-2 ring-[#c5a059]/30'
                          : 'bg-[#faf8f5] border-[#e6dece] text-[#191c1f] hover:border-[#8a3243]'
                      }`}
                    >
                      <Clock className="w-5 h-5 mx-auto mb-2 text-[#8a3243]" />
                      <span className="text-sm font-semibold tracking-wide block">
                        {slot}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-medium block mt-1">
                        Available
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: GUESTS */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl text-[#191c1f] mb-1">
                  Step 4 — Select Guest Party Size
                </h2>
                <p className="text-xs sm:text-sm text-[#525960]">
                  Please specify the number of guests in your party.
                </p>
              </div>

              <div className="space-y-4 max-w-md">
                {/* Adults */}
                <div className="p-5 bg-[#faf8f5] rounded-2xl border border-[#e6dece] flex items-center justify-between">
                  <div>
                    <h4 className="font-serif text-lg font-medium text-[#191c1f]">Adults (18+)</h4>
                    <p className="text-xs text-[#525960]">Includes full wine tasting flight</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={currentBooking.adults <= 1}
                      onClick={() => updateBooking({ adults: currentBooking.adults - 1 })}
                      className="w-9 h-9 rounded-full bg-white border border-[#e6dece] flex items-center justify-center text-[#191c1f] hover:bg-[#e6dece] disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-base w-4 text-center">
                      {currentBooking.adults}
                    </span>
                    <button
                      type="button"
                      disabled={currentBooking.adults >= 12}
                      onClick={() => updateBooking({ adults: currentBooking.adults + 1 })}
                      className="w-9 h-9 rounded-full bg-white border border-[#e6dece] flex items-center justify-center text-[#191c1f] hover:bg-[#e6dece] disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Children */}
                <div className="p-5 bg-[#faf8f5] rounded-2xl border border-[#e6dece] flex items-center justify-between">
                  <div>
                    <h4 className="font-serif text-lg font-medium text-[#191c1f]">Children (Under 18)</h4>
                    <p className="text-xs text-[#525960]">Estate cold-pressed grape juice & pastry</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={currentBooking.children <= 0}
                      onClick={() => updateBooking({ children: currentBooking.children - 1 })}
                      className="w-9 h-9 rounded-full bg-white border border-[#e6dece] flex items-center justify-center text-[#191c1f] hover:bg-[#e6dece] disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-base w-4 text-center">
                      {currentBooking.children}
                    </span>
                    <button
                      type="button"
                      disabled={currentBooking.children >= 8}
                      onClick={() => updateBooking({ children: currentBooking.children + 1 })}
                      className="w-9 h-9 rounded-full bg-white border border-[#e6dece] flex items-center justify-center text-[#191c1f] hover:bg-[#e6dece] disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: GUEST DETAILS */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl text-[#191c1f] mb-1">
                  Step 5 — Guest Contact & Preferences
                </h2>
                <p className="text-xs sm:text-sm text-[#525960]">
                  Where should we send your booking confirmation and digital arrival pass?
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={currentBooking.guestName}
                    onChange={(e) => updateBooking({ guestName: e.target.value })}
                    className="w-full bg-[#f4f0e8] border border-[#e6dece] rounded-xl px-4 py-3 text-sm text-[#191c1f] focus:outline-none focus:border-[#8a3243] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={currentBooking.guestEmail}
                      onChange={(e) => updateBooking({ guestEmail: e.target.value })}
                      className="w-full bg-[#f4f0e8] border border-[#e6dece] rounded-xl px-4 py-3 text-sm text-[#191c1f] focus:outline-none focus:border-[#8a3243] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={currentBooking.guestPhone}
                      onChange={(e) => updateBooking({ guestPhone: e.target.value })}
                      className="w-full bg-[#f4f0e8] border border-[#e6dece] rounded-xl px-4 py-3 text-sm text-[#191c1f] focus:outline-none focus:border-[#8a3243] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1">
                    Special Requests or Dietary Requirements (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={currentBooking.specialRequests}
                    onChange={(e) => updateBooking({ specialRequests: e.target.value })}
                    placeholder="Celebration details (anniversary, birthday), allergies, quiet seating preference..."
                    className="w-full bg-[#f4f0e8] border border-[#e6dece] rounded-xl px-4 py-3 text-sm text-[#191c1f] focus:outline-none focus:border-[#8a3243] focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW & SUMMARY */}
          {step === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl text-[#191c1f] mb-1">
                  Step 6 — Review Reservation
                </h2>
                <p className="text-xs sm:text-sm text-[#525960]">
                  Please review the details of your upcoming visit before finalizing.
                </p>
              </div>

              {submitError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-rose-800">Booking Failed</p>
                    <p className="text-xs text-rose-700 mt-1">{submitError}</p>
                    <p className="text-xs text-rose-600 mt-2">
                      Please go back, adjust your selection, and try again.
                    </p>
                  </div>
                </div>
              )}

              <div className="p-6 bg-[#faf8f5] rounded-3xl border border-[#e6dece] space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-[#e6dece]">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#8a3243] font-semibold block">
                      Experience
                    </span>
                    <h3 className="font-serif text-xl text-[#191c1f] font-medium">
                      {selectedExp.title}
                    </h3>
                  </div>
                  <span className="font-serif text-xl font-bold text-[#8a3243]">
                    ${selectedExp.price} / adult
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 text-xs">
                  <div>
                    <span className="text-[#525960] block uppercase tracking-wider text-[10px]">
                      Date
                    </span>
                    <strong className="text-[#191c1f] text-sm">
                      {currentBooking.date}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#525960] block uppercase tracking-wider text-[10px]">
                      Time
                    </span>
                    <strong className="text-[#191c1f] text-sm">
                      {currentBooking.time}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#525960] block uppercase tracking-wider text-[10px]">
                      Party Size
                    </span>
                    <strong className="text-[#191c1f] text-sm">
                      {currentBooking.adults} Adults
                      {currentBooking.children > 0 && `, ${currentBooking.children} Children`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#525960] block uppercase tracking-wider text-[10px]">
                      Guest Name
                    </span>
                    <strong className="text-[#191c1f] text-sm">
                      {currentBooking.guestName}
                    </strong>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="pt-4 border-t border-[#e6dece] space-y-2 text-xs text-[#525960]">
                  <div className="flex justify-between">
                    <span>Base Reservation ({currentBooking.adults} Adults)</span>
                    <span>${basePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Regional Hospitality Tax (9%)</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-[#191c1f] pt-2 border-t border-[#e6dece]">
                    <span>Total Due</span>
                    <span className="text-[#8a3243]">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-800">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>
                  No payment required now. Pay directly at the estate cellar door upon arrival.
                </span>
              </div>
            </div>
          )}

          {/* STEP 7: CONFIRMATION */}
          {step === 7 && createdBooking && (
            <div className="text-center py-6 space-y-8 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs uppercase tracking-[0.3em] font-bold text-[#8a3243] block mb-1">
                  Reservation Confirmed
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-[#191c1f]">
                  We look forward to welcoming you.
                </h2>
                <p className="text-xs sm:text-sm text-[#525960] mt-2">
                  A confirmation summary has been delivered to <strong>{currentBooking.guestEmail}</strong>.
                </p>
              </div>

              {/* Digital Pass Card */}
              <div className="max-w-md mx-auto bg-[#faf8f5] border border-[#e6dece] rounded-3xl p-6 shadow-md text-left">
                <div className="flex items-center justify-between pb-4 border-b border-[#e6dece]">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#8a3243] font-bold block">
                      Booking Pass
                    </span>
                    <h4 className="font-serif text-lg font-medium text-[#191c1f]">
                      {selectedExp.title}
                    </h4>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#8a3243]">
                    {serverBookingNumber}
                  </span>
                </div>

                <div className="my-6">
                  <QRCodePlaceholder
                    code={serverBookingNumber || ''}
                    size={160}
                    label="Show this digital pass at the Estate Lounge check-in"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-[#525960] pt-4 border-t border-[#e6dece]">
                  <div>
                    <span>Date:</span>
                    <strong className="block text-[#191c1f]">
                      {createdBooking.date}
                    </strong>
                  </div>
                  <div>
                    <span>Time:</span>
                    <strong className="block text-[#191c1f]">
                      {createdBooking.time}
                    </strong>
                  </div>
                  <div>
                    <span>Guests:</span>
                    <strong className="block text-[#191c1f]">
                      {createdBooking.totalGuests} Guests
                    </strong>
                  </div>
                  <div>
                    <span>Total:</span>
                    <strong className="block text-[#8a3243] font-serif font-bold">
                      ${serverTotal.toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Post-confirmation Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Link
                  href={`/booking/${serverBookingNumber}`}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider transition-colors shadow-md"
                >
                  View My Booking Ticket
                </Link>
                <Link
                  href="/"
                  className="w-full sm:w-auto px-6 py-3.5 text-xs text-[#525960] hover:text-[#191c1f] transition-colors"
                >
                  Back to Winery Home
                </Link>
              </div>
            </div>
          )}

          {/* Stepper Bottom Controls (Steps 1 to 6) */}
          {step < 7 && (
            <div className="pt-8 mt-8 border-t border-[#e6dece] flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-[#e6dece] text-xs font-semibold uppercase tracking-wider text-[#525960] hover:bg-[#f4f0e8] transition-colors disabled:opacity-50"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] text-xs font-semibold uppercase tracking-widest transition-all shadow-md disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{step === 6 ? 'Confirm Reservation' : 'Continue'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-32 pb-24 text-center">Loading reservation engine...</div>}>
      <BookingContent />
    </Suspense>
  );
}
