'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CalendarDays, Users, DollarSign, ChevronLeft, ChevronRight, Eye, Loader2, AlertCircle } from 'lucide-react';
import { SectionCard, StatusBadge } from '@/components/admin/UIComponents';
import { BookingFiltersClient } from '@/components/admin/bookings/BookingFiltersClient';
import EmptyState from '@/components/common/EmptyState';

interface BookingItem {
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
  status: string;
  specialRequests?: string;
  dietaryRequirements?: string;
  createdAt: string;
  guestProfile: {
    id: string;
    name: string;
    phone?: string;
    user: { email: string };
  } | null;
  items: {
    id: string;
    title: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    experience?: { title: string; slug: string } | null;
  }[];
  payments: {
    id: string;
    status: string;
    amount: number;
  }[];
}

export function BookingListClient() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchBookings = useCallback(async (page: number, searchVal: string, statusVal: string, dateFromVal: string, dateToVal: string) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (searchVal) params.set('search', searchVal);
      if (statusVal) params.set('status', statusVal);
      if (dateFromVal) params.set('dateFrom', dateFromVal);
      if (dateToVal) params.set('dateTo', dateToVal);

      const response = await fetch(`/api/admin/bookings?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch bookings');
      }

      setBookings(result.data.bookings);
      setPagination(result.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('pageSize', '20');
        const response = await fetch(`/api/admin/bookings?${params.toString()}`);
        const result = await response.json();
        if (!cancelled) {
          if (!response.ok) throw new Error(result.error || 'Failed to fetch bookings');
          setBookings(result.data.bookings);
          setPagination(result.data.pagination);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSearch = (val: string) => {
    setSearch(val);
    fetchBookings(1, val, status, dateFrom, dateTo);
  };

  const handleStatusFilter = (val: string) => {
    setStatus(val);
    fetchBookings(1, search, val, dateFrom, dateTo);
  };

  const handleDateFilter = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    fetchBookings(1, search, status, from, to);
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    fetchBookings(1, '', '', '', '');
  };

  const handlePageChange = (newPage: number) => {
    fetchBookings(newPage, search, status, dateFrom, dateTo);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
              Domaine Élysée • Estate Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium mt-1">
            Bookings
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Manage reservations, confirmations, and guest check-ins
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200/80 shadow-xs">
            <CalendarDays className="w-3.5 h-3.5 text-stone-500" />
            <span className="text-xs font-mono font-medium text-stone-700">
              {pagination.total} total
            </span>
          </div>
        </div>
      </div>

      <SectionCard
        title="All Reservations"
        description="Search, filter, and manage all guest reservations"
      >
        <BookingFiltersClient
          onSearch={handleSearch}
          onStatusFilter={handleStatusFilter}
          onDateFilter={handleDateFilter}
          onClearFilters={handleClearFilters}
          currentSearch={search}
          currentStatus={status}
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
            <p className="text-xs text-stone-500 font-mono">Loading reservations...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No bookings found"
              description={search || status || dateFrom || dateTo
                ? "No reservations match your current filters. Try adjusting your search criteria."
                : "No reservations have been made yet. Bookings will appear here once guests start booking experiences."
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
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4">Experience</th>
                    <th className="py-3 px-4 text-center">Guests</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {bookings.map((booking) => {
                    const item = booking.items[0];
                    const experienceTitle = item?.experience?.title || item?.title || 'Estate Tasting';
                    const hasPaid = booking.payments.some((p) => p.status === 'PAID');

                    return (
                      <tr key={booking.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3.5 px-5">
                          <Link
                            href={`/admin/bookings/${booking.bookingNumber}`}
                            className="font-mono font-medium text-[#6c2432] hover:text-[#461822] hover:underline"
                          >
                            {booking.bookingNumber}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-medium text-stone-900">
                            {new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="text-[11px] font-mono text-stone-500">{booking.time}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-stone-900">
                            {booking.guestProfile?.name || 'Guest'}
                          </div>
                          <div className="text-[11px] text-stone-500 truncate max-w-[140px]">
                            {booking.guestProfile?.user?.email || ''}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-serif text-stone-800">
                          {experienceTitle}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="font-semibold text-stone-900">{booking.totalGuests}</span>
                          <span className="text-stone-500 text-[11px]"> ({booking.adults}A{booking.children > 0 ? `, ${booking.children}C` : ''})</span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="font-mono font-semibold text-stone-900">
                            ${Number(booking.totalPrice).toFixed(2)}
                          </span>
                          {hasPaid && (
                            <span className="ml-1.5 text-[10px] text-emerald-600 font-medium">PAID</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <StatusBadge status={booking.status} />
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <Link
                            href={`/admin/bookings/${booking.bookingNumber}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#6c2432] bg-[#461822]/5 border border-[#461822]/10 rounded-md hover:bg-[#461822]/10 transition"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="mt-6 space-y-3 md:hidden">
              {bookings.map((booking) => {
                const item = booking.items[0];
                const experienceTitle = item?.experience?.title || item?.title || 'Estate Tasting';

                return (
                  <Link
                    key={booking.id}
                    href={`/admin/bookings/${booking.bookingNumber}`}
                    className="block p-4 rounded-xl border border-stone-200/80 bg-white hover:bg-[#faf8f5] transition"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="font-mono font-medium text-[#6c2432] text-sm">
                          {booking.bookingNumber}
                        </span>
                        <h4 className="font-serif font-medium text-stone-900 mt-0.5">
                          {experienceTitle}
                        </h4>
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-stone-600">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {booking.totalGuests} guests
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        ${Number(booking.totalPrice).toFixed(2)}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-stone-500">
                      {booking.guestProfile?.name || 'Guest'} • {booking.time}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4">
                <p className="text-xs text-stone-500 font-mono">
                  Page {pagination.page} of {pagination.totalPages} • {pagination.total} bookings
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
