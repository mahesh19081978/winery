'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Mail,
  Receipt,
  RotateCcw,
  Ticket,
  User,
  X,
} from 'lucide-react';
import { SectionCard, StatusBadge, StatCard } from '@/components/admin/UIComponents';

interface PaymentDetail {
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
  referenceTitle: string | null;
  bookingStatus: string | null;
  bookingDate: string | null;
  bookingTime: string | null;
  bookingTotal: string | null;
  wineryName: string | null;
  winerySlug: string | null;
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PAID: 'success',
  PENDING: 'warning',
  AUTHORIZED: 'info',
  FAILED: 'danger',
  REFUNDED: 'default',
  PARTIALLY_REFUNDED: 'warning',
};

interface Feedback {
  type: 'success' | 'error';
  message: string;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function PaymentDetailClient({
  paymentId,
  permissions = [],
}: {
  paymentId: string;
  permissions?: string[];
}) {
  const canRefundPermission = permissions.includes('payments.refund');
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [showRefund, setShowRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundError, setRefundError] = useState('');
  const [refunding, setRefunding] = useState(false);

  const fetchPayment = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotFound(false);

    try {
      const response = await fetch(`/api/admin/payments/${paymentId}`);
      const result = await response.json();

      if (response.status === 404) {
        setNotFound(true);
        setPayment(null);
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch payment');
      }

      setPayment(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    const load = async () => {
      await fetchPayment();
    };
    load();
  }, [fetchPayment]);

  const openRefund = () => {
    setRefundAmount('');
    setRefundReason('');
    setRefundError('');
    setShowRefund(true);
  };

  const closeRefund = () => {
    if (refunding) return;
    setShowRefund(false);
    setRefundError('');
  };

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment) return;

    setRefunding(true);
    setRefundError('');

    try {
      const body: Record<string, unknown> = {
        bookingType: payment.bookingType,
        bookingNumber: payment.bookingNumber,
        paymentId: payment.id,
        reason: refundReason.trim() || 'Staff initiated refund',
      };

      if (refundAmount.trim()) {
        const parsed = Number(refundAmount);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          throw new Error('Refund amount must be greater than zero');
        }
        body.amount = parsed;
      }

      const response = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Refund failed');
      }

      setShowRefund(false);
      setFeedback({
        type: 'success',
        message: result.data?.alreadyRefunded
          ? 'This payment was already refunded.'
          : `Refund of ${payment.currency} ${result.data?.refundAmount ?? payment.amount} initiated.`,
      });
      await fetchPayment();
    } catch (err) {
      setRefundError(err instanceof Error ? err.message : 'Refund failed');
    } finally {
      setRefunding(false);
    }
  };

  const canRefund = payment?.status === 'PAID' && canRefundPermission;
  const refundedAmount = Number(payment?.refundAmount ?? 0);
  const netAmount = payment ? Number(payment.amount) - refundedAmount : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-6 h-6 text-[#6c2432] animate-spin" />
        <p className="text-xs text-stone-500 font-mono">Loading payment...</p>
      </div>
    );
  }

  if (notFound || !payment) {
    return (
      <div className="mt-10">
        <SectionCard title="Payment Not Found">
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle className="w-6 h-6 text-stone-400" />
            <p className="text-xs text-stone-500">
              {error || 'This payment does not exist or is not available for your winery.'}
            </p>
            <Link
              href="/admin/payments"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#6c2432] bg-[#461822]/5 border border-[#461822]/10 rounded-lg hover:bg-[#461822]/10 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Payments
            </Link>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/payments"
            className="p-2 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
              VINORA • Payment Details
            </span>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium">
                {payment.bookingNumber}
              </h1>
              <StatusBadge
                status={payment.status}
                variant={STATUS_VARIANT[payment.status] ?? 'default'}
                size="md"
              />
            </div>
            <p className="text-xs text-stone-500 font-mono mt-0.5">{payment.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canRefund && (
            <button
              type="button"
              onClick={openRefund}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#6c2432] rounded-lg hover:bg-[#461822] transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Refund Payment
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/90 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <p className="text-xs font-medium">{feedback.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss feedback"
            className="shrink-0"
          >
            <X className="w-4 h-4 opacity-60 hover:opacity-100" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Payment Overview"
            description="Gateway references and settlement status"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                      Amount
                    </p>
                    <p className="text-sm font-mono font-semibold text-stone-900">
                      {payment.currency} {payment.amount}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Receipt className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                      Provider
                    </p>
                    <p className="text-sm text-stone-900">{payment.provider || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Ticket className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                      Payment Method
                    </p>
                    <p className="text-sm text-stone-900">{payment.paymentMethod || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                    Provider Order ID
                  </p>
                  <p className="text-xs font-mono text-stone-800 break-all">
                    {payment.providerOrderId || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                    Provider Payment ID
                  </p>
                  <p className="text-xs font-mono text-stone-800 break-all">
                    {payment.providerPaymentId || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                    Payment ID
                  </p>
                  <p className="text-xs font-mono text-stone-800 break-all">{payment.id}</p>
                </div>
              </div>
            </div>

            {(payment.errorCode || payment.errorMessage) && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200">
                <p className="text-[10px] uppercase font-mono tracking-wider text-rose-700">
                  Failure Detail
                </p>
                <p className="text-xs text-rose-800 mt-1">
                  {payment.errorCode ? `[${payment.errorCode}] ` : ''}
                  {payment.errorMessage || 'No additional detail'}
                </p>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Booking Reference"
            description="Reservation this payment is attached to"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Receipt className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                      Booking Number
                    </p>
                    <p className="text-sm font-mono font-medium text-[#6c2432]">
                      {payment.bookingNumber}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                      Guest
                    </p>
                    <p className="text-sm text-stone-900">{payment.guestName || 'Guest'}</p>
                    {payment.guestEmail && (
                      <p className="text-[11px] text-stone-500">{payment.guestEmail}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                      Reservation Type
                    </p>
                    <p className="text-sm text-stone-900">
                      {payment.bookingType === 'EVENT' ? 'Event Booking' : 'Experience Booking'}
                      {payment.referenceTitle ? ` • ${payment.referenceTitle}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CalendarDays className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                      {payment.bookingType === 'EVENT' ? 'Event Date' : 'Visit Date'}
                    </p>
                    <p className="text-sm text-stone-900">{formatDate(payment.bookingDate)}</p>
                    {payment.bookingTime && (
                      <p className="text-[11px] text-stone-500">{payment.bookingTime}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                      Reservation Status
                    </p>
                    <div className="mt-0.5">
                      {payment.bookingStatus ? (
                        <StatusBadge status={payment.bookingStatus} />
                      ) : (
                        <span className="text-sm text-stone-900">—</span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                    Reservation Total
                  </p>
                  <p className="text-sm font-mono text-stone-900">
                    {payment.bookingTotal ? `${payment.currency} ${payment.bookingTotal}` : '—'}
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Refund Information"
            description="Refund state recorded against this payment"
          >
            {payment.refundId || payment.refundAmount ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                    Refund ID
                  </p>
                  <p className="text-xs font-mono text-stone-800 break-all">
                    {payment.refundId || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                    Refunded Amount
                  </p>
                  <p className="text-sm font-mono font-semibold text-stone-900">
                    {payment.refundAmount ? `${payment.currency} ${payment.refundAmount}` : '—'}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                    Refund Reason
                  </p>
                  <p className="text-xs text-stone-800">{payment.refundReason || '—'}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500">
                No refund has been recorded for this payment.
              </p>
            )}
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <StatCard
            title="Amount"
            value={`${payment.currency} ${payment.amount}`}
            icon={CreditCard}
          />
          <StatCard
            title="Refunded"
            value={`${payment.currency} ${(payment.refundAmount ?? '0.00')}`}
            icon={RotateCcw}
            subtitle={payment.refundId ? `Refund ${payment.refundId}` : 'No refund recorded'}
          />
          <StatCard title="Net Captured" value={`${payment.currency} ${netAmount.toFixed(2)}`} icon={Receipt} />

          <SectionCard title="Timeline">
            <div className="space-y-3 text-xs">
              <div className="flex items-start justify-between gap-3">
                <span className="text-stone-500">Created</span>
                <span className="font-mono text-stone-800 text-right">
                  {formatDateTime(payment.createdAt)}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-stone-500">Last Updated</span>
                <span className="font-mono text-stone-800 text-right">
                  {formatDateTime(payment.updatedAt)}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-stone-500">Winery</span>
                <span className="text-stone-800 text-right">{payment.wineryName || '—'}</span>
              </div>
            </div>
          </SectionCard>

          {!canRefund && (
            <div className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/70">
              <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                Refunds
              </p>
              <p className="text-xs text-stone-600 mt-1">
                {!canRefundPermission
                  ? 'Your role does not permit issuing refunds.'
                  : payment.status === 'REFUNDED' || payment.status === 'PARTIALLY_REFUNDED'
                    ? 'This payment has already been refunded.'
                    : `Refunds are only available for payments in PAID status. This payment is ${payment.status.toLowerCase().replace('_', ' ')}.`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Refund modal */}
      {showRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-xl border border-stone-200 shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base font-medium text-stone-900">
                  Refund {payment.bookingNumber}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Full refund of {payment.currency} {payment.amount} unless an amount is provided.
                </p>
              </div>
              <button
                type="button"
                onClick={closeRefund}
                aria-label="Close"
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRefund} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                  Refund Amount (optional, for partial refunds)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={payment.amount}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                  Reason
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Reason for the refund"
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#6c2432] resize-none"
                />
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-[11px] text-amber-800">
                  Refunds are executed through the payment provider and cannot be undone.
                </p>
              </div>

              {refundError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-700">{refundError}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeRefund}
                  disabled={refunding}
                  className="px-4 py-2 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refunding}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#6c2432] rounded-lg hover:bg-[#461822] transition disabled:opacity-50"
                >
                  {refunding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {refunding ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
