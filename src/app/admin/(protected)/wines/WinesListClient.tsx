'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  X,
  Filter,
  Eye,
  Loader2,
  AlertCircle,
  Wine,
  Star,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SectionCard, StatusBadge } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';

interface WineVintage {
  id: string;
  vintageYear: number;
  price: number;
  isAvailable: boolean;
  inventoryCount: number;
}

interface WineItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  featured: boolean;
  rating: number;
  reviewCount: number;
  shortDescription: string;
  vintages: WineVintage[];
  images: { id: string; url: string; isPrimary: boolean }[];
  _count: { reviews: number; experienceWines: number };
}

export function WinesListClient() {
  const [wines, setWines] = useState<WineItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [featured, setFeatured] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchWines = async (page: number, searchVal: string, categoryVal: string, featuredVal: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (searchVal) params.set('search', searchVal);
      if (categoryVal) params.set('category', categoryVal);
      if (featuredVal) params.set('featured', featuredVal);

      const response = await fetch(`/api/admin/wines?${params.toString()}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch wines');
      setWines(result.data.wines);
      setPagination(result.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('pageSize', '20');
        const response = await fetch(`/api/admin/wines?${params.toString()}`);
        const result = await response.json();
        if (!cancelled) {
          if (!response.ok) throw new Error(result.error || 'Failed to fetch wines');
          setWines(result.data.wines);
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
    fetchWines(1, val, category, featured);
  };

  const handleCategoryFilter = (val: string) => {
    setCategory(val);
    fetchWines(1, search, val, featured);
  };

  const handleFeaturedFilter = (val: string) => {
    setFeatured(val);
    fetchWines(1, search, category, val);
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategory('');
    setFeatured('');
    fetchWines(1, '', '', '');
  };

  const handlePageChange = (newPage: number) => {
    fetchWines(newPage, search, category, featured);
  };

  const hasActiveFilters = search || category || featured;

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
            Wines
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Manage estate wines, vintages, and tasting profiles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200/80 shadow-xs">
            <Wine className="w-3.5 h-3.5 text-stone-500" />
            <span className="text-xs font-mono font-medium text-stone-700">
              {pagination.total} total
            </span>
          </div>
        </div>
      </div>

      <SectionCard
        title="All Wines"
        description="Search and manage the estate wine collection"
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
                  onClick={() => { setSearch(''); fetchWines(1, '', category, featured); }}
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
                  <option value="RED">Red</option>
                  <option value="WHITE">White</option>
                  <option value="ROSE">Rosé</option>
                  <option value="SPARKLING">Sparkling</option>
                  <option value="RESERVE">Reserve</option>
                  <option value="DESSERT">Dessert</option>
                </select>
              </div>

              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Featured</label>
                <select
                  value={featured}
                  onChange={(e) => handleFeaturedFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                >
                  <option value="">All Wines</option>
                  <option value="true">Featured Only</option>
                  <option value="false">Non-Featured</option>
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
            <p className="text-xs text-stone-500 font-mono">Loading wines...</p>
          </div>
        ) : wines.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No wines found"
              description={hasActiveFilters
                ? "No wines match your current filters. Try adjusting your search criteria."
                : "No wines have been added to the collection yet."
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
                    <th className="py-3 px-5">Wine</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Vintages</th>
                    <th className="py-3 px-4 text-center">Rating</th>
                    <th className="py-3 px-4 text-center">Experiences</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {wines.map((wine) => (
                    <tr key={wine.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {wine.images[0] && (
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                              <img
                                src={wine.images[0].url}
                                alt={wine.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/admin/wines/${wine.slug}`}
                              className="font-serif font-medium text-stone-900 hover:text-[#6c2432] hover:underline"
                            >
                              {wine.name}
                            </Link>
                            {wine.featured && (
                              <span className="ml-1.5 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60">
                                Featured
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={wine.category} />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-medium text-stone-700">{wine.vintages.length}</span>
                        {wine.vintages.filter((v) => v.isAvailable).length > 0 && (
                          <span className="text-[10px] text-stone-500 ml-1">
                            ({wine.vintages.filter((v) => v.isAvailable).length} available)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span className="font-mono text-stone-700">{Number(wine.rating).toFixed(1)}</span>
                          <span className="text-stone-500">({wine._count.reviews})</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-medium text-stone-700">{wine._count.experienceWines}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={wine.featured ? 'FEATURED' : 'STANDARD'} />
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/wines/${wine.slug}`}
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
              {wines.map((wine) => (
                <Link
                  key={wine.id}
                  href={`/admin/wines/${wine.slug}`}
                  className="block p-4 rounded-xl border border-stone-200/80 bg-white hover:bg-[#faf8f5] transition"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-serif font-medium text-stone-900">{wine.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={wine.category} />
                        {wine.featured && (
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-stone-600">
                    <span>{wine.vintages.length} vintages</span>
                    <span>{wine._count.reviews} reviews</span>
                    <span>{wine._count.experienceWines} experiences</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4">
                <p className="text-xs text-stone-500 font-mono">
                  Page {pagination.page} of {pagination.totalPages} • {pagination.total} wines
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
