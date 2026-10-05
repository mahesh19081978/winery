import { prisma } from '@/lib/db';

export type ReportScope = { wineryId?: string } | Record<string, never>;

export interface CurrencyFinancials {
  grossBookingValue: number;
  collectedAmount: number;
  refunds: number;
  netCollected: number;
  outstanding: number;
  retainedFromCancelled: number;
}

export type FinancialSummary = Record<string, CurrencyFinancials>;

import { BookingStatus, PaymentStatus } from '@prisma/client';

const VALID_BOOKING_STATUSES: BookingStatus[] = ['CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'NO_SHOW'];
const VALID_PAYMENT_STATUSES: PaymentStatus[] = ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'];

export const reportsService = {
  /**
   * Calculates financial metrics grouped by currency.
   * Outstanding is clamped to >= 0 per booking/event.
   * Cancelled bookings do not inflate GBV, but retained/captured amounts are tracked separately.
   */
  async getFinancialSummary(
    scope: ReportScope,
    startDate: Date,
    endDate: Date
  ): Promise<FinancialSummary> {
    const financials: FinancialSummary = {};
    const processedPayments = new Set<string>();

    const initCurrency = (currency: string) => {
      if (!financials[currency]) {
        financials[currency] = {
          grossBookingValue: 0,
          collectedAmount: 0,
          refunds: 0,
          netCollected: 0,
          outstanding: 0,
          retainedFromCancelled: 0,
        };
      }
    };

    // 1. Process standard experience bookings
    const bookings = await prisma.booking.findMany({
      where: {
        ...scope,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        payments: true,
      },
    });

    for (const b of bookings) {
      initCurrency(b.currency);
      const currencyData = financials[b.currency];

      let bCollected = 0;
      let bRefunds = 0;

      for (const p of b.payments) {
        if (!processedPayments.has(p.id)) {
          processedPayments.add(p.id);
          if (VALID_PAYMENT_STATUSES.includes(p.status)) {
            bCollected += Number(p.amount);
            bRefunds += Number(p.refundAmount || 0);
          }
        }
      }

      const bNet = bCollected - bRefunds;

      if (VALID_BOOKING_STATUSES.includes(b.status)) {
        currencyData.grossBookingValue += Number(b.totalPrice);
        currencyData.collectedAmount += bCollected;
        currencyData.refunds += bRefunds;
        currencyData.netCollected += bNet;
        
        // Clamp outstanding to >= 0
        const outstanding = Math.max(0, Number(b.totalPrice) - bNet);
        currencyData.outstanding += outstanding;
      } else if (b.status === 'CANCELLED') {
        currencyData.retainedFromCancelled += bNet;
        // The retained amount is real cash, so we still add it to collections/net.
        currencyData.collectedAmount += bCollected;
        currencyData.refunds += bRefunds;
        currencyData.netCollected += bNet;
      }
    }

    // 2. Process event bookings (using eventDate from the linked event)
    const eventBookings = await prisma.eventBooking.findMany({
      where: {
        event: {
          ...scope,
          eventDate: { gte: startDate, lte: endDate },
        },
      },
      include: {
        payments: true,
        event: true,
      },
    });

    for (const eb of eventBookings) {
      // EventBooking inherits currency from its Event
      const currency = eb.event.currency || 'USD';
      initCurrency(currency);
      const currencyData = financials[currency];

      let ebCollected = 0;
      let ebRefunds = 0;

      for (const p of eb.payments) {
        if (!processedPayments.has(p.id)) {
          processedPayments.add(p.id);
          if (VALID_PAYMENT_STATUSES.includes(p.status)) {
            ebCollected += Number(p.amount);
            ebRefunds += Number(p.refundAmount || 0);
          }
        }
      }

      const ebNet = ebCollected - ebRefunds;

      if (VALID_BOOKING_STATUSES.includes(eb.status)) {
        currencyData.grossBookingValue += Number(eb.totalPrice);
        currencyData.collectedAmount += ebCollected;
        currencyData.refunds += ebRefunds;
        currencyData.netCollected += ebNet;
        
        // Clamp outstanding to >= 0
        const outstanding = Math.max(0, Number(eb.totalPrice) - ebNet);
        currencyData.outstanding += outstanding;
      } else if (eb.status === 'CANCELLED') {
        currencyData.retainedFromCancelled += ebNet;
        currencyData.collectedAmount += ebCollected;
        currencyData.refunds += ebRefunds;
        currencyData.netCollected += ebNet;
      }
    }

    return financials;
  },

  /**
   * Calculates capacity utilization per experience, handling individual time-slot
   * overrides and closures correctly.
   */
  async getExperienceUtilization(
    scope: ReportScope,
    startDate: Date,
    endDate: Date
  ) {
    // Fetch all active experiences with their scheduling rules
    const experiences = await prisma.experience.findMany({
      where: scope,
      include: {
        availabilityRules: true,
        timeSlotOverrides: {
          where: { date: { gte: startDate, lte: endDate } },
        },
        experienceClosures: {
          where: { date: { gte: startDate, lte: endDate } },
        },
        winery: {
          include: {
            closures: {
              where: {
                endDate: { gte: startDate },
                startDate: { lte: endDate },
              },
            },
          },
        },
      },
    });

    const bookings = await prisma.booking.findMany({
      where: {
        ...scope,
        date: { gte: startDate, lte: endDate },
        status: { in: VALID_BOOKING_STATUSES },
      },
      include: {
        items: true,
      },
    });

    const utilizationByExperience: Record<string, {
      experienceId: string;
      title: string;
      theoreticalCapacity: number;
      bookedSeats: number;
      utilizationPercentage: number;
    }> = {};

    for (const exp of experiences) {
      utilizationByExperience[exp.id] = {
        experienceId: exp.id,
        title: exp.title,
        theoreticalCapacity: 0,
        bookedSeats: 0,
        utilizationPercentage: 0,
      };

      // Iterate day by day in the range
      const current = new Date(startDate);
      // Ensure we don't accidentally mutate the original startDate by using getTime()
      current.setUTCHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setUTCHours(0, 0, 0, 0);

      while (current <= end) {
        const currentIsoDate = current.toISOString().split('T')[0];
        
        const isWineryClosed = exp.winery.closures.some(
          (c) => {
            const startIso = c.startDate.toISOString().split('T')[0];
            const endIso = c.endDate.toISOString().split('T')[0];
            return currentIsoDate >= startIso && currentIsoDate <= endIso;
          }
        );
        
        const isExpClosed = exp.experienceClosures.some(
          (c) => c.date.toISOString().split('T')[0] === currentIsoDate
        );

        if (!isWineryClosed && !isExpClosed) {
          const dayOfWeek = current.getUTCDay();
          // Active baseline rules for this day of week
          const rules = exp.availabilityRules.filter((r) => r.dayOfWeek === dayOfWeek && r.isActive);
          
          // Slot-level capacity tracking
          const capacityPerSlot = new Map<string, number>();
          
          for (const rule of rules) {
             capacityPerSlot.set(rule.time, rule.capacity);
          }

          // Overrides for this specific date ONLY override the specific slot, not the whole day
          const overrides = exp.timeSlotOverrides.filter(
            (o) => o.date.toISOString().split('T')[0] === currentIsoDate
          );

          for (const override of overrides) {
             if (override.isBlocked) {
                capacityPerSlot.set(override.time, 0);
             } else {
                capacityPerSlot.set(override.time, override.capacity);
             }
          }

          // Sum up all slots for this day
          let dailyCapacity = 0;
          for (const cap of capacityPerSlot.values()) {
             dailyCapacity += cap;
          }

          utilizationByExperience[exp.id].theoreticalCapacity += dailyCapacity;
        }

        // Advance one day
        current.setUTCDate(current.getUTCDate() + 1);
      }
    }

    // Allocate actual booked guests to the appropriate experiences
    for (const b of bookings) {
      const appliedExperiences = new Set<string>();
      for (const item of b.items) {
        if (item.experienceId && utilizationByExperience[item.experienceId] && !appliedExperiences.has(item.experienceId)) {
           appliedExperiences.add(item.experienceId);
           utilizationByExperience[item.experienceId].bookedSeats += b.totalGuests;
        }
      }
    }

    // Calculate final percentages
    for (const key in utilizationByExperience) {
      const data = utilizationByExperience[key];
      if (data.theoreticalCapacity > 0) {
        data.utilizationPercentage = (data.bookedSeats / data.theoreticalCapacity) * 100;
      } else {
        data.utilizationPercentage = 0;
      }
    }

    return Object.values(utilizationByExperience);
  }
};
