'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { SectionCard } from '@/components/admin/UIComponents';

const STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];
const AVAILABILITY = ['AVAILABLE', 'FEW_SEATS_LEFT', 'SOLD_OUT'];

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function EventCreateClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    title: '',
    slug: '',
    eventDate: '',
    timeRange: '',
    venue: '',
    price: '',
    currency: 'USD',
    description: '',
    shortDescription: '',
    availability: 'AVAILABLE',
    availableTickets: '',
    maxCapacity: '',
    entertainment: '',
    featuredImage: '',
    winesServed: '',
    culinaryMenu: '',
    galleryImages: '',
    status: 'UPCOMING',
    isPast: false,
  });

  const update = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setFieldErrors({});
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        slug: form.slug.trim() || slugify(form.title),
        eventDate: form.eventDate,
        timeRange: form.timeRange.trim(),
        venue: form.venue.trim(),
        price: Number(form.price),
        currency: form.currency,
        description: form.description.trim(),
        shortDescription: form.shortDescription.trim(),
        availability: form.availability,
        availableTickets: Number(form.availableTickets),
        maxCapacity: Number(form.maxCapacity),
        entertainment: form.entertainment.trim() || null,
        featuredImage: form.featuredImage.trim(),
        winesServed: form.winesServed ? form.winesServed.split(',').map((s) => s.trim()).filter(Boolean) : [],
        culinaryMenu: form.culinaryMenu ? form.culinaryMenu.split(',').map((s) => s.trim()).filter(Boolean) : [],
        galleryImages: form.galleryImages ? form.galleryImages.split(',').map((s) => s.trim()).filter(Boolean) : [],
        status: form.status,
        isPast: form.isPast,
      };
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.details && Array.isArray(data.details)) {
          const fe: Record<string, string> = {};
          data.details.forEach((d: { path?: string[]; message?: string }) => {
            const k = d.path?.[0] || 'form';
            fe[k] = d.message || 'Invalid';
          });
          setFieldErrors(fe);
        }
        throw new Error(data.error || 'Failed to create event');
      }
      setSuccess('Event created successfully');
      setTimeout(() => router.push(`/admin/events/${data.data.id}`), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-stone-200/60 pb-2">
        <Link href="/admin/events" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">Domaine Élysée · Create Event</span>
          <h1 className="font-serif text-2xl font-medium text-stone-900">New Event</h1>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <p className="text-xs text-emerald-700">{success}</p>
        </div>
      )}

      <SectionCard title="Event Information" description="All fields validated server-side. Slug must be lowercase hyphenated.">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Title *</label>
              <input value={form.title} onChange={(e) => { update('title', e.target.value); if (!form.slug || form.slug === slugify(form.title)) update('slug', slugify(e.target.value)); }} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#6c2432]" placeholder="Wine & Jazz Evening" />
              {fieldErrors.title && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.title}</p>}
            </div>
            <div>
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Slug *</label>
              <input value={form.slug} onChange={(e) => update('slug', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#6c2432]" placeholder="wine-jazz-evening" />
              {fieldErrors.slug && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.slug}</p>}
            </div>
            <div>
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Event Date (YYYY-MM-DD) *</label>
              <input type="date" value={form.eventDate} onChange={(e) => update('eventDate', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#6c2432]" />
              {fieldErrors.eventDate && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.eventDate}</p>}
            </div>
            <div>
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Time Range *</label>
              <input value={form.timeRange} onChange={(e) => update('timeRange', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#6c2432]" placeholder="6:30 PM – 10:00 PM" />
            </div>
            <div>
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Venue *</label>
              <input value={form.venue} onChange={(e) => update('venue', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#6c2432]" placeholder="The Grand Lawn" />
            </div>
            <div>
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Price (USD) *</label>
              <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => update('price', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#6c2432]" placeholder="85" />
            </div>
            <div>
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Available Tickets *</label>
              <input type="number" min="0" value={form.availableTickets} onChange={(e) => update('availableTickets', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#6c2432]" />
              {fieldErrors.availableTickets && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.availableTickets}</p>}
            </div>
            <div>
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Max Capacity *</label>
              <input type="number" min="0" value={form.maxCapacity} onChange={(e) => update('maxCapacity', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#6c2432]" />
            </div>
            <div>
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Availability *</label>
              <select value={form.availability} onChange={(e) => update('availability', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs">
                {AVAILABILITY.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Status *</label>
              <select value={form.status} onChange={(e) => update('status', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs">
                {STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Featured Image URL *</label>
              <input value={form.featuredImage} onChange={(e) => update('featuredImage', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#6c2432]" placeholder="https://..." />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Entertainment</label>
              <input value={form.entertainment} onChange={(e) => update('entertainment', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" placeholder="Live performance by ..." />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Short Description *</label>
              <textarea value={form.shortDescription} onChange={(e) => update('shortDescription', e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#6c2432]" placeholder="Short description..." />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Description *</label>
              <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#6c2432]" placeholder="Full description..." />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Wines Served (comma separated)</label>
              <input value={form.winesServed} onChange={(e) => update('winesServed', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" placeholder="Blanc de Blancs, Chardonnay" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Culinary Menu (comma separated)</label>
              <input value={form.culinaryMenu} onChange={(e) => update('culinaryMenu', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" placeholder="Tartine, Arancini" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase font-mono tracking-wider text-stone-600">Gallery Images (comma separated URLs)</label>
              <input value={form.galleryImages} onChange={(e) => update('galleryImages', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs" placeholder="https://..." />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isPast} onChange={(e) => update('isPast', e.target.checked)} className="rounded" />
              <label className="text-xs text-stone-700">Mark as past event</label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-4">
            <Link href="/admin/events" className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50">Cancel</Link>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-[#461822] px-5 py-2 text-xs font-medium text-white hover:bg-[#6c2432] disabled:opacity-50">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Event
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
