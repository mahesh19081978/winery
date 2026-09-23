'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  ExternalLink,
  FileText,
  HelpCircle,
  MapPin,
  Music,
  Star,
  Ticket,
  Users,
  Utensils,
  Wine,
  Pencil,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { SectionCard, StatCard, StatusBadge } from '@/components/admin/UIComponents';

interface EventData {
  id: string;
  slug: string;
  title: string;
  eventDate: string;
  timeRange: string;
  venue: string;
  price: string | number;
  currency: string;
  description: string;
  shortDescription: string;
  availability: string;
  availableTickets: number;
  maxCapacity: number;
  entertainment: string | null;
  featuredImage: string;
  winesServed: string[];
  culinaryMenu: string[];
  galleryImages: string[];
  isPast: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  schedules: { id: string; timeSlot: string; activity: string; sortOrder: number }[];
  faqs: { id: string; question: string; answer: string; sortOrder: number }[];
  ticketTypes: { id: string; name: string; price: string | number; capacity: number; soldCount: number }[];
  eventBookings: {
    id: string;
    bookingNumber: string;
    totalPrice: string | number;
    status: string;
    createdAt: string;
    eventSchedule: { id: string; timeSlot: string; activity: string };
    guestProfile: { id: string; name: string; phone: string | null; user: { email: string } };
    tickets: { quantity: number; unitPrice: string | number; ticketType: { id: string; name: string; price: string | number; capacity: number; soldCount: number } | null }[];
  }[];
  reviews: { id: string; authorName: string; rating: number; title: string; status: string; createdAt: string }[];
  _count: { eventBookings: number; reviews: number };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
function formatDateTime(date: string) {
  return new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function getBookingTicketCount(b: EventData['eventBookings'][number]) { return b.tickets.reduce((s, t) => s + t.quantity, 0); }
function getBookingTicketSummary(b: EventData['eventBookings'][number]) {
  if (b.tickets.length === 0) return 'No ticket lines';
  return b.tickets.map((t) => `${t.ticketType?.name || 'Archived ticket'} x ${t.quantity}`).join(', ');
}

export function EventDetailClient({ event: initial }: { event: EventData }) {
  const [event, setEvent] = useState<EventData>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [globalMsg, setGlobalMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/events/${initial.id}`);
      const j = await res.json();
      if (res.ok) setEvent(j.data);
    } finally { setRefreshing(false); }
  };

  // Event edit state
  const [showEventEdit, setShowEventEdit] = useState(false);
  const [eventForm, setEventForm] = useState<Record<string,string>>({});
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState('');

  const openEventEdit = () => {
    setEventForm({
      title: event.title,
      slug: event.slug,
      eventDate: event.eventDate.slice(0,10),
      timeRange: event.timeRange,
      venue: event.venue,
      price: String(event.price),
      currency: event.currency,
      description: event.description,
      shortDescription: event.shortDescription,
      availability: event.availability,
      availableTickets: String(event.availableTickets),
      maxCapacity: String(event.maxCapacity),
      entertainment: event.entertainment || '',
      featuredImage: event.featuredImage,
      winesServed: event.winesServed.join(', '),
      culinaryMenu: event.culinaryMenu.join(', '),
      galleryImages: event.galleryImages.join(', '),
      status: event.status,
      isPast: event.isPast ? 'true' : 'false',
    });
    setEventError('');
    setShowEventEdit(true);
  };

  const submitEventEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventLoading(true); setEventError('');
    try {
      const payload: Record<string, unknown> = {
        title: eventForm.title,
        slug: eventForm.slug,
        eventDate: eventForm.eventDate,
        timeRange: eventForm.timeRange,
        venue: eventForm.venue,
        price: Number(eventForm.price),
        currency: eventForm.currency,
        description: eventForm.description,
        shortDescription: eventForm.shortDescription,
        availability: eventForm.availability,
        availableTickets: Number(eventForm.availableTickets),
        maxCapacity: Number(eventForm.maxCapacity),
        entertainment: eventForm.entertainment || null,
        featuredImage: eventForm.featuredImage,
        winesServed: eventForm.winesServed ? eventForm.winesServed.split(',').map(s=>s.trim()).filter(Boolean) : [],
        culinaryMenu: eventForm.culinaryMenu ? eventForm.culinaryMenu.split(',').map(s=>s.trim()).filter(Boolean) : [],
        galleryImages: eventForm.galleryImages ? eventForm.galleryImages.split(',').map(s=>s.trim()).filter(Boolean) : [],
        status: eventForm.status,
        isPast: eventForm.isPast === 'true',
      };
      const res = await fetch(`/api/admin/events/${event.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Update failed');
      setShowEventEdit(false);
      setGlobalMsg({ type: 'success', text: 'Event updated successfully' });
      await refresh();
      setTimeout(()=>setGlobalMsg(null), 3000);
    } catch (err) { setEventError(err instanceof Error ? err.message : 'Update failed'); } finally { setEventLoading(false); }
  };

  // Schedule dialog
  const [showSchedule, setShowSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<{ id: string; timeSlot: string; activity: string; sortOrder: number } | null>(null);
  const [schedForm, setSchedForm] = useState({ timeSlot: '', activity: '', sortOrder: '0' });
  const [schedLoading, setSchedLoading] = useState(false);
  const [schedError, setSchedError] = useState('');

  const openScheduleCreate = () => { setEditingSchedule(null); setSchedForm({ timeSlot: '', activity: '', sortOrder: String(event.schedules.length) }); setSchedError(''); setShowSchedule(true); };
  const openScheduleEdit = (s: { id: string; timeSlot: string; activity: string; sortOrder: number }) => { setEditingSchedule(s); setSchedForm({ timeSlot: s.timeSlot, activity: s.activity, sortOrder: String(s.sortOrder) }); setSchedError(''); setShowSchedule(true); };
  const submitSchedule = async (e: React.FormEvent) => {
    e.preventDefault(); setSchedLoading(true); setSchedError('');
    try {
      const payload = { timeSlot: schedForm.timeSlot, activity: schedForm.activity, sortOrder: Number(schedForm.sortOrder) };
      const url = editingSchedule ? `/api/admin/events/${event.id}/schedules/${editingSchedule.id}` : `/api/admin/events/${event.id}/schedules`;
      const method = editingSchedule ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed');
      setShowSchedule(false); setGlobalMsg({ type: 'success', text: editingSchedule ? 'Schedule updated' : 'Schedule created' }); await refresh();
    } catch (err) { setSchedError(err instanceof Error ? err.message : 'Failed'); } finally { setSchedLoading(false); }
  };
  const deleteSchedule = async (id: string) => {
    if (!confirm('Delete this schedule? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/events/${event.id}/schedules/${id}`, { method: 'DELETE' });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j.error || 'Delete failed');
      setGlobalMsg({ type: 'success', text: 'Schedule deleted' }); await refresh();
    } catch (err) { setGlobalMsg({ type: 'error', text: err instanceof Error ? err.message : 'Delete failed' }); }
  };

  // Ticket type dialog
  const [showTicket, setShowTicket] = useState(false);
  const [editingTicket, setEditingTicket] = useState<{ id: string; name: string; price: string | number; capacity: number } | null>(null);
  const [ticketForm, setTicketForm] = useState({ name: '', price: '', capacity: '' });
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState('');

  const openTicketCreate = () => { setEditingTicket(null); setTicketForm({ name: '', price: '', capacity: '' }); setTicketError(''); setShowTicket(true); };
  const openTicketEdit = (t: { id: string; name: string; price: string | number; capacity: number }) => { setEditingTicket(t); setTicketForm({ name: t.name, price: String(t.price), capacity: String(t.capacity) }); setTicketError(''); setShowTicket(true); };
  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault(); setTicketLoading(true); setTicketError('');
    try {
      const payload: Record<string, unknown> = { name: ticketForm.name, price: Number(ticketForm.price), capacity: Number(ticketForm.capacity) };
      const url = editingTicket ? `/api/admin/events/${event.id}/ticket-types/${editingTicket.id}` : `/api/admin/events/${event.id}/ticket-types`;
      const method = editingTicket ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed');
      setShowTicket(false); setGlobalMsg({ type: 'success', text: editingTicket ? 'Ticket type updated' : 'Ticket type created' }); await refresh();
    } catch (err) { setTicketError(err instanceof Error ? err.message : 'Failed'); } finally { setTicketLoading(false); }
  };
  const deleteTicket = async (id: string) => {
    if (!confirm('Delete this ticket type? If bookings reference it, deletion will be blocked with 409 Conflict.')) return;
    try {
      const res = await fetch(`/api/admin/events/${event.id}/ticket-types/${id}`, { method: 'DELETE' });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j.error || 'Delete failed');
      setGlobalMsg({ type: 'success', text: 'Ticket type deleted' }); await refresh();
    } catch (err) { setGlobalMsg({ type: 'error', text: err instanceof Error ? err.message : 'Delete failed' }); }
  };

  // FAQ dialog
  const [showFaq, setShowFaq] = useState(false);
  const [editingFaq, setEditingFaq] = useState<{ id: string; question: string; answer: string; sortOrder: number } | null>(null);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', sortOrder: '0' });
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqError, setFaqError] = useState('');

  const openFaqCreate = () => { setEditingFaq(null); setFaqForm({ question: '', answer: '', sortOrder: String(event.faqs.length) }); setFaqError(''); setShowFaq(true); };
  const openFaqEdit = (f: { id: string; question: string; answer: string; sortOrder: number }) => { setEditingFaq(f); setFaqForm({ question: f.question, answer: f.answer, sortOrder: String(f.sortOrder) }); setFaqError(''); setShowFaq(true); };
  const submitFaq = async (e: React.FormEvent) => {
    e.preventDefault(); setFaqLoading(true); setFaqError('');
    try {
      const payload = { question: faqForm.question, answer: faqForm.answer, sortOrder: Number(faqForm.sortOrder) };
      const url = editingFaq ? `/api/admin/events/${event.id}/faqs/${editingFaq.id}` : `/api/admin/events/${event.id}/faqs`;
      const method = editingFaq ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed');
      setShowFaq(false); setGlobalMsg({ type: 'success', text: editingFaq ? 'FAQ updated' : 'FAQ created' }); await refresh();
    } catch (err) { setFaqError(err instanceof Error ? err.message : 'Failed'); } finally { setFaqLoading(false); }
  };
  const deleteFaq = async (id: string) => {
    if (!confirm('Delete this FAQ?')) return;
    try {
      const res = await fetch(`/api/admin/events/${event.id}/faqs/${id}`, { method: 'DELETE' });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j.error || 'Delete failed');
      setGlobalMsg({ type: 'success', text: 'FAQ deleted' }); await refresh();
    } catch (err) { setGlobalMsg({ type: 'error', text: err instanceof Error ? err.message : 'Delete failed' }); }
  };

  const ticketCapacity = event.ticketTypes.reduce((sum, ticket) => sum + ticket.capacity, 0);
  const soldTickets = event.ticketTypes.reduce((sum, ticket) => sum + ticket.soldCount, 0);
  const bookingTickets = event.eventBookings.reduce((sum, booking) => sum + getBookingTicketCount(booking), 0);
  const averageReviewRating = event.reviews.length > 0 ? (event.reviews.reduce((sum, review) => sum + review.rating, 0) / event.reviews.length).toFixed(1) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-stone-200/60 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/events" className="rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">VINORA · Event Details</span>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-2xl font-medium text-stone-900 sm:text-3xl">{event.title}</h1>
              <StatusBadge status={event.status} size="md" />
              <StatusBadge status={event.availability} size="md" />
              {refreshing && <Loader2 className="h-4 w-4 animate-spin text-stone-400" />}
            </div>
          </div>
        </div>
        <Link href={`/events/${event.slug}`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50">
          <ExternalLink className="h-3.5 w-3.5" />Public Page
        </Link>
      </div>

      {globalMsg && (
        <div className={`flex items-center gap-2 rounded-lg border p-3 ${globalMsg.type==='success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          {globalMsg.type==='success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <p className="text-xs">{globalMsg.text}</p>
          <button onClick={()=>setGlobalMsg(null)} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard title="Bookings" value={event._count.eventBookings} icon={Users} />
        <StatCard title="Tickets Booked" value={bookingTickets} icon={Ticket} />
        <StatCard title="Ticket Types" value={event.ticketTypes.length} icon={FileText} />
        <StatCard title="Capacity" value={ticketCapacity || event.maxCapacity} subtitle={`${soldTickets} sold by ticket types`} icon={Users} />
        <StatCard title="Schedules" value={event.schedules.length} icon={Clock} />
        <StatCard title="Reviews" value={event._count.reviews} subtitle={averageReviewRating ? `Avg ${averageReviewRating}/5` : undefined} icon={Star} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Event Information */}
          <SectionCard title="Event Information" description="Authenticated edit via PATCH /api/admin/events/[id]" action={<button onClick={openEventEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"><Pencil className="h-3.5 w-3.5" />Edit</button>}>
            <div className="space-y-5">
              <div className="rounded-xl border border-stone-200/80 bg-[#faf8f5]/50 p-4">
                <p className="text-sm leading-relaxed text-stone-700">{event.shortDescription}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-4 w-4 text-stone-400" /><div><p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Date</p><p className="text-sm font-medium text-stone-900">{formatDate(event.eventDate)}</p></div></div>
                <div className="flex items-start gap-3"><Clock className="mt-0.5 h-4 w-4 text-stone-400" /><div><p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Time</p><p className="text-sm font-medium text-stone-900">{event.timeRange}</p></div></div>
                <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 text-stone-400" /><div><p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Venue</p><p className="text-sm font-medium text-stone-900">{event.venue}</p></div></div>
                <div className="flex items-start gap-3"><Ticket className="mt-0.5 h-4 w-4 text-stone-400" /><div><p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Base Price</p><p className="text-sm font-medium text-stone-900">${Number(event.price).toFixed(2)} {event.currency}</p></div></div>
              </div>
              <div><p className="mb-2 text-[10px] uppercase font-mono tracking-wider text-stone-500">Description</p><p className="text-sm leading-relaxed text-stone-700">{event.description}</p></div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-stone-200 bg-white p-3"><p className="text-[10px] uppercase font-mono text-stone-500">Slug</p><p className="font-mono text-stone-800">{event.slug}</p></div>
                <div className="rounded-lg border border-stone-200 bg-white p-3"><p className="text-[10px] uppercase font-mono text-stone-500">Featured Image</p><p className="truncate text-stone-700">{event.featuredImage}</p></div>
              </div>
            </div>
          </SectionCard>

          {/* Schedule Management */}
          <SectionCard title="Schedule Management" description="Create / edit / delete where safe (blocked if bookings reference it)" action={<button onClick={openScheduleCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-[#461822] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#6c2432]"><Plus className="h-3.5 w-3.5" />Add Slot</button>}>
            {event.schedules.length === 0 ? (
              <div className="py-8 text-center"><p className="text-xs text-stone-500">No schedule items configured.</p><p className="mt-1 text-[11px] text-stone-400">Add time slots for the event program</p></div>
            ) : (
              <div className="space-y-3">
                {event.schedules.map((s) => (
                  <div key={s.id} className="flex items-start justify-between gap-4 rounded-lg border border-stone-200/80 bg-white p-3">
                    <div className="flex items-start gap-4">
                      <span className="w-20 shrink-0 font-mono text-xs font-semibold text-[#6c2432]">{s.timeSlot}</span>
                      <p className="text-sm font-medium text-stone-800">{s.activity}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={()=>openScheduleEdit(s)} className="rounded p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-700"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={()=>deleteSchedule(s.id)} className="rounded p-1.5 text-stone-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Ticket Types */}
          <SectionCard title="Ticket Types" description="Price from DB, soldCount is read-only, capacity cannot be reduced below soldCount" action={<button onClick={openTicketCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-[#461822] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#6c2432]"><Plus className="h-3.5 w-3.5" />Add Ticket</button>}>
            {event.ticketTypes.length === 0 ? (
              <div className="py-8 text-center"><p className="text-xs text-stone-500">No ticket types configured.</p></div>
            ) : (
              <div className="overflow-x-auto -mx-5 -my-2">
                <table className="w-full border-collapse text-left text-xs">
                  <thead><tr className="border-b border-stone-100 bg-[#faf8f5]/60 text-[10px] uppercase tracking-wider text-stone-500 font-mono"><th className="px-5 py-3">Ticket</th><th className="px-4 py-3 text-right">Price</th><th className="px-4 py-3 text-center">Capacity</th><th className="px-4 py-3 text-center">Sold</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-stone-100">
                    {event.ticketTypes.map((ticket) => (
                      <tr key={ticket.id}>
                        <td className="px-5 py-3.5 font-medium text-stone-900">{ticket.name}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-stone-700">${Number(ticket.price).toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-center text-stone-700">{ticket.capacity}</td>
                        <td className="px-5 py-3.5 text-center font-semibold text-stone-900">{ticket.soldCount}</td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={()=>openTicketEdit(ticket)} className="rounded p-1.5 text-stone-500 hover:bg-stone-100"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={()=>deleteTicket(ticket.id)} className="rounded p-1.5 text-stone-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Event Bookings" description="Read-only participation from existing EventBooking records">
            {event.eventBookings.length === 0 ? (
              <p className="py-8 text-center text-xs text-stone-500">No event bookings exist for this event yet.</p>
            ) : (
              <div className="space-y-3">
                {event.eventBookings.map((booking) => (
                  <div key={booking.id} className="rounded-xl border border-stone-200/80 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><p className="font-medium text-stone-900">{booking.guestProfile.name}</p><p className="text-[11px] text-stone-500">{booking.bookingNumber} · {booking.guestProfile.user.email}</p></div>
                      <StatusBadge status={booking.status} size="sm" />
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-stone-600 sm:grid-cols-3">
                      <span>{getBookingTicketSummary(booking)}</span>
                      <span>{getBookingTicketCount(booking)} ticket{getBookingTicketCount(booking) !== 1 ? 's' : ''}</span>
                      <span className="font-mono">${Number(booking.totalPrice).toFixed(2)}</span>
                    </div>
                    <p className="mt-2 text-[11px] text-stone-500">{booking.eventSchedule.timeSlot} · {booking.eventSchedule.activity}</p>
                    <p className="mt-2 text-[10px] font-mono text-stone-400">Booked {formatDateTime(booking.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Availability" description="Real event capacity fields">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between"><span className="text-stone-500">Available Tickets</span><span className="font-mono font-medium text-stone-900">{event.availableTickets}</span></div>
              <div className="flex items-center justify-between"><span className="text-stone-500">Max Capacity</span><span className="font-mono font-medium text-stone-900">{event.maxCapacity}</span></div>
              <div className="flex items-center justify-between"><span className="text-stone-500">Past Event</span><span className="font-mono font-medium text-stone-900">{event.isPast ? 'Yes' : 'No'}</span></div>
              <div className="flex items-center justify-between"><span className="text-stone-500">Created</span><span className="font-mono text-stone-700">{formatDateTime(event.createdAt)}</span></div>
              <div className="flex items-center justify-between"><span className="text-stone-500">Updated</span><span className="font-mono text-stone-700">{formatDateTime(event.updatedAt)}</span></div>
            </div>
          </SectionCard>

          {event.entertainment && (
            <SectionCard title="Entertainment" description="Program performer or feature">
              <div className="flex items-start gap-3"><Music className="mt-0.5 h-4 w-4 text-[#6c2432]" /><p className="text-sm font-medium text-stone-900">{event.entertainment}</p></div>
            </SectionCard>
          )}

          <SectionCard title="Wines Served" description={`${event.winesServed.length} listed selections`}>
            {event.winesServed.length === 0 ? <p className="text-xs text-stone-500">No wines listed.</p> : <ul className="space-y-2">{event.winesServed.map((wine) => (<li key={wine} className="flex items-start gap-2 text-xs text-stone-700"><Wine className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6c2432]" />{wine}</li>))}</ul>}
          </SectionCard>

          <SectionCard title="Culinary Menu" description={`${event.culinaryMenu.length} listed items`}>
            {event.culinaryMenu.length === 0 ? <p className="text-xs text-stone-500">No menu items listed.</p> : <ul className="space-y-2">{event.culinaryMenu.map((item) => (<li key={item} className="flex items-start gap-2 text-xs text-stone-700"><Utensils className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6c2432]" />{item}</li>))}</ul>}
          </SectionCard>

          <SectionCard title="FAQs" description={`${event.faqs.length} configured questions. Ordering via sortOrder.`} action={<button onClick={openFaqCreate} className="inline-flex items-center gap-1 rounded-lg bg-[#461822] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#6c2432]"><Plus className="h-3 w-3" />Add</button>}>
            {event.faqs.length === 0 ? (
              <div className="py-6 text-center"><p className="text-xs text-stone-500">No FAQs configured.</p></div>
            ) : (
              <div className="space-y-3">
                {event.faqs.map((faq) => (
                  <div key={faq.id} className="rounded-lg border border-stone-200 bg-white p-3">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1"><HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6c2432]" /><p className="text-xs font-medium text-stone-900">{faq.question}</p></div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={()=>openFaqEdit(faq)} className="rounded p-1 text-stone-500 hover:bg-stone-100"><Pencil className="h-3 w-3" /></button>
                        <button onClick={()=>deleteFaq(faq.id)} className="rounded p-1 text-stone-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-stone-600">{faq.answer}</p>
                    <p className="mt-1 text-[10px] font-mono text-stone-400">Order: {faq.sortOrder}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Event Edit Dialog */}
      {showEventEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between"><h3 className="font-serif text-lg font-medium text-stone-900">Edit Event</h3><button onClick={()=>setShowEventEdit(false)} className="rounded p-1 hover:bg-stone-100"><X className="h-4 w-4" /></button></div>
            {eventError && <div className="mb-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700"><AlertCircle className="h-3.5 w-3.5" />{eventError}</div>}
            <form onSubmit={submitEventEdit} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Title</label><input value={eventForm.title} onChange={(e)=>setEventForm(p=>({...p, title:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Slug</label><input value={eventForm.slug} onChange={(e)=>setEventForm(p=>({...p, slug:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Date</label><input type="date" value={eventForm.eventDate} onChange={(e)=>setEventForm(p=>({...p, eventDate:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Time Range</label><input value={eventForm.timeRange} onChange={(e)=>setEventForm(p=>({...p, timeRange:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Venue</label><input value={eventForm.venue} onChange={(e)=>setEventForm(p=>({...p, venue:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Price</label><input type="number" step="0.01" value={eventForm.price} onChange={(e)=>setEventForm(p=>({...p, price:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Available Tickets</label><input type="number" value={eventForm.availableTickets} onChange={(e)=>setEventForm(p=>({...p, availableTickets:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Max Capacity</label><input type="number" value={eventForm.maxCapacity} onChange={(e)=>setEventForm(p=>({...p, maxCapacity:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Availability</label><select value={eventForm.availability} onChange={(e)=>setEventForm(p=>({...p, availability:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs"><option value="AVAILABLE">AVAILABLE</option><option value="FEW_SEATS_LEFT">FEW_SEATS_LEFT</option><option value="SOLD_OUT">SOLD_OUT</option></select></div>
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Status</label><select value={eventForm.status} onChange={(e)=>setEventForm(p=>({...p, status:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs"><option value="UPCOMING">UPCOMING</option><option value="ONGOING">ONGOING</option><option value="COMPLETED">COMPLETED</option><option value="CANCELLED">CANCELLED</option></select></div>
                <div className="sm:col-span-2"><label className="text-[11px] uppercase font-mono text-stone-600">Featured Image</label><input value={eventForm.featuredImage} onChange={(e)=>setEventForm(p=>({...p, featuredImage:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
                <div className="sm:col-span-2"><label className="text-[11px] uppercase font-mono text-stone-600">Short Description</label><textarea value={eventForm.shortDescription} onChange={(e)=>setEventForm(p=>({...p, shortDescription:e.target.value}))} rows={2} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
                <div className="sm:col-span-2"><label className="text-[11px] uppercase font-mono text-stone-600">Description</label><textarea value={eventForm.description} onChange={(e)=>setEventForm(p=>({...p, description:e.target.value}))} rows={3} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
                <div className="sm:col-span-2"><label className="text-[11px] uppercase font-mono text-stone-600">Wines (comma)</label><input value={eventForm.winesServed} onChange={(e)=>setEventForm(p=>({...p, winesServed:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
                <div className="sm:col-span-2"><label className="text-[11px] uppercase font-mono text-stone-600">Culinary (comma)</label><input value={eventForm.culinaryMenu} onChange={(e)=>setEventForm(p=>({...p, culinaryMenu:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
                <div className="sm:col-span-2"><label className="text-[11px] uppercase font-mono text-stone-600">Gallery (comma URLs)</label><input value={eventForm.galleryImages} onChange={(e)=>setEventForm(p=>({...p, galleryImages:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Is Past</label><select value={eventForm.isPast} onChange={(e)=>setEventForm(p=>({...p, isPast:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs"><option value="false">No</option><option value="true">Yes</option></select></div>
                <div><label className="text-[11px] uppercase font-mono text-stone-600">Entertainment</label><input value={eventForm.entertainment} onChange={(e)=>setEventForm(p=>({...p, entertainment:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={()=>setShowEventEdit(false)} className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700">Cancel</button><button type="submit" disabled={eventLoading} className="inline-flex items-center gap-2 rounded-lg bg-[#461822] px-5 py-2 text-xs font-medium text-white disabled:opacity-50">{eventLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save</button></div>
            </form>
          </div>
        </div>
      )}

      {showSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between"><h3 className="font-serif font-medium">{editingSchedule ? 'Edit Schedule' : 'Add Schedule'}</h3><button onClick={()=>setShowSchedule(false)}><X className="h-4 w-4" /></button></div>
            {schedError && <div className="mb-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700"><AlertCircle className="h-3.5 w-3.5" />{schedError}</div>}
            <form onSubmit={submitSchedule} className="space-y-3">
              <div><label className="text-[11px] uppercase font-mono text-stone-600">Time Slot *</label><input value={schedForm.timeSlot} onChange={(e)=>setSchedForm(p=>({...p, timeSlot:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" placeholder="6:30 PM" /></div>
              <div><label className="text-[11px] uppercase font-mono text-stone-600">Activity *</label><input value={schedForm.activity} onChange={(e)=>setSchedForm(p=>({...p, activity:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" placeholder="Welcome reception" /></div>
              <div><label className="text-[11px] uppercase font-mono text-stone-600">Sort Order</label><input type="number" value={schedForm.sortOrder} onChange={(e)=>setSchedForm(p=>({...p, sortOrder:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={()=>setShowSchedule(false)} className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs">Cancel</button><button type="submit" disabled={schedLoading} className="inline-flex items-center gap-2 rounded-lg bg-[#461822] px-5 py-2 text-xs text-white disabled:opacity-50">{schedLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{editingSchedule ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}

      {showTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between"><h3 className="font-serif font-medium">{editingTicket ? 'Edit Ticket Type' : 'Add Ticket Type'}</h3><button onClick={()=>setShowTicket(false)}><X className="h-4 w-4" /></button></div>
            {ticketError && <div className="mb-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700"><AlertCircle className="h-3.5 w-3.5" />{ticketError}</div>}
            <form onSubmit={submitTicket} className="space-y-3">
              <div><label className="text-[11px] uppercase font-mono text-stone-600">Name *</label><input value={ticketForm.name} onChange={(e)=>setTicketForm(p=>({...p, name:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" placeholder="General Admission" /></div>
              <div><label className="text-[11px] uppercase font-mono text-stone-600">Price *</label><input type="number" step="0.01" value={ticketForm.price} onChange={(e)=>setTicketForm(p=>({...p, price:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
              <div><label className="text-[11px] uppercase font-mono text-stone-600">Capacity *</label><input type="number" value={ticketForm.capacity} onChange={(e)=>setTicketForm(p=>({...p, capacity:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /><p className="mt-1 text-[10px] text-stone-500">Cannot be reduced below soldCount. soldCount is server-managed.</p></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={()=>setShowTicket(false)} className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs">Cancel</button><button type="submit" disabled={ticketLoading} className="inline-flex items-center gap-2 rounded-lg bg-[#461822] px-5 py-2 text-xs text-white disabled:opacity-50">{ticketLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{editingTicket ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}

      {showFaq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between"><h3 className="font-serif font-medium">{editingFaq ? 'Edit FAQ' : 'Add FAQ'}</h3><button onClick={()=>setShowFaq(false)}><X className="h-4 w-4" /></button></div>
            {faqError && <div className="mb-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700"><AlertCircle className="h-3.5 w-3.5" />{faqError}</div>}
            <form onSubmit={submitFaq} className="space-y-3">
              <div><label className="text-[11px] uppercase font-mono text-stone-600">Question *</label><input value={faqForm.question} onChange={(e)=>setFaqForm(p=>({...p, question:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
              <div><label className="text-[11px] uppercase font-mono text-stone-600">Answer *</label><textarea value={faqForm.answer} onChange={(e)=>setFaqForm(p=>({...p, answer:e.target.value}))} rows={3} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
              <div><label className="text-[11px] uppercase font-mono text-stone-600">Sort Order</label><input type="number" value={faqForm.sortOrder} onChange={(e)=>setFaqForm(p=>({...p, sortOrder:e.target.value}))} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs" /></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={()=>setShowFaq(false)} className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs">Cancel</button><button type="submit" disabled={faqLoading} className="inline-flex items-center gap-2 rounded-lg bg-[#461822] px-5 py-2 text-xs text-white disabled:opacity-50">{faqLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{editingFaq ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
