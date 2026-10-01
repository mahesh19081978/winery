export interface RefundPolicyResult {
  allowed: boolean;
  maxPercentage: number;
  maxAmount: number;
  reason?: string;
  windowStr?: string;
}

export function getUtcTimeFromLocal(date: Date, timeStr: string, timeZone: string): Date {
  const [time, ampm] = timeStr.split(' ');
  const [hourStr, minStr] = time.split(':');
  let h = parseInt(hourStr, 10);
  if (ampm?.toUpperCase() === 'PM' && h < 12) h += 12;
  if (ampm?.toUpperCase() === 'AM' && h === 12) h = 0;
  const m = parseInt(minStr, 10);

  const iso = date.toISOString();
  const [y, mo, d] = iso.split('T')[0].split('-').map(Number);
  
  let timestamp = Date.UTC(y, mo - 1, d, h, m);
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
  });
  
  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(timestamp));
    const tzY = Number(parts.find(p => p.type === 'year')?.value);
    const tzMo = Number(parts.find(p => p.type === 'month')?.value);
    const tzD = Number(parts.find(p => p.type === 'day')?.value);
    let tzH = Number(parts.find(p => p.type === 'hour')?.value);
    if (tzH === 24) tzH = 0;
    const tzM = Number(parts.find(p => p.type === 'minute')?.value);
    
    const targetUTC = Date.UTC(y, mo - 1, d, h, m);
    const formattedUTC = Date.UTC(tzY, tzMo - 1, tzD, tzH, tzM);
    
    const diff = targetUTC - formattedUTC;
    if (diff === 0) break;
    timestamp += diff;
  }
  
  return new Date(timestamp);
}

export function calculateRefundEligibility(
  bookingType: 'EXPERIENCE' | 'EVENT',
  status: string,
  experienceDate: Date,
  experienceTime: string,
  timeZone: string,
  paymentAmount: number,
  alreadyRefunded: number,
  nowUtc: Date = new Date()
): RefundPolicyResult {
  if (status === 'CHECKED_IN') {
    return {
      allowed: false,
      maxPercentage: 0,
      maxAmount: 0,
      reason: 'No Refund — Guest Checked In',
    };
  }



  const startUtc = getUtcTimeFromLocal(experienceDate, experienceTime, timeZone);
  const hoursUntilStart = (startUtc.getTime() - nowUtc.getTime()) / (1000 * 60 * 60);

  let maxPercentage = 0;
  let windowStr = 'Less than 12 hours';
  
  if (hoursUntilStart >= 48) {
    maxPercentage = 100;
    windowStr = '48+ hours before experience';
  } else if (hoursUntilStart >= 24) {
    maxPercentage = 50;
    windowStr = '24-48 hours before experience';
  } else if (hoursUntilStart >= 12) {
    maxPercentage = 20;
    windowStr = '12-24 hours before experience';
  }

  const maxTotalRefund = (paymentAmount * maxPercentage) / 100;
  const remainingRefundable = Math.max(0, maxTotalRefund - alreadyRefunded);

  if (maxPercentage === 0) {
    return {
      allowed: false,
      maxPercentage: 0,
      maxAmount: 0,
      reason: 'No Refund — Refund Window Expired',
      windowStr,
    };
  }
  
  if (remainingRefundable <= 0 && alreadyRefunded > 0) {
     return {
      allowed: false,
      maxPercentage,
      maxAmount: 0,
      reason: 'Maximum allowed refund amount has already been refunded.',
      windowStr,
    };
  }

  return {
    allowed: remainingRefundable > 0,
    maxPercentage,
    maxAmount: remainingRefundable,
    windowStr,
  };
}
