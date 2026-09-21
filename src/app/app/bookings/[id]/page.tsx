'use client';

import { use } from 'react';
import Link from 'next/link';
import { useBooking } from '@/context/BookingContext';
import { mockExperiences } from '@/data/experiences';
import { 
  ArrowLeft, 
  Share2, 
  Download, 
  Info,
  Sparkles
} from 'lucide-react';
import StatusBadge from '@/components/common/StatusBadge';
import QRCodePlaceholder from '@/components/booking/QRCodePlaceholder';

export default function GuestBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { bookings } = useBooking();

  const booking = bookings.find(b => b.id === id);

  if (!booking) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-stone-200 p-8">
        <h2 className="font-serif text-2xl text-stone-900 mb-2">Reservation Not Found</h2>
        <p className="text-stone-500 text-sm mb-6">We could not locate this reservation in your guest record.</p>
        <Link
          href="/app/bookings"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#8a3243] text-white text-sm font-medium hover:bg-[#732937] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Reservations
        </Link>
      </div>
    );
  }

  const exp = mockExperiences.find(e => e.id === booking.experienceId);

  const formattedDate = new Date(booking.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

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

      {/* Main Luxury Ticket Voucher */}
      <div className="bg-white rounded-3xl overflow-hidden border border-stone-200/80 shadow-xl">
        {/* Ticket Header Banner */}
        <div className="bg-gradient-to-r from-[#2d1117] via-[#4a1c24] to-[#2d1117] text-white p-8 md:p-10 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#c5a059]/20 via-transparent to-transparent pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#f5ebd7]/80 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" />
                Official Guest Reservation Voucher
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-normal text-white">
                {exp?.title || booking.experienceTitle}
              </h1>
              <p className="text-stone-300 text-sm mt-1">Domaine Élysée · Val de Rêve Estate</p>
            </div>
            <div className="self-start sm:self-auto">
              <StatusBadge status={booking.status} />
            </div>
          </div>
        </div>

        {/* Voucher Body: Details + QR Code */}
        <div className="p-8 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-2 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
              <div>
                <span className="block text-xs uppercase tracking-wider text-stone-400 font-medium mb-1">Date</span>
                <span className="font-serif text-lg text-stone-900 block">{formattedDate}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-stone-400 font-medium mb-1">Time</span>
                <span className="font-serif text-lg text-stone-900 block">{booking.time}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-stone-400 font-medium mb-1">Guests</span>
                <span className="font-serif text-lg text-stone-900 block">
                  {booking.totalGuests} {booking.totalGuests === 1 ? 'Guest' : 'Guests'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-stone-100 text-sm">
              <div>
                <span className="block text-xs uppercase tracking-wider text-stone-400 font-medium mb-1">Estate Location</span>
                <span className="text-stone-700 font-medium block">Val de Rêve Estate Cellar Doors</span>
                <span className="text-stone-500 text-xs">1840 Domaine Way, Rutherford, CA</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-stone-400 font-medium mb-1">Guest Name & Email</span>
                <span className="text-stone-700 font-medium block">{booking.guestName}</span>
                <span className="text-stone-500 text-xs">{booking.guestEmail}</span>
              </div>
            </div>

            {booking.specialRequests && (
              <div className="p-4 rounded-2xl bg-[#faf8f5] border border-stone-200/60 text-xs text-stone-600">
                <span className="font-semibold text-stone-800">Dietary & Sommelier Requests:</span> {booking.specialRequests}
              </div>
            )}
          </div>

          {/* QR Code Presentation */}
          <div className="flex flex-col items-center justify-center p-6 bg-[#faf8f5] rounded-3xl border border-stone-200 text-center">
            <QRCodePlaceholder code={`VAL-REVE-PASS-${booking.id}`} size={160} />
            <div className="mt-4 font-mono text-xs uppercase tracking-wider font-semibold text-stone-700">
              PASS #{booking.id}
            </div>
            <div className="text-[11px] text-stone-400 mt-1 max-w-[160px]">
              Present this digital pass to your host sommelier upon arrival.
            </div>
          </div>
        </div>

        {/* Perforated Divider Simulation */}
        <div className="relative border-t-2 border-dashed border-stone-200 px-8 py-6 bg-stone-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Info className="w-4 h-4 text-[#c5a059]" />
            <span>Complimentary valet parking and EV charging available at estate gates.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-full border border-stone-300 bg-white text-stone-700 text-xs font-medium hover:border-stone-500 transition inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: exp?.title || 'Estate Pass',
                    text: `Domaine Élysée Reservation #${booking.id}`,
                    url: window.location.href,
                  }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Voucher link copied to clipboard.');
                }
              }}
              className="px-4 py-2 rounded-full border border-stone-300 bg-white text-stone-700 text-xs font-medium hover:border-stone-500 transition inline-flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
