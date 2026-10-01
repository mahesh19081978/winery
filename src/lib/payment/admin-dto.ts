import type { RefundPolicyResult } from './refund-policy';
import type { PaymentStatus } from '@prisma/client';

/**
 * Sanitized payment projections for the admin surfaces (/api/admin/payments and
 * /admin/payments). The mapper is intentionally picky: it never copies
 * providerSignature, idempotencyKey or metadata, so those columns cannot leak
 * into an API response, a server-rendered page or a client component prop.
 */

export type AdminPaymentBookingType = 'EXPERIENCE' | 'EVENT';

interface DecimalLike {
  toNumber: () => number;
}

interface AdminPaymentGuestRef {
  name?: string | null;
  user?: { email?: string | null } | null;
}

interface AdminPaymentBookingRef {
  bookingNumber: string;
  status?: string | null;
  date?: Date | string | null;
  time?: string | null;
  totalPrice?: DecimalLike | number | string | null;
  currency?: string | null;
  guestProfile?: AdminPaymentGuestRef | null;
  winery?: { name?: string | null; slug?: string | null; timezone?: string | null } | null;
  items?: { title?: string | null }[] | null;
}

interface AdminPaymentEventBookingRef {
  bookingNumber: string;
  status?: string | null;
  totalPrice?: DecimalLike | number | string | null;
  guestProfile?: AdminPaymentGuestRef | null;
  event?: {
    title?: string | null;
    eventDate?: Date | string | null;
    winery?: { name?: string | null; slug?: string | null; timezone?: string | null } | null;
  } | null;
}

export interface AdminPaymentRecord {
  id: string;
  amount: DecimalLike;
  currency: string;
  status: PaymentStatus;
  provider: string | null;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  paymentMethod: string | null;
  refundId: string | null;
  refundAmount?: DecimalLike | null;
  refundReason: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  booking?: AdminPaymentBookingRef | null;
  eventBooking?: AdminPaymentEventBookingRef | null;
}

export interface AdminPaymentSummaryDto {
  id: string;
  bookingType: AdminPaymentBookingType;
  bookingNumber: string;
  guestName: string | null;
  guestEmail: string | null;
  amount: string;
  currency: string;
  status: PaymentStatus;
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

export interface AdminPaymentDetailDto extends AdminPaymentSummaryDto {
  referenceTitle: string | null;
  bookingStatus: string | null;
  bookingDate: string | null;
  bookingTime: string | null;
  bookingTotal: string | null;
  wineryName: string | null;
  winerySlug: string | null;
  wineryTimezone: string | null;
  refundPolicy?: RefundPolicyResult;
}

function toAmountString(value?: DecimalLike | number | string | null): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && typeof value.toNumber === 'function') {
    return value.toNumber().toFixed(2);
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : null;
}

function toIsoString(value?: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function resolveBooking(payment: AdminPaymentRecord) {
  if (payment.booking) {
    const booking = payment.booking;
    return {
      bookingType: 'EXPERIENCE' as const,
      bookingNumber: booking.bookingNumber,
      guestName: booking.guestProfile?.name ?? null,
      guestEmail: booking.guestProfile?.user?.email ?? null,
      referenceTitle: booking.items?.[0]?.title ?? null,
      bookingStatus: booking.status ?? null,
      bookingDate: toIsoString(booking.date),
      bookingTime: booking.time ?? null,
      bookingTotal: toAmountString(booking.totalPrice),
      wineryName: booking.winery?.name ?? null,
      winerySlug: booking.winery?.slug ?? null,
        wineryTimezone: booking.winery?.timezone ?? null,
    };
  }

  const eventBooking = payment.eventBooking;
  return {
    bookingType: 'EVENT' as const,
    bookingNumber: eventBooking?.bookingNumber ?? '',
    guestName: eventBooking?.guestProfile?.name ?? null,
    guestEmail: eventBooking?.guestProfile?.user?.email ?? null,
    referenceTitle: eventBooking?.event?.title ?? null,
    bookingStatus: eventBooking?.status ?? null,
    bookingDate: toIsoString(eventBooking?.event?.eventDate),
    bookingTime: null,
    bookingTotal: toAmountString(eventBooking?.totalPrice),
    wineryName: eventBooking?.event?.winery?.name ?? null,
    winerySlug: eventBooking?.event?.winery?.slug ?? null,
      wineryTimezone: eventBooking?.event?.winery?.timezone ?? null,
  };
}

export function toAdminPaymentSummaryDto(payment: AdminPaymentRecord): AdminPaymentSummaryDto {
  const reference = resolveBooking(payment);

  return {
    id: payment.id,
    bookingType: reference.bookingType,
    bookingNumber: reference.bookingNumber,
    guestName: reference.guestName,
    guestEmail: reference.guestEmail,
    amount: toAmountString(payment.amount) ?? '0.00',
    currency: payment.currency,
    status: payment.status,
    provider: payment.provider,
    providerOrderId: payment.providerOrderId,
    providerPaymentId: payment.providerPaymentId,
    paymentMethod: payment.paymentMethod,
    refundId: payment.refundId ?? null,
    refundAmount: toAmountString(payment.refundAmount),
    refundReason: payment.refundReason ?? null,
    errorCode: payment.errorCode ?? null,
    errorMessage: payment.errorMessage ?? null,
    createdAt: toIsoString(payment.createdAt) ?? '',
    updatedAt: toIsoString(payment.updatedAt) ?? '',
  };
}

export function toAdminPaymentDetailDto(payment: AdminPaymentRecord): AdminPaymentDetailDto {
  const summary = toAdminPaymentSummaryDto(payment);
  const reference = resolveBooking(payment);

  return {
    ...summary,
    referenceTitle: reference.referenceTitle,
    bookingStatus: reference.bookingStatus,
    bookingDate: reference.bookingDate,
    bookingTime: reference.bookingTime,
    bookingTotal: reference.bookingTotal,
    wineryName: reference.wineryName,
    winerySlug: reference.winerySlug,
    wineryTimezone: reference.wineryTimezone,
  };
}
