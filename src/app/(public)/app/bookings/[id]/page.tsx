'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock, Mail } from 'lucide-react';

export default function GuestBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          href="/app/bookings"
          className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-stone-500 hover:text-[#8a3243] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Reservations
        </Link>
      </div>

      {/* Deferred Notice */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-10 text-center max-w-lg mx-auto mt-8">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="font-serif text-xl font-medium text-stone-900 mb-2">
          Guest Account Required
        </h3>
        <p className="text-sm text-stone-500 mb-4 leading-relaxed">
          Viewing reservation details requires guest account authentication, which is currently under development.
        </p>
        <p className="text-xs text-stone-400 mb-6">
          Booking reference: <span className="font-mono font-semibold text-stone-600">{id}</span>
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
