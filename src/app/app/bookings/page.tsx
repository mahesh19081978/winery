'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useBooking } from '@/context/BookingContext';
import { mockExperiences } from '@/data/experiences';
import { 
  Calendar, 
  Clock, 
  Users, 
  QrCode, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Edit3
} from 'lucide-react';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';

export default function BookingsPage() {
  const { bookings, cancelBooking, updateBooking } = useBooking();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  
  // Modal states
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<string | null>(null);
  const [selectedBookingForModify, setSelectedBookingForModify] = useState<{ id: string; date: string; time: string; adults: number } | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'upcoming') return b.status === 'Confirmed';
    if (activeTab === 'past') return b.status === 'Completed';
    if (activeTab === 'cancelled') return b.status === 'Cancelled';
    return true;
  });

  const handleConfirmCancel = () => {
    if (selectedBookingForCancel) {
      cancelBooking(selectedBookingForCancel);
      setSelectedBookingForCancel(null);
      setActionSuccess('Your reservation has been cancelled. A confirmation has been noted on your guest record.');
      setTimeout(() => setActionSuccess(null), 5000);
    }
  };

  const handleConfirmModify = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBookingForModify) {
      updateBooking({
        date: selectedBookingForModify.date,
        time: selectedBookingForModify.time,
        adults: selectedBookingForModify.adults,
      });
      setSelectedBookingForModify(null);
      setActionSuccess('Your reservation schedule has been successfully adjusted.');
      setTimeout(() => setActionSuccess(null), 5000);
    }
  };

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

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
        {(['upcoming', 'past', 'cancelled'] as const).map(tab => {
          const count = bookings.filter(b => {
            if (tab === 'upcoming') return b.status === 'Confirmed';
            if (tab === 'past') return b.status === 'Completed';
            return b.status === 'Cancelled';
          }).length;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-full text-xs font-medium uppercase tracking-wider transition ${
                activeTab === tab 
                  ? 'bg-stone-900 text-white' 
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              {tab} ({count})
            </button>
          );
        })}
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <EmptyState
          title={`No ${activeTab} reservations`}
          description={
            activeTab === 'upcoming'
              ? 'You have no upcoming experiences scheduled at Domaine Élysée.'
              : `You have no ${activeTab} reservations on record.`
          }
          actionText={activeTab === 'upcoming' ? 'Browse Experiences' : undefined}
          actionHref={activeTab === 'upcoming' ? '/experiences' : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredBookings.map(booking => {
            const exp = mockExperiences.find(e => e.id === booking.experienceId);
            return (
              <div 
                key={booking.id}
                className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-[#c5a059]/40 transition"
              >
                <div className="space-y-4 max-w-xl">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={booking.status} />
                    <span className="font-mono text-xs uppercase tracking-wider text-stone-400">
                      #{booking.id}
                    </span>
                  </div>

                  <div>
                    <h2 className="font-serif text-2xl text-stone-900 font-normal">
                      {exp?.title || booking.experienceTitle}
                    </h2>
                    <p className="text-stone-500 text-xs mt-1">
                      Val de Rêve Estate, Napa Valley
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm text-stone-700 pt-2 border-t border-stone-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#8a3243]" />
                      <span>{new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#8a3243]" />
                      <span>{booking.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#8a3243]" />
                      <span>{booking.totalGuests} {booking.totalGuests === 1 ? 'Guest' : 'Guests'}</span>
                    </div>
                  </div>

                  {booking.specialRequests && (
                    <div className="text-xs text-stone-500 bg-[#faf8f5] p-3 rounded-xl border border-stone-100">
                      <span className="font-medium text-stone-700">Special Requests:</span> {booking.specialRequests}
                    </div>
                  )}
                </div>

                {/* Actions & Pass */}
                <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-3 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-stone-100">
                  <Link
                    href={`/app/bookings/${booking.id}`}
                    className="px-5 py-2.5 rounded-full bg-[#8a3243] text-white text-xs font-medium uppercase tracking-wider hover:bg-[#732937] transition inline-flex items-center justify-center gap-2 text-center shadow-sm"
                  >
                    <QrCode className="w-4 h-4" /> View Digital Ticket
                  </Link>

                  {booking.status === 'Confirmed' && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => setSelectedBookingForModify({
                          id: booking.id,
                          date: booking.date,
                          time: booking.time,
                          adults: booking.adults
                        })}
                        className="flex-1 sm:flex-initial px-4 py-2 rounded-full border border-stone-300 text-stone-700 text-xs font-medium hover:border-stone-500 transition text-center inline-flex items-center justify-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Modify
                      </button>
                      <button
                        onClick={() => setSelectedBookingForCancel(booking.id)}
                        className="flex-1 sm:flex-initial px-4 py-2 rounded-full border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition text-center"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  <div className="text-stone-500 text-xs font-serif text-right mt-1">
                    Total: <span className="font-semibold text-stone-900">${booking.totalPrice}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {selectedBookingForCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-stone-200 space-y-6">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-serif text-2xl text-stone-900 font-normal">Cancel Reservation</h3>
              <p className="text-stone-500 text-sm mt-2 leading-relaxed">
                Are you sure you wish to cancel reservation <strong>#{selectedBookingForCancel}</strong>? 
                Cancellations made 48 hours in advance are eligible for a full cellar credit or rescheduling.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setSelectedBookingForCancel(null)}
                className="px-5 py-2.5 rounded-full border border-stone-300 text-stone-700 text-xs font-medium uppercase tracking-wider hover:bg-stone-50 transition"
              >
                Keep Reservation
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-5 py-2.5 rounded-full bg-red-600 text-white text-xs font-medium uppercase tracking-wider hover:bg-red-700 transition"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modify Reservation Modal */}
      {selectedBookingForModify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-stone-200 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-2xl text-stone-900 font-normal">Modify Reservation</h3>
              <button
                onClick={() => setSelectedBookingForModify(null)}
                className="p-2 text-stone-400 hover:text-stone-700 transition rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmModify} className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                  Select Date
                </label>
                <input
                  type="date"
                  required
                  value={selectedBookingForModify.date}
                  onChange={(e) => setSelectedBookingForModify({ ...selectedBookingForModify, date: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                  Tasting Time Slot
                </label>
                <select
                  value={selectedBookingForModify.time}
                  onChange={(e) => setSelectedBookingForModify({ ...selectedBookingForModify, time: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm bg-white"
                >
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="01:00 PM">01:00 PM</option>
                  <option value="02:30 PM">02:30 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                  Number of Guests
                </label>
                <select
                  value={selectedBookingForModify.adults}
                  onChange={(e) => setSelectedBookingForModify({ ...selectedBookingForModify, adults: parseInt(e.target.value, 10) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#8a3243] text-stone-800 text-sm bg-white"
                >
                  {[1, 2, 3, 4, 5, 6, 8].map(num => (
                    <option key={num} value={num}>{num} {num === 1 ? 'Guest' : 'Guests'}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setSelectedBookingForModify(null)}
                  className="px-5 py-2.5 rounded-full border border-stone-300 text-stone-700 text-xs font-medium uppercase tracking-wider hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-[#8a3243] text-white text-xs font-medium uppercase tracking-wider hover:bg-[#732937] transition shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
