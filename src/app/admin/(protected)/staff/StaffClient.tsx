'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  UserCheck,
  UserX,
  Search,
  RefreshCw,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserPlus,
  Pencil,
  Ban,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { SectionCard, StatCard, StatusBadge } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';
import { useIsMounted } from '@/hooks/useIsMounted';

interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  wineryId: string | null;
  createdAt: string;
  winery: { id: string; name: string; slug: string } | null;
}

interface WineryOption {
  id: string;
  name: string;
  slug: string;
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
    desc: 'Comprehensive access to bookings, guests, inventory, staff and estate configuration',
    permissions: ['Staff Management', 'Bookings & Front Desk', 'Wine Management', 'Guest CRM'],
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
  TELECALLER: {
    label: 'Telecaller',
    desc: 'Outbound guest follow-ups, inquiry callbacks, and reservation reminders',
    permissions: ['Inquiry Follow-up', 'Guest Callbacks', 'Reservation Reminders'],
  },
};

const ASSIGNABLE_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'RECEPTION',
  'WINE_STAFF',
  'EVENT_MANAGER',
  'TELECALLER',
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const inputClass =
  'w-full px-3 py-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6c2432]';

function passwordIssue(value: string): string | null {
  if (value.length < 8) return 'Password must be at least 8 characters';
  if (value.length > 100) return 'Password cannot exceed 100 characters';
  if (!/[A-Za-z]/.test(value)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
  return null;
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[11px] font-mono uppercase tracking-wider text-stone-600 font-semibold block mb-1">
        {label}
        {required ? ' *' : ''}
      </label>
      {children}
      {error ? (
        <p className="text-[11px] text-rose-600 mt-1">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-stone-500 mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

function Modal({
  eyebrow,
  title,
  onClose,
  children,
}: {
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-stone-200 bg-[#faf8f5] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#6c2432] font-semibold">
              {eyebrow}
            </span>
            <h3 className="text-lg font-serif font-medium text-stone-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function StaffClient() {
  const mounted = useIsMounted();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [wineries, setWineries] = useState<WineryOption[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [actor, setActor] = useState<{ userId: string; role: string; wineryId: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [modal, setModal] = useState<'add' | 'edit' | 'password' | null>(null);
  const [activeMember, setActiveMember] = useState<StaffMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'RECEPTION',
    wineryId: '',
    isActive: true,
  });
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'RECEPTION',
    wineryId: '',
    isActive: true,
  });
  const [pwForm, setPwForm] = useState({ password: '', confirmPassword: '' });

  const notify = (message: string) => {
    setSuccessMsg(message);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const fetchStaff = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/staff');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load staff roster');
      setStaff(json.data.staff || []);
      setWineries(json.data.wineries || []);
      setCanManage(Boolean(json.data.canManage));
      setActor(json.data.actor || null);
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
        if (cancelled) return;
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load staff roster');
        setStaff(json.data.staff || []);
        setWineries(json.data.wineries || []);
        setCanManage(Boolean(json.data.canManage));
        setActor(json.data.actor || null);
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

  const isSelf = (member: StaffMember) => actor?.userId === member.id;

  const roleOptions = useMemo(() => {
    const assignable = ASSIGNABLE_ROLES.filter((r) => actor?.role === 'SUPER_ADMIN' || r !== 'SUPER_ADMIN');
    if (actor?.role !== 'SUPER_ADMIN' && editForm.role === 'SUPER_ADMIN') {
      return [...assignable, 'SUPER_ADMIN'];
    }
    return assignable;
  }, [actor?.role, editForm.role]);

  const filteredStaff = useMemo(() => {
    return staff.filter((m) => {
      if (search) {
        const q = search.toLowerCase();
        const label = `${m.name || ''} ${m.email}`.toLowerCase();
        if (!label.includes(q) && !m.role.toLowerCase().includes(q)) return false;
      }
      if (roleFilter && m.role !== roleFilter) return false;
      if (statusFilter === 'ACTIVE' && !m.isActive) return false;
      if (statusFilter === 'INACTIVE' && m.isActive) return false;
      return true;
    });
  }, [staff, search, roleFilter, statusFilter]);

  const activeCount = staff.filter((m) => m.isActive).length;
  const inactiveCount = staff.length - activeCount;
  const rolesInUse = new Set(staff.map((m) => m.role)).size;
  const defaultWineryId = wineries[0]?.id || '';

  const closeModals = () => {
    setModal(null);
    setActiveMember(null);
    setFormErrors({});
    setSubmitting(false);
  };

  const openAdd = () => {
    setAddForm({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'RECEPTION',
      wineryId: actor?.role === 'SUPER_ADMIN' ? defaultWineryId : actor?.wineryId || '',
      isActive: true,
    });
    setFormErrors({});
    setModal('add');
  };

  const openEdit = (member: StaffMember) => {
    setActiveMember(member);
    setEditForm({
      name: member.name || '',
      email: member.email,
      role: member.role,
      wineryId: member.wineryId || '',
      isActive: member.isActive,
    });
    setFormErrors({});
    setModal('edit');
  };

  const openPassword = (member: StaffMember) => {
    setActiveMember(member);
    setPwForm({ password: '', confirmPassword: '' });
    setFormErrors({});
    setModal('password');
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (addForm.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!EMAIL_REGEX.test(addForm.email.trim())) errs.email = 'Valid email is required';
    const pw = passwordIssue(addForm.password);
    if (pw) errs.password = pw;
    if (addForm.password !== addForm.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (!addForm.role) errs.role = 'Role is required';
    if (wineries.length > 0 && !addForm.wineryId) errs.wineryId = 'Winery is required';
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          password: addForm.password,
          confirmPassword: addForm.confirmPassword,
          role: addForm.role,
          wineryId: addForm.wineryId || null,
          isActive: addForm.isActive,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to create user');
      notify(`User ${json.data.staff.email} created`);
      closeModals();
      await fetchStaff();
    } catch (err) {
      setFormErrors({ form: err instanceof Error ? err.message : 'Failed to create user' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMember) return;
    const self = isSelf(activeMember);
    const errs: Record<string, string> = {};
    const name = editForm.name.trim();
    if (name.length > 0 && name.length < 2) errs.name = 'Name must be at least 2 characters';
    if (!EMAIL_REGEX.test(editForm.email.trim())) errs.email = 'Valid email is required';
    if (!editForm.role) errs.role = 'Role is required';
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        email: editForm.email.trim(),
        role: editForm.role,
      };
      if (name.length > 0) body.name = name;
      if (!self) {
        body.wineryId = editForm.wineryId || null;
        body.isActive = editForm.isActive;
      }
      const res = await fetch(`/api/admin/staff/${activeMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update user');
      notify(`User ${json.data.staff.email} updated`);
      closeModals();
      await fetchStaff();
    } catch (err) {
      setFormErrors({ form: err instanceof Error ? err.message : 'Failed to update user' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMember) return;
    const errs: Record<string, string> = {};
    const pw = passwordIssue(pwForm.password);
    if (pw) errs.password = pw;
    if (pwForm.password !== pwForm.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/staff/${activeMember.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: pwForm.password,
          confirmPassword: pwForm.confirmPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update password');
      notify(`Password updated for ${activeMember.email}`);
      closeModals();
    } catch (err) {
      setFormErrors({ form: err instanceof Error ? err.message : 'Failed to update password' });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (member: StaffMember) => {
    const label = member.name || member.email;
    const message = member.isActive
      ? `Deactivate "${label}"? They will no longer be able to sign in to the admin panel.`
      : `Reactivate "${label}"? They will be able to sign in again.`;
    if (!window.confirm(message)) return;

    setBusyId(member.id);
    setError('');
    try {
      const res = await fetch(`/api/admin/staff/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update status');
      notify(member.isActive ? `${label} deactivated` : `${label} reactivated`);
      await fetchStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  const removeMember = async (member: StaffMember) => {
    const label = member.name || member.email;
    if (!window.confirm(`Permanently delete "${label}"? This cannot be undone. Deactivate instead if history must be kept.`)) return;

    setBusyId(member.id);
    setError('');
    try {
      const res = await fetch(`/api/admin/staff/${member.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to delete user');
      notify(`${label} deleted`);
      await fetchStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setBusyId(null);
    }
  };

  const actionButtonClass =
    'p-1.5 rounded-lg border border-stone-200 bg-white text-stone-500 hover:text-[#6c2432] hover:border-[#6c2432]/40 hover:bg-[#6c2432]/5 transition disabled:opacity-50';

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
            Manage the accounts that can sign in to VINORA Admin — roles, winery assignment, and access status
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
          {canManage && (
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#461822] hover:bg-[#6c2432] text-white text-xs font-medium transition shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="flex-1">{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-emerald-500 hover:text-emerald-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!canManage && !loading && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>You have read-only access to the staff roster. Contact an administrator to make changes.</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Staff"
          value={activeCount}
          subtitle="Enabled console accounts"
          icon={UserCheck}
        />
        <StatCard
          title="Deactivated"
          value={inactiveCount}
          subtitle="Sign-in suspended"
          icon={UserX}
        />
        <StatCard
          title="Roles in Use"
          value={rolesInUse}
          subtitle="Distinct role assignments"
          icon={ShieldCheck}
        />
        <StatCard
          title="Authentication"
          value="JWT (HS256)"
          subtitle="Strict cryptographic tokens"
          icon={Lock}
        />
      </div>

      {/* Staff Roster & Role Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Staff Accounts */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-2xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search staff by name or email..."
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
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_PERMISSIONS[r]?.label || r}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none text-stone-700"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Deactivated</option>
            </select>
          </div>

          <SectionCard
            title="Team Members"
            description={`Accounts allowed to sign in to the admin panel (${filteredStaff.length})`}
          >
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-stone-500">
                <Loader2 className="w-6 h-6 animate-spin text-[#6c2432] mb-2" />
                <span className="text-xs">Loading team roster...</span>
              </div>
            ) : filteredStaff.length === 0 ? (
              <EmptyState
                icon={<UserCheck className="w-7 h-7" />}
                title={staff.length === 0 ? 'No staff accounts yet' : 'No staff members found'}
                description={
                  staff.length === 0
                    ? 'Create the first account that can sign in to the VINORA Admin panel.'
                    : 'No accounts match your current search filters.'
                }
                actionText={staff.length === 0 && canManage ? 'Add User' : undefined}
                onAction={staff.length === 0 && canManage ? openAdd : undefined}
              />
            ) : (
              <div className="divide-y divide-stone-100 -mx-5 -my-5">
                {filteredStaff.map((member) => {
                  const self = isSelf(member);
                  const busy = busyId === member.id;
                  const displayName = member.name || member.email.split('@')[0];

                  return (
                    <div
                      key={member.id}
                      className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 hover:bg-stone-50/60 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#461822]/10 border border-[#461822]/20 flex items-center justify-center text-[#6c2432] font-semibold text-sm shrink-0">
                          {(member.name || member.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-stone-900 text-sm truncate">{displayName}</span>
                            <StatusBadge status={member.role} size="sm" />
                            {self && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wide bg-stone-100 text-stone-600 border border-stone-200">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5 truncate">{member.email}</p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500 flex-wrap">
                            <span className="font-mono">{member.winery?.name || 'No winery assigned'}</span>
                            <span className="text-stone-300">•</span>
                            <span className="font-mono">
                              Added{' '}
                              {new Date(member.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between xl:justify-end gap-3 shrink-0">
                        <StatusBadge status={member.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" />
                        {canManage && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              title="Edit user"
                              onClick={() => openEdit(member)}
                              className={actionButtonClass}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Change password"
                              onClick={() => openPassword(member)}
                              className={actionButtonClass}
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            {!self && (
                              <>
                                <button
                                  type="button"
                                  title={member.isActive ? 'Deactivate user' : 'Reactivate user'}
                                  disabled={busy}
                                  onClick={() => toggleActive(member)}
                                  className={actionButtonClass}
                                >
                                  {busy ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : member.isActive ? (
                                    <Ban className="w-3.5 h-3.5" />
                                  ) : (
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  title="Delete user"
                                  disabled={busy}
                                  onClick={() => removeMember(member)}
                                  className={`${actionButtonClass} hover:!text-rose-700 hover:!border-rose-400 hover:!bg-rose-50`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Column: Roles & Privileges Hierarchy */}
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

      {/* Add User Modal */}
      {modal === 'add' && (
        <Modal eyebrow="Provision Access" title="Add User" onClose={closeModals}>
          <form onSubmit={submitAdd} className="space-y-4">
            {formErrors.form && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formErrors.form}</span>
              </div>
            )}

            <Field label="Full Name" required error={formErrors.name}>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g. Camille Laurent"
                className={inputClass}
              />
            </Field>

            <Field label="Email" required error={formErrors.email}>
              <input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="name@vinora.com"
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Password" required error={formErrors.password} hint="Min 8 chars, letters & numbers">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Confirm Password" required error={formErrors.confirmPassword}>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={addForm.confirmPassword}
                  onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Role" required error={formErrors.role}>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  className={`${inputClass} bg-white text-stone-700`}
                >
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_PERMISSIONS[r]?.label || r}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Winery"
                required={actor?.role === 'SUPER_ADMIN'}
                error={formErrors.wineryId}
                hint={actor?.role !== 'SUPER_ADMIN' ? 'Pinned to your own winery' : undefined}
              >
                <select
                  value={addForm.wineryId}
                  onChange={(e) => setAddForm({ ...addForm, wineryId: e.target.value })}
                  className={`${inputClass} bg-white text-stone-700`}
                  disabled={actor?.role !== 'SUPER_ADMIN'}
                >
                  <option value="">No winery (global)</option>
                  {wineries.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={addForm.isActive}
                onChange={(e) => setAddForm({ ...addForm, isActive: e.target.checked })}
                className="mt-0.5 w-4 h-4 accent-[#6c2432]"
              />
              <span className="text-xs text-stone-700">
                <span className="font-medium">Active account</span> — allowed to sign in to the admin panel
                immediately.
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={closeModals}
                className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-[#461822] hover:bg-[#6c2432] text-white text-xs font-medium inline-flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{submitting ? 'Creating...' : 'Create User'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit User Modal */}
      {modal === 'edit' && activeMember && (
        <Modal eyebrow="Update Access" title="Edit User" onClose={closeModals}>
          <form onSubmit={submitEdit} className="space-y-4">
            {formErrors.form && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formErrors.form}</span>
              </div>
            )}

            {isSelf(activeMember) && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                This is your own account — role, winery and status cannot be changed here.
              </div>
            )}

            <Field label="Full Name" error={formErrors.name}>
              <input
                type="text"
                value={editForm.name}
                placeholder="Leave blank to keep the current name"
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className={inputClass}
              />
            </Field>

            <Field label="Email" required error={formErrors.email}>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Role" required error={formErrors.role}>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className={`${inputClass} bg-white text-stone-700`}
                  disabled={isSelf(activeMember)}
                >
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_PERMISSIONS[r]?.label || r}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Winery" error={formErrors.wineryId}>
                <select
                  value={editForm.wineryId}
                  onChange={(e) => setEditForm({ ...editForm, wineryId: e.target.value })}
                  className={`${inputClass} bg-white text-stone-700`}
                  disabled={isSelf(activeMember) || actor?.role !== 'SUPER_ADMIN'}
                >
                  <option value="">No winery (global)</option>
                  {wineries.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <label className={`flex items-start gap-2.5 ${isSelf(activeMember) ? 'opacity-60' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                disabled={isSelf(activeMember)}
                className="mt-0.5 w-4 h-4 accent-[#6c2432]"
              />
              <span className="text-xs text-stone-700">
                <span className="font-medium">Active account</span> — uncheck to deactivate and block sign-in
                while keeping all historical records.
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={closeModals}
                className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-[#461822] hover:bg-[#6c2432] text-white text-xs font-medium inline-flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change Password Modal */}
      {modal === 'password' && activeMember && (
        <Modal eyebrow="Credential Reset" title="Change Password" onClose={closeModals}>
          <form onSubmit={submitPassword} className="space-y-4">
            {formErrors.form && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formErrors.form}</span>
              </div>
            )}

            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-600">
              Setting a new password for <span className="font-medium text-stone-900">{activeMember.email}</span>.
              The previous password stops working immediately.
            </div>

            <Field label="New Password" required error={formErrors.password} hint="Min 8 chars, letters & numbers">
              <input
                type="password"
                autoComplete="new-password"
                value={pwForm.password}
                onChange={(e) => setPwForm({ ...pwForm, password: e.target.value })}
                className={inputClass}
              />
            </Field>

            <Field label="Confirm New Password" required error={formErrors.confirmPassword}>
              <input
                type="password"
                autoComplete="new-password"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                className={inputClass}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={closeModals}
                className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-[#461822] hover:bg-[#6c2432] text-white text-xs font-medium inline-flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{submitting ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
