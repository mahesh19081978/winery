/**
 * Pure date/time calculations for Event Lifecycle & Timezone Boundaries
 */

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
  return utcDate.getTime() - tzDate.getTime();
}

export function extractEventStartTime(timeRange?: string | null): string {
  if (!timeRange || !timeRange.trim()) return '12:00 AM';
  const parts = timeRange.split(/[–—-]/);
  return parts[0].trim();
}

/**
 * Extracts the end-time string from a timeRange or single time slot.
 * Examples:
 *   "6:00 PM – 10:00 PM" -> "10:00 PM"
 *   "6:30 PM - 09:30 PM" -> "09:30 PM"
 *   "7:00 PM" -> "7:00 PM"
 */
export function extractEventEndTime(timeRange?: string | null): string {
  if (!timeRange || !timeRange.trim()) return '11:59 PM';
  const parts = timeRange.split(/[–—-]/);
  return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
}

/**
 * Parses an event Date and time string in a specific IANA timeZone
 * into a definitive UTC Date representing that exact instant.
 */
export function parseEventDateTimeInTimezone(
  eventDate: Date | string,
  timeStr: string,
  timeZone: string
): Date {
  const dateStr = typeof eventDate === 'string'
    ? eventDate.slice(0, 10)
    : eventDate.toISOString().slice(0, 10);

  const match = timeStr.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  let h = 23;
  let m = 59;

  if (match) {
    h = parseInt(match[1], 10);
    m = parseInt(match[2] || '0', 10);
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === 'PM' && h < 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
  }

  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');

  const tentativeUtc = new Date(`${dateStr}T${hh}:${mm}:00Z`);
  const offset = getTimeZoneOffsetMs(tentativeUtc, timeZone);
  return new Date(tentativeUtc.getTime() + offset);
}

/**
 * Calculates the exact UTC Date at which the event starts, based on:
 * - Event date
 * - Event timeRange
 * - Optional EventSchedule timeSlot
 * - Winery timezone
 */
export function calculateEventStartBoundary(params: {
  eventDate: Date | string;
  timeRange?: string | null;
  scheduleTimeSlot?: string | null;
  timeZone?: string | null;
}): Date {
  const timeZone = params.timeZone || 'America/Los_Angeles';
  const timeStr = extractEventStartTime(params.scheduleTimeSlot || params.timeRange);
  return parseEventDateTimeInTimezone(params.eventDate, timeStr, timeZone);
}

/**
 * Calculates the exact UTC Date at which the event ends, based on:
 * - Event date
 * - Event timeRange
 * - Optional EventSchedule timeSlot
 * - Winery timezone
 */
export function calculateEventEndBoundary(params: {
  eventDate: Date | string;
  timeRange?: string | null;
  scheduleTimeSlot?: string | null;
  timeZone?: string | null;
}): Date {
  const timeZone = params.timeZone || 'America/Los_Angeles';
  const timeStr = extractEventEndTime(params.timeRange || params.scheduleTimeSlot);
  return parseEventDateTimeInTimezone(params.eventDate, timeStr, timeZone);
}

/**
 * Checks if an event has already ended relative to `now` (default: new Date()).
 */
export function isEventPastEndTime(params: {
  eventDate: Date | string;
  timeRange?: string | null;
  scheduleTimeSlot?: string | null;
  timeZone?: string | null;
  now?: Date;
}): boolean {
  const now = params.now || new Date();
  const endBoundary = calculateEventEndBoundary(params);
  return now.getTime() > endBoundary.getTime();
}

/**
 * Evaluates the check-in window for an event:
 * - Window opens: exactly 1 hour before event start (eventStart - 1 hour)
 * - Window closes: event end time
 * Valid check-in condition:
 *   currentTime >= checkInOpens && currentTime < eventEnd
 */
export function getEventCheckInWindow(params: {
  eventDate: Date | string;
  timeRange?: string | null;
  scheduleTimeSlot?: string | null;
  timeZone?: string | null;
  now?: Date;
}): {
  eventStart: Date;
  eventEnd: Date;
  checkInOpens: Date;
  isOpen: boolean;
  isBeforeWindow: boolean;
  isPastEnd: boolean;
} {
  const now = params.now || new Date();
  const eventStart = calculateEventStartBoundary(params);
  const eventEnd = calculateEventEndBoundary(params);
  const checkInOpens = new Date(eventStart.getTime() - 60 * 60 * 1000);

  const nowMs = now.getTime();
  const isBeforeWindow = nowMs < checkInOpens.getTime();
  const isPastEnd = nowMs >= eventEnd.getTime();
  const isOpen = !isBeforeWindow && !isPastEnd;

  return {
    eventStart,
    eventEnd,
    checkInOpens,
    isOpen,
    isBeforeWindow,
    isPastEnd,
  };
}

/**
 * Returns true if check-in is currently valid.
 */
export function isEventCheckInOpen(params: {
  eventDate: Date | string;
  timeRange?: string | null;
  scheduleTimeSlot?: string | null;
  timeZone?: string | null;
  now?: Date;
}): boolean {
  return getEventCheckInWindow(params).isOpen;
}

/**
 * Calculates the exact UTC Date at which an Experience starts, based on:
 * - Booking date
 * - Booking time (e.g., "14:00" or "2:00 PM")
 * - Winery timezone
 */
export function calculateExperienceStartBoundary(params: {
  bookingDate: Date | string;
  bookingTime: string;
  timeZone?: string | null;
}): Date {
  const timeZone = params.timeZone || 'America/Los_Angeles';
  return parseEventDateTimeInTimezone(params.bookingDate, params.bookingTime, timeZone);
}

/**
 * Calculates the exact UTC Date at which an Experience ends, based on:
 * - Experience start time
 * - Duration in minutes
 */
export function calculateExperienceEndBoundary(params: {
  bookingDate: Date | string;
  bookingTime: string;
  durationMinutes: number;
  timeZone?: string | null;
}): Date {
  const start = calculateExperienceStartBoundary({
    bookingDate: params.bookingDate,
    bookingTime: params.bookingTime,
    timeZone: params.timeZone,
  });
  const durationMs = (params.durationMinutes || 60) * 60 * 1000;
  return new Date(start.getTime() + durationMs);
}

/**
 * Evaluates operational timing status for an Experience Booking:
 * - Check-in valid: currentTime >= experienceStart && currentTime < experienceEnd
 * - No-Show valid: currentTime >= experienceEnd (when status is CONFIRMED)
 * - Complete valid: currentTime >= experienceEnd (when status is CHECKED_IN)
 */
export function getExperienceTimingStatus(params: {
  bookingDate: Date | string;
  bookingTime: string;
  durationMinutes: number;
  timeZone?: string | null;
  now?: Date;
}): {
  experienceStart: Date;
  experienceEnd: Date;
  isBeforeStart: boolean;
  isDuringExperience: boolean;
  isPastEnd: boolean;
  isCheckInAvailable: boolean;
  isNoShowAvailable: boolean;
  isCompleteAvailable: boolean;
} {
  const now = params.now || new Date();
  const experienceStart = calculateExperienceStartBoundary({
    bookingDate: params.bookingDate,
    bookingTime: params.bookingTime,
    timeZone: params.timeZone,
  });
  const experienceEnd = new Date(
    experienceStart.getTime() + (params.durationMinutes || 60) * 60 * 1000
  );

  const nowMs = now.getTime();
  const startMs = experienceStart.getTime();
  const endMs = experienceEnd.getTime();

  const isBeforeStart = nowMs < startMs;
  const isPastEnd = nowMs >= endMs;
  const isDuringExperience = nowMs >= startMs && nowMs < endMs;

  const isCheckInAvailable = nowMs >= startMs && nowMs < endMs;
  const isNoShowAvailable = nowMs >= endMs;
  const isCompleteAvailable = nowMs >= endMs;

  return {
    experienceStart,
    experienceEnd,
    isBeforeStart,
    isDuringExperience,
    isPastEnd,
    isCheckInAvailable,
    isNoShowAvailable,
    isCompleteAvailable,
  };
}

/**
 * Checks if an Experience has already ended relative to `now` (default: new Date()).
 */
export function isExperiencePastEndTime(params: {
  bookingDate: Date | string;
  bookingTime: string;
  durationMinutes: number;
  timeZone?: string | null;
  now?: Date;
}): boolean {
  const now = params.now || new Date();
  const endBoundary = calculateExperienceEndBoundary(params);
  return now.getTime() >= endBoundary.getTime();
}
