import React from 'react';
import Link from 'next/link';
import { requirePagePermission } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db';
import { reportsService } from '@/lib/services/reports.service';
import {
  StatCard,
  SectionCard,
} from '@/components/admin/UIComponents';
import { RevenueTrendChart } from '@/components/admin/reports/RevenueTrendChart';
import { BookingTrendChart } from '@/components/admin/reports/BookingTrendChart';
import { PaymentMethodBreakdown } from '@/components/admin/reports/PaymentMethodBreakdown';
import {
  DollarSign,
  CalendarDays,
  Users,
  Ticket,
  TrendingUp,
  CreditCard,
  RefreshCw,
  AlertCircle,
  PieChart as PieIcon,
  BarChart3,
} from 'lucide-react';
import { BookingStatus } from '@prisma/client';

const VALID_BOOKING_STATUSES: BookingStatus[] = ['CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'NO_SHOW'];

type SearchParamsPromise = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ReportsPage(props: {
  searchParams: SearchParamsPromise;
}) {
  const searchParams = await props.searchParams;
  const session = await requirePagePermission('dashboard.view');

  const scope =
    session.role === 'SUPER_ADMIN'
      ? {}
      : { wineryId: session.wineryId ?? '__no_tenant__' };

  // Calculate Date Range
  const rangeParam = searchParams.range;
  const range = Array.isArray(rangeParam) ? rangeParam[0] : rangeParam || '30d';
  
  let startDate = new Date();
  let endDate = new Date();

  // Reset to local midnight boundaries for standard queries
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  if (range === 'today') {
    // defaults to today
  } else if (range === '7d') {
    startDate.setDate(startDate.getDate() - 6);
  } else if (range === '30d') {
    startDate.setDate(startDate.getDate() - 29);
  } else if (range === 'this_month') {
    startDate.setDate(1);
  } else if (range === 'custom') {
    const startParam = Array.isArray(searchParams.start) ? searchParams.start[0] : searchParams.start;
    const endParam = Array.isArray(searchParams.end) ? searchParams.end[0] : searchParams.end;
    if (startParam && endParam) {
      const s = new Date(startParam);
      if (!isNaN(s.getTime())) {
         s.setHours(0, 0, 0, 0);
         startDate = s;
      }
      const e = new Date(endParam);
      if (!isNaN(e.getTime())) {
         e.setHours(23, 59, 59, 999);
         endDate = e;
      }
    }
  }

  // Fetch Financials, Trends, Breakdown & Utilization from reportsService
  const [financials, revenueTrends, bookingTrend, paymentBreakdowns, utilization] = await Promise.all([
    reportsService.getFinancialSummary(scope, startDate, endDate),
    reportsService.getRevenueTrend(scope, startDate, endDate),
    reportsService.getBookingTrend(scope, startDate, endDate),
    reportsService.getPaymentMethodBreakdown(scope, startDate, endDate),
    reportsService.getExperienceUtilization(scope, startDate, endDate),
  ]);


  // Additional Counters
  const [totalBookingsCount, totalGuestsResult, eventBookingsCount] = await Promise.all([
    prisma.booking.count({
      where: {
        ...scope,
        date: { gte: startDate, lte: endDate },
        status: { in: VALID_BOOKING_STATUSES },
      },
    }),
    prisma.booking.aggregate({
      where: {
        ...scope,
        date: { gte: startDate, lte: endDate },
        status: { in: VALID_BOOKING_STATUSES },
      },
      _sum: { totalGuests: true },
    }),
    prisma.eventBooking.count({
      where: {
        event: {
          ...scope,
          eventDate: { gte: startDate, lte: endDate },
        },
        status: { in: VALID_BOOKING_STATUSES },
      },
    })
  ]);

  const totalGuests = totalGuestsResult._sum.totalGuests || 0;

  // We should render the financials per currency
  const currencyKeys = Object.keys(financials);
  
  // Formatters
  const formatCurrency = (val: number, curr = 'USD') => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: curr, minimumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-8">
      {/* Header & Date Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium capitalize mt-1">
            Financial & Operations Reports
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Estate performance from {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}
          </p>
        </div>

        <div className="flex bg-stone-100 rounded-lg p-1 text-xs">
          {[
            { id: 'today', label: 'Today' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: 'this_month', label: 'This Month' },
          ].map((tab) => (
            <Link
              key={tab.id}
              href={`/admin/reports?range=${tab.id}`}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                range === tab.id
                  ? 'bg-white shadow-sm text-stone-900'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {currencyKeys.length === 0 ? (
        <div className="text-center py-12 text-stone-500 bg-[#faf8f5]/40 rounded-xl border border-stone-200/80">
          No financial data recorded for this period.
        </div>
      ) : (
        currencyKeys.map((currency) => {
          const data = financials[currency];
          return (
            <div key={currency} className="space-y-6">
              <h2 className="text-lg font-serif font-medium text-stone-800 border-b pb-2">
                Ledger ({currency})
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard
                  title="Gross Booking Value"
                  value={formatCurrency(data.grossBookingValue, currency)}
                  subtitle="Total expected revenue"
                  icon={TrendingUp}
                />
                <StatCard
                  title="Net Collected"
                  value={formatCurrency(data.netCollected, currency)}
                  subtitle="Realized cash"
                  icon={DollarSign}
                />
                <StatCard
                  title="Total Collected"
                  value={formatCurrency(data.collectedAmount, currency)}
                  subtitle="Raw cash in"
                  icon={CreditCard}
                />
                <StatCard
                  title="Refunds Processed"
                  value={formatCurrency(data.refunds, currency)}
                  subtitle="Cash returned"
                  icon={RefreshCw}
                />
                <StatCard
                  title="Outstanding Balance"
                  value={formatCurrency(data.outstanding, currency)}
                  subtitle="Yet to be paid"
                  icon={AlertCircle}
                />
                <StatCard
                  title="Retained (Cancelled)"
                  value={formatCurrency(data.retainedFromCancelled, currency)}
                  subtitle="From cancelled bookings"
                  icon={AlertCircle}
                />
              </div>
            </div>
          );
        })
      )}

      {/* Volume Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Experiences"
          value={totalBookingsCount}
          subtitle="Valid bookings only"
          icon={CalendarDays}
        />
        <StatCard
          title="Total Guests"
          value={totalGuests}
          subtitle="Seated guests"
          icon={Users}
        />
        <StatCard
          title="Total Events"
          value={eventBookingsCount}
          subtitle="Ticketed events"
          icon={Ticket}
        />
      </div>

      {/* 1. Revenue Trend Section (Separated per currency) */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
          <TrendingUp className="w-5 h-5 text-[#6c2432]" />
          <h2 className="text-xl font-serif font-medium text-stone-900">
            Revenue Trend
          </h2>
        </div>

        {currencyKeys.length === 0 ? (
          <div className="text-center py-8 text-stone-400 bg-stone-50 rounded-xl border border-stone-200 text-xs">
            No revenue trend data for this period.
          </div>
        ) : (
          currencyKeys.map((currency) => (
            <SectionCard
              key={`rev-trend-${currency}`}
              title={`Revenue Progression (${currency})`}
              description="Daily Gross Booking Value, Collected Amount, Refunds, and Net Collected"
            >
              <RevenueTrendChart
                data={revenueTrends[currency] || []}
                currency={currency}
              />
            </SectionCard>
          ))
        )}
      </div>

      {/* 2. Booking Trend Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
          <BarChart3 className="w-5 h-5 text-[#6c2432]" />
          <h2 className="text-xl font-serif font-medium text-stone-900">
            Booking & Guest Trend
          </h2>
        </div>

        <SectionCard
          title="Reservation Volume Progression"
          description="Daily valid reservations and daily seated guest counts"
        >
          <BookingTrendChart data={bookingTrend} />
        </SectionCard>
      </div>

      {/* 3. Payment Method Breakdown Section (Separated per currency) */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
          <PieIcon className="w-5 h-5 text-[#6c2432]" />
          <h2 className="text-xl font-serif font-medium text-stone-900">
            Payment Method Breakdown
          </h2>
        </div>

        {currencyKeys.length === 0 ? (
          <div className="text-center py-8 text-stone-400 bg-stone-50 rounded-xl border border-stone-200 text-xs">
            No payment transaction records for this period.
          </div>
        ) : (
          currencyKeys.map((currency) => (
            <SectionCard
              key={`pm-breakdown-${currency}`}
              title={`Payment Channels (${currency})`}
              description="Breakdown by channel: Cash, UPI, Card, Bank Transfer, Online, Other / Complimentary"
            >
              <PaymentMethodBreakdown
                data={paymentBreakdowns[currency] || []}
                currency={currency}
              />
            </SectionCard>
          ))
        )}
      </div>

      {/* Utilization Table */}
      <SectionCard
        title="Experience Capacity Utilization"
        description="Theoretical capacity vs. actual booked seats for active experiences"
      >
        <div className="overflow-x-auto -mx-5 -my-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-100 bg-[#faf8f5]/60 text-stone-500 uppercase tracking-wider font-mono text-[10px]">
                <th className="py-3 px-5">Experience</th>
                <th className="py-3 px-4 text-right">Capacity</th>
                <th className="py-3 px-4 text-right">Booked</th>
                <th className="py-3 px-5 text-right">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {utilization.length > 0 ? utilization.map((exp) => (
                <tr key={exp.experienceId} className="hover:bg-stone-50/80 transition-colors">
                  <td className="py-3.5 px-5 font-serif font-medium text-stone-900">
                    {exp.title}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-stone-600">
                    {exp.theoreticalCapacity}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-medium text-stone-900">
                    {exp.bookedSeats}
                  </td>
                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-mono text-stone-900 font-semibold">
                        {exp.utilizationPercentage.toFixed(1)}%
                      </span>
                      <div className="w-16 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            exp.utilizationPercentage > 85 ? 'bg-emerald-500' :
                            exp.utilizationPercentage > 50 ? 'bg-amber-500' : 'bg-stone-300'
                          }`} 
                          style={{ width: `${Math.min(100, exp.utilizationPercentage)}%` }} 
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-stone-400">
                    No active experiences found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
