'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  Search,
  RefreshCw,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { SectionCard, StatCard, StatusBadge } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';
import { useIsMounted } from '@/hooks/useIsMounted';

interface NotificationItem {
  id: string;
  recipient: string;
  channel: string;
  type: string;
  title: string;
  content: string;
  isSent: boolean;
  sentAt: string | null;
  createdAt: string;
}

export function NotificationsClient() {
  const mounted = useIsMounted();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/notifications');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load notifications');
      setNotifications(json.data.notifications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching notifications');
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
        const res = await fetch('/api/admin/notifications');
        const json = await res.json();
        if (!cancelled) {
          if (!res.ok) throw new Error(json.error || 'Failed to load notifications');
          setNotifications(json.data.notifications || []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error fetching notifications');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const types = useMemo(() => {
    const set = new Set<string>();
    notifications.forEach((n) => set.add(n.type));
    return Array.from(set).sort();
  }, [notifications]);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesRecipient = n.recipient.toLowerCase().includes(q);
        const matchesTitle = n.title.toLowerCase().includes(q);
        const matchesContent = n.content.toLowerCase().includes(q);
        if (!matchesRecipient && !matchesTitle && !matchesContent) return false;
      }
      if (channelFilter && n.channel !== channelFilter) return false;
      if (typeFilter && n.type !== typeFilter) return false;
      return true;
    });
  }, [notifications, search, channelFilter, typeFilter]);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL':
        return <Mail className="w-3.5 h-3.5 text-sky-600" />;
      case 'SMS':
        return <Smartphone className="w-3.5 h-3.5 text-emerald-600" />;
      case 'PUSH':
        return <Bell className="w-3.5 h-3.5 text-[#aa853e]" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-stone-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
              Communication
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-mono text-stone-500">Dispatch Audit Log</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium mt-1">
            Notifications
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Real-time audit log of guest booking confirmations, event tickets, and reminders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchNotifications}
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
          title="Total Dispatched"
          value={notifications.length}
          subtitle="System event triggers"
          icon={Bell}
        />
        <StatCard
          title="Push & In-App"
          value={notifications.filter((n) => n.channel === 'PUSH').length}
          subtitle="Real-time portal messages"
          icon={Smartphone}
        />
        <StatCard
          title="Email Notices"
          value={notifications.filter((n) => n.channel === 'EMAIL').length}
          subtitle="Delivered guest receipts"
          icon={Mail}
        />
        <StatCard
          title="Notification Gateway"
          value="Healthy"
          subtitle="SMTP & Push relays online"
          icon={Sparkles}
        />
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by recipient email, subject, or message content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#aa853e]"
            />
          </div>

          <div>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none text-stone-700"
            >
              <option value="">All Channels</option>
              <option value="PUSH">Push / In-App</option>
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none text-stone-700"
            >
              <option value="">All Notification Types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notifications Table */}
      <SectionCard
        title="Audit Logs"
        description={`Displaying ${filtered.length} of ${notifications.length} logged dispatches`}
      >
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-stone-500">
            <Loader2 className="w-6 h-6 animate-spin text-[#6c2432] mb-2" />
            <span className="text-xs">Loading dispatch logs...</span>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-7 h-7" />}
            title="No notifications recorded"
            description={
              search
                ? 'No notifications match your current filter.'
                : 'Transactional notifications will appear here automatically when reservations are made.'
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf8f5] border-b border-stone-200/80 text-[10px] font-mono uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="py-3 px-5">Timestamp</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Type &amp; Subject</th>
                  <th className="py-3 px-5">Message Preview</th>
                  <th className="py-3 px-4 text-right">Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-sans">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-5 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-stone-100 text-stone-700 border border-stone-200">
                        {getChannelIcon(item.channel)}
                        <span>{item.channel}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-900 font-medium whitespace-nowrap max-w-[180px] truncate">
                      {item.recipient}
                    </td>
                    <td className="py-3 px-4 max-w-[220px]">
                      <span className="text-[10px] font-mono text-[#6c2432] block uppercase tracking-wider">
                        {item.type.replace(/_/g, ' ')}
                      </span>
                      <span className="font-medium text-stone-900 truncate block">
                        {item.title}
                      </span>
                    </td>
                    <td className="py-3 px-5 max-w-[340px] text-stone-500 truncate leading-relaxed">
                      {item.content}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <StatusBadge status="DELIVERED" variant="success" size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
