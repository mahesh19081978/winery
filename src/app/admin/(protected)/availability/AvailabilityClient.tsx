'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Ban,
} from 'lucide-react';
import { SectionCard, StatusBadge } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AvailabilityRule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotInterval: number;
  capacity: number;
  isActive: boolean;
  experience: { id: string; title: string; slug: string } | null;
}

interface TimeSlotOverride {
  id: string;
  date: string;
  time: string;
  capacity: number;
  isBlocked: boolean;
  reason: string | null;
  experience: { id: string; title: string; slug: string };
}

interface WineryClosure {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
}

interface ScheduleBooking {
  date: string;
  time: string;
  totalGuests: number;
  bookingNumber: string;
  status: string;
  guestProfile: { name: string } | null;
  items: { experienceId: string; title: string }[];
}

interface ScheduleExperience {
  id: string;
  title: string;
  slug: string;
  capacity: number;
}

interface ScheduleData {
  experiences: ScheduleExperience[];
  bookings: ScheduleBooking[];
  closures: WineryClosure[];
}

type TabType = 'rules' | 'overrides' | 'closures' | 'schedule';

export function AvailabilityClient() {
  const [activeTab, setActiveTab] = useState<TabType>('schedule');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [overrides, setOverrides] = useState<TimeSlotOverride[]>([]);
  const [closures, setClosures] = useState<WineryClosure[]>([]);
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [scheduleWeekStart, setScheduleWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (activeTab === 'schedule') {
          const start = new Date(scheduleWeekStart);
          const end = new Date(start);
          end.setDate(end.getDate() + 6);
          const response = await fetch(
            `/api/admin/availability?view=schedule&startDate=${scheduleWeekStart}&endDate=${end.toISOString().split('T')[0]}`
          );
          const result = await response.json();
          if (!cancelled) {
            if (!response.ok) throw new Error(result.error || 'Failed to fetch schedule');
            setSchedule(result.data);
          }
        } else {
          const response = await fetch('/api/admin/availability');
          const result = await response.json();
          if (!cancelled) {
            if (!response.ok) throw new Error(result.error || 'Failed to fetch availability');
            setRules(result.data.rules);
            setOverrides(result.data.overrides);
            setClosures(result.data.closures);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activeTab, scheduleWeekStart]);

  const handlePrevWeek = () => {
    const d = new Date(scheduleWeekStart);
    d.setDate(d.getDate() - 7);
    setScheduleWeekStart(d.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(scheduleWeekStart);
    d.setDate(d.getDate() + 7);
    setScheduleWeekStart(d.toISOString().split('T')[0]);
  };

  const getWeekDays = () => {
    const start = new Date(scheduleWeekStart);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  };

  const tabs: { key: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'schedule', label: 'Schedule', icon: Calendar },
    { key: 'rules', label: 'Rules', icon: Clock },
    { key: 'overrides', label: 'Overrides', icon: Users },
    { key: 'closures', label: 'Closures', icon: Ban },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
              VINORA • Estate Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium mt-1">
            Availability
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Manage time slots, capacity rules, and winery closures
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md transition ${
                activeTab === tab.key
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-6 h-6 text-[#6c2432] animate-spin" />
          <p className="text-xs text-stone-500 font-mono">Loading availability data...</p>
        </div>
      ) : (
        <>
          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <SectionCard
              title="Weekly Schedule"
              description="Booking capacity and slot availability by day"
              action={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevWeek}
                    className="p-1.5 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono text-stone-600">
                    {new Date(scheduleWeekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' – '}
                    {new Date(new Date(scheduleWeekStart).getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextWeek}
                    className="p-1.5 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              }
            >
              {!schedule || schedule.experiences.length === 0 ? (
                <EmptyState
                  title="No availability configured"
                  description="No active experiences or availability rules found. Configure experiences and availability rules to see the schedule."
                />
              ) : (
                <div className="space-y-4">
                  {schedule.experiences.map((exp) => {
                    const dayBookings = schedule.bookings.filter(
                      (b) => b.items.some((item) => item.experienceId === exp.id)
                    );

                    return (
                      <div key={exp.id} className="border border-stone-200/80 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-[#faf8f5] border-b border-stone-200/80">
                          <h3 className="font-serif font-medium text-sm text-stone-900">{exp.title}</h3>
                          <p className="text-[10px] font-mono text-stone-500">Capacity: {exp.capacity} guests per slot</p>
                        </div>

                        <div className="grid grid-cols-7 divide-x divide-stone-100">
                          {getWeekDays().map((dateStr) => {
                            const date = new Date(dateStr + 'T12:00:00');
                            const isClosed = schedule.closures.some(
                              (c) => dateStr >= c.startDate && dateStr <= c.endDate
                            );
                            const dayBookingCount = dayBookings.filter((b) => b.date === dateStr).length;
                            const dayGuests = dayBookings
                              .filter((b) => b.date === dateStr)
                              .reduce((sum, b) => sum + b.totalGuests, 0);

                            return (
                              <div key={dateStr} className="p-2 text-center min-h-[80px]">
                                <p className="text-[10px] font-mono text-stone-500 uppercase">
                                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                </p>
                                <p className="text-xs font-medium text-stone-900">
                                  {date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                                </p>
                                {isClosed ? (
                                  <div className="mt-1">
                                    <StatusBadge status="CLOSED" size="sm" />
                                  </div>
                                ) : (
                                  <div className="mt-1 space-y-0.5">
                                    <p className="text-[10px] font-mono text-stone-600">
                                      {dayBookingCount} booking{dayBookingCount !== 1 ? 's' : ''}
                                    </p>
                                    <p className="text-[10px] font-mono text-stone-500">
                                      {dayGuests} guest{dayGuests !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Daily booking details */}
                        <div className="border-t border-stone-100 px-4 py-3">
                          {dayBookings.length === 0 ? (
                            <p className="text-xs text-stone-400 italic">No bookings this week</p>
                          ) : (
                            <div className="space-y-1.5">
                              {dayBookings.slice(0, 5).map((booking, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-xs">
                                  <span className="font-mono text-stone-500 w-16">
                                    {new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                  <span className="font-mono text-stone-600">{booking.time}</span>
                                  <span className="text-stone-900 font-medium">
                                    {booking.guestProfile?.name || 'Guest'}
                                  </span>
                                  <span className="text-stone-500">
                                    ({booking.totalGuests} pax)
                                  </span>
                                  <StatusBadge status={booking.status} size="sm" />
                                </div>
                              ))}
                              {dayBookings.length > 5 && (
                                <p className="text-[10px] text-stone-400">
                                  +{dayBookings.length - 5} more bookings
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          )}

          {/* Rules Tab */}
          {activeTab === 'rules' && (
            <SectionCard title="Availability Rules" description="Time slot rules by day of week and experience">
              {rules.length === 0 ? (
                <EmptyState
                  title="No availability rules"
                  description="No availability rules have been configured. Rules define the time slots, capacity, and intervals for each day of the week."
                />
              ) : (
                <div className="overflow-x-auto -mx-5 -my-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-stone-100 bg-[#faf8f5]/60 text-stone-500 uppercase tracking-wider font-mono text-[10px]">
                        <th className="py-3 px-5">Day</th>
                        <th className="py-3 px-4">Experience</th>
                        <th className="py-3 px-4 text-center">Start</th>
                        <th className="py-3 px-4 text-center">End</th>
                        <th className="py-3 px-4 text-center">Interval</th>
                        <th className="py-3 px-4 text-center">Capacity</th>
                        <th className="py-3 px-5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {rules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="py-3.5 px-5 font-medium text-stone-900">{DAY_NAMES[rule.dayOfWeek]}</td>
                          <td className="py-3.5 px-4 font-serif text-stone-800">
                            {rule.experience?.title || 'Global (All Experiences)'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-stone-700">{rule.startTime}</td>
                          <td className="py-3.5 px-4 text-center font-mono text-stone-700">{rule.endTime}</td>
                          <td className="py-3.5 px-4 text-center font-mono text-stone-700">{rule.slotInterval}min</td>
                          <td className="py-3.5 px-4 text-center font-mono font-medium text-stone-900">{rule.capacity}</td>
                          <td className="py-3.5 px-5 text-center">
                            <StatusBadge status={rule.isActive ? 'ACTIVE' : 'INACTIVE'} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          )}

          {/* Overrides Tab */}
          {activeTab === 'overrides' && (
            <SectionCard title="Time Slot Overrides" description="Date-specific capacity adjustments and blocked slots">
              {overrides.length === 0 ? (
                <EmptyState
                  title="No time slot overrides"
                  description="No overrides have been configured. Overrides allow adjusting capacity or blocking specific time slots for specific dates."
                />
              ) : (
                <div className="overflow-x-auto -mx-5 -my-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-stone-100 bg-[#faf8f5]/60 text-stone-500 uppercase tracking-wider font-mono text-[10px]">
                        <th className="py-3 px-5">Date</th>
                        <th className="py-3 px-4">Time</th>
                        <th className="py-3 px-4">Experience</th>
                        <th className="py-3 px-4 text-center">Capacity</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-5">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {overrides.map((ov) => (
                        <tr key={ov.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="py-3.5 px-5 font-mono text-stone-900 whitespace-nowrap">
                            {new Date(ov.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-stone-700">{ov.time}</td>
                          <td className="py-3.5 px-4 font-serif text-stone-800">{ov.experience.title}</td>
                          <td className="py-3.5 px-4 text-center font-mono font-medium text-stone-900">{ov.capacity}</td>
                          <td className="py-3.5 px-4 text-center">
                            <StatusBadge status={ov.isBlocked ? 'BLOCKED' : 'ACTIVE'} />
                          </td>
                          <td className="py-3.5 px-5 text-stone-500 italic max-w-[200px] truncate">
                            {ov.reason || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          )}

          {/* Closures Tab */}
          {activeTab === 'closures' && (
            <SectionCard title="Winery Closures" description="Scheduled closure dates and reasons">
              {closures.length === 0 ? (
                <EmptyState
                  title="No winery closures"
                  description="No closure periods have been scheduled. Closures block all bookings for the specified date range."
                />
              ) : (
                <div className="space-y-3">
                  {closures.map((closure) => (
                    <div key={closure.id} className="p-4 rounded-xl border border-stone-200/80 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Ban className="w-4 h-4 text-rose-500" />
                            <span className="text-sm font-medium text-stone-900">
                              {new Date(closure.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                              {' – '}
                              {new Date(closure.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-xs text-stone-600 ml-6">{closure.reason}</p>
                        </div>
                        <StatusBadge status="CLOSED" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
