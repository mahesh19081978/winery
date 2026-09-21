'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { GlassWater, CalendarDays, ChevronLeft, ChevronRight, Eye, Loader2, AlertCircle, Search, X, Filter, MapPin, BookOpen } from 'lucide-react';
import { SectionCard } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';

interface TastingSessionItem {
  id: string;
  sessionDate: string;
  location: string | null;
  notes: string | null;
  createdAt: string;
  guestProfile: {
    id: string;
    name: string;
    user: { email: string };
  };
  booking: {
    bookingNumber: string;
    date: Date;
    status: string;
  } | null;
  records: {
    id: string;
    wineNameSnapshot: string;
    vintageYear: number;
    rating: number;
    wouldDrinkAgain: string;
    wineVintage: {
      wine: { name: string; slug: string };
    };
  }[];
}

export function TastingListClient() {
  const [sessions, setSessions] = useState<TastingSessionItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [hasBooking, setHasBooking] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchSessions = useCallback(async (page: number, searchVal: string, dateFromVal: string, dateToVal: string, hasBookingVal: string) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (searchVal) params.set('search', searchVal);
      if (dateFromVal) params.set('dateFrom', dateFromVal);
      if (dateToVal) params.set('dateTo', dateToVal);
      if (hasBookingVal) params.set('hasBooking', hasBookingVal);

      const response = await fetch(`/api/admin/tastings?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch tasting sessions');
      }

      setSessions(result.data.sessions);
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
        const response = await fetch(`/api/admin/tastings?${params.toString()}`);
        const result = await response.json();
        if (!cancelled) {
          if (!response.ok) throw new Error(result.error || 'Failed to fetch tasting sessions');
          setSessions(result.data.sessions);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSessions(1, search, dateFrom, dateTo, hasBooking);
  };

  const handleClearSearch = () => {
    setSearch('');
    fetchSessions(1, '', dateFrom, dateTo, hasBooking);
  };

  const handleDateFilter = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    fetchSessions(1, search, from, to, hasBooking);
  };

  const handleBookingFilter = (val: string) => {
    setHasBooking(val);
    fetchSessions(1, search, dateFrom, dateTo, val);
  };

  const handleClearFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setHasBooking('');
    setShowFilters(false);
    fetchSessions(1, '', '', '', '');
  };

  const handlePageChange = (newPage: number) => {
    fetchSessions(newPage, search, dateFrom, dateTo, hasBooking);
  };

  const hasActiveFilters = search || dateFrom || dateTo || hasBooking;

  const getAverageRating = (records: TastingSessionItem['records']) => {
    if (records.length === 0) return null;
    const sum = records.reduce((acc, r) => acc + Number(r.rating), 0);
    return (sum / records.length).toFixed(1);
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
            Tastings
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Review tasting sessions, records, and guest sensory data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200/80 shadow-xs">
            <GlassWater className="w-3.5 h-3.5 text-stone-500" />
            <span className="text-xs font-mono font-medium text-stone-700">
              {pagination.total} total
            </span>
          </div>
        </div>
      </div>

      <SectionCard
        title="Tasting Sessions"
        description="Search and review all guest tasting sessions"
      >
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search by guest name, email, booking number, or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition ${
                showFilters || hasActiveFilters
                  ? 'bg-[#461822]/5 border-[#461822]/20 text-[#6c2432]'
                  : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="w-4 h-4 rounded-full bg-[#6c2432] text-white text-[10px] flex items-center justify-center">
                  !
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-3 p-3 bg-[#faf8f5] rounded-lg border border-stone-200/80">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Booking Link</label>
                <select
                  value={hasBooking}
                  onChange={(e) => handleBookingFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                >
                  <option value="">All Sessions</option>
                  <option value="yes">With Booking</option>
                  <option value="no">Without Booking</option>
                </select>
              </div>

              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleDateFilter(e.target.value, dateTo)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                />
              </div>

              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => handleDateFilter(dateFrom, e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                />
              </div>

              {hasActiveFilters && (
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <p className="text-xs text-rose-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="mt-6 flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-6 h-6 text-[#6c2432] animate-spin" />
            <p className="text-xs text-stone-500 font-mono">Loading tasting sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<GlassWater className="w-7 h-7" />}
              title="No tasting sessions found"
              description={hasActiveFilters
                ? "No tasting sessions match your current filters. Try adjusting your search criteria."
                : "No tasting sessions have been recorded yet. Sessions will appear here once guests complete tastings."
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
                    <th className="py-3 px-5">Guest</th>
                    <th className="py-3 px-4">Session Date</th>
                    <th className="py-3 px-4">Booking</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-center">Wines</th>
                    <th className="py-3 px-4 text-center">Avg Rating</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {sessions.map((session) => {
                    const avgRating = getAverageRating(session.records);
                    return (
                      <tr key={session.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="font-medium text-stone-900">
                            {session.guestProfile.name}
                          </div>
                          <div className="text-[11px] text-stone-500 truncate max-w-[160px]">
                            {session.guestProfile.user.email}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-medium text-stone-900">
                            {new Date(session.sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="text-[11px] font-mono text-stone-500">
                            {new Date(session.sessionDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {session.booking ? (
                            <Link
                              href={`/admin/bookings/${session.booking.bookingNumber}`}
                              className="font-mono font-medium text-[#6c2432] hover:text-[#461822] hover:underline"
                            >
                              {session.booking.bookingNumber}
                            </Link>
                          ) : (
                            <span className="text-stone-400 italic">Walk-in</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {session.location ? (
                            <div className="flex items-center gap-1.5 text-stone-700">
                              <MapPin className="w-3 h-3 text-stone-400" />
                              <span>{session.location}</span>
                            </div>
                          ) : (
                            <span className="text-stone-400 italic">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="font-semibold text-stone-900">{session.records.length}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {avgRating ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className="font-mono font-semibold text-stone-900">{avgRating}</span>
                              <span className="text-stone-400">/5</span>
                            </div>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <Link
                            href={`/admin/tastings/${session.id}`}
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
              {sessions.map((session) => {
                const avgRating = getAverageRating(session.records);
                return (
                  <Link
                    key={session.id}
                    href={`/admin/tastings/${session.id}`}
                    className="block p-4 rounded-xl border border-stone-200/80 bg-white hover:bg-[#faf8f5] transition"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-serif font-medium text-stone-900">
                          {session.guestProfile.name}
                        </h4>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {session.guestProfile.user.email}
                        </p>
                      </div>
                      {session.booking ? (
                        <span className="font-mono text-[10px] text-[#6c2432] bg-[#461822]/5 px-2 py-0.5 rounded">
                          {session.booking.bookingNumber}
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-400 italic">Walk-in</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-stone-600">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(session.sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {session.records.length} wines
                      </div>
                      {avgRating && (
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-semibold">{avgRating}</span>
                          <span>/5</span>
                        </div>
                      )}
                    </div>
                    {session.location && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-stone-500">
                        <MapPin className="w-3 h-3" />
                        {session.location}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4">
                <p className="text-xs text-stone-500 font-mono">
                  Page {pagination.page} of {pagination.totalPages} • {pagination.total} sessions
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
