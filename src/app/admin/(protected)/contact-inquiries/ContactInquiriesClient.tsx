'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Search,
  RefreshCw,
  Eye,
  AlertCircle,
  Loader2,
  Clock,
  Phone,
  User,
  CheckCircle2,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { StatCard } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ContactInquiryItem {
  id: string;
  wineryId: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  category: string;
  message: string;
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'ARCHIVED';
  assignedToId: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: {
    id: string;
    email: string;
    role: string;
  } | null;
}

interface StaffUserItem {
  id: string;
  email: string;
  role: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'General Concierge',
  PRIVATE_EVENT: 'Private Event & Wedding',
  CELLAR_TASTING: 'VIP Cellar Tasting',
  ALLOCATION: 'Wine Allocation',
  PRESS: 'Media & Trade',
};

const STATUS_OPTIONS: Array<{ key: string; label: string; color: string }> = [
  { key: 'ALL', label: 'All Inquiries', color: 'bg-stone-100 text-stone-700' },
  { key: 'NEW', label: 'New', color: 'bg-emerald-100 text-emerald-800' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'bg-amber-100 text-amber-800' },
  { key: 'RESOLVED', label: 'Resolved', color: 'bg-blue-100 text-blue-800' },
  { key: 'ARCHIVED', label: 'Archived', color: 'bg-stone-200 text-stone-600' },
];

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function ContactInquiriesClient() {
  const mounted = useIsMounted();
  const [inquiries, setInquiries] = useState<ContactInquiryItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({
    ALL: 0,
    NEW: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    ARCHIVED: 0,
  });
  const [staffList, setStaffList] = useState<StaffUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtering & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Modal
  const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiryItem | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [internalNotesInput, setInternalNotesInput] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [assigneeIdInput, setAssigneeIdInput] = useState<string>('');

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '15');
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/contact-inquiries?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load contact inquiries');
      }

      setInquiries(json.data.inquiries || []);
      setTotalPages(json.data.pagination?.totalPages || 1);
      setTotalCount(json.data.pagination?.total || 0);
      if (json.data.counts) {
        setCounts(json.data.counts);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching contact inquiries');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter, search]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', '15');
        if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
        if (categoryFilter) params.set('category', categoryFilter);
        if (search.trim()) params.set('search', search.trim());

        const res = await fetch(`/api/admin/contact-inquiries?${params.toString()}`);
        const json = await res.json();
        if (!cancelled) {
          if (!res.ok || !json.success) {
            throw new Error(json.error || 'Failed to load contact inquiries');
          }
          setInquiries(json.data.inquiries || []);
          setTotalPages(json.data.pagination?.totalPages || 1);
          setTotalCount(json.data.pagination?.total || 0);
          if (json.data.counts) {
            setCounts(json.data.counts);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error fetching contact inquiries');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, categoryFilter, search]);

  // Fetch staff list for assignment dropdown
  useEffect(() => {
    const loadStaff = async () => {
      try {
        const res = await fetch('/api/admin/staff');
        if (res.ok) {
          const json = await res.json();
          if (json.data?.staff) {
            setStaffList(json.data.staff);
          }
        }
      } catch {
        // Staff dropdown fallback
      }
    };
    loadStaff();
  }, []);

  const openDetail = (item: ContactInquiryItem) => {
    setSelectedInquiry(item);
    setInternalNotesInput(item.internalNotes || '');
    setAssigneeIdInput(item.assignedToId || '');
  };

  const handleUpdateStatus = async (newStatus: 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'ARCHIVED') => {
    if (!selectedInquiry) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/contact-inquiries/${selectedInquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update status');

      const updated = json.data.inquiry;
      setSelectedInquiry(updated);
      setInquiries((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSuccessMsg(`Status marked as ${newStatus}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveNotesAndAssignee = async () => {
    if (!selectedInquiry) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/admin/contact-inquiries/${selectedInquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internalNotes: internalNotesInput.trim() || null,
          assignedToId: assigneeIdInput || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update inquiry');

      const updated = json.data.inquiry;
      setSelectedInquiry(updated);
      setInquiries((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSuccessMsg('Concierge notes and assignment saved');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete the inquiry from "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/contact-inquiries/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to delete inquiry');

      setInquiries((prev) => prev.filter((i) => i.id !== id));
      if (selectedInquiry?.id === id) setSelectedInquiry(null);
      setSuccessMsg(`Inquiry from ${name} deleted`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deletion failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
              Engagement
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-mono text-stone-500">Concierge Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium mt-1">
            Contact Inquiries
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Incoming public inquiries, VIP cellar tasting requests, and private event bookings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchInquiries}
            disabled={mounted ? loading : false}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-medium transition shadow-2xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading && mounted ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="New Inquiries"
          value={counts.NEW || 0}
          subtitle="Requiring concierge review"
          icon={Inbox}
        />
        <StatCard
          title="In Progress"
          value={counts.IN_PROGRESS || 0}
          subtitle="Active sommelier communications"
          icon={Clock}
        />
        <StatCard
          title="Resolved"
          value={counts.RESOLVED || 0}
          subtitle="Completed guest requests"
          icon={CheckCircle2}
        />
        <StatCard
          title="Total Received"
          value={counts.ALL || totalCount}
          subtitle="All recorded channels"
          icon={Mail}
        />
      </div>

      {/* Filter / Status Bar */}
      <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-2xs space-y-3">
        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_OPTIONS.map((st) => (
            <button
              key={st.key}
              type="button"
              onClick={() => {
                setStatusFilter(st.key);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                statusFilter === st.key
                  ? 'bg-[#461822] text-white shadow-xs font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>{st.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === st.key
                    ? 'bg-white/20 text-white'
                    : 'bg-stone-200 text-stone-700'
                }`}
              >
                {counts[st.key] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Category Filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-stone-100">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by guest name, email, subject, or message content..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#aa853e]"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none text-stone-700"
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Inquiries Table */}
      <div className="bg-white rounded-xl border border-stone-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-stone-500">
            <Loader2 className="w-6 h-6 animate-spin text-[#6c2432] mb-2" />
            <span className="text-xs">Loading contact inquiries...</span>
          </div>
        ) : inquiries.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Mail className="w-7 h-7" />}
              title="No inquiries found"
              description={
                search || statusFilter !== 'ALL' || categoryFilter
                  ? 'No contact inquiries match your filters.'
                  : 'No public inquiries have been received yet.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf8f5] text-stone-600 border-b border-stone-200 font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Guest</th>
                  <th className="py-3.5 px-4 font-semibold">Subject &amp; Category</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Assigned Staff</th>
                  <th className="py-3.5 px-4 font-semibold">Received</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {inquiries.map((item) => {
                  const statusColors: Record<string, string> = {
                    NEW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
                    RESOLVED: 'bg-blue-50 text-blue-700 border-blue-200',
                    ARCHIVED: 'bg-stone-100 text-stone-600 border-stone-200',
                  };

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-stone-50/80 transition-colors cursor-pointer"
                      onClick={() => openDetail(item)}
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-stone-900">{item.name}</div>
                        <div className="text-[11px] text-stone-500 font-mono">{item.email}</div>
                        {item.phone && (
                          <div className="text-[10px] text-stone-400 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" /> {item.phone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-serif text-sm text-stone-900 font-medium line-clamp-1">
                          {item.subject}
                        </div>
                        <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-mono bg-stone-100 text-stone-600 border border-stone-200">
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider border ${
                            statusColors[item.status] || 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {item.assignedTo ? (
                          <div className="flex items-center gap-1.5 text-stone-700">
                            <User className="w-3.5 h-3.5 text-stone-400" />
                            <span className="font-mono text-[11px]">{item.assignedTo.email}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetail(item);
                            }}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition"
                            title="Inspect details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id, item.name);
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-stone-100 bg-[#faf8f5]/60 flex items-center justify-between text-xs text-stone-500">
          <span>
            Showing {inquiries.length} of {totalCount} inquiries
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-stone-200 bg-white disabled:opacity-40 hover:bg-stone-50 text-stone-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-[11px]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-stone-200 bg-white disabled:opacity-40 hover:bg-stone-50 text-stone-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Inquiry Detail & Management Modal */}
      {selectedInquiry && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={() => setSelectedInquiry(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-stone-200 bg-[#faf8f5] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#6c2432] font-semibold">
                  Concierge Detail Record
                </span>
                <h3 className="text-lg font-serif font-medium text-stone-900">
                  {selectedInquiry.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Guest & Timing Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200/60">
                <div>
                  <span className="text-[10px] uppercase font-mono text-stone-400 block mb-1">
                    Guest Information
                  </span>
                  <div className="font-semibold text-stone-900 text-sm">{selectedInquiry.name}</div>
                  <div className="text-stone-600 font-mono mt-0.5">{selectedInquiry.email}</div>
                  {selectedInquiry.phone && (
                    <div className="text-stone-500 font-mono mt-0.5">{selectedInquiry.phone}</div>
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-stone-400 block mb-1">
                    Inquiry Metadata
                  </span>
                  <div className="text-stone-700">
                    <strong className="text-stone-900">Type:</strong>{' '}
                    {CATEGORY_LABELS[selectedInquiry.category] || selectedInquiry.category}
                  </div>
                  <div className="text-stone-700 mt-1">
                    <strong className="text-stone-900">Received:</strong>{' '}
                    {formatDateTime(selectedInquiry.createdAt)}
                  </div>
                </div>
              </div>

              {/* Message Content */}
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 font-semibold block mb-2">
                  Guest Message
                </span>
                <div className="p-4 rounded-xl border border-stone-200 bg-white text-stone-800 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedInquiry.message}
                </div>
              </div>

              {/* Status Control */}
              <div className="p-4 rounded-xl border border-stone-200/80 bg-[#faf8f5]/60 space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-stone-600 font-semibold block">
                  Workflow Status
                </span>
                <div className="flex flex-wrap gap-2">
                  {(['NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleUpdateStatus(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        selectedInquiry.status === st
                          ? 'bg-[#461822] text-white shadow-xs font-semibold'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Internal Staff Notes & Assignment */}
              <div className="space-y-4 pt-2 border-t border-stone-100">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-stone-600 font-semibold block mb-1">
                    Assign Sommelier / Staff Member
                  </label>
                  <select
                    value={assigneeIdInput}
                    onChange={(e) => setAssigneeIdInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                  >
                    <option value="">Unassigned</option>
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.email} ({st.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-stone-600 font-semibold block mb-1">
                    Internal Concierge Notes &amp; Follow-up Actions
                  </label>
                  <textarea
                    rows={4}
                    value={internalNotesInput}
                    onChange={(e) => setInternalNotesInput(e.target.value)}
                    placeholder="Private staff notes (e.g. called guest on phone, sent private tasting menu PDF, confirmed allocation waitlist status)..."
                    className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-stone-200 bg-[#faf8f5] flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDelete(selectedInquiry.id, selectedInquiry.name)}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Inquiry</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInquiry(null)}
                  className="px-4 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-700"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={savingNotes}
                  onClick={handleSaveNotesAndAssignee}
                  className="px-4 py-2 rounded-lg bg-[#461822] hover:bg-[#6c2432] text-white text-xs font-medium inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {savingNotes && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Notes &amp; Assignment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
