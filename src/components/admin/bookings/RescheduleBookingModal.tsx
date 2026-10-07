'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CalendarDays,
  Clock,
  AlertCircle,
  Loader2,
  X,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

interface AvailableSlot {
  time: string;
  capacity: number;
  bookedGuests: number;
  remainingCapacity: number;
  isAvailable: boolean;
  reason?: string;
}

interface RescheduleBookingModalProps {
  bookingNumber: string;
  experienceSlug: string;
  experienceTitle: string;
  currentDate: string; // YYYY-MM-DD or ISO
  currentTime: string;
  totalGuests: number;
  timeZone?: string;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Formats a Date object to YYYY-MM-DD in the designated timezone
 */
function formatDateInTimezone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // en-CA gives YYYY-MM-DD
}

/**
 * Returns current minutes elapsed from midnight in the designated timezone
 */
function getMinutesForTimezone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  return hour * 60 + minute;
}

/**
 * Converts "10:00 AM", "2:30 PM", or "14:00" to minutes from midnight
 */
function parseSlotTimeToMinutes(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2] || '0', 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && h < 12) h += 12;
  if (meridiem === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

export function RescheduleBookingModal({
  bookingNumber,
  experienceSlug,
  experienceTitle,
  currentDate,
  currentTime,
  totalGuests,
  timeZone = 'America/Los_Angeles',
  onClose,
  onSuccess,
}: RescheduleBookingModalProps) {
  // Normalize current date to YYYY-MM-DD
  const normalizedCurrentDate = useMemo(() => {
    return currentDate.includes('T') ? currentDate.split('T')[0] : currentDate;
  }, [currentDate]);

  // Today in winery timezone
  const todayInWineryTz = useMemo(() => {
    return formatDateInTimezone(new Date(), timeZone);
  }, [timeZone]);

  // Generate selectable future dates (next 14 days starting today)
  const selectableDates = useMemo(() => {
    const dates: Array<{ iso: string; dayName: string; monthName: string; dayNum: number }> = [];
    const base = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
      const iso = formatDateInTimezone(d, timeZone);
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).formatToParts(d);

      const dayName = parts.find((p) => p.type === 'weekday')?.value || '';
      const monthName = parts.find((p) => p.type === 'month')?.value || '';
      const dayNum = parseInt(parts.find((p) => p.type === 'day')?.value || '1', 10);

      if (!dates.some((existing) => existing.iso === iso)) {
        dates.push({ iso, dayName, monthName, dayNum });
      }
    }
    return dates;
  }, [timeZone]);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to the first date in the future (or tomorrow if current booking is today)
    const nextDays = selectableDates.filter((d) => d.iso !== normalizedCurrentDate);
    return nextDays.length > 0 ? nextDays[0].iso : selectableDates[0]?.iso || '';
  });

  const [selectedTime, setSelectedTime] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch slots whenever selectedDate changes
  const fetchSlots = useCallback(async (date: string) => {
    if (!experienceSlug || !date) return;
    setLoadingSlots(true);
    setSlotsError(null);
    setSelectedTime('');

    try {
      const res = await fetch(`/api/availability?experience=${encodeURIComponent(experienceSlug)}&date=${date}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load slot availability');
      }

      const data = json.data;
      if (data.isClosed) {
        setSlotsError(`The winery is closed on this date (${data.closureReason || 'No availability'}).`);
        setAvailableSlots([]);
      } else {
        setAvailableSlots(data.availableSlots || []);
      }
    } catch (err) {
      setSlotsError(err instanceof Error ? err.message : 'Error fetching availability');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [experienceSlug]);

  useEffect(() => {
    if (selectedDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchSlots(selectedDate);
    }
  }, [selectedDate, fetchSlots]);

  // Check if current slot is selected
  const isSameSlot = selectedDate === normalizedCurrentDate && selectedTime === currentTime;

  // Check if target slot has elapsed (if selected date is today in winery timezone)
  const isSlotPast = useCallback((timeStr: string) => {
    if (selectedDate !== todayInWineryTz) return false;
    const nowMinutes = getMinutesForTimezone(new Date(), timeZone);
    const slotMinutes = parseSlotTimeToMinutes(timeStr);
    return slotMinutes <= nowMinutes;
  }, [selectedDate, todayInWineryTz, timeZone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      setSubmitError('Please select both a date and a time slot.');
      return;
    }

    if (isSameSlot) {
      setSubmitError('The selected time slot is already the current booking time.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/admin/bookings/${bookingNumber}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime,
          reason: reason.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to reschedule booking');
      }

      onSuccess();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An error occurred during rescheduling.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
      <div className="flex flex-col w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 bg-[#faf8f5] px-6 py-4 shrink-0">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#6c2432] font-semibold">
              Reschedule Experience
            </span>
            <h2 className="font-serif text-lg font-medium text-stone-900">
              {bookingNumber} &bull; {experienceTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Current Booking Overview Banner */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Current Reservation</p>
              <p className="text-sm font-medium text-stone-900 mt-0.5">
                {normalizedCurrentDate} at {currentTime}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Guests</p>
              <p className="text-sm font-semibold text-stone-900 mt-0.5">{totalGuests} guests</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Timezone</p>
              <p className="text-xs font-mono text-stone-600 mt-0.5">{timeZone}</p>
            </div>
          </div>

          {/* Invariant Guarantee Notice */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <p>
              <strong>Reservation Invariant:</strong> Guest party size ({totalGuests}), experience pricing, payments, and booking number remain completely unchanged.
            </p>
          </div>

          {/* Step 1: Select Date */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-stone-700 flex items-center gap-1.5 font-medium">
              <CalendarDays className="w-3.5 h-3.5 text-[#6c2432]" />
              1. Select Destination Date
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {selectableDates.map((item) => {
                const isSelected = selectedDate === item.iso;
                const isCurrent = item.iso === normalizedCurrentDate;

                return (
                  <button
                    key={item.iso}
                    type="button"
                    onClick={() => setSelectedDate(item.iso)}
                    className={`min-h-[58px] p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-[#2d1117] text-[#faf8f5] border-[#2d1117] shadow-xs'
                        : isCurrent
                        ? 'bg-[#faf8f5] border-amber-300 text-stone-900 ring-1 ring-amber-300'
                        : 'bg-white border-stone-200 text-stone-800 hover:border-[#6c2432]'
                    }`}
                  >
                    <span className={`text-[10px] uppercase font-mono font-medium ${isSelected ? 'text-[#c5a059]' : 'text-stone-500'}`}>
                      {item.dayName}
                    </span>
                    <span className="font-serif text-base font-bold my-0.5 leading-none">
                      {item.dayNum}
                    </span>
                    <span className={`text-[9px] uppercase font-mono ${isSelected ? 'text-stone-300' : 'text-stone-400'}`}>
                      {item.monthName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Time Slot */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-stone-700 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#6c2432]" />
              2. Select Available Session Time
            </label>

            {loadingSlots ? (
              <div className="py-8 flex flex-col items-center justify-center text-stone-500 gap-2 border border-dashed border-stone-200 rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin text-[#6c2432]" />
                <span className="text-xs font-mono">Checking live slot capacity...</span>
              </div>
            ) : slotsError ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>{slotsError}</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-stone-200">
                No sessions available for {selectedDate}. Please select another date.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {availableSlots.map((slot) => {
                  const isSelected = selectedTime === slot.time;
                  const isCurrent = selectedDate === normalizedCurrentDate && currentTime === slot.time;
                  const isPast = isSlotPast(slot.time);
                  const notEnoughCapacity = slot.remainingCapacity < totalGuests;
                  const isBlocked = !slot.isAvailable;
                  const isDisabled = isCurrent || isPast || notEnoughCapacity || isBlocked;

                  let badgeLabel = `${slot.remainingCapacity} seats left`;
                  if (isCurrent) badgeLabel = 'Current Slot';
                  else if (isPast) badgeLabel = 'Elapsed Time';
                  else if (slot.remainingCapacity === 0) badgeLabel = 'Sold Out';
                  else if (notEnoughCapacity) badgeLabel = `Need ${totalGuests} seats`;
                  else if (isBlocked) badgeLabel = slot.reason || 'Blocked';

                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`min-h-[64px] p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-between ${
                        isSelected
                          ? 'bg-[#6c2432] text-white border-[#6c2432] shadow-sm font-semibold'
                          : isDisabled
                          ? 'bg-stone-100/80 border-stone-200 text-stone-400 cursor-not-allowed opacity-75'
                          : 'bg-white border-stone-200/90 text-stone-800 hover:border-[#6c2432]'
                      }`}
                    >
                      <span className="text-xs font-medium font-mono">{slot.time}</span>
                      <span
                        className={`text-[9px] font-mono mt-1 ${
                          isSelected
                            ? 'text-[#c5a059]'
                            : isCurrent
                            ? 'text-amber-700 font-bold'
                            : isDisabled
                            ? 'text-stone-400'
                            : 'text-emerald-700 font-medium'
                        }`}
                      >
                        {badgeLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 3: Optional Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-stone-700 font-medium">
              3. Reschedule Reason / Staff Note (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Guest requested afternoon session via phone call"
              maxLength={1000}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
            />
          </div>

          {/* Submission Error Banner */}
          {submitError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p>{submitError}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-stone-100 bg-[#faf8f5] px-6 py-4 shrink-0">
          <div className="text-xs font-mono text-stone-500">
            {selectedDate && selectedTime ? (
              <span>Target: <strong className="text-stone-900">{selectedDate} @ {selectedTime}</strong></span>
            ) : (
              <span>Select date &amp; slot</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-[44px] px-4 py-2 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || !selectedDate || !selectedTime || isSameSlot}
              onClick={handleSubmit}
              className="min-h-[44px] px-5 py-2 text-xs font-semibold text-white bg-[#6c2432] hover:bg-[#461822] rounded-xl transition disabled:opacity-50 inline-flex items-center gap-2 shadow-xs"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm Reschedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
