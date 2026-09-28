'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  MessagesSquare,
  Search,
  RefreshCw,
  User,
  Bot,
  Sparkles,
  AlertCircle,
  Loader2,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';
import { SectionCard, StatCard } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ConversationMessageItem {
  id: string;
  role: string;
  content: string;
  timestamp: string;
}

interface ConversationItem {
  id: string;
  channel: string;
  startedAt: string;
  endedAt: string | null;
  guestProfile: {
    id: string;
    name: string;
    phone: string | null;
    user: { email: string };
  } | null;
  messages: ConversationMessageItem[];
}

export function ConversationsClient() {
  const mounted = useIsMounted();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchConversations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/conversations');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load conversations');
      const items = json.data.conversations || [];
      setConversations(items);
      if (items.length > 0 && !selectedId) {
        setSelectedId(items[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching conversations');
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
        const res = await fetch('/api/admin/conversations');
        const json = await res.json();
        if (!cancelled) {
          if (!res.ok) throw new Error(json.error || 'Failed to load conversations');
          const items = json.data.conversations || [];
          setConversations(items);
          if (items.length > 0 && !selectedId) {
            setSelectedId(items[0].id);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error fetching conversations');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      const guestName = c.guestProfile?.name.toLowerCase() || 'anonymous';
      const guestEmail = c.guestProfile?.user.email.toLowerCase() || '';
      const hasMessageMatch = c.messages.some((m) => m.content.toLowerCase().includes(q));
      return guestName.includes(q) || guestEmail.includes(q) || hasMessageMatch;
    });
  }, [conversations, search]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedId) || filteredConversations[0] || null;
  }, [conversations, selectedId, filteredConversations]);

  const totalMessages = useMemo(() => {
    return conversations.reduce((sum, c) => sum + c.messages.length, 0);
  }, [conversations]);

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
            <span className="text-xs font-mono text-stone-500">Concierge Transcripts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium mt-1">
            Conversations
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            AI sommelier dialogues, cellar queries, and guest hospitality transcripts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchConversations}
            disabled={mounted ? loading : false}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-medium transition shadow-2xs disabled:opacity-60"
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
          title="Active Sessions"
          value={conversations.length}
          subtitle="Guest chat dialogues"
          icon={MessagesSquare}
        />
        <StatCard
          title="Total Exchanged"
          value={totalMessages}
          subtitle="Messages recorded"
          icon={MessageCircle}
        />
        <StatCard
          title="Channel"
          value="Web Concierge"
          subtitle="Interactive digital sommelier"
          icon={Bot}
        />
        <StatCard
          title="AI Assistant"
          value="Online"
          subtitle="VINORA Knowledge Engine"
          icon={Sparkles}
        />
      </div>

      {/* Two Column Layout: Conversation List & Active Transcript */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left Column: Conversation Sidebar (5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search chat dialogues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#aa853e]"
            />
          </div>

          <div className="bg-white rounded-xl border border-stone-200/80 shadow-2xs overflow-hidden divide-y divide-stone-100 max-h-[580px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-stone-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#6c2432] mb-2" />
                <span className="text-xs">Loading conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-stone-400 text-xs">
                No conversation threads matching filter.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = activeConversation?.id === c.id;
                const lastMsg = c.messages[c.messages.length - 1];
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-4 transition-colors ${
                      isSelected
                        ? 'bg-[#faf8f5] border-l-4 border-l-[#6c2432]'
                        : 'hover:bg-stone-50/70 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-serif font-semibold text-stone-900 truncate">
                        {c.guestProfile?.name || 'Estate Guest'}
                      </span>
                      <span className="text-[10px] font-mono text-stone-400">
                        {new Date(c.startedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                      {lastMsg ? lastMsg.content : 'No messages'}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-stone-400">
                      <span>{c.channel}</span>
                      <span>{c.messages.length} messages</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation Transcript (7 cols) */}
        <div className="lg:col-span-7 xl:col-span-8">
          <SectionCard
            title={
              activeConversation
                ? activeConversation.guestProfile?.name || 'Estate Guest'
                : 'Conversation Thread'
            }
            description={
              activeConversation
                ? `${activeConversation.guestProfile?.user.email || 'Web Session'} • Started ${new Date(
                    activeConversation.startedAt
                  ).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'Select a conversation from the left to read dialogue history'
            }
            action={
              activeConversation?.guestProfile ? (
                <Link
                  href={`/admin/guests/${activeConversation.guestProfile.id}`}
                  className="text-xs font-medium text-[#6c2432] hover:text-[#461822] hover:underline flex items-center gap-1"
                >
                  <span>Guest Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : null
            }
          >
            {!activeConversation ? (
              <EmptyState
                icon={<MessagesSquare className="w-7 h-7" />}
                title="No conversation selected"
                description="Choose an existing conversation to review questions, AI recommendations, and tasting inquiries."
              />
            ) : (
              <div className="space-y-4">
                {/* Messages stream */}
                <div className="space-y-3 min-h-[380px] max-h-[460px] overflow-y-auto p-2 rounded-xl bg-stone-50/50 border border-stone-200/50">
                  {activeConversation.messages.map((m) => {
                    const isAssistant = m.role === 'assistant';
                    return (
                      <div
                        key={m.id}
                        className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                      >
                        {isAssistant && (
                          <div className="w-7 h-7 rounded-full bg-[#461822] text-[#d6b774] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-2xs ${
                            isAssistant
                              ? 'bg-white border border-stone-200/80 text-stone-800'
                              : 'bg-[#6c2432] text-white rounded-br-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span
                              className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                                isAssistant ? 'text-[#aa853e]' : 'text-[#f4f0e8]/80'
                              }`}
                            >
                              {isAssistant ? 'VINORA Concierge' : activeConversation.guestProfile?.name || 'Guest'}
                            </span>
                            <span
                              className={`text-[9px] font-mono ${
                                isAssistant ? 'text-stone-400' : 'text-stone-200/70'
                              }`}
                            >
                              {new Date(m.timestamp).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        </div>
                        {!isAssistant && (
                          <div className="w-7 h-7 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center shrink-0 mt-0.5">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Concierge Status Notice */}
                <div className="p-3 rounded-lg border border-stone-200/70 bg-[#faf8f5] flex items-center justify-between text-xs text-stone-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Real-time guest transcript captured via VINORA Concierge Gateway</span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-400">Read-only transcript</span>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
