'use client';

import React, { useState } from 'react';
import { CheckCircle, UserCheck, CircleCheck, Ban, AlertTriangle, X } from 'lucide-react';

import { getExperienceTimingStatus } from '@/lib/events/timing';

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

interface StatusTransition {
  to: BookingStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  destructive?: boolean;
  description: string;
}

const VALID_TRANSITIONS: Record<BookingStatus, StatusTransition[]> = {
  PENDING: [
    { to: 'CONFIRMED', label: 'Confirm', icon: CheckCircle, color: 'bg-emerald-600 hover:bg-emerald-700', description: 'Confirm this reservation. The guest will be notified.' },
    { to: 'CANCELLED', label: 'Cancel', icon: Ban, color: 'bg-rose-600 hover:bg-rose-700', destructive: true, description: 'Cancel this reservation. This action cannot be undone.' },
  ],
  CONFIRMED: [
    { to: 'CHECKED_IN', label: 'Check In', icon: UserCheck, color: 'bg-sky-600 hover:bg-sky-700', description: 'Mark the guest as checked in upon arrival.' },
    { to: 'NO_SHOW', label: 'No Show', icon: AlertTriangle, color: 'bg-amber-600 hover:bg-amber-700', destructive: true, description: 'Mark as no-show. The guest did not arrive.' },
    { to: 'CANCELLED', label: 'Cancel', icon: Ban, color: 'bg-rose-600 hover:bg-rose-700', destructive: true, description: 'Cancel this reservation. This action cannot be undone.' },
  ],
  CHECKED_IN: [
    { to: 'COMPLETED', label: 'Complete', icon: CircleCheck, color: 'bg-emerald-600 hover:bg-emerald-700', description: 'Mark the experience as completed.' },
  ],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

interface BookingActionsClientProps {
  currentStatus: BookingStatus;
  bookingNumber: string;
  onStatusUpdated: () => void;
  bookingDate?: string | Date;
  bookingTime?: string;
  durationMinutes?: number;
  timeZone?: string | null;
  canReschedule?: boolean;
  onRescheduleClick?: () => void;
}

export function BookingActionsClient({
  currentStatus,
  bookingNumber,
  onStatusUpdated,
  bookingDate,
  bookingTime,
  durationMinutes,
  timeZone,
  canReschedule = false,
  onRescheduleClick,
}: BookingActionsClientProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedTransition, setSelectedTransition] = useState<StatusTransition | null>(null);
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  const transitions = VALID_TRANSITIONS[currentStatus] || [];

  if (transitions.length === 0) {
    return (
      <span className="text-[11px] font-mono text-stone-400 italic">
        {currentStatus === 'COMPLETED' ? 'Experience concluded' : 'No actions available'}
      </span>
    );
  }

  const handleActionClick = (transition: StatusTransition) => {
    setSelectedTransition(transition);
    setNotes('');
    setError('');
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (!selectedTransition) return;

    setIsUpdating(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/bookings/${bookingNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedTransition.to,
          notes: notes || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update status');
      }

      setShowConfirm(false);
      onStatusUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const timing = (bookingDate && bookingTime)
    ? getExperienceTimingStatus({
        bookingDate,
        bookingTime,
        durationMinutes: durationMinutes || 60,
        timeZone: timeZone || 'America/Los_Angeles',
      })
    : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {transitions.map((t) => {
          // Check operational timing constraints
          if (t.to === 'CHECKED_IN' && timing) {
            if (!timing.isCheckInAvailable) return null;
          }
          if (t.to === 'NO_SHOW' && timing) {
            if (!timing.isNoShowAvailable) return null;
          }
          if (t.to === 'COMPLETED' && timing) {
            if (!timing.isCompleteAvailable) return null;
          }

          const Icon = t.icon;
          return (
            <button
              key={t.to}
              type="button"
              onClick={() => handleActionClick(t)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-white rounded-md transition ${
                t.destructive
                  ? 'bg-rose-600 hover:bg-rose-700 border border-rose-700'
                  : 'bg-[#6c2432] hover:bg-[#461822] border border-[#461822]'
              }`}
            >
              <Icon className="w-3 h-3" />
              {t.label}
            </button>
          );
        })}

        {currentStatus === 'CONFIRMED' && canReschedule && onRescheduleClick && (
          <button
            type="button"
            onClick={onRescheduleClick}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-md transition shadow-2xs"
          >
            Reschedule
          </button>
        )}

        {/* Informational badges when actions are restricted by operational timing */}
        {currentStatus === 'CONFIRMED' && timing?.isBeforeStart && (
          <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
            Check-in opens at the scheduled experience time.
          </span>
        )}
        {currentStatus === 'CONFIRMED' && !timing?.isPastEnd && (
          <span className="text-[11px] font-medium text-stone-500 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-md">
            No-show can be marked after the experience ends.
          </span>
        )}
        {currentStatus === 'CHECKED_IN' && timing && !timing.isPastEnd && (
          <span className="text-[11px] font-medium text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-md">
            Completion available after the experience ends.
          </span>
        )}
      </div>

      {showConfirm && selectedTransition && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-[#faf8f5]">
              <h3 className="font-serif font-medium text-stone-900">
                {selectedTransition.destructive ? 'Confirm Action' : 'Update Status'}
              </h3>
              <button
                onClick={() => setShowConfirm(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className={`p-3 rounded-lg border ${
                selectedTransition.destructive
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <p className={`text-xs font-medium ${
                  selectedTransition.destructive ? 'text-rose-800' : 'text-emerald-800'
                }`}>
                  {selectedTransition.description}
                </p>
              </div>

              <div>
                <p className="text-xs text-stone-600 mb-1">
                  Booking: <span className="font-mono font-medium text-stone-900">{bookingNumber}</span>
                </p>
                <p className="text-xs text-stone-600">
                  Status: <span className="font-medium text-stone-900">{currentStatus.replace(/_/g, ' ')}</span>
                  {' → '}
                  <span className="font-medium text-stone-900">{selectedTransition.to.replace(/_/g, ' ')}</span>
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note about this status change..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] resize-none"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                  <p className="text-xs text-rose-700">{error}</p>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-stone-100 bg-[#faf8f5] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isUpdating}
                className="px-4 py-2 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isUpdating}
                className={`px-4 py-2 text-xs font-medium text-white rounded-lg transition disabled:opacity-50 ${
                  selectedTransition.destructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#6c2432] hover:bg-[#461822]'
                }`}
              >
                {isUpdating ? 'Updating...' : `Confirm ${selectedTransition.label}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
