'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

const CATEGORIES = [
  { value: 'GENERAL', label: 'General Concierge Inquiry' },
  { value: 'CELLAR_TASTING', label: 'VIP Cellar Tasting Request' },
  { value: 'PRIVATE_EVENT', label: 'Private Event & Wedding Booking' },
  { value: 'ALLOCATION', label: 'Wine Allocation & Cellar Membership' },
  { value: 'PRESS', label: 'Media & Trade Relations' },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    category: 'GENERAL',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit inquiry.');
      }

      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        category: 'GENERAL',
        message: '',
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full pt-20 pb-24">
      {/* Hero Header */}
      <section className="relative py-20 sm:py-28 bg-[#1e0c10] text-[#faf8f5] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=2000&q=85"
          alt="Estate Vineyard and Salon"
          fill
          priority
          className="object-cover opacity-25"
        />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-[#c5a059] block mb-3 font-semibold">
            Estate Concierge
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl font-normal text-[#faf8f5] mb-4">
            Connect With Us
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#e6dece]/85 leading-relaxed font-light">
            Whether inquiring about bespoke private salon bookings, wedding celebrations, or cellar allocations, our team is devoted to your journey.
          </p>
        </div>
      </section>

      {/* Main Grid: Info + Form */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Estate Info Cards */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#2d1117] text-[#faf8f5] rounded-3xl p-8 sm:p-10 shadow-xl border border-[#c5a059]/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#c5a059]/15 via-transparent to-transparent pointer-events-none" />

              <span className="text-[10px] uppercase tracking-[0.25em] text-[#c5a059] block font-semibold mb-2">
                Estate Address & Desk
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-white font-normal mb-6">
                VINORA Cellars & Salon
              </h2>

              <div className="space-y-6 text-sm text-[#e6dece]/90">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-[#c5a059]">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white">Location</h3>
                    <p className="mt-1 leading-relaxed">
                      4800 Terrasses du Rêve, Coteaux de l&apos;Est<br />
                      Valley Wine Country
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-[#c5a059]">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white">Direct Line</h3>
                    <p className="mt-1 font-mono text-xs">+1 (555) 392-8733</p>
                    <p className="text-[11px] text-white/60">Concierge Desk (Wednesday – Sunday)</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-[#c5a059]">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white">Electronic Inquiries</h3>
                    <p className="mt-1 font-mono text-xs">concierge@domaine-elysee.com</p>
                    <p className="text-[11px] text-white/60">Responses delivered within 24 business hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-[#c5a059]">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white">Cellar Hours</h3>
                    <p className="mt-1 leading-relaxed">
                      Wednesday – Sunday: 10:00 AM – 7:00 PM<br />
                      <span className="text-white/60">Monday & Tuesday: Closed for Cellar Maturation</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Note Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e6dece] shadow-sm">
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-[#8a3243] mb-3">
                <Sparkles className="w-4 h-4 text-[#c5a059]" />
                <span>Private Gatherings</span>
              </div>
              <p className="text-xs text-[#525960] leading-relaxed">
                Hosting an intimate wedding reception, anniversary soiree, or corporate retreat? Please specify your estimated party size and preferred dates for bespoke curations.
              </p>
            </div>
          </div>

          {/* Right Column: Contact Inquiry Form */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#e6dece] shadow-sm">
              <h2 className="font-serif text-2xl sm:text-3xl text-[#191c1f] font-normal mb-2">
                Send an Inquiry
              </h2>
              <p className="text-xs sm:text-sm text-[#525960] mb-8">
                Please complete the form below. All inquiries are directly received by our estate sommelier and concierge team.
              </p>

              {success && (
                <div className="mb-8 p-6 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-4 text-emerald-900">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-serif text-lg font-medium">Inquiry Submitted Successfully</h3>
                    <p className="text-xs mt-1 text-emerald-700 leading-relaxed">
                      Thank you for contacting VINORA. An acknowledgment email has been placed in your inbox, and our concierge team will respond shortly.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSuccess(false)}
                      className="mt-4 text-xs font-semibold uppercase tracking-wider text-emerald-800 underline hover:text-emerald-950"
                    >
                      Send another message
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-8 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800 text-xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-[#191c1f] mb-2">
                      Full Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Lady Vivienne Montgomery"
                      className="w-full px-4 py-3 rounded-xl border border-[#e6dece] text-sm text-[#191c1f] focus:outline-none focus:ring-2 focus:ring-[#8a3243]/30 focus:border-[#8a3243] bg-[#faf8f5]/50"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-[#191c1f] mb-2">
                      Email Address <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. vivienne@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-[#e6dece] text-sm text-[#191c1f] focus:outline-none focus:ring-2 focus:ring-[#8a3243]/30 focus:border-[#8a3243] bg-[#faf8f5]/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider text-[#191c1f] mb-2">
                      Phone Number (Optional)
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-4 py-3 rounded-xl border border-[#e6dece] text-sm text-[#191c1f] focus:outline-none focus:ring-2 focus:ring-[#8a3243]/30 focus:border-[#8a3243] bg-[#faf8f5]/50"
                    />
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-xs font-semibold uppercase tracking-wider text-[#191c1f] mb-2">
                      Inquiry Type <span className="text-rose-600">*</span>
                    </label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-[#e6dece] text-sm text-[#191c1f] focus:outline-none focus:ring-2 focus:ring-[#8a3243]/30 focus:border-[#8a3243] bg-[#faf8f5]/50"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-xs font-semibold uppercase tracking-wider text-[#191c1f] mb-2">
                    Subject Line <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="subject"
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Private Sunset Tasting for 8 Guests"
                    className="w-full px-4 py-3 rounded-xl border border-[#e6dece] text-sm text-[#191c1f] focus:outline-none focus:ring-2 focus:ring-[#8a3243]/30 focus:border-[#8a3243] bg-[#faf8f5]/50"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-xs font-semibold uppercase tracking-wider text-[#191c1f] mb-2">
                    Message Details <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Share any details, dates, dietary requirements, or specific requests..."
                    className="w-full px-4 py-3 rounded-xl border border-[#e6dece] text-sm text-[#191c1f] focus:outline-none focus:ring-2 focus:ring-[#8a3243]/30 focus:border-[#8a3243] bg-[#faf8f5]/50 resize-y"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] text-xs font-semibold uppercase tracking-widest transition-all shadow-md disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin" />
                        <span>Transmitting to Concierge…</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-[#c5a059]" />
                        <span>Submit Inquiry</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
