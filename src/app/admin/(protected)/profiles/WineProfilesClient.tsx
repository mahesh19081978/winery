'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  HeartHandshake,
  Wine,
  Search,
  RefreshCw,
  Users,
  Sparkles,
  GlassWater,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { StatCard, StatusBadge } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';
import { useIsMounted } from '@/hooks/useIsMounted';

interface GuestWineProfileItem {
  id: string;
  guestProfileId: string;
  favoriteVarietals: string[];
  preferredSweetness: string | null;
  preferredBody: string | null;
  preferredAcidity: string | null;
  createdAt: string;
  updatedAt: string;
  guestProfile: {
    id: string;
    name: string;
    phone: string | null;
    visitsCount: number;
    user: { email: string };
    _count: {
      bookings: number;
      tastingSessions: number;
      tastingRecords: number;
      reviews: number;
    };
  };
  favoriteWine: {
    id: string;
    name: string;
    slug: string;
    category: string;
  } | null;
}

export function WineProfilesClient() {
  const mounted = useIsMounted();
  const [profiles, setProfiles] = useState<GuestWineProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [varietalFilter, setVarietalFilter] = useState('');

  const fetchProfiles = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/profiles');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load guest wine profiles');
      setProfiles(json.data.profiles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching wine profiles');
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
        const res = await fetch('/api/admin/profiles');
        const json = await res.json();
        if (!cancelled) {
          if (!res.ok) throw new Error(json.error || 'Failed to load guest wine profiles');
          setProfiles(json.data.profiles || []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error fetching wine profiles');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const allVarietals = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach((p) => {
      p.favoriteVarietals.forEach((v) => set.add(v));
    });
    return Array.from(set).sort();
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesName = p.guestProfile.name.toLowerCase().includes(q);
        const matchesEmail = p.guestProfile.user.email.toLowerCase().includes(q);
        const matchesWine = p.favoriteWine?.name.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesEmail && !matchesWine) return false;
      }
      if (varietalFilter && !p.favoriteVarietals.includes(varietalFilter)) {
        return false;
      }
      return true;
    });
  }, [profiles, search, varietalFilter]);

  const totalPalates = profiles.length;
  const totalTastingSessions = profiles.reduce(
    (sum, p) => sum + (p.guestProfile._count.tastingSessions || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
              Guest Intelligence
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-mono text-stone-500">Palate Profiles</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium mt-1">
            Wine Profiles
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Concierge palate benchmarks, favored varietals, and tailored cellar preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchProfiles}
            disabled={mounted ? loading : false}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-medium transition shadow-2xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading && mounted ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/admin/guests"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#461822] hover:bg-[#6c2432] text-white text-xs font-medium transition shadow-xs"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Guest Directory</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Cataloged Palates"
          value={totalPalates}
          subtitle="Guests with curated preferences"
          icon={HeartHandshake}
        />
        <StatCard
          title="Top Varietal"
          value={allVarietals[0] || 'Cabernet'}
          subtitle="Most favored by guests"
          icon={Wine}
        />
        <StatCard
          title="Active Tasting Sessions"
          value={totalTastingSessions}
          subtitle="Linked journal evaluations"
          icon={GlassWater}
        />
        <StatCard
          title="Concierge Status"
          value="Synchronized"
          subtitle="Live CRM palate integration"
          icon={Sparkles}
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by guest name, email, or favorite estate wine..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#aa853e]"
            />
          </div>

          <div>
            <select
              value={varietalFilter}
              onChange={(e) => setVarietalFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none text-stone-700"
            >
              <option value="">All Favorite Varietals</option>
              {allVarietals.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Profiles Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-stone-500">
          <Loader2 className="w-6 h-6 animate-spin text-[#6c2432] mb-2" />
          <span className="text-xs">Loading guest wine profiles...</span>
        </div>
      ) : filteredProfiles.length === 0 ? (
        <EmptyState
          icon={<HeartHandshake className="w-7 h-7" />}
          title="No wine profiles found"
          description={
            search
              ? 'No guest profiles match the current filter.'
              : 'Guest wine profiles are automatically recorded during tasting sessions and member surveys.'
          }
          actionText="View Guests"
          actionHref="/admin/guests"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProfiles.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-stone-200/80 shadow-xs hover:shadow-sm transition-all overflow-hidden flex flex-col justify-between"
            >
              <div className="p-5 space-y-4">
                {/* Guest Identity */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#461822]/10 border border-[#461822]/20 flex items-center justify-center text-[#6c2432] font-serif font-semibold text-sm shrink-0">
                      {p.guestProfile.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-serif font-medium text-base text-stone-900 leading-tight">
                        {p.guestProfile.name}
                      </h3>
                      <p className="text-xs text-stone-500 truncate max-w-[180px]">
                        {p.guestProfile.user.email}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#aa853e]/15 text-[#6c2432] border border-[#aa853e]/30 shrink-0">
                    {p.guestProfile.visitsCount} visits
                  </span>
                </div>

                {/* Favorite Wine Hero */}
                {p.favoriteWine ? (
                  <div className="p-3 rounded-lg border border-amber-200/70 bg-amber-50/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-amber-800">
                        Signature Favorite
                      </span>
                      <StatusBadge status={p.favoriteWine.category} size="sm" />
                    </div>
                    <p className="font-serif font-medium text-sm text-stone-900">
                      {p.favoriteWine.name}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-stone-200/60 bg-stone-50/60 text-xs text-stone-500">
                    No primary wine benchmark designated yet.
                  </div>
                )}

                {/* Palate Dimensions */}
                <div className="space-y-2 text-xs">
                  <span className="text-stone-400 text-[10px] uppercase font-mono block">
                    Palate Dimensions
                  </span>
                  <div className="space-y-1.5 bg-[#faf8f5]/60 p-3 rounded-lg border border-stone-200/60">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Sweetness:</span>
                      <span className="font-medium text-stone-800">
                        {p.preferredSweetness || 'Dry (1–3)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Body Weight:</span>
                      <span className="font-medium text-stone-800">
                        {p.preferredBody || 'Full & Opulent'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Acidity Drive:</span>
                      <span className="font-medium text-stone-800">
                        {p.preferredAcidity || 'Vibrant & Crisp'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Favorite Varietals */}
                <div className="space-y-1.5">
                  <span className="text-stone-400 text-[10px] uppercase font-mono block">
                    Favored Varietals
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {p.favoriteVarietals.map((v) => (
                      <span
                        key={v}
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#461822]/5 text-[#6c2432] border border-[#461822]/15"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-stone-100 bg-[#fdfcfb] flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-stone-500">
                  {p.guestProfile._count.tastingRecords} tasting notes logged
                </span>
                <Link
                  href={`/admin/guests/${p.guestProfile.id}`}
                  className="font-medium text-[#6c2432] hover:text-[#461822] hover:underline flex items-center gap-1"
                >
                  <span>Guest Dossier</span>
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
