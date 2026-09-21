'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  AlertCircle,
  Search,
  X,
  Filter,
  CalendarDays,
  GlassWater,
  Star,
  Mail,
  Phone,
  Ticket,
} from 'lucide-react';
import { SectionCard } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';

interface GuestItem {
  id: string;
  name: string;
  phone: string | null;
  avatar: string | null;
  dateOfBirth: string | null;
  visitsCount: number;
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    email: string;
    role: string;
  };
  _count: {
    bookings: number;
    tastingSessions: number;
    tastingRecords: number;
    reviews: number;
    eventBookings: number;
  };
}

export function GuestListClient() {
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [hasBookings, setHasBookings] = useState('');
  const [hasTastings, setHasTastings] = useState('');
  const [hasReviews, setHasReviews] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchGuests = useCallback(async (
    page: number,
    searchVal: string,
    hasBookingsVal: string,
    hasTastingsVal: string,
    hasReviewsVal: string
  ) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (searchVal) params.set('search', searchVal);
      if (hasBookingsVal) params.set('hasBookings', hasBookingsVal);
      if (hasTastingsVal) params.set('hasTastings', hasTastingsVal);
      if (hasReviewsVal) params.set('hasReviews', hasReviewsVal);

      const response = await fetch(`/api/admin/guests?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch guests');
      }

      setGuests(result.data.guests);
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
        const response = await fetch(`/api/admin/guests?${params.toString()}`);
        const result = await response.json();
        if (!cancelled) {
          if (!response.ok) throw new Error(result.error || 'Failed to fetch guests');
          setGuests(result.data.guests);
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
    fetchGuests(1, search, hasBookings, hasTastings, hasReviews);
  };

  const handleClearSearch = () => {
    setSearch('');
    fetchGuests(1, '', hasBookings, hasTastings, hasReviews);
  };

  const handleFilterChange = (field: string, value: string) => {
    const newBookings = field === 'hasBookings' ? value : hasBookings;
    const newTastings = field === 'hasTastings' ? value : hasTastings;
    const newReviews = field === 'hasReviews' ? value : hasReviews;

    if (field === 'hasBookings') setHasBookings(value);
    if (field === 'hasTastings') setHasTastings(value);
    if (field === 'hasReviews') setHasReviews(value);

    fetchGuests(1, search, newBookings, newTastings, newReviews);
  };

  const handleClearFilters = () => {
    setSearch('');
    setHasBookings('');
    setHasTastings('');
    setHasReviews('');
    setShowFilters(false);
    fetchGuests(1, '', '', '', '');
  };

  const handlePageChange = (newPage: number) => {
    fetchGuests(newPage, search, hasBookings, hasTastings, hasReviews);
  };

  const hasActiveFilters = search || hasBookings || hasTastings || hasReviews;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
            Guests
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Guest profiles, booking history, and CRM overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200/80 shadow-xs">
            <Users className="w-3.5 h-3.5 text-stone-500" />
            <span className="text-xs font-mono font-medium text-stone-700">
              {pagination.total} total
            </span>
          </div>
        </div>
      </div>

      <SectionCard
        title="Guest Directory"
        description="Search and manage guest profiles and CRM data"
      >
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
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
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Bookings</label>
                <select
                  value={hasBookings}
                  onChange={(e) => handleFilterChange('hasBookings', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                >
                  <option value="">All Guests</option>
                  <option value="yes">With Bookings</option>
                  <option value="no">Without Bookings</option>
                </select>
              </div>

              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Tastings</label>
                <select
                  value={hasTastings}
                  onChange={(e) => handleFilterChange('hasTastings', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                >
                  <option value="">All Guests</option>
                  <option value="yes">With Tasting Records</option>
                  <option value="no">Without Tasting Records</option>
                </select>
              </div>

              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Reviews</label>
                <select
                  value={hasReviews}
                  onChange={(e) => handleFilterChange('hasReviews', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                >
                  <option value="">All Guests</option>
                  <option value="yes">With Reviews</option>
                  <option value="no">Without Reviews</option>
                </select>
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
            <p className="text-xs text-stone-500 font-mono">Loading guests...</p>
          </div>
        ) : guests.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<Users className="w-7 h-7" />}
              title="No guests found"
              description={hasActiveFilters
                ? "No guests match your current filters. Try adjusting your search criteria."
                : "No guest profiles exist yet. Guests are created when bookings are made."
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
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4 text-center">Bookings</th>
                    <th className="py-3 px-4 text-center">Sessions</th>
                    <th className="py-3 px-4 text-center">Reviews</th>
                    <th className="py-3 px-4 text-center">Events</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {guests.map((guest) => (
                    <tr key={guest.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#461822]/10 border border-[#461822]/20 flex items-center justify-center text-[#6c2432] font-serif font-medium text-xs shrink-0">
                            {guest.name?.charAt(0)?.toUpperCase() || 'G'}
                          </div>
                          <div>
                            <div className="font-medium text-stone-900">{guest.name}</div>
                            {guest.phone && (
                              <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                                <Phone className="w-2.5 h-2.5" />
                                {guest.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-stone-600">
                          <Mail className="w-3 h-3 text-stone-400" />
                          <span className="truncate max-w-[160px]">{guest.user.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <CalendarDays className="w-3 h-3 text-stone-400" />
                          <span className="font-semibold text-stone-900">{guest._count.bookings}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <GlassWater className="w-3 h-3 text-stone-400" />
                          <span className="font-semibold text-stone-900">{guest._count.tastingRecords}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-3 h-3 text-stone-400" />
                          <span className="font-semibold text-stone-900">{guest._count.reviews}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <Ticket className="w-3 h-3 text-stone-400" />
                          <span className="font-semibold text-stone-900">{guest._count.eventBookings}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-stone-600">{formatDate(guest.createdAt)}</span>
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/guests/${guest.id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#6c2432] bg-[#461822]/5 border border-[#461822]/10 rounded-md hover:bg-[#461822]/10 transition"
                        >
                          <Eye className="w-3 h-3" />
                          View CRM
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="mt-6 space-y-3 md:hidden">
              {guests.map((guest) => (
                <Link
                  key={guest.id}
                  href={`/admin/guests/${guest.id}`}
                  className="block p-4 rounded-xl border border-stone-200/80 bg-white hover:bg-[#faf8f5] transition"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#461822]/10 border border-[#461822]/20 flex items-center justify-center text-[#6c2432] font-serif font-medium text-sm">
                        {guest.name?.charAt(0)?.toUpperCase() || 'G'}
                      </div>
                      <div>
                        <h4 className="font-serif font-medium text-stone-900">{guest.name}</h4>
                        <p className="text-[11px] text-stone-500 mt-0.5">{guest.user.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-stone-600 mt-2">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {guest._count.bookings} bookings
                    </div>
                    <div className="flex items-center gap-1">
                      <GlassWater className="w-3 h-3" />
                      {guest._count.tastingRecords} tastings
                    </div>
                    {guest._count.reviews > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {guest._count.reviews} reviews
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4">
                <p className="text-xs text-stone-500 font-mono">
                  Page {pagination.page} of {pagination.totalPages} • {pagination.total} guests
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
