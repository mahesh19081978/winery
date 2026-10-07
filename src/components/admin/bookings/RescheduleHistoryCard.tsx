'use client';

import React from 'react';
import { CalendarClock } from 'lucide-react';
import { SectionCard } from '@/components/admin/UIComponents';

export interface RescheduleHistoryEntry {
  id: string;
  fromSchedule: string;
  toSchedule: string;
  rescheduledBy?: string | null;
  reason?: string | null;
  createdAt: string;
}

interface RescheduleHistoryCardProps {
  title?: string;
  description?: string;
  entries: RescheduleHistoryEntry[];
  emptyMessage?: string;
}

export function RescheduleHistoryCard({
  title = 'Reschedule History',
  description = 'Audit trail of date and schedule modifications',
  entries,
  emptyMessage = 'No schedule changes recorded for this booking',
}: RescheduleHistoryCardProps) {
  if (!entries || entries.length === 0) {
    return (
      <SectionCard title={title} description={description}>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CalendarClock className="w-6 h-6 text-stone-300 mb-1.5" />
          <p className="text-xs text-stone-400 italic">{emptyMessage}</p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={title} description={description}>
      <div className="space-y-0">
        {entries.map((entry, idx) => (
          <div key={entry.id || idx} className="relative flex gap-3 pb-4 last:pb-0">
            {idx < entries.length - 1 && (
              <div className="absolute left-[7px] top-5 bottom-0 w-px bg-stone-200" />
            )}
            <div className="w-3.5 h-3.5 rounded-full bg-[#aa853e]/20 border-2 border-[#aa853e] shrink-0 mt-0.5 relative z-10" />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs font-medium text-stone-900 font-mono">
                  {entry.fromSchedule}
                </span>
                <span className="text-[10px] text-stone-400 font-mono">→</span>
                <span className="text-xs font-semibold text-[#6c2432] font-mono">
                  {entry.toSchedule}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono text-stone-500">
                  {new Date(entry.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {entry.rescheduledBy && (
                  <span className="text-[10px] font-mono text-stone-400">
                    by {entry.rescheduledBy}
                  </span>
                )}
              </div>
              {entry.reason && (
                <p className="text-[11px] text-stone-600 mt-1 italic bg-[#faf8f5] px-2.5 py-1 rounded border border-stone-200/60">
                  &ldquo;{entry.reason}&rdquo;
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
