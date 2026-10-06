'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  GitMerge,
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
  Mail,
  Phone,
  CalendarDays,
  ShieldAlert,
  Info,
  RefreshCw,
} from 'lucide-react';
import { SectionCard, StatusBadge } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';

interface DuplicateCandidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'ACTIVE' | 'VIP' | 'PROSPECT' | 'INACTIVE' | 'BLOCKED';
  createdAt: string;
  bookingsCount: number;
  tags: string[];
}

interface DuplicateGroup {
  id: string;
  primaryMatchReason: string;
  confidence: 'HIGH' | 'MEDIUM';
  reasons: string[];
  guests: DuplicateCandidate[];
}

export function DuplicateGuestsClient() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Merge modal state
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [survivingGuestId, setSurvivingGuestId] = useState<string>('');
  const [sourceGuestId, setSourceGuestId] = useState<string>('');
  const [mergeReason, setMergeReason] = useState<string>('Duplicate profile cleanup');
  const [confirmed, setConfirmed] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState('');

  const runScan = useCallback(async () => {
    setScanning(true);
    setError('');
    try {
      const res = await fetch('/api/admin/guests/duplicates');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to detect duplicates');
      }
      setGroups(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching duplicates');
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/guests/duplicates');
        const json = await res.json();
        if (!cancelled) {
          if (!res.ok || !json.success) {
            setError(json.error || 'Failed to detect duplicates');
          } else {
            setGroups(json.data || []);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error fetching duplicates');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openMergeModal = (group: DuplicateGroup) => {
    setSelectedGroup(group);
    // Default surviving guest to the one with the most bookings or the first one
    const sorted = [...group.guests].sort((a, b) => b.bookingsCount - a.bookingsCount);
    setSurvivingGuestId(sorted[0].id);
    const other = sorted.find((g) => g.id !== sorted[0].id) || sorted[1] || sorted[0];
    setSourceGuestId(other.id);
    setConfirmed(false);
    setMergeError('');
    setMergeReason('Duplicate profile merge');
  };

  const handleExecuteMerge = async () => {
    if (!survivingGuestId || !sourceGuestId) {
      setMergeError('Please select both a surviving profile and a source profile.');
      return;
    }
    if (survivingGuestId === sourceGuestId) {
      setMergeError('Surviving guest and source guest cannot be the same profile.');
      return;
    }
    if (!confirmed) {
      setMergeError('You must confirm that you understand this action is permanent.');
      return;
    }

    setMerging(true);
    setMergeError('');

    try {
      const res = await fetch('/api/admin/guests/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetGuestId: survivingGuestId,
          sourceGuestId: sourceGuestId,
          reason: mergeReason,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Merge failed');
      }

      setSuccessMsg('Guests merged successfully. History, notes, and bookings have been safely transferred.');
      setSelectedGroup(null);
      runScan();
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : 'Merge failed');
    } finally {
      setMerging(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-stone-500 mb-1">
            <Link href="/admin/guests" className="hover:text-stone-800 transition flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" />
              Back to Guests Directory
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium">
            Duplicate Guests
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Identify potential duplicate guest records and execute safe, transactional profile merges
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200/80 shadow-xs text-xs font-medium text-stone-700 hover:bg-stone-50 transition disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-stone-500 ${scanning ? 'animate-spin' : ''}`} />
            <span>Scan Now</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900 font-bold">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Notice */}
      <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 flex items-start gap-3 text-xs text-stone-600">
        <Info className="w-4 h-4 text-[#6c2432] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-stone-800">Safe Merge Guarantee</p>
          <p>
            When merging guest profiles, all historic bookings, event tickets, tasting records, reviews, notes, and AI
            conversations are automatically reassigned to the surviving guest. Blank profile fields are backfilled from
            the source without overwriting existing data, and an immutable audit log is created.
          </p>
        </div>
      </div>

      {/* Duplicate Groups List */}
      <SectionCard
        title="Suspected Duplicate Groups"
        description={
          loading
            ? 'Analyzing guest directory for matches...'
            : `${groups.length} duplicate group${groups.length === 1 ? '' : 's'} detected within your winery scope`
        }
      >
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-stone-400">
            <Loader2 className="w-7 h-7 animate-spin text-[#6c2432]" />
            <span className="text-xs font-mono">Running duplicate detection algorithm...</span>
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<Users className="w-7 h-7" />}
            title="No duplicates found"
            description="All guests appear to have unique emails, phone numbers, and profile details."
          />
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div
                key={group.id}
                className="p-4 rounded-xl bg-white border border-stone-200 hover:border-stone-300 transition shadow-xs"
              >
                {/* Header of group */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                          group.confidence === 'HIGH'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {group.confidence} CONFIDENCE
                      </span>
                      <span className="text-xs font-medium text-stone-800">{group.primaryMatchReason}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] text-stone-500">
                      {group.reasons.map((r, i) => (
                        <span key={i} className="inline-flex items-center gap-1">
                          • {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => openMergeModal(group)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6c2432] text-white hover:bg-[#521b26] text-xs font-medium transition self-start sm:self-auto shrink-0 shadow-xs"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Review & Merge</span>
                  </button>
                </div>

                {/* Candidate Guests Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  {group.guests.map((g) => (
                    <div
                      key={g.id}
                      className="p-3 rounded-lg bg-stone-50 border border-stone-200/80 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-900">{g.name}</span>
                        <StatusBadge status={g.status} />
                      </div>

                      <div className="space-y-1 text-stone-600">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="font-mono text-[11px] truncate">{g.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{g.phone || 'No phone'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>Joined {formatDate(g.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 text-[11px]">
                        <span className="text-stone-500">
                          {g.bookingsCount} booking{g.bookingsCount === 1 ? '' : 's'}
                        </span>
                        {g.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {g.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded bg-stone-200/70 text-stone-700 text-[10px]"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Review & Safe Merge Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2 text-stone-900">
                <GitMerge className="w-5 h-5 text-[#6c2432]" />
                <h2 className="text-lg font-serif font-semibold">Safe Guest Merge Review</h2>
              </div>
              <button
                onClick={() => setSelectedGroup(null)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {mergeError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{mergeError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  1. Select the Surviving Guest Profile (Primary)
                </label>
                <p className="text-[11px] text-stone-500 mb-2">
                  This profile will remain active. Any blank fields on it will be filled in from the source.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedGroup.guests.map((g) => (
                    <button
                      type="button"
                      key={`surviving-${g.id}`}
                      onClick={() => {
                        setSurvivingGuestId(g.id);
                        if (sourceGuestId === g.id) {
                          const other = selectedGroup.guests.find((x) => x.id !== g.id);
                          if (other) setSourceGuestId(other.id);
                        }
                      }}
                      className={`p-3 rounded-xl border text-left transition ${
                        survivingGuestId === g.id
                          ? 'border-[#6c2432] bg-[#6c2432]/5 ring-1 ring-[#6c2432]'
                          : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-stone-900">{g.name}</span>
                        {survivingGuestId === g.id && (
                          <span className="text-[10px] font-mono font-bold text-[#6c2432]">SURVIVOR</span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-stone-600 truncate">{g.email}</p>
                      <p className="text-[11px] text-stone-500">{g.phone || 'No phone'}</p>
                      <p className="text-[10px] text-stone-400 mt-1">{g.bookingsCount} booking(s)</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  2. Select the Source Guest Profile (To Be Merged & Removed)
                </label>
                <p className="text-[11px] text-stone-500 mb-2">
                  All bookings, events, notes, and records will be moved to the survivor before this profile is removed.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedGroup.guests.map((g) => (
                    <button
                      type="button"
                      key={`source-${g.id}`}
                      disabled={survivingGuestId === g.id}
                      onClick={() => setSourceGuestId(g.id)}
                      className={`p-3 rounded-xl border text-left transition ${
                        survivingGuestId === g.id
                          ? 'opacity-40 cursor-not-allowed border-stone-200 bg-stone-100'
                          : sourceGuestId === g.id
                          ? 'border-rose-400 bg-rose-50/50 ring-1 ring-rose-400'
                          : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-stone-900">{g.name}</span>
                        {sourceGuestId === g.id && (
                          <span className="text-[10px] font-mono font-bold text-rose-600">MERGING AWAY</span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-stone-600 truncate">{g.email}</p>
                      <p className="text-[11px] text-stone-500">{g.phone || 'No phone'}</p>
                      <p className="text-[10px] text-stone-400 mt-1">{g.bookingsCount} booking(s)</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Merge Reason / Audit Note
                </label>
                <input
                  type="text"
                  value={mergeReason}
                  onChange={(e) => setMergeReason(e.target.value)}
                  placeholder="e.g. Same guest booked with alternate email address"
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-medium">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Permanent Operation</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  This action is permanent and transactionally safe. Bookings, tickets, notes, and preferences will be
                  reassigned to the survivor.
                </p>
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="w-4 h-4 rounded text-[#6c2432] focus:ring-[#6c2432] border-stone-300"
                  />
                  <span className="font-medium text-stone-800 text-xs">
                    I confirm that I want to merge these two guest profiles
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="px-4 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteMerge}
                disabled={merging || !confirmed || !survivingGuestId || !sourceGuestId}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#6c2432] hover:bg-[#521b26] text-white text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {merging ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Merging Transactionally...</span>
                  </>
                ) : (
                  <>
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Confirm & Merge Profiles</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
