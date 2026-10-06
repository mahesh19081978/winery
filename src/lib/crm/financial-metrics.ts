export interface GuestFinancialMetrics {
  totalBookings: number;
  totalVisits: number;
  totalPaid: number;
  totalRefunds: number;
  netRevenue: number;
  outstandingAmount: number;
  averageBookingValue: number;
  firstVisit: string | null;
  lastVisit: string | null;
  experienceSpend: number;
  eventSpend: number;
  currency: string;
}

export function computeGuestFinancialMetrics(
  bookings: {
    id: string;
    date: Date | string;
    totalPrice: number | string | { toString(): string };
    status: string;
    wineryId?: string;
    currency?: string;
    payments?: {
      amount: number | string | { toString(): string };
      status: string;
      refundAmount?: number | string | { toString(): string } | null;
    }[];
  }[],
  eventBookings: {
    id: string;
    totalPrice: number | string | { toString(): string };
    status: string;
    event?: { eventDate?: Date | string; wineryId?: string } | null;
    payments?: {
      amount: number | string | { toString(): string };
      status: string;
      refundAmount?: number | string | { toString(): string } | null;
    }[];
  }[],
  wineryId?: string
): GuestFinancialMetrics {
  // Filter by winery if wineryId is given
  const scopedBookings = wineryId
    ? bookings.filter((b) => !b.wineryId || b.wineryId === wineryId)
    : bookings;

  const scopedEventBookings = wineryId
    ? eventBookings.filter((eb) => !eb.event?.wineryId || eb.event.wineryId === wineryId)
    : eventBookings;

  let totalPaid = 0;
  let totalRefunds = 0;
  let experienceSpend = 0;
  let eventSpend = 0;
  let totalExpectedPrice = 0;
  let validBookingsCount = 0;

  const visitDates: Date[] = [];

  // Experience Bookings
  for (const b of scopedBookings) {
    if (b.status !== 'CANCELLED') {
      validBookingsCount += 1;
      totalExpectedPrice += Number(b.totalPrice);
    }

    if (b.status === 'COMPLETED' || b.status === 'CHECKED_IN') {
      const d = new Date(b.date);
      if (!isNaN(d.getTime())) visitDates.push(d);
    }

    let bPaid = 0;
    let bRefunds = 0;
    for (const py of b.payments || []) {
      if (['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(py.status)) {
        bPaid += Number(py.amount);
      }
      if (py.refundAmount) {
        bRefunds += Number(py.refundAmount);
      }
    }
    totalPaid += bPaid;
    totalRefunds += bRefunds;
    experienceSpend += (bPaid - bRefunds);
  }

  // Event Bookings
  for (const eb of scopedEventBookings) {
    if (eb.status !== 'CANCELLED') {
      validBookingsCount += 1;
      totalExpectedPrice += Number(eb.totalPrice);
    }

    if (eb.status === 'COMPLETED' || eb.status === 'CHECKED_IN') {
      if (eb.event?.eventDate) {
        const d = new Date(eb.event.eventDate);
        if (!isNaN(d.getTime())) visitDates.push(d);
      }
    }

    let ebPaid = 0;
    let ebRefunds = 0;
    for (const py of eb.payments || []) {
      if (['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(py.status)) {
        ebPaid += Number(py.amount);
      }
      if (py.refundAmount) {
        ebRefunds += Number(py.refundAmount);
      }
    }
    totalPaid += ebPaid;
    totalRefunds += ebRefunds;
    eventSpend += (ebPaid - ebRefunds);
  }

  const netRevenue = Math.max(0, totalPaid - totalRefunds);
  const outstandingAmount = Math.max(0, totalExpectedPrice - totalPaid);
  const averageBookingValue = validBookingsCount > 0 ? (totalExpectedPrice / validBookingsCount) : 0;

  visitDates.sort((a, b) => a.getTime() - b.getTime());
  const firstVisit = visitDates.length > 0 ? visitDates[0].toISOString() : null;
  const lastVisit = visitDates.length > 0 ? visitDates[visitDates.length - 1].toISOString() : null;

  return {
    totalBookings: validBookingsCount,
    totalVisits: visitDates.length,
    totalPaid: Number(totalPaid.toFixed(2)),
    totalRefunds: Number(totalRefunds.toFixed(2)),
    netRevenue: Number(netRevenue.toFixed(2)),
    outstandingAmount: Number(outstandingAmount.toFixed(2)),
    averageBookingValue: Number(averageBookingValue.toFixed(2)),
    firstVisit,
    lastVisit,
    experienceSpend: Number(Math.max(0, experienceSpend).toFixed(2)),
    eventSpend: Number(Math.max(0, eventSpend).toFixed(2)),
    currency: scopedBookings[0]?.currency || 'USD',
  };
}
