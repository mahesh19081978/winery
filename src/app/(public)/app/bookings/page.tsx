'use client';

import Link from 'next/link';
import { Lock, Mail } from 'lucide-react';

export default function BookingsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-stone-900 font-light">My Reservations</h1>
          <p className="text-stone-500 text-sm mt-1">Manage your estate visits, digital entry passes, and itineraries</p>
        </div>
        <Link
          href="/book"
          className="px-6 py-2.5 rounded-full bg-[#8a3243] text-white text-sm font-medium hover:bg-[#732937] transition inline-flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          Book New Experience
        </Link>
      </div>

      {/* Deferred Notice */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-10 text-center max-w-lg mx-auto my-12">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="font-serif text-xl font-medium text-stone-900 mb-2">
          Guest Account Required
        </h3>
        <p className="text-sm text-stone-500 mb-6 leading-relaxed">
          The reservations dashboard requires guest account authentication, which is currently under development.
          Your booking confirmation can still be viewed directly from the booking reference provided after reservation.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/book"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#8a3243] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#732937] transition shadow-sm"
          >
            Make a Reservation
          </Link>
          <a
            href="mailto:concierge@domaine-elysee.com"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-stone-300 text-stone-700 text-xs font-semibold uppercase tracking-wider hover:bg-stone-50 transition"
          >
            <Mail className="w-3.5 h-3.5" /> Contact Concierge
          </a>
        </div>
      </div>
    </div>
  );
}
