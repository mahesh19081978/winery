'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Search,
  RefreshCw,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { SectionCard, StatCard, StatusBadge } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';
import { useIsMounted } from '@/hooks/useIsMounted';

interface StaffMember {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

const ROLE_PERMISSIONS: Record<
  string,
  { label: string; desc: string; permissions: string[] }
> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    desc: 'Unrestricted master access to cellar ledger, security policies, billing, and staff administration',
    permissions: ['Full Ledger Control', 'Staff Management', 'Financial Auditing', 'Master Operations'],
  },
  ADMIN: {
    label: 'Administrator',
    desc: 'Comprehensive access to bookings, guests, inventory, and estate configuration',
    permissions: ['Bookings & Front Desk', 'Wine Management', 'Guest CRM', 'Event Coordination'],
  },
  MANAGER: {
    label: 'Estate Manager',
    desc: 'Day-to-day hospitality scheduling, time slot controls, and review moderation',
    permissions: ['Availability Engine', 'Front Desk Operations', 'Reviews Moderation', 'Reports'],
  },
  WINE_STAFF: {
    label: 'Sommelier & Wine Staff',
    desc: 'Cellar tasting records, vintage ratings, and tasting flight execution',
    permissions: ['Tasting Flights', 'Vintage Notes', 'Guest Palate Assessment'],
  },
  EVENT_MANAGER: {
    label: 'Event Manager',
    desc: 'Winery event calendar, ticket tier capacity, and check-in rosters',
    permissions: ['Event Ticketing', 'Roster Check-in', 'Private Buyouts'],
  },
  RECEPTION: {
    label: 'Front Desk Receptionist',
    desc: 'Guest arrival check-in, walk-in reservations, and tasting salon greeting',
    permissions: ['Arrival Check-in', 'Table Assignment', 'Guest Lookup'],
  },
};

export function StaffClient() {
  const mounted = useIsMounted();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchStaff = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/staff');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load staff roster');
      setStaff(json.data.staff || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching staff');
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
        const res = await fetch('/api/admin/staff');
        const json = await res.json();
        if (!cancelled) {
          if (!res.ok) throw new Error(json.error || 'Failed to load staff roster');
          setStaff(json.data.staff || []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error fetching staff');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredStaff = useMemo(() => {
    return staff.filter((m) => {
      if (search) {
        const q = search.toLowerCase();
        if (!m.email.toLowerCase().includes(q) && !m.role.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (roleFilter && m.role !== roleFilter) return false;
      return true;
    });
  }, [staff, search, roleFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
              System &amp; Security
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-mono text-stone-500">Access Control List</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium mt-1">
            Staff &amp; Roles
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Role-based security policies, team assignments, and sommelier operational privileges
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchStaff}
            disabled={mounted ? loading : false}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-medium transition shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading && mounted ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Staff"
          value={staff.length}
          subtitle="Registered team accounts"
          icon={UserCheck}
        />
        <StatCard
          title="Role Hierarchy"
          value="6 Roles"
          subtitle="Enforced in RBAC proxy"
          icon={ShieldCheck}
        />
        <StatCard
          title="Authentication"
          value="JWT (HS256)"
          subtitle="Strict cryptographic tokens"
          icon={Lock}
        />
        <StatCard
          title="Security Perimeter"
          value="Enforced"
          subtitle="Zero-trust role validation"
          icon={KeyRound}
        />
      </div>

      {/* Staff Roster & Role Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Staff Accounts (7 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-2xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search staff accounts by email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#aa853e]"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none text-stone-700"
            >
              <option value="">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Estate Manager</option>
              <option value="WINE_STAFF">Wine Staff</option>
              <option value="EVENT_MANAGER">Event Manager</option>
              <option value="RECEPTION">Reception</option>
            </select>
          </div>

          <SectionCard
            title="Team Members"
            description={`Active team credentials with assigned operational roles (${filteredStaff.length})`}
          >
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-stone-500">
                <Loader2 className="w-6 h-6 animate-spin text-[#6c2432] mb-2" />
                <span className="text-xs">Loading team roster...</span>
              </div>
            ) : filteredStaff.length === 0 ? (
              <EmptyState
                icon={<UserCheck className="w-7 h-7" />}
                title="No staff members found"
                description={
                  search
                    ? 'No accounts match your search filter.'
                    : 'Staff team accounts appear here once provisioned.'
                }
              />
            ) : (
              <div className="divide-y divide-stone-100 -mx-5 -my-5">
                {filteredStaff.map((member) => {
                  const roleMeta = ROLE_PERMISSIONS[member.role] || {
                    label: member.role,
                    desc: 'Standard estate privileges',
                    permissions: [],
                  };
                  return (
                    <div
                      key={member.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#461822]/10 border border-[#461822]/20 flex items-center justify-center text-[#6c2432] font-semibold text-sm shrink-0">
                          {member.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-stone-900 text-sm">
                              {member.email}
                            </span>
                            <StatusBadge status={member.role} size="sm" />
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5 leading-snug">
                            {roleMeta.desc}
                          </p>
                        </div>
                      </div>

                      <div className="text-right sm:text-right shrink-0">
                        <span className="text-[10px] font-mono text-stone-400 block">
                          Provisioned {new Date(member.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 mt-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active Session Access</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Column: Roles & Privileges Hierarchy (5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          <SectionCard
            title="RBAC Roles Hierarchy"
            description="Cryptographic permissions map for estate personnel"
          >
            <div className="space-y-3">
              {Object.entries(ROLE_PERMISSIONS).map(([roleKey, meta]) => (
                <div
                  key={roleKey}
                  className="p-3.5 rounded-xl border border-stone-200/80 bg-[#faf8f5]/40 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-medium text-sm text-stone-900">
                      {meta.label}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
                      {roleKey}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">{meta.desc}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {meta.permissions.map((p) => (
                      <span
                        key={p}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white text-stone-700 border border-stone-200/70"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
