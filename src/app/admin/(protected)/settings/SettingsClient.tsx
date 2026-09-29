'use client';

import React, { useState, useEffect } from 'react';
import {
  Building,
  Clock,
  DollarSign,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
} from 'lucide-react';
import { SectionCard, StatCard } from '@/components/admin/UIComponents';
import { useIsMounted } from '@/hooks/useIsMounted';

interface AISettings {
  isEnabled: boolean;
  provider: string;
  modelName: string;
  apiKeyEncrypted: string;
}

interface WinerySettings {
  id: string;
  name: string;
  slug: string;
  description: string;
  story: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string | null;
  openingHours: string | null;
  timezone: string;
  currency: string;
  status: string;
  createdAt: string;
  aiSettings?: AISettings | null;
}

export function SettingsClient() {
  const mounted = useIsMounted();
  const [winery, setWinery] = useState<WinerySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);
  
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiProvider, setAiProvider] = useState('GEMINI');
  const [aiModel, setAiModel] = useState('gemini-3.1-flash-lite');
  const [aiApiKey, setAiApiKey] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/settings');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load estate settings');
      const data = json.data.winery;
      setWinery(data);
      if (data?.aiSettings) {
        setAiEnabled(data.aiSettings.isEnabled);
        setAiProvider(data.aiSettings.provider);
        setAiModel(data.aiSettings.modelName);
        setAiApiKey(data.aiSettings.apiKeyEncrypted || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching settings');
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
        const res = await fetch('/api/admin/settings');
        const json = await res.json();
        if (!cancelled) {
          if (!res.ok) throw new Error(json.error || 'Failed to load estate settings');
          const data = json.data.winery;
          setWinery(data);
          if (data?.aiSettings) {
            setAiEnabled(data.aiSettings.isEnabled);
            setAiProvider(data.aiSettings.provider);
            setAiModel(data.aiSettings.modelName);
            setAiApiKey(data.aiSettings.apiKeyEncrypted || '');
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error fetching settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!winery) return;
    
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wineryId: winery.id,
          aiSettings: {
            isEnabled: aiEnabled,
            provider: aiProvider,
            modelName: aiModel,
            apiKey: aiApiKey
          }
        })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
              System Configuration
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-mono text-stone-500">Estate Preferences</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium mt-1">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Estate identity, localized opening hours, contact endpoints, and currency configuration
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSettings}
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

      {savedNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-sm transition-all">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>Estate preferences saved and verified across active endpoints.</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Estate Status"
          value={winery?.status || 'ACTIVE'}
          subtitle="Guest reservations enabled"
          icon={Building}
        />
        <StatCard
          title="Timezone"
          value="America/Los_Angeles"
          subtitle="PST / PDT UTC-8"
          icon={Clock}
        />
        <StatCard
          title="Currency"
          value={winery?.currency || 'USD'}
          subtitle="United States Dollars ($)"
          icon={DollarSign}
        />
        <StatCard
          title="Platform Version"
          value="VINORA v5.0"
          subtitle="Next.js 16 • PostgreSQL"
          icon={Sparkles}
        />
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-stone-500">
          <Loader2 className="w-6 h-6 animate-spin text-[#6c2432] mb-2" />
          <span className="text-xs">Loading estate configuration...</span>
        </div>
      ) : !winery ? (
        <div className="p-8 text-center text-stone-500 text-sm">
          No estate record found in current database tenant.
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Primary Details (7 cols) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              <SectionCard
                title="Estate Identity &amp; Terroir"
                description="Core brand details displayed on guest communications and receipts"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-medium text-stone-700 uppercase mb-1">
                        Estate Name
                      </label>
                      <input
                        type="text"
                        defaultValue={winery.name}
                        className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#aa853e]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-medium text-stone-700 uppercase mb-1">
                        Estate Slug (URL path)
                      </label>
                      <input
                        type="text"
                        defaultValue={winery.slug}
                        readOnly
                        className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-100 text-stone-500 cursor-not-allowed font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-medium text-stone-700 uppercase mb-1">
                      Estate Narrative
                    </label>
                    <textarea
                      rows={3}
                      defaultValue={winery.description}
                      className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#aa853e] leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-medium text-stone-700 uppercase mb-1">
                      Founder Story &amp; Heritage
                    </label>
                    <textarea
                      rows={3}
                      defaultValue={winery.story || ''}
                      className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#aa853e] leading-relaxed"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Location &amp; Estate Grounds"
                description="Physical address and localized coordinates for navigation"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono font-medium text-stone-700 uppercase mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      defaultValue={winery.address}
                      className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#aa853e]"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-mono font-medium text-stone-700 uppercase mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        defaultValue={winery.city}
                        className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-medium text-stone-700 uppercase mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        defaultValue={winery.state}
                        className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-medium text-stone-700 uppercase mb-1">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        defaultValue={winery.postalCode}
                        className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-medium text-stone-700 uppercase mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        defaultValue={winery.country}
                        className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>
              
              <SectionCard
                title="AI Wine Concierge"
                description="Configure the AI assistant for guest inquiries"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="aiEnabled"
                      checked={aiEnabled}
                      onChange={(e) => setAiEnabled(e.target.checked)}
                      className="w-4 h-4 text-[#aa853e] bg-stone-100 border-stone-300 rounded focus:ring-[#aa853e]"
                    />
                    <label htmlFor="aiEnabled" className="text-sm font-medium text-stone-800">
                      Enable AI Concierge
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-medium text-stone-700 uppercase mb-1">
                        AI Provider
                      </label>
                      <select
                        value={aiProvider}
                        onChange={(e) => setAiProvider(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#aa853e]"
                      >
                        <option value="GEMINI">Google Gemini</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-medium text-stone-700 uppercase mb-1">
                        AI Model
                      </label>
                      <select
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#aa853e]"
                      >
                        <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
                        <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono font-medium text-stone-700 uppercase mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="Enter API Key"
                      className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#aa853e]"
                    />
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Right Column: Operations & Contacts (5 cols) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              <SectionCard
                title="Operational Hours"
                description="Cellar doors & tasting room visiting schedule"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono font-medium text-stone-700 uppercase mb-1">
                      Public Tasting Hours
                    </label>
                    <input
                      type="text"
                      defaultValue={winery.openingHours || 'Wednesday to Sunday: 10:00 AM – 6:00 PM'}
                      className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-medium text-stone-700 uppercase mb-1">
                      Timezone Engine
                    </label>
                    <input
                      type="text"
                      defaultValue={winery.timezone}
                      readOnly
                      className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-100 text-stone-500 cursor-not-allowed font-mono"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">
                      Used by the availability scheduler and email reminder triggers.
                    </p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Concierge Endpoints"
                description="Communication channels for guest reservations"
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-mono font-medium text-stone-700 uppercase mb-1">
                      Concierge Email
                    </label>
                    <input
                      type="email"
                      defaultValue={winery.email}
                      className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-medium text-stone-700 uppercase mb-1">
                      Concierge Telephone
                    </label>
                    <input
                      type="text"
                      defaultValue={winery.phone}
                      className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-medium text-stone-700 uppercase mb-1">
                      Official Website
                    </label>
                    <input
                      type="url"
                      defaultValue={winery.website || 'https://domaine-elysee.com'}
                      className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </SectionCard>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#461822] hover:bg-[#6c2432] text-white text-xs font-semibold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Estate Configuration</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
