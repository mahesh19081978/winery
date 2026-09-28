'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Layers,
  Wine,
  Search,
  RefreshCw,
  AlertCircle,
  Loader2,
  Package,
  GlassWater,
  ArrowRight,
} from 'lucide-react';
import { StatCard, StatusBadge } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';
import { useIsMounted } from '@/hooks/useIsMounted';

interface VintageItem {
  id: string;
  vintageYear: number;
  price: number;
  currency: string;
  alcohol: string;
  oakAging: string | null;
  tastingNotes: string | null;
  aromaTags: string[];
  body: number;
  acidity: number;
  sweetness: number;
  tannin: number;
  isAvailable: boolean;
  inventoryCount: number;
  wine: {
    id: string;
    slug: string;
    name: string;
    category: string;
    characteristics: string[];
    servingTemp: string | null;
    cellarPotential: string | null;
  };
  _count: {
    tastingRecords: number;
  };
}

export function VintagesClient() {
  const mounted = useIsMounted();
  const [vintages, setVintages] = useState<VintageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');

  const fetchVintages = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/vintages');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load vintages');
      setVintages(json.data.vintages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching vintages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/admin/vintages');
        const json = await res.json();
        if (!cancelled) {
          if (!res.ok) throw new Error(json.error || 'Failed to load vintages');
          setVintages(json.data.vintages || []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error fetching vintages');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const years = useMemo(() => {
    const set = new Set<number>();
    vintages.forEach((v) => set.add(v.vintageYear));
    return Array.from(set).sort((a, b) => b - a);
  }, [vintages]);

  const filteredVintages = useMemo(() => {
    return vintages.filter((v) => {
      if (search) {
        const query = search.toLowerCase();
        const matchesName = v.wine.name.toLowerCase().includes(query);
        const matchesTags = v.aromaTags.some((tag) => tag.toLowerCase().includes(query));
        const matchesYear = String(v.vintageYear).includes(query);
        if (!matchesName && !matchesTags && !matchesYear) return false;
      }
      if (categoryFilter && v.wine.category !== categoryFilter) return false;
      if (yearFilter && String(v.vintageYear) !== yearFilter) return false;
      if (availabilityFilter === 'AVAILABLE' && !v.isAvailable) return false;
      if (availabilityFilter === 'UNAVAILABLE' && v.isAvailable) return false;
      return true;
    });
  }, [vintages, search, categoryFilter, yearFilter, availabilityFilter]);

  const totalBottles = useMemo(() => {
    return vintages.reduce((sum, v) => sum + (v.inventoryCount || 0), 0);
  }, [vintages]);

  const totalTastings = useMemo(() => {
    return vintages.reduce((sum, v) => sum + (v._count?.tastingRecords || 0), 0);
  }, [vintages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
              Wine Domain
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-mono text-stone-500">Cellar Reserves</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium mt-1">
            Vintages Library
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Cellar inventory, barrel aging specifications, sensory profiles, and tasting logs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchVintages}
            disabled={mounted ? loading : false}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-medium transition shadow-2xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading && mounted ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/admin/wines"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#461822] hover:bg-[#6c2432] text-white text-xs font-medium transition shadow-xs"
          >
            <Wine className="w-3.5 h-3.5" />
            <span>Wines Catalog</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Vintages"
          value={vintages.length}
          subtitle="Bottled cellar vintages"
          icon={Layers}
        />
        <StatCard
          title="Total Bottles"
          value={totalBottles.toLocaleString()}
          subtitle="Cellar inventory count"
          icon={Package}
        />
        <StatCard
          title="Harvest Years"
          value={years.length}
          subtitle={years.length > 0 ? `${years[years.length - 1]} – ${years[0]}` : 'None'}
          icon={Wine}
        />
        <StatCard
          title="Tasting Logs"
          value={totalTastings}
          subtitle="Tasting journal records"
          icon={GlassWater}
        />
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by wine name, year, or aroma note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#aa853e]"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none text-stone-700"
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

          <div>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none text-stone-700 font-mono"
            >
              <option value="">All Harvest Years</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  Vintage {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none text-stone-700"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="UNAVAILABLE">Unavailable / Cellared</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vintages Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-stone-500">
          <Loader2 className="w-6 h-6 animate-spin text-[#6c2432] mb-2" />
          <span className="text-xs">Loading vintages catalog...</span>
        </div>
      ) : filteredVintages.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-7 h-7" />}
          title="No vintages found"
          description={search ? 'No vintages match your search criteria.' : 'No vintages are registered in the cellar system.'}
          actionText="View Wines"
          actionHref="/admin/wines"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVintages.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-stone-200/80 shadow-xs hover:shadow-sm transition-all overflow-hidden flex flex-col justify-between"
            >
              <div className="p-5 space-y-4">
                {/* Title & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#461822]/10 text-[#6c2432]">
                        Vintage {item.vintageYear}
                      </span>
                      <StatusBadge status={item.wine.category} size="sm" />
                    </div>
                    <h3 className="font-serif font-medium text-base text-stone-900 mt-2 leading-snug">
                      {item.wine.name}
                    </h3>
                  </div>
                  <StatusBadge status={item.isAvailable ? 'AVAILABLE' : 'CELLAR_LOCKED'} size="sm" />
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono py-2 border-y border-stone-100 bg-[#faf8f5]/40 rounded-lg px-3">
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase">Price</span>
                    <span className="font-semibold text-stone-900">${Number(item.price).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase">Alcohol</span>
                    <span className="font-semibold text-stone-900">{item.alcohol}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase">Inventory</span>
                    <span className="font-semibold text-stone-900">{item.inventoryCount} btls</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase">Tasting Logs</span>
                    <span className="font-semibold text-stone-900">{item._count.tastingRecords} recorded</span>
                  </div>
                </div>

                {/* Oak Aging */}
                {item.oakAging && (
                  <div className="text-xs">
                    <span className="text-stone-400 text-[10px] uppercase font-mono block">Oak Maturation</span>
                    <p className="text-stone-700 mt-0.5">{item.oakAging}</p>
                  </div>
                )}

                {/* Sensory 4-scale profile */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-stone-400 text-[10px] uppercase font-mono block">Sensory Profile</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-stone-500">
                        <span>Body</span>
                        <span>{item.body}/10</span>
                      </div>
                      <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#6c2432]" style={{ width: `${item.body * 10}%` }} />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-stone-500">
                        <span>Acidity</span>
                        <span>{item.acidity}/10</span>
                      </div>
                      <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#6c2432]" style={{ width: `${item.acidity * 10}%` }} />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-stone-500">
                        <span>Tannin</span>
                        <span>{item.tannin}/10</span>
                      </div>
                      <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#6c2432]" style={{ width: `${item.tannin * 10}%` }} />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-stone-500">
                        <span>Sweetness</span>
                        <span>{item.sweetness}/10</span>
                      </div>
                      <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#6c2432]" style={{ width: `${item.sweetness * 10}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Aroma Tags */}
                {item.aromaTags && item.aromaTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {item.aromaTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full text-[10px] bg-stone-100 text-stone-700 border border-stone-200/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer Link */}
              <div className="px-5 py-3 border-t border-stone-100 bg-[#fdfcfb] flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-stone-500">
                  {item.wine.cellarPotential || 'Cellar ready'}
                </span>
                <Link
                  href={`/admin/wines/${item.wine.slug}`}
                  className="font-medium text-[#6c2432] hover:text-[#461822] hover:underline flex items-center gap-1"
                >
                  <span>Wine Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
