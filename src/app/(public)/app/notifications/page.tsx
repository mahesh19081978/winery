'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  targetUrl: string | null;
}

interface PaginationData {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function GuestNotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/auth/guest/notifications?type=${filter}&page=${page}&pageSize=${pageSize}`
      );
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Please sign in to view your notifications.');
        }
        throw new Error('Failed to load notifications. Please try again.');
      }
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items || []);
        setPagination(
          json.data.pagination || {
            page: 1,
            pageSize,
            total: 0,
            totalPages: 1,
          }
        );
        setUnreadCount(json.data.unreadCount ?? 0);
      } else {
        throw new Error(json.error || 'Failed to parse notifications');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while loading notifications');
    } finally {
      setLoading(false);
    }
  }, [filter, page, pageSize]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
  }, [fetchNotifications]);

  const handleFilterChange = (newFilter: 'all' | 'unread') => {
    if (newFilter !== filter) {
      setFilter(newFilter);
      setPage(1);
    }
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/auth/guest/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_READ' }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, read: true, isRead: true, readAt: new Date().toISOString() } : item
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // silently retain state on error
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || batchLoading) return;
    setBatchLoading(true);
    try {
      const res = await fetch('/api/auth/guest/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_ALL_READ' }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) => ({ ...item, read: true, isRead: true, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
        if (filter === 'unread') {
          // Refresh list if filtering on unread only
          fetchNotifications();
        }
      }
    } catch {
      // silently retain state on error
    } finally {
      setBatchLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'BOOKING_CONFIRMATION':
      case 'EVENT_BOOKING_CONFIRMATION':
        return {
          label: 'Reservation Confirmed',
          icon: CheckCircle2,
          bgColor: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
          iconColor: 'text-emerald-700',
        };
      case 'BOOKING_CANCELLATION':
      case 'EVENT_BOOKING_CANCELLATION':
        return {
          label: 'Cancelled',
          icon: AlertCircle,
          bgColor: 'bg-stone-100 text-stone-700 border-stone-200',
          iconColor: 'text-stone-500',
        };
      case 'REVIEW_APPROVED':
        return {
          label: 'Review Published',
          icon: Sparkles,
          bgColor: 'bg-[#faf3e3] text-[#8a6828] border-[#e8d7ad]',
          iconColor: 'text-[#c5a059]',
        };
      case 'REVIEW_REJECTED':
        return {
          label: 'Review Update',
          icon: MessageSquare,
          bgColor: 'bg-stone-100 text-stone-700 border-stone-200',
          iconColor: 'text-stone-500',
        };
      default:
        return {
          label: 'Estate Notice',
          icon: Bell,
          bgColor: 'bg-[#faf0f2] text-[#8a3243] border-[#e8cfd5]',
          iconColor: 'text-[#8a3243]',
        };
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header section with estate styling */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#e6dece] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-[#c5a059] font-bold">
                Estate Communications
              </span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#8a3243] text-white">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-normal">
              Member Notifications
            </h1>
            <p className="text-sm text-stone-500 mt-1 max-w-xl">
              Stay informed of reservation updates, wine tasting arrangements, and estate event announcements.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={batchLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#8a3243]/30 text-xs uppercase tracking-wider font-semibold text-[#8a3243] hover:bg-[#8a3243]/5 transition-all disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{batchLoading ? 'Marking…' : 'Mark All as Read'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => fetchNotifications()}
              disabled={loading}
              title="Refresh notifications"
              className="p-2 rounded-full border border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-[#f4f0e8]">
          <button
            type="button"
            onClick={() => handleFilterChange('all')}
            className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
              filter === 'all'
                ? 'bg-[#2d1117] text-[#faf8f5] shadow-sm'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            All Notifications
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('unread')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
              filter === 'unread'
                ? 'bg-[#2d1117] text-[#faf8f5] shadow-sm'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  filter === 'unread' ? 'bg-[#c5a059] text-[#2d1117]' : 'bg-[#8a3243] text-white'
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-rose-900 mb-1">Unable to Load Notifications</h3>
            <p className="text-rose-700">{error}</p>
            <button
              type="button"
              onClick={() => fetchNotifications()}
              className="mt-3 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg bg-rose-800 text-white hover:bg-rose-900 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-2xl p-12 border border-[#e6dece] flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs uppercase tracking-[0.25em] text-stone-500 font-mono">
            Fetching communications…
          </span>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="bg-white rounded-2xl p-12 border border-[#e6dece] text-center max-w-xl mx-auto shadow-sm">
          <div className="w-14 h-14 rounded-full bg-[#faf3e3] border border-[#e8d7ad] mx-auto flex items-center justify-center text-[#c5a059] mb-4">
            <Bell className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-xl text-stone-900 mb-2">
            {filter === 'unread' ? 'You are all caught up' : 'No notifications yet'}
          </h2>
          <p className="text-sm text-stone-500 mb-6">
            {filter === 'unread'
              ? 'There are no unread notifications waiting for your review.'
              : 'As you book tastings, reserve event tickets, or share reviews, estate communications will appear here.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            {filter === 'unread' ? (
              <button
                type="button"
                onClick={() => handleFilterChange('all')}
                className="px-4 py-2 text-xs uppercase tracking-wider font-semibold rounded-full bg-[#2d1117] text-[#faf8f5] hover:bg-[#461822] transition-colors"
              >
                View All Notifications
              </button>
            ) : (
              <Link
                href="/experiences"
                className="px-5 py-2.5 text-xs uppercase tracking-wider font-semibold rounded-full bg-[#8a3243] text-white hover:bg-[#6e2735] transition-colors"
              >
                Explore Winery Experiences
              </Link>
            )}
          </div>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => {
            const isUnread = !item.read;
            const badge = getTypeBadge(item.type);
            const BadgeIcon = badge.icon;

            return (
              <div
                key={item.id}
                className={`relative bg-white rounded-2xl p-5 sm:p-6 border transition-all duration-200 shadow-sm ${
                  isUnread
                    ? 'border-[#8a3243]/40 bg-gradient-to-r from-[#fcf7f8] to-white shadow-sm ring-1 ring-[#8a3243]/10'
                    : 'border-[#e6dece] hover:border-stone-300'
                }`}
              >
                {/* Unread indicator dot */}
                {isUnread && (
                  <span
                    className="absolute top-6 right-6 w-2.5 h-2.5 rounded-full bg-[#8a3243] ring-4 ring-[#8a3243]/20"
                    title="Unread notification"
                  />
                )}

                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Icon circle */}
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${badge.bgColor}`}
                  >
                    <BadgeIcon className={`w-5 h-5 ${badge.iconColor}`} />
                  </div>

                  {/* Body */}
                  <div className="flex-1 pr-6 sm:pr-8">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border font-semibold ${badge.bgColor}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-stone-300 text-xs">•</span>
                      <span className="text-xs text-stone-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {formatDate(item.createdAt)}
                      </span>
                    </div>

                    <h3
                      className={`text-base font-serif mb-1 ${
                        isUnread ? 'text-stone-900 font-medium' : 'text-stone-700'
                      }`}
                    >
                      {item.title}
                    </h3>
                    <p className="text-sm text-stone-600 leading-relaxed max-w-3xl">
                      {item.message}
                    </p>

                    {/* Actions row */}
                    <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-stone-100">
                      {item.targetUrl && (
                        <Link
                          href={item.targetUrl}
                          className="inline-flex items-center gap-1 text-xs uppercase tracking-wider font-semibold text-[#8a3243] hover:text-[#6e2735] transition-colors"
                        >
                          <span>View Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}

                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(item.id, e)}
                          disabled={actionLoadingId === item.id}
                          className="inline-flex items-center gap-1 text-xs uppercase tracking-wider font-semibold text-stone-500 hover:text-stone-900 transition-colors ml-auto disabled:opacity-50"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>{actionLoadingId === item.id ? 'Marking…' : 'Mark as Read'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-2xl px-6 py-4 border border-[#e6dece] mt-6 shadow-sm">
              <span className="text-xs text-stone-500 font-mono">
                Showing page <strong className="text-stone-800">{pagination.page}</strong> of{' '}
                <strong className="text-stone-800">{pagination.totalPages}</strong> (
                {pagination.total} total)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1 || loading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 text-xs uppercase font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 text-xs uppercase font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
