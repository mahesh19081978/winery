'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Users,
  Mail,
  Phone,
  FileText,
  Utensils,
  CreditCard,
  Loader2,
  QrCode,
} from 'lucide-react';
import { SectionCard, StatusBadge } from '@/components/admin/UIComponents';
import { BookingActionsClient } from '@/components/admin/bookings/BookingActionsClient';

interface BookingData {
  id: string;
  bookingNumber: string;
  date: string;
  time: string;
  adults: number;
  children: number;
  totalGuests: number;
  subtotal: number;
  taxAmount: number;
  totalPrice: number;
  currency: string;
  status: string;
  specialRequests?: string;
  dietaryRequirements?: string;
  qrCodeUrl?: string;
  createdAt: string;
  guestProfile: {
    id: string;
    name: string;
    phone?: string;
    avatar?: string;
    user: {
      email: string;
    };
  } | null;
  items: {
    id: string;
    title: string;
    itemType: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    experience?: {
      title: string;
      slug: string;
    } | null;
  }[];
  attendees: {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
    isPrimary: boolean;
    dietaryNotes?: string;
  }[];
  statusHistory: {
    id: string;
    fromStatus: string;
    toStatus: string;
    changedBy?: string;
    notes?: string;
    createdAt: string;
  }[];
  payments: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    provider?: string;
    paymentMethod?: string;
    createdAt: string;
  }[];
}

interface BookingDetailClientProps {
  booking: BookingData;
  experiences?: { id: string; title: string }[];
  adminEmail?: string;
  adminRole?: string;
}

export function BookingDetailClient({ booking: initialBooking }: BookingDetailClientProps) {
  const router = useRouter();
  const [booking, setBooking] = useState(initialBooking);
  const [refreshing, setRefreshing] = useState(false);

  const handleStatusUpdated = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/bookings/${booking.bookingNumber}`);
      const result = await response.json();
      if (result.success) {
        setBooking(result.data);
      }
    } catch {
      router.refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const totalPaid = booking.payments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const outstanding = Number(booking.totalPrice) - totalPaid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/bookings"
            className="p-2 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
                Domaine Élysée • Booking Details
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium">
                {booking.bookingNumber}
              </h1>
              <StatusBadge status={booking.status} size="md" />
            </div>
          </div>
        </div>

        <BookingActionsClient
          currentStatus={booking.status as 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'}
          bookingNumber={booking.bookingNumber}
          onStatusUpdated={handleStatusUpdated}
        />
      </div>

      {refreshing && (
        <div className="flex items-center gap-2 text-xs text-stone-500 font-mono">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Refreshing...
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Overview */}
          <SectionCard title="Booking Overview" description="Reservation details and scheduling information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CalendarDays className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Date</p>
                    <p className="text-sm font-medium text-stone-900">
                      {new Date(booking.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Time</p>
                    <p className="text-sm font-medium text-stone-900">{booking.time}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Party Size</p>
                    <p className="text-sm font-medium text-stone-900">
                      {booking.totalGuests} guests
                      <span className="text-stone-500 text-xs ml-1">
                        ({booking.adults} adult{booking.adults !== 1 ? 's' : ''}
                        {booking.children > 0 ? `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}` : ''})
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-stone-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Experience</p>
                    <p className="text-sm font-serif font-medium text-stone-900">
                      {booking.items[0]?.experience?.title || booking.items[0]?.title || 'Estate Tasting'}
                    </p>
                  </div>
                </div>
                {booking.specialRequests && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-stone-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Special Requests</p>
                      <p className="text-sm text-stone-700">{booking.specialRequests}</p>
                    </div>
                  </div>
                )}
                {booking.dietaryRequirements && (
                  <div className="flex items-start gap-3">
                    <Utensils className="w-4 h-4 text-stone-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Dietary Requirements</p>
                      <p className="text-sm text-stone-700">{booking.dietaryRequirements}</p>
                    </div>
                  </div>
                )}
                {booking.qrCodeUrl && (
                  <div className="flex items-start gap-3">
                    <QrCode className="w-4 h-4 text-stone-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">QR Code</p>
                      <p className="text-xs text-stone-500 font-mono">{booking.qrCodeUrl}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Guest Information */}
          <SectionCard title="Guest Information" description="Primary guest contact and additional attendees">
            <div className="space-y-4">
              {booking.guestProfile && (
                <div className="p-4 rounded-xl border border-stone-200/80 bg-[#faf8f5]/40">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#461822]/10 border border-[#461822]/20 flex items-center justify-center text-[#6c2432] font-serif font-medium text-sm">
                      {booking.guestProfile.name?.charAt(0)?.toUpperCase() || 'G'}
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">{booking.guestProfile.name}</p>
                      <p className="text-[10px] uppercase font-mono text-stone-500">Primary Guest</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <Mail className="w-3.5 h-3.5 text-stone-400" />
                      {booking.guestProfile.user?.email || 'No email'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      {booking.guestProfile.phone || 'No phone'}
                    </div>
                  </div>
                </div>
              )}

              {booking.attendees.length > 1 && (
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-2">
                    Additional Attendees ({booking.attendees.length - 1})
                  </p>
                  <div className="space-y-2">
                    {booking.attendees
                      .filter((a) => !a.isPrimary)
                      .map((attendee) => (
                        <div key={attendee.id} className="flex items-center gap-3 p-3 rounded-lg border border-stone-200/60 bg-white">
                          <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 text-xs font-medium">
                            {attendee.fullName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-stone-900">{attendee.fullName}</p>
                            {attendee.email && (
                              <p className="text-[11px] text-stone-500">{attendee.email}</p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Booking Items */}
          <SectionCard title="Booking Items" description="Experience and add-on line items">
            <div className="overflow-x-auto -mx-5 -my-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-100 bg-[#faf8f5]/60 text-stone-500 uppercase tracking-wider font-mono text-[10px]">
                    <th className="py-3 px-5">Item</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {booking.items.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-medium text-stone-900">{item.title}</div>
                        <div className="text-[11px] text-stone-500 font-mono">{item.itemType.replace(/_/g, ' ')}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center text-stone-700">{item.quantity}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-stone-700">
                        ${Number(item.unitPrice).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-semibold text-stone-900">
                        ${Number(item.totalPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* Right Column: Financial & History */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <SectionCard title="Financial Summary" description="Payment breakdown and status">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-600">Subtotal</span>
                <span className="font-mono font-medium text-stone-900">${Number(booking.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-600">Tax (9%)</span>
                <span className="font-mono font-medium text-stone-900">${Number(booking.taxAmount).toFixed(2)}</span>
              </div>
              <div className="border-t border-stone-200 pt-3 flex items-center justify-between">
                <span className="text-sm font-medium text-stone-900">Total</span>
                <span className="text-lg font-serif font-medium text-stone-900">${Number(booking.totalPrice).toFixed(2)}</span>
              </div>

              <div className="border-t border-stone-100 pt-3 mt-3">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-stone-600">Paid</span>
                  <span className="font-mono font-medium text-emerald-700">${totalPaid.toFixed(2)}</span>
                </div>
                {outstanding > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-600">Outstanding</span>
                    <span className="font-mono font-medium text-amber-700">${outstanding.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {booking.payments.length > 0 && (
                <div className="border-t border-stone-100 pt-3 mt-3">
                  <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-2">Payment Records</p>
                  <div className="space-y-2">
                    {booking.payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-200/60">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-3.5 h-3.5 text-stone-400" />
                          <div>
                            <p className="text-xs font-medium text-stone-900">${Number(payment.amount).toFixed(2)}</p>
                            <p className="text-[10px] text-stone-500">{payment.provider || 'Unknown'} • {payment.paymentMethod || 'N/A'}</p>
                          </div>
                        </div>
                        <StatusBadge status={payment.status} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Status History */}
          <SectionCard title="Status History" description="Chronological booking status changes">
            <div className="space-y-0">
              {booking.statusHistory.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-4 text-center">No status changes recorded</p>
              ) : (
                booking.statusHistory.map((entry, idx) => (
                  <div key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {idx < booking.statusHistory.length - 1 && (
                      <div className="absolute left-[7px] top-5 bottom-0 w-px bg-stone-200" />
                    )}
                    <div className="w-3.5 h-3.5 rounded-full bg-[#461822]/10 border-2 border-[#461822]/30 shrink-0 mt-0.5 relative z-10" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-xs font-medium text-stone-900">
                          {entry.fromStatus.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-stone-400">→</span>
                        <span className="text-xs font-medium text-stone-900">
                          {entry.toStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-stone-500">
                          {new Date(entry.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {entry.changedBy && (
                          <span className="text-[10px] font-mono text-stone-400">
                            by {entry.changedBy}
                          </span>
                        )}
                      </div>
                      {entry.notes && (
                        <p className="text-[11px] text-stone-600 mt-1 italic">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
