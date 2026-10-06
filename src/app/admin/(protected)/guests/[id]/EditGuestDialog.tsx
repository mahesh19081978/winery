'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Plus, Tag as TagIcon } from 'lucide-react';

export interface AvailableTag {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
}

export interface EditGuestData {
  id: string;
  name: string;
  phone: string | null;
  status: 'ACTIVE' | 'VIP' | 'PROSPECT' | 'INACTIVE' | 'BLOCKED';
  dateOfBirth: string | null;
  dietaryPreferences: string | null;
  notes: string | null;
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  tags?: { tag: AvailableTag }[];
}

interface EditGuestDialogProps {
  guest: EditGuestData;
  isOpen: boolean;
  wineryId?: string;
  onClose: () => void;
  onUpdated: (updated: Partial<EditGuestData>) => void;
}

const LIFECYCLE_STATUSES: { value: EditGuestData['status']; label: string; description: string }[] = [
  { value: 'ACTIVE', label: 'Active', description: 'Standard active guest visiting estate' },
  { value: 'VIP', label: 'VIP', description: 'High-value or esteemed winery guest' },
  { value: 'PROSPECT', label: 'Prospect', description: 'Prospective member or high interest' },
  { value: 'INACTIVE', label: 'Inactive', description: 'Dormant or past guest' },
  { value: 'BLOCKED', label: 'Blocked', description: 'Restricted from booking or estate entry' },
];

export function EditGuestDialog({ guest, isOpen, wineryId, onClose, onUpdated }: EditGuestDialogProps) {
  const [name, setName] = useState(guest.name || '');
  const [phone, setPhone] = useState(guest.phone || '');
  const [status, setStatus] = useState<EditGuestData['status']>(guest.status || 'ACTIVE');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() =>
    (guest.tags || []).map((t) => t.tag.id)
  );
  const [availableTags, setAvailableTags] = useState<AvailableTag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);
  const [tagCreateError, setTagCreateError] = useState<string | null>(null);

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

  // Fetch available tags
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const fetchTags = async () => {
      setLoadingTags(true);
      try {
        const url = wineryId ? `/api/admin/guest-tags?wineryId=${encodeURIComponent(wineryId)}` : '/api/admin/guest-tags';
        const res = await fetch(url);
        const json = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && Array.isArray(json.data)) {
          setAvailableTags(json.data);
        }
      } catch {
        // silent fail for tag fetch
      } finally {
        if (!cancelled) setLoadingTags(false);
      }
    };
    fetchTags();
    return () => {
      cancelled = true;
    };
  }, [isOpen, wineryId]);

  if (!isOpen) return null;

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setCreatingTag(true);
    setTagCreateError(null);

    try {
      const url = wineryId ? `/api/admin/guest-tags?wineryId=${encodeURIComponent(wineryId)}` : '/api/admin/guest-tags';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim() }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setTagCreateError(json.error || 'Failed to create tag');
        return;
      }

      const created: AvailableTag = json.data;
      setAvailableTags((prev) => [...prev, created]);
      setSelectedTagIds((prev) => [...prev, created.id]);
      setNewTagName('');
    } catch {
      setTagCreateError('Error creating tag');
    } finally {
      setCreatingTag(false);
    }
  };

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
        status,
        tagIds: selectedTagIds,
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

      // Reconstruct tag objects for optimistic local state update
      const updatedTags = availableTags
        .filter((t) => selectedTagIds.includes(t.id))
        .map((t) => ({ tag: t }));

      onUpdated({
        name: payload.name,
        phone: payload.phone,
        status: payload.status,
        dateOfBirth: payload.dateOfBirth,
        dietaryPreferences: payload.dietaryPreferences,
        notes: payload.notes,
        emailNotifications: payload.notifications.email,
        smsNotifications: payload.notifications.sms,
        whatsappNotifications: payload.notifications.whatsapp,
        tags: updatedTags,
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
            <h2 className="font-serif text-lg font-medium text-stone-900">Edit Guest Profile &amp; Lifecycle</h2>
            <p className="text-xs text-stone-500 mt-0.5">Manage status, tags, contact info, and hospitality notes</p>
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

          {/* Lifecycle Status */}
          <div>
            <label className="block font-medium text-stone-700 mb-1">Guest Lifecycle Status *</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EditGuestData['status'])}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#6c2432]/30 focus:border-[#6c2432] font-medium text-stone-800"
            >
              {LIFECYCLE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label} — {s.description}
                </option>
              ))}
            </select>
          </div>

          {/* Guest Tags */}
          <div className="pt-2 border-t border-stone-200">
            <label className="block font-medium text-stone-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-[#6c2432]" />
                <span>Assigned Guest Tags</span>
              </span>
              <span className="text-[11px] font-normal text-stone-400">
                {selectedTagIds.length} selected
              </span>
            </label>

            {loadingTags ? (
              <p className="text-xs text-stone-400 py-1">Loading tags...</p>
            ) : availableTags.length === 0 ? (
              <p className="text-xs text-stone-500 py-1">No tags defined yet for this winery.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-stone-200 bg-[#faf8f5]/60 min-h-[42px]">
                {availableTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTag(tag.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                        isSelected
                          ? 'bg-[#6c2432] text-white border-[#6c2432] shadow-xs'
                          : 'bg-white text-stone-700 border-stone-300 hover:border-stone-400'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: isSelected ? '#ffffff' : tag.color || '#6c2432' }}
                      />
                      <span>{tag.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick add tag */}
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                placeholder="New tag name (e.g. Wine Club, Local)"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
              />
              <button
                type="button"
                onClick={handleCreateTag}
                disabled={creatingTag || !newTagName.trim()}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700 font-medium transition disabled:opacity-50 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{creatingTag ? 'Adding…' : 'Add Tag'}</span>
              </button>
            </div>
            {tagCreateError && (
              <p className="text-[11px] text-rose-600 mt-1">{tagCreateError}</p>
            )}
          </div>

          {/* Full Name */}
          <div className="pt-2 border-t border-stone-200">
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
