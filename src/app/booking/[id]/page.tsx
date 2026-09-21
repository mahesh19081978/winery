'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useBooking } from '@/context/BookingContext';
import QRCodePlaceholder from '@/components/booking/QRCodePlaceholder';
import StatusBadge from '@/components/common/StatusBadge';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Download,
  CalendarPlus,
  Edit3,
  XCircle,
  ArrowLeft,
  CheckCircle,
  Phone
} from 'lucide-react';

export default function BookingDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { getBookingById, cancelBooking } = useBooking();

  const booking = getBookingById(id);

  const [modifyModalOpen, setModifyModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Fallback if not found in state
  const currentBooking = booking || {
    id: id || 'DVR-2026-10482',
    experienceTitle: 'Signature Estate Wine Tasting',
    date: '2026-10-18',
    time: '2:00 PM',
    adults: 2,
    children: 0,
    totalGuests: 2,
    guestName: 'Eleanor Vance',
    guestEmail: 'eleanor.vance@example.com',
    guestPhone: '+1 (555) 234-5678',
    specialRequests: 'Anniversary celebration; quiet terrace seating preferred.',
    totalPrice: 141.7,
    status: 'Confirmed' as const,
    createdAt: new Date().toISOString()
  };

  const handleCancel = () => {
    cancelBooking(currentBooking.id);
    setCancelModalOpen(false);
    setActionNotice('Your booking has been cancelled. A confirmation email was sent.');
  };

  const handleModify = (e: React.FormEvent) => {
    e.preventDefault();
    setModifyModalOpen(false);
    setActionNotice('Your reservation modification request was saved.');
  };

  return (
    <div className="w-full pt-20 pb-24 bg-[#faf8f5]">
      {/* Editorial Breadcrumb */}
      <div className="bg-[#faf8f5] border-b border-[#e6dece] py-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs">
          <Link
            href="/app/bookings"
            className="inline-flex items-center gap-1.5 text-[#525960] hover:text-[#2d1117] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Reservations</span>
          </Link>
          <StatusBadge status={currentBooking.status} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">
        {actionNotice && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              {actionNotice}
            </span>
            <button
              onClick={() => setActionNotice(null)}
              className="text-emerald-900 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Digital Boarding Pass Ticket */}
        <div className="bg-white border border-[#e6dece] rounded-3xl overflow-hidden shadow-xl">
          {/* Ticket Header */}
          <div className="bg-[#2d1117] text-[#faf8f5] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#c5a059] block font-semibold mb-1">
                Digital Guest Pass · Val de Rêve Estate
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl text-[#faf8f5] font-normal">
                {currentBooking.experienceTitle}
              </h1>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase tracking-widest text-[#e6dece]/80 block">
                Booking Reference
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-[#c5a059]">
                {currentBooking.id}
              </span>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="p-6 sm:p-8 space-y-8">
            {/* QR Code Presentation */}
            <div className="flex flex-col sm:flex-row items-center gap-8 justify-center p-6 bg-[#faf8f5] rounded-2xl border border-dashed border-[#c5a059]/60">
              <QRCodePlaceholder
                code={currentBooking.id}
                size={150}
                label="Present at Reception"
              />
              <div className="space-y-3 text-xs sm:text-sm text-[#525960] max-w-xs text-center sm:text-left">
                <h4 className="font-serif text-lg font-medium text-[#191c1f]">
                  Arrival Instructions
                </h4>
                <p className="leading-relaxed">
                  Please arrive 10 minutes prior to your allocated time. The concierge desk is located inside the stone tasting salon.
                </p>
                <div className="pt-1 flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-[#8a3243]">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Estate Concierge: +1 (555) 392-8733</span>
                </div>
              </div>
            </div>

            {/* Itinerary Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-white border border-[#e6dece] rounded-2xl text-xs">
              <div>
                <span className="text-[#525960] block uppercase tracking-wider text-[10px] mb-1">
                  Date
                </span>
                <span className="font-semibold text-sm text-[#191c1f] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#8a3243]" />
                  {currentBooking.date}
                </span>
              </div>
              <div>
                <span className="text-[#525960] block uppercase tracking-wider text-[10px] mb-1">
                  Time
                </span>
                <span className="font-semibold text-sm text-[#191c1f] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#8a3243]" />
                  {currentBooking.time}
                </span>
              </div>
              <div>
                <span className="text-[#525960] block uppercase tracking-wider text-[10px] mb-1">
                  Party Size
                </span>
                <span className="font-semibold text-sm text-[#191c1f] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#8a3243]" />
                  {currentBooking.totalGuests} Guests
                </span>
              </div>
              <div>
                <span className="text-[#525960] block uppercase tracking-wider text-[10px] mb-1">
                  Lead Guest
                </span>
                <span className="font-semibold text-sm text-[#191c1f] truncate block">
                  {currentBooking.guestName}
                </span>
              </div>
            </div>

            {/* Venue & Directions */}
            <div className="p-6 bg-[#faf8f5] rounded-2xl border border-[#e6dece] space-y-2">
              <h4 className="font-serif text-base text-[#191c1f] font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#8a3243]" />
                Location & Arrival Directions
              </h4>
              <p className="text-xs text-[#525960] leading-relaxed">
                4800 Terrasses du Rêve, Coteaux de l&apos;Est. Follow the cypress-lined avenue to the main stone courtyard. Valet parking and EV charging points are available directly ahead.
              </p>
              {currentBooking.specialRequests && (
                <div className="pt-3 border-t border-[#e6dece] text-xs">
                  <span className="font-semibold text-[#191c1f]">Special Requests: </span>
                  <span className="text-[#525960]">{currentBooking.specialRequests}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActionNotice('Calendar invite (.ics) generated.')}
                className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl border border-[#e6dece] hover:bg-[#f4f0e8] text-xs font-semibold uppercase tracking-wider text-[#2d1117] transition-colors"
              >
                <CalendarPlus className="w-4 h-4 text-[#8a3243]" />
                <span>Add to Calendar</span>
              </button>

              <button
                type="button"
                onClick={() => setActionNotice('Digital ticket PDF download started.')}
                className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl border border-[#e6dece] hover:bg-[#f4f0e8] text-xs font-semibold uppercase tracking-wider text-[#2d1117] transition-colors"
              >
                <Download className="w-4 h-4 text-[#8a3243]" />
                <span>Download Pass</span>
              </button>

              <button
                type="button"
                onClick={() => setModifyModalOpen(true)}
                className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl border border-[#e6dece] hover:bg-[#f4f0e8] text-xs font-semibold uppercase tracking-wider text-[#2d1117] transition-colors"
              >
                <Edit3 className="w-4 h-4 text-[#8a3243]" />
                <span>Modify</span>
              </button>

              <button
                type="button"
                onClick={() => setCancelModalOpen(true)}
                disabled={currentBooking.status === 'Cancelled'}
                className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl border border-rose-200 hover:bg-rose-50 text-xs font-semibold uppercase tracking-wider text-rose-700 disabled:opacity-50 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modify Modal Simulation */}
      {modifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e0c10]/70 backdrop-blur-sm">
          <div className="bg-white border border-[#e6dece] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-serif text-2xl text-[#191c1f]">Modify Reservation</h3>
            <p className="text-xs text-[#525960] leading-relaxed">
              Select an alternative date or update your special requests.
            </p>
            <form onSubmit={handleModify} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-semibold text-[#191c1f] mb-1">
                  Preferred Date
                </label>
                <input
                  type="date"
                  defaultValue={currentBooking.date}
                  className="w-full bg-[#f4f0e8] border border-[#e6dece] rounded-xl px-4 py-2 text-sm text-[#191c1f]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-semibold text-[#191c1f] mb-1">
                  Time Slot
                </label>
                <select
                  defaultValue={currentBooking.time}
                  className="w-full bg-[#f4f0e8] border border-[#e6dece] rounded-xl px-4 py-2 text-sm text-[#191c1f]"
                >
                  <option>10:00 AM</option>
                  <option>12:00 PM</option>
                  <option>2:00 PM</option>
                  <option>4:00 PM</option>
                  <option>6:00 PM</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModifyModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-[#e6dece] text-xs font-semibold text-[#525960]"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full bg-[#2d1117] text-white text-xs font-semibold uppercase tracking-wider"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal Simulation */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e0c10]/70 backdrop-blur-sm">
          <div className="bg-white border border-[#e6dece] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 text-rose-700 flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl text-[#191c1f]">Cancel Reservation?</h3>
            <p className="text-xs text-[#525960] leading-relaxed">
              Are you sure you wish to cancel your reservation for <strong>{currentBooking.experienceTitle}</strong>? Free cancellation is available anytime up to 24 hours prior.
            </p>
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-5 py-2.5 rounded-full border border-[#e6dece] text-xs font-semibold uppercase tracking-wider text-[#525960] hover:bg-[#f4f0e8]"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 rounded-full bg-rose-700 text-white text-xs font-semibold uppercase tracking-wider hover:bg-rose-800"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
