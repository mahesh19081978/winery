'use client';

import { useState } from 'react';
import { useGuest } from '@/context/GuestContext';
import {
  User,
  CheckCircle2,
  Sliders,
  Bell,
  Wine,
  XCircle
} from 'lucide-react';

function buildFormData(profile: ReturnType<typeof useGuest>['profile']) {
  return {
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    preferredBody: profile.preferences.preferredBody || 'Full & Opulent (7–9)',
    preferredAcidity: profile.preferences.preferredAcidity || 'Vibrant & Crisp (6–8)',
    preferredSweetness: profile.preferences.preferredSweetness || 'Dry (1–3)',
    favoriteVarietals: profile.preferences.favoriteVarietals || ['Cabernet Sauvignon', 'Syrah'],
    emailAlerts: profile.notifications.email,
    smsReminders: profile.notifications.sms,
    whatsapp: profile.notifications.whatsapp,
  };
}

export default function ProfilePage() {
  const { profile, updateProfile } = useGuest();

  // Local editable form state initialized from profile
  const [formData, setFormData] = useState(() => buildFormData(profile));
  const [prevProfile, setPrevProfile] = useState(profile);

  // Adjust state during render when the authenticated profile arrives (React-endorsed
  // alternative to setState-in-effect for prop-driven resets).
  if (prevProfile !== profile) {
    setPrevProfile(profile);
    setFormData(buildFormData(profile));
  }

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);

  // Varietal options
  const allVarietals = [
    'Cabernet Sauvignon',
    'Cabernet Franc',
    'Merlot',
    'Pinot Noir',
    'Syrah',
    'Chardonnay',
    'Sauvignon Blanc',
    'Champagne / Sparkling',
    'Rosé'
  ];

  const handleVarietalToggle = (varietal: string) => {
    const exists = formData.favoriteVarietals.includes(varietal);
    const updated = exists 
      ? formData.favoriteVarietals.filter((v: string) => v !== varietal)
      : [...formData.favoriteVarietals, varietal];
    setFormData({ ...formData, favoriteVarietals: updated });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(false);

    const ok = await updateProfile({
      name: formData.name,
      phone: formData.phone,
      preferences: {
        ...profile.preferences,
        preferredSweetness: formData.preferredSweetness,
        preferredAcidity: formData.preferredAcidity,
        preferredBody: formData.preferredBody,
        favoriteVarietals: formData.favoriteVarietals,
      },
      notifications: {
        email: formData.emailAlerts,
        sms: formData.smsReminders,
        whatsapp: formData.whatsapp
      }
    });

    setSaving(false);
    if (ok) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } else {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 6000);
    }
  };

  return (
    <div className="space-y-10 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl md:text-4xl text-stone-900 font-light">Palate Profile & Account</h1>
        <p className="text-stone-500 text-sm mt-1">
          Customize your sensory preferences so our cellar master and AI concierge can tailor your tasting flights
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Your profile and wine preferences have been updated and saved to your cellar account.</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>We could not save your preferences. Please try again in a moment.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Contact Info Card */}
        <section className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-full bg-[#faf8f5] border border-stone-200 flex items-center justify-center text-[#8a3243]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl text-stone-900 font-normal">Personal Information</h2>
              <p className="text-xs text-stone-500">Used for your tasting reservations and digital passes</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={formData.email}
                  title="Your sign-in email cannot be changed here. Contact the estate concierge to update it."
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-100 text-stone-500 text-sm cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                Contact Phone
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Palate Calibration */}
        <section className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-full bg-[#faf8f5] border border-stone-200 flex items-center justify-center text-[#8a3243]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl text-stone-900 font-normal">Palate Calibration</h2>
              <p className="text-xs text-stone-500">Fine-tune your sensory thresholds</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                Sweetness Preference
              </label>
              <select
                value={formData.preferredSweetness}
                onChange={(e) => setFormData({ ...formData, preferredSweetness: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm bg-white"
              >
                <option value="Bone Dry (1–2)">Bone Dry (1–2)</option>
                <option value="Dry (1–3)">Dry (1–3)</option>
                <option value="Off-Dry (4–6)">Off-Dry (4–6)</option>
                <option value="Sweet / Dessert (7–10)">Sweet / Dessert (7–10)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                Acidity & Crispness
              </label>
              <select
                value={formData.preferredAcidity}
                onChange={(e) => setFormData({ ...formData, preferredAcidity: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm bg-white"
              >
                <option value="Soft & Mellow (3–5)">Soft & Mellow (3–5)</option>
                <option value="Balanced (5–7)">Balanced (5–7)</option>
                <option value="Vibrant & Crisp (6–8)">Vibrant & Crisp (6–8)</option>
                <option value="Electric & Chalky (8–10)">Electric & Chalky (8–10)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                Body & Weight
              </label>
              <select
                value={formData.preferredBody}
                onChange={(e) => setFormData({ ...formData, preferredBody: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm bg-white"
              >
                <option value="Light & Delicate (2–4)">Light & Delicate (2–4)</option>
                <option value="Medium-Bodied (4–6)">Medium-Bodied (4–6)</option>
                <option value="Full & Opulent (7–9)">Full & Opulent (7–9)</option>
                <option value="Monumental Reserve (9–10)">Monumental Reserve (9–10)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Varietal Preferences */}
        <section className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-full bg-[#faf8f5] border border-stone-200 flex items-center justify-center text-[#8a3243]">
              <Wine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl text-stone-900 font-normal">Favorite Grape Varietals</h2>
              <p className="text-xs text-stone-500">Tap to include or exclude varietals from your tailored tasting menu</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {allVarietals.map((varietal) => {
              const selected = formData.favoriteVarietals.includes(varietal);
              return (
                <button
                  type="button"
                  key={varietal}
                  onClick={() => handleVarietalToggle(varietal)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition ${
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
        </section>

        {/* Member Communications & Notifications */}
        <section className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-full bg-[#faf8f5] border border-stone-200 flex items-center justify-center text-[#8a3243]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl text-stone-900 font-normal">Estate Notifications</h2>
              <p className="text-xs text-stone-500">How you would like to be alerted for allocations and bookings</p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-stone-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.emailAlerts}
                onChange={(e) => setFormData({ ...formData, emailAlerts: e.target.checked })}
                className="w-4 h-4 accent-[#8a3243] rounded"
              />
              <span>Receive digital reservation confirmations and estate calendar updates via Email</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.smsReminders}
                onChange={(e) => setFormData({ ...formData, smsReminders: e.target.checked })}
                className="w-4 h-4 accent-[#8a3243] rounded"
              />
              <span>Send SMS reminder 24 hours prior to my estate tasting reservation</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.checked })}
                className="w-4 h-4 accent-[#8a3243] rounded"
              />
              <span>Receive concierge allocation updates via WhatsApp</span>
            </label>
          </div>
        </section>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 rounded-full bg-[#8a3243] text-white text-sm font-medium uppercase tracking-wider hover:bg-[#732937] transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save Palate Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}
