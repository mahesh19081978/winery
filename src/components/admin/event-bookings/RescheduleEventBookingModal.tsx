'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  AlertCircle,
  Loader2,
  X,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { calculateEventStartBoundary } from '@/lib/events/timing';

interface EventScheduleOption {
  id: string;
  timeSlot: string;
  activity: string;
  sortOrder: number;
}

interface RescheduleEventBookingModalProps {
  bookingNumber: string;
  eventId: string;
  eventTitle: string;
  eventDate: string; // ISO string or YYYY-MM-DD
  currentScheduleId: string;
  currentTimeSlot: string;
  currentActivity?: string;
  totalTickets: number;
  timeZone?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RescheduleEventBookingModal({
  bookingNumber,
  eventId,
  eventTitle,
  eventDate,
  currentScheduleId,
  currentTimeSlot,
  currentActivity,
  totalTickets,
  timeZone = 'America/Los_Angeles',
  onClose,
  onSuccess,
}: RescheduleEventBookingModalProps) {
  const [schedules, setSchedules] = useState<EventScheduleOption[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentTimestamp(Date.now());
  }, []);

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch all schedules for this specific event
  useEffect(() => {
    let cancelled = false;

    async function loadEventSchedules() {
      setLoadingSchedules(true);
      setLoadError(null);

      try {
        const res = await fetch(`/api/admin/events/${eventId}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to load event schedules');
        }

        if (!cancelled) {
          const loaded = json.data?.schedules || [];
          setSchedules(loaded);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Error loading schedules');
        }
      } finally {
        if (!cancelled) {
          setLoadingSchedules(false);
        }
      }
    }

    void loadEventSchedules();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // Determine which schedules have already elapsed
  const evaluatedSchedules = useMemo(() => {
    return schedules.map((sched) => {
      let isElapsed = false;
      if (currentTimestamp > 0) {
        try {
          const startBoundary = calculateEventStartBoundary({
            eventDate,
            scheduleTimeSlot: sched.timeSlot,
            timeZone,
          });
          isElapsed = startBoundary.getTime() <= currentTimestamp;
        } catch {
          isElapsed = false;
        }
      }

      const isCurrent = sched.id === currentScheduleId;
      return {
        ...sched,
        isElapsed,
        isCurrent,
        isSelectable: !isElapsed && !isCurrent,
      };
    });
  }, [schedules, eventDate, timeZone, currentScheduleId, currentTimestamp]);

  const isSameSchedule = selectedScheduleId === currentScheduleId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedScheduleId) {
      setSubmitError('Please select a target schedule session.');
      return;
    }

    if (isSameSchedule) {
      setSubmitError('The selected schedule is already the assigned session for this booking.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/admin/event-bookings/${bookingNumber}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventScheduleId: selectedScheduleId,
          reason: reason.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to reschedule event booking');
      }

      onSuccess();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An error occurred during event rescheduling.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedOption = evaluatedSchedules.find((s) => s.id === selectedScheduleId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
      <div className="flex flex-col w-full max-w-xl max-h-[85vh] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 bg-[#faf8f5] px-6 py-4 shrink-0">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#6c2432] font-semibold">
              Reschedule Event Booking
            </span>
            <h2 className="font-serif text-lg font-medium text-stone-900">
              {bookingNumber} &bull; {eventTitle}
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
              <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Current Session</p>
              <p className="text-sm font-medium text-stone-900 mt-0.5 font-mono">
                {currentTimeSlot} {currentActivity ? `(${currentActivity})` : ''}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Tickets</p>
              <p className="text-sm font-semibold text-stone-900 mt-0.5">{totalTickets} ticket(s)</p>
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
              <strong>Event Schedule Rule:</strong> Rescheduling is only between schedules of this exact Event. Ticket quantities, tiers, pricing, and payment records remain completely untouched.
            </p>
          </div>

          {/* Schedule Sessions List */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-stone-700 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#6c2432]" />
              Select Alternative Event Schedule Session
            </label>

            {loadingSchedules ? (
              <div className="py-8 flex flex-col items-center justify-center text-stone-500 gap-2 border border-dashed border-stone-200 rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin text-[#6c2432]" />
                <span className="text-xs font-mono">Loading event schedules...</span>
              </div>
            ) : loadError ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>{loadError}</p>
              </div>
            ) : evaluatedSchedules.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-stone-200">
                No alternative schedules are configured for this event.
              </div>
            ) : (
              <div className="space-y-2">
                {evaluatedSchedules.map((sched) => {
                  const isSelected = selectedScheduleId === sched.id;
                  const isDisabled = !sched.isSelectable;

                  return (
                    <button
                      key={sched.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setSelectedScheduleId(sched.id)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#6c2432] text-white border-[#6c2432] shadow-sm'
                          : isDisabled
                          ? 'bg-stone-100/70 border-stone-200 text-stone-400 cursor-not-allowed opacity-75'
                          : 'bg-white border-stone-200/90 text-stone-800 hover:border-[#6c2432]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-semibold ${isSelected ? 'text-white' : 'text-stone-900'}`}>
                            {sched.timeSlot}
                          </span>
                          {sched.isCurrent && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Current Schedule
                            </span>
                          )}
                          {sched.isElapsed && !sched.isCurrent && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-200 text-stone-600">
                              Session Elapsed
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-1 truncate ${isSelected ? 'text-stone-200' : 'text-stone-600'}`}>
                          {sched.activity}
                        </p>
                      </div>

                      <div className="shrink-0 ml-3">
                        <span className={`text-[11px] font-mono font-medium ${isSelected ? 'text-[#c5a059]' : 'text-stone-400'}`}>
                          {isSelected ? 'Selected' : isDisabled ? 'Unavailable' : 'Available'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-stone-700 font-medium">
              Reschedule Reason / Staff Note (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Guest requested later schedule slot"
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
          <div className="text-xs font-mono text-stone-500 truncate max-w-[220px]">
            {selectedOption ? (
              <span>Target: <strong className="text-stone-900">{selectedOption.timeSlot}</strong></span>
            ) : (
              <span>Select alternative schedule</span>
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
              disabled={submitting || !selectedScheduleId || isSameSchedule}
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
