'use client';

import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';

interface EditGuestData {
  id: string;
  name: string;
  phone: string | null;
  dateOfBirth: string | null;
  dietaryPreferences: string | null;
  notes: string | null;
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
}

interface EditGuestDialogProps {
  guest: EditGuestData;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updated: Partial<EditGuestData>) => void;
}

export function EditGuestDialog({ guest, isOpen, onClose, onUpdated }: EditGuestDialogProps) {
  const [name, setName] = useState(guest.name || '');
  const [phone, setPhone] = useState(guest.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState(() => {
    if (!guest.dateOfBirth) return '';
    const d = new Date(guest.dateOfBirth);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  });
  const [dietaryPreferences, setDietaryPreferences] = useState(guest.dietaryPreferences || '');
  const [notes, setNotes] = useState(guest.notes || '');
  const [emailNotifications, setEmailNotifications] = useState(guest.emailNotifications ?? false);
  const [smsNotifications, setSmsNotifications] = useState(guest.smsNotifications ?? false);
  const [whatsappNotifications, setWhatsappNotifications] = useState(guest.whatsappNotifications ?? false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Guest name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
        dietaryPreferences: dietaryPreferences.trim() || null,
        notes: notes.trim() || null,
        notifications: {
          email: emailNotifications,
          sms: smsNotifications,
          whatsapp: whatsappNotifications,
        },
      };

      const res = await fetch(`/api/admin/guests/${guest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Failed to update guest profile');
        return;
      }

      onUpdated({
        name: payload.name,
        phone: payload.phone,
        dateOfBirth: payload.dateOfBirth,
        dietaryPreferences: payload.dietaryPreferences,
        notes: payload.notes,
        emailNotifications: payload.notifications.email,
        smsNotifications: payload.notifications.sms,
        whatsappNotifications: payload.notifications.whatsapp,
      });

      onClose();
    } catch {
      setError('A network error occurred while updating profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-200 bg-[#faf8f5]">
          <div>
            <h2 className="font-serif text-lg font-medium text-stone-900">Edit Guest Profile</h2>
            <p className="text-xs text-stone-500 mt-0.5">Update contact details, preferences, and internal notes</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block font-medium text-stone-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c2432]/30 focus:border-[#6c2432]"
              placeholder="Guest full name"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block font-medium text-stone-700 mb-1">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c2432]/30 focus:border-[#6c2432]"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block font-medium text-stone-700 mb-1">Date of Birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c2432]/30 focus:border-[#6c2432]"
            />
          </div>

          {/* Dietary Preferences */}
          <div>
            <label className="block font-medium text-stone-700 mb-1">Dietary Preferences</label>
            <textarea
              rows={2}
              value={dietaryPreferences}
              onChange={(e) => setDietaryPreferences(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c2432]/30 focus:border-[#6c2432]"
              placeholder="e.g. Vegetarian, Gluten-free, Nut allergy..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-medium text-stone-700 mb-1">CRM / Hospitality Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c2432]/30 focus:border-[#6c2432]"
              placeholder="Important hospitality notes, visit preferences, or special accommodations..."
            />
          </div>

          {/* Notification Preferences */}
          <div className="pt-2 border-t border-stone-200">
            <label className="block font-medium text-stone-700 mb-2">Notification Channels</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-stone-700">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="rounded border-stone-300 text-[#6c2432] focus:ring-[#6c2432]"
                />
                <span>Email notifications</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-stone-700">
                <input
                  type="checkbox"
                  checked={smsNotifications}
                  onChange={(e) => setSmsNotifications(e.target.checked)}
                  className="rounded border-stone-300 text-[#6c2432] focus:ring-[#6c2432]"
                />
                <span>SMS notifications</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-stone-700">
                <input
                  type="checkbox"
                  checked={whatsappNotifications}
                  onChange={(e) => setWhatsappNotifications(e.target.checked)}
                  className="rounded border-stone-300 text-[#6c2432] focus:ring-[#6c2432]"
                />
                <span>WhatsApp notifications</span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6c2432] text-white hover:bg-[#581c28] transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
