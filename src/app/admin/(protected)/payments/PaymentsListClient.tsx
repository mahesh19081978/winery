'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { SectionCard, StatusBadge } from '@/components/admin/UIComponents';
import { PaymentFiltersClient } from '@/components/admin/payments/PaymentFiltersClient';
import EmptyState from '@/components/common/EmptyState';

interface PaymentItem {
  id: string;
  bookingType: 'EXPERIENCE' | 'EVENT';
  bookingNumber: string;
  guestName: string | null;
  guestEmail: string | null;
  amount: string;
  currency: string;
  status: string;
  provider: string | null;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  paymentMethod: string | null;
  refundId: string | null;
  refundAmount: string | null;
  refundReason: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PAID: 'success',
  PENDING: 'warning',
  AUTHORIZED: 'info',
  FAILED: 'danger',
  REFUNDED: 'default',
  PARTIALLY_REFUNDED: 'warning',
};

function statusVariant(status: string) {
  return STATUS_VARIANT[status] ?? 'default';
}

export function PaymentsListClient() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [bookingType, setBookingType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchPayments = useCallback(
    async (
      page: number,
      searchVal: string,
      statusVal: string,
      bookingTypeVal: string,
      dateFromVal: string,
      dateToVal: string
    ) => {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', '20');
        if (searchVal) params.set('search', searchVal);
        if (statusVal) params.set('status', statusVal);
        if (bookingTypeVal) params.set('bookingType', bookingTypeVal);
        if (dateFromVal) params.set('dateFrom', dateFromVal);
        if (dateToVal) params.set('dateTo', dateToVal);

        const response = await fetch(`/api/admin/payments?${params.toString()}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch payments');
        }

        setPayments(result.data.payments);
        setPagination(result.data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const load = async () => {
      await fetchPayments(1, '', '', '', '', '');
    };
    load();
  }, [fetchPayments]);

  const handleSearch = (val: string) => {
    setSearch(val);
    fetchPayments(1, val, status, bookingType, dateFrom, dateTo);
  };

  const handleStatusFilter = (val: string) => {
    setStatus(val);
    fetchPayments(1, search, val, bookingType, dateFrom, dateTo);
  };

  const handleBookingTypeFilter = (val: string) => {
    setBookingType(val);
    fetchPayments(1, search, status, val, dateFrom, dateTo);
  };

  const handleDateFilter = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    fetchPayments(1, search, status, bookingType, from, to);
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setBookingType('');
    setDateFrom('');
    setDateTo('');
    fetchPayments(1, '', '', '', '', '');
  };

  const handlePageChange = (newPage: number) => {
    fetchPayments(newPage, search, status, bookingType, dateFrom, dateTo);
  };

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
            Payments
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Experience and event payments, provider references and refunds
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200/80 shadow-xs">
            <CreditCard className="w-3.5 h-3.5 text-stone-500" />
            <span className="text-xs font-mono font-medium text-stone-700">
              {pagination.total} total
            </span>
          </div>
        </div>
      </div>

      <SectionCard
        title="All Payments"
        description="Search, filter and inspect payments across experience and event bookings"
      >
        <PaymentFiltersClient
          onSearch={handleSearch}
          onStatusFilter={handleStatusFilter}
          onBookingTypeFilter={handleBookingTypeFilter}
          onDateFilter={handleDateFilter}
          onClearFilters={handleClearFilters}
          currentSearch={search}
          currentStatus={status}
          currentBookingType={bookingType}
          currentDateFrom={dateFrom}
          currentDateTo={dateTo}
        />

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <p className="text-xs text-rose-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="mt-6 flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-6 h-6 text-[#6c2432] animate-spin" />
            <p className="text-xs text-stone-500 font-mono">Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No payments found"
              description={
                search || status || bookingType || dateFrom || dateTo
                  ? 'No payments match your current filters. Try adjusting your search criteria.'
                  : 'No payments have been recorded yet. Payments will appear here once guests check out.'
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="mt-6 overflow-x-auto -mx-5 -my-2 hidden md:block">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-100 bg-[#faf8f5]/60 text-stone-500 uppercase tracking-wider font-mono text-[10px]">
                    <th className="py-3 px-5">Booking</th>
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Provider Ref</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <Link
                          href={`/admin/payments/${payment.id}`}
                          className="font-mono font-medium text-[#6c2432] hover:text-[#461822] hover:underline"
                        >
                          {payment.bookingNumber}
                        </Link>
                        <div className="text-[10px] uppercase tracking-wider text-stone-500 font-mono mt-0.5">
                          {payment.bookingType === 'EVENT' ? 'Event' : 'Experience'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-stone-900">
                          {payment.guestName || 'Guest'}
                        </div>
                        <div className="text-[11px] text-stone-500 truncate max-w-[160px]">
                          {payment.guestEmail || ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-mono font-semibold text-stone-900">
                          {payment.currency} {payment.amount}
                        </span>
                        {payment.refundAmount && (
                          <div className="text-[10px] text-amber-700 font-mono">
                            refunded {payment.refundAmount}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-stone-600">
                        <div className="truncate max-w-[150px]">
                          {payment.providerPaymentId || payment.providerOrderId || '—'}
                        </div>
                        <div className="text-stone-400">{payment.provider || ''}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-stone-600">
                        {payment.paymentMethod || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={payment.status} variant={statusVariant(payment.status)} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-[11px] font-mono text-stone-500">
                        {new Date(payment.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/payments/${payment.id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#6c2432] bg-[#461822]/5 border border-[#461822]/10 rounded-md hover:bg-[#461822]/10 transition"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="mt-6 space-y-3 md:hidden">
              {payments.map((payment) => (
                <Link
                  key={payment.id}
                  href={`/admin/payments/${payment.id}`}
                  className="block p-4 rounded-xl border border-stone-200/80 bg-white hover:bg-[#faf8f5] transition"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-mono font-medium text-[#6c2432] text-sm">
                        {payment.bookingNumber}
                      </span>
                      <h4 className="font-serif font-medium text-stone-900 mt-0.5">
                        {payment.guestName || 'Guest'}
                      </h4>
                    </div>
                    <StatusBadge status={payment.status} variant={statusVariant(payment.status)} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-stone-600">
                    <span className="font-mono font-semibold">
                      {payment.currency} {payment.amount}
                    </span>
                    <span>{payment.paymentMethod || payment.provider || '—'}</span>
                  </div>
                  <div className="mt-2 text-[11px] text-stone-500 font-mono">
                    {payment.bookingType === 'EVENT' ? 'Event' : 'Experience'} •{' '}
                    {new Date(payment.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4">
                <p className="text-xs text-stone-500 font-mono">
                  Page {pagination.page} of {pagination.totalPages} • {pagination.total} payments
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
