'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useGuest } from '@/context/GuestContext';
import {
  User,
  CheckCircle2,
  Bell,
  XCircle,
  Wine,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

function buildFormData(profile: ReturnType<typeof useGuest>['profile']) {
  return {
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const ok = await updateProfile({
      name: formData.name,
      phone: formData.phone,
      notifications: {
        email: formData.emailAlerts,
        sms: formData.smsReminders,
        whatsapp: formData.whatsapp,
      },
    });

    setSaving(false);
    if (ok) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } else {
      setSaveError('We could not save your profile changes. Please verify all fields and try again.');
      setTimeout(() => setSaveError(null), 6000);
    }
  };

  return (
    <div className="space-y-10 max-w-4xl pb-16">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl md:text-4xl text-stone-900 font-light">Account & Profile</h1>
        <p className="text-stone-500 text-sm mt-1">
          Manage your personal contact details, estate reservation passes, and communication preferences.
        </p>
      </div>

      {/* Wine Profile Link Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#faf8f5] to-amber-50/40 border border-[#e6dece] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#8a3243]/10 border border-[#8a3243]/20 flex items-center justify-center text-[#8a3243] shrink-0">
            <Wine className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-medium text-stone-900">Wine Palate & Taste Preferences</h3>
            <p className="text-xs text-stone-500">
              Calibrate your preferred sweetness, body, acidity, favorite varietals, and signature estate bottle.
            </p>
          </div>
        </div>
        <Link
          href="/app/wine-profile"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#8a3243] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#732937] transition shrink-0 shadow-sm"
        >
          <span>My Wine Profile</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Your personal profile and communication settings have been saved.</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-3 animate-in fade-in">
          <XCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{saveError}</span>
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
              <p className="text-xs text-stone-500">Used for your tasting reservations and digital estate passes</p>
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
              <p className="text-[11px] text-stone-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-stone-400" />
                <span>Primary account email (read-only)</span>
              </p>
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
            className="px-8 py-3 rounded-full bg-[#8a3243] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#732937] transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? 'Saving…' : 'Save Profile Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
