'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  X,
  Filter,
  Eye,
  Loader2,
  AlertCircle,
  Sparkles,
  Clock,
  Users,
  DollarSign,
  Star,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SectionCard, StatusBadge } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';

interface ExperienceItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  durationMinutes: number;
  durationText: string;
  price: number;
  currency: string;
  capacity: number;
  minGuests: number;
  maxGuests: number;
  featured: boolean;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  shortDescription: string;
  images: { id: string; url: string; isPrimary: boolean }[];
  _count: { bookingItems: number; reviews: number };
}

export function ExperiencesListClient() {
  const [experiences, setExperiences] = useState<ExperienceItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [isActive, setIsActive] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchExperiences = useCallback(async (page: number, searchVal: string, categoryVal: string, activeVal: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (searchVal) params.set('search', searchVal);
      if (categoryVal) params.set('category', categoryVal);
      if (activeVal) params.set('isActive', activeVal);

      const response = await fetch(`/api/admin/experiences?${params.toString()}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch experiences');
      setExperiences(result.data.experiences);
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
        const response = await fetch(`/api/admin/experiences?${params.toString()}`);
        const result = await response.json();
        if (!cancelled) {
          if (!response.ok) throw new Error(result.error || 'Failed to fetch experiences');
          setExperiences(result.data.experiences);
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
    fetchExperiences(1, val, category, isActive);
  };

  const handleCategoryFilter = (val: string) => {
    setCategory(val);
    fetchExperiences(1, search, val, isActive);
  };

  const handleActiveFilter = (val: string) => {
    setIsActive(val);
    fetchExperiences(1, search, category, val);
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategory('');
    setIsActive('');
    fetchExperiences(1, '', '', '');
  };

  const handlePageChange = (newPage: number) => {
    fetchExperiences(newPage, search, category, isActive);
  };

  const hasActiveFilters = search || category || isActive;

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
            Experiences
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Manage tasting experiences, tours, and cellar events
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200/80 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-stone-500" />
            <span className="text-xs font-mono font-medium text-stone-700">
              {pagination.total} total
            </span>
          </div>
        </div>
      </div>

      <SectionCard
        title="All Experiences"
        description="Search and manage vineyard experiences and tasting sessions"
      >
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSearch(search); }}
              className="flex-1 relative"
            >
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search by name or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); fetchExperiences(1, '', category, isActive); }}
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
                <span className="w-4 h-4 rounded-full bg-[#6c2432] text-white text-[10px] flex items-center justify-center">!</span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-3 p-3 bg-[#faf8f5] rounded-lg border border-stone-200/80">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Category</label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                >
                  <option value="">All Categories</option>
                  <option value="TASTING">Tasting</option>
                  <option value="TOUR">Tour</option>
                  <option value="CULINARY">Culinary</option>
                  <option value="PRIVATE">Private</option>
                </select>
              </div>

              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Status</label>
                <select
                  value={isActive}
                  onChange={(e) => handleActiveFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                >
                  <option value="">All Statuses</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
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
            <p className="text-xs text-stone-500 font-mono">Loading experiences...</p>
          </div>
        ) : experiences.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No experiences found"
              description={hasActiveFilters
                ? "No experiences match your current filters. Try adjusting your search criteria."
                : "No experiences have been configured yet."
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
                    <th className="py-3 px-5">Experience</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Duration</th>
                    <th className="py-3 px-4 text-right">Price</th>
                    <th className="py-3 px-4 text-center">Capacity</th>
                    <th className="py-3 px-4 text-center">Bookings</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {experiences.map((exp) => (
                    <tr key={exp.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {exp.images[0] && (
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                              <img
                                src={exp.images[0].url}
                                alt={exp.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/admin/experiences/${exp.slug}`}
                              className="font-serif font-medium text-stone-900 hover:text-[#6c2432] hover:underline"
                            >
                              {exp.title}
                            </Link>
                            {exp.featured && (
                              <span className="ml-1.5 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60">
                                Featured
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={exp.category} />
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 text-stone-600">
                          <Clock className="w-3 h-3" />
                          {exp.durationText}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-stone-900 whitespace-nowrap">
                        ${Number(exp.price).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 text-stone-600">
                          <Users className="w-3 h-3" />
                          {exp.capacity}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-medium text-stone-700">{exp._count.bookingItems}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={exp.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/experiences/${exp.slug}`}
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
              {experiences.map((exp) => (
                <Link
                  key={exp.id}
                  href={`/admin/experiences/${exp.slug}`}
                  className="block p-4 rounded-xl border border-stone-200/80 bg-white hover:bg-[#faf8f5] transition"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-serif font-medium text-stone-900">{exp.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={exp.category} />
                        <StatusBadge status={exp.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </div>
                    </div>
                    {exp.featured && (
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-stone-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {exp.durationText}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      ${Number(exp.price).toFixed(2)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {exp.capacity}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4">
                <p className="text-xs text-stone-500 font-mono">
                  Page {pagination.page} of {pagination.totalPages} • {pagination.total} experiences
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
