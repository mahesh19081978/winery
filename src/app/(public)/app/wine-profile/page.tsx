'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGuest } from '@/context/GuestContext';
import {
  Wine as WineIcon,
  Sliders,
  Heart,
  CheckCircle2,
  XCircle,
  Sparkles,
  Info,
  RotateCcw,
} from 'lucide-react';

interface AvailableWine {
  id: string;
  name: string;
  category: string;
  slug: string;
  shortDescription?: string;
  characteristics?: string[];
}

interface WinePreferencesState {
  favoriteVarietals: string[];
  preferredSweetness: string;
  preferredBody: string;
  preferredAcidity: string;
  favoriteWineId: string;
  favoriteWine?: {
    id: string;
    name: string;
    slug: string;
    category: string;
  } | null;
}

const ALL_VARIETALS = [
  'Cabernet Sauvignon',
  'Cabernet Franc',
  'Merlot',
  'Pinot Noir',
  'Syrah',
  'Chardonnay',
  'Sauvignon Blanc',
  'Champagne / Sparkling',
  'Rosé',
];

const SWEETNESS_OPTIONS = [
  'Bone Dry (1–2)',
  'Dry (1–3)',
  'Off-Dry (4–6)',
  'Sweet / Dessert (7–10)',
];

const BODY_OPTIONS = [
  'Light & Delicate (2–4)',
  'Medium-Bodied (4–6)',
  'Full & Opulent (7–9)',
  'Monumental Reserve (9–10)',
];

const ACIDITY_OPTIONS = [
  'Soft & Mellow (3–5)',
  'Balanced (5–7)',
  'Vibrant & Crisp (6–8)',
  'Electric & Chalky (8–10)',
];

export default function WineProfilePage() {
  const { refreshSession } = useGuest();

  const [preferences, setPreferences] = useState<WinePreferencesState>({
    favoriteVarietals: [],
    preferredSweetness: '',
    preferredBody: '',
    preferredAcidity: '',
    favoriteWineId: '',
    favoriteWine: null,
  });

  const [availableWines, setAvailableWines] = useState<AvailableWine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingWines, setLoadingWines] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load preferences from canonical database endpoint
  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch('/api/auth/guest/wine-profile', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.preferences) {
          const p = json.data.preferences;
          setPreferences({
            favoriteVarietals: p.favoriteVarietals || [],
            preferredSweetness: p.preferredSweetness || '',
            preferredBody: p.preferredBody || '',
            preferredAcidity: p.preferredAcidity || '',
            favoriteWineId: p.favoriteWineId || (p.favoriteWine?.id ?? ''),
            favoriteWine: p.favoriteWine || null,
          });
        }
      } else {
        setErrorMessage('Failed to load your wine preferences. Please try refreshing.');
      }
    } catch {
      setErrorMessage('A network error occurred while loading your wine profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch real wines for the selector
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoadingWines(true);
        const res = await fetch('/api/wines');
        if (res.ok) {
          const json = await res.json();
          if (json?.success && Array.isArray(json.data) && active) {
            setAvailableWines(json.data);
          }
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (active) setLoadingWines(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Initial load of preferences
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/guest/wine-profile', { cache: 'no-store' });
        if (res.ok && active) {
          const json = await res.json();
          if (json.success && json.data?.preferences) {
            const p = json.data.preferences;
            setPreferences({
              favoriteVarietals: p.favoriteVarietals || [],
              preferredSweetness: p.preferredSweetness || '',
              preferredBody: p.preferredBody || '',
              preferredAcidity: p.preferredAcidity || '',
              favoriteWineId: p.favoriteWineId || (p.favoriteWine?.id ?? ''),
              favoriteWine: p.favoriteWine || null,
            });
          }
        } else if (active) {
          setErrorMessage('Failed to load your wine preferences. Please try refreshing.');
        }
      } catch {
        if (active) {
          setErrorMessage('A network error occurred while loading your wine profile.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleVarietalToggle = (varietal: string) => {
    setPreferences((prev) => {
      const exists = prev.favoriteVarietals.includes(varietal);
      const updated = exists
        ? prev.favoriteVarietals.filter((v) => v !== varietal)
        : [...prev.favoriteVarietals, varietal];
      return { ...prev, favoriteVarietals: updated };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const payload = {
      favoriteVarietals: preferences.favoriteVarietals,
      preferredSweetness: preferences.preferredSweetness || null,
      preferredBody: preferences.preferredBody || null,
      preferredAcidity: preferences.preferredAcidity || null,
      favoriteWineId: preferences.favoriteWineId || null,
    };

    try {
      const res = await fetch('/api/auth/guest/wine-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        const updated = json.data?.preferences;
        if (updated) {
          setPreferences({
            favoriteVarietals: updated.favoriteVarietals || [],
            preferredSweetness: updated.preferredSweetness || '',
            preferredBody: updated.preferredBody || '',
            preferredAcidity: updated.preferredAcidity || '',
            favoriteWineId: updated.favoriteWineId || (updated.favoriteWine?.id ?? ''),
            favoriteWine: updated.favoriteWine || null,
          });
        }
        setSuccessMessage('Your wine preferences have been saved to your cellar profile.');
        // Synchronize with GuestContext session
        try {
          await refreshSession();
        } catch {
          // Ignore background sync errors
        }
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setErrorMessage(json.error || 'Failed to save wine preferences. Please review your selections.');
      }
    } catch {
      setErrorMessage('A network error occurred while saving your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedWine = availableWines.find((w) => w.id === preferences.favoriteWineId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-2 border-[#8a3243] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Loading your wine profile…</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-4xl pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#8a3243] font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Palate Calibration</span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl text-stone-900 font-light">My Wine Profile</h1>
        <p className="text-stone-500 text-sm mt-1 max-w-2xl">
          Your personal wine preferences represent your taste profile. Our estate sommeliers and cellar master
          use this calibration to curate tasting flights, recommend library allocations, and personalize every cellar visit.
        </p>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={loadPreferences}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-900 text-xs font-medium transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Favorite Grape Varietals */}
        <section className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-full bg-[#faf8f5] border border-stone-200 flex items-center justify-center text-[#8a3243]">
              <WineIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl text-stone-900 font-normal">Favorite Varietals</h2>
              <p className="text-xs text-stone-500">
                Select one or more grape varietals you enjoy most to guide your tailored tasting flights
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {ALL_VARIETALS.map((varietal) => {
              const selected = preferences.favoriteVarietals.includes(varietal);
              return (
                <button
                  type="button"
                  key={varietal}
                  onClick={() => handleVarietalToggle(varietal)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition cursor-pointer ${
                    selected
                      ? 'bg-[#8a3243] text-white shadow-sm'
                      : 'bg-[#faf8f5] border border-stone-200 text-stone-700 hover:border-stone-400'
                  }`}
                >
                  {varietal} {selected && '✓'}
                </button>
              );
            })}
          </div>
          {preferences.favoriteVarietals.length === 0 && (
            <p className="text-xs text-stone-400 italic">No specific varietals selected yet. Tap any to select.</p>
          )}
        </section>

        {/* Sensory Palate Profile */}
        <section className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-full bg-[#faf8f5] border border-stone-200 flex items-center justify-center text-[#8a3243]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl text-stone-900 font-normal">Sensory Calibration</h2>
              <p className="text-xs text-stone-500">Fine-tune your personal sweetness, body, and acidity preferences</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sweetness */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                Preferred Sweetness
              </label>
              <select
                value={preferences.preferredSweetness}
                onChange={(e) => setPreferences({ ...preferences, preferredSweetness: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm bg-white"
              >
                <option value="">None specified</option>
                {SWEETNESS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-stone-400 mt-1">From bone dry to rich dessert wines</p>
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                Preferred Body
              </label>
              <select
                value={preferences.preferredBody}
                onChange={(e) => setPreferences({ ...preferences, preferredBody: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm bg-white"
              >
                <option value="">None specified</option>
                {BODY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-stone-400 mt-1">Weight and mouthfeel on the palate</p>
            </div>

            {/* Acidity */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                Preferred Acidity
              </label>
              <select
                value={preferences.preferredAcidity}
                onChange={(e) => setPreferences({ ...preferences, preferredAcidity: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm bg-white"
              >
                <option value="">None specified</option>
                {ACIDITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-stone-400 mt-1">Crispness and freshness on the finish</p>
            </div>
          </div>
        </section>

        {/* Favorite VINORA Wine */}
        <section className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-full bg-[#faf8f5] border border-stone-200 flex items-center justify-center text-[#8a3243]">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl text-stone-900 font-normal">Favorite VINORA Wine</h2>
              <p className="text-xs text-stone-500">
                Choose your benchmark bottle from our real active cellar collection
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                Selected Estate Wine
              </label>
              <select
                value={preferences.favoriteWineId}
                onChange={(e) => setPreferences({ ...preferences, favoriteWineId: e.target.value })}
                disabled={loadingWines}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm bg-white disabled:bg-stone-100 disabled:cursor-not-allowed"
              >
                <option value="">None selected (clear favorite wine)</option>
                {availableWines.map((wine) => (
                  <option key={wine.id} value={wine.id}>
                    {wine.name} — {wine.category}
                  </option>
                ))}
              </select>
              <p className="text-xs text-stone-500 mt-1.5">
                Choosing a favorite bottle helps our hospitality team surprise you with library vintage pours during visits.
              </p>
            </div>

            {/* Display information for selected wine */}
            {selectedWine && (
              <div className="p-4 rounded-2xl bg-[#faf8f5] border border-stone-200/80 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-[#8a3243] shrink-0">
                  <WineIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-medium text-stone-900">{selectedWine.name}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#8a3243]/10 text-[#8a3243]">
                      {selectedWine.category}
                    </span>
                  </div>
                  {selectedWine.shortDescription && (
                    <p className="text-xs text-stone-600">{selectedWine.shortDescription}</p>
                  )}
                  {selectedWine.characteristics && selectedWine.characteristics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedWine.characteristics.map((char) => (
                        <span key={char} className="text-[10px] px-2 py-0.5 rounded-md bg-stone-200/70 text-stone-700">
                          {char}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Informational Note */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-amber-900 text-xs">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            Preferences are securely stored in your cellar database account. You can return and update them at any time
            as your palate evolves.
          </span>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 rounded-full bg-[#8a3243] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#732937] transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Preferences…</span>
              </>
            ) : (
              <span>Save Wine Preferences</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
