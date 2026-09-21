'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Mail,
  Phone,
  Wine,
  Star,
  Users,
  Ticket,
  GlassWater,
  FileText,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Minus,
  MapPin,
  CreditCard,
  User,
  Cake,
  MessageSquare,
  Bell,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { SectionCard, StatCard, StatusBadge } from '@/components/admin/UIComponents';

interface GuestData {
  id: string;
  name: string;
  phone: string | null;
  avatar: string | null;
  dateOfBirth: string | null;
  dietaryPreferences: string | null;
  notes: string | null;
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  visitsCount: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    role: string;
    createdAt: string;
  };
  winePreference: {
    id: string;
    favoriteVarietals: string[];
    preferredSweetness: string | null;
    preferredBody: string | null;
    preferredAcidity: string | null;
    favoriteWine: {
      id: string;
      name: string;
      slug: string;
      category: string;
    } | null;
  } | null;
  bookings: {
    id: string;
    bookingNumber: string;
    date: string;
    time: string;
    adults: number;
    children: number;
    totalGuests: number;
    subtotal: number;
    taxAmount: number;
    totalPrice: number;
    currency: string;
    status: string;
    createdAt: string;
    items: {
      title: string;
      experience: {
        id: string;
        title: string;
        slug: string;
      } | null;
    }[];
  }[];
  tastingSessions: {
    id: string;
    sessionDate: string;
    location: string | null;
    notes: string | null;
    booking: {
      id: string;
      bookingNumber: string;
      date: string;
      status: string;
    } | null;
    records: {
      id: string;
      wineNameSnapshot: string;
      vintageYear: number;
      rating: number;
      tasteCharacteristics: string[];
      notes: string;
      wouldDrinkAgain: string;
      experienceName: string | null;
      tastedAt: string;
      wineVintage: {
        wine: {
          id: string;
          name: string;
          slug: string;
          category: string;
        };
      };
    }[];
  }[];
  tastingRecords: {
    id: string;
    wineNameSnapshot: string;
    vintageYear: number;
    rating: number;
    tasteCharacteristics: string[];
    notes: string;
    wouldDrinkAgain: string;
    experienceName: string | null;
    tastedAt: string;
    wineVintage: {
      wine: {
        id: string;
        name: string;
        slug: string;
        category: string;
      };
    };
    tastingSession: {
      id: string;
      sessionDate: string;
    } | null;
  }[];
  reviews: {
    id: string;
    rating: number;
    title: string;
    comment: string;
    category: string;
    targetName: string;
    status: string;
    verified: boolean;
    helpfulCount: number;
    createdAt: string;
    experience: {
      id: string;
      title: string;
      slug: string;
    } | null;
    wine: {
      id: string;
      name: string;
      slug: string;
    } | null;
    event: {
      id: string;
      title: string;
      slug: string;
    } | null;
  }[];
  eventBookings: {
    id: string;
    bookingNumber: string;
    totalPrice: number;
    status: string;
    createdAt: string;
    event: {
      id: string;
      title: string;
      slug: string;
      eventDate: string;
      status: string;
    };
    eventSchedule: {
      id: string;
      timeSlot: string;
      activity: string;
    };
    tickets: {
      quantity: number;
      unitPrice: number;
      ticketType: {
        name: string;
        price: number;
      } | null;
    }[];
  }[];
}

type TabId = 'profile' | 'preferences' | 'bookings' | 'tastings' | 'wines' | 'reviews' | 'events';

function DrinkAgainBadge({ preference }: { preference: string }) {
  const config = {
    YES: { icon: ThumbsUp, label: 'Yes', style: 'bg-emerald-50 text-emerald-800 border-emerald-200/80' },
    MAYBE: { icon: Minus, label: 'Maybe', style: 'bg-amber-50 text-amber-800 border-amber-200/80' },
    NO: { icon: ThumbsDown, label: 'No', style: 'bg-rose-50 text-rose-800 border-rose-200/80' },
  };
  const c = config[preference as keyof typeof config] || config.MAYBE;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full border ${c.style}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const styles: Record<string, string> = {
    RED: 'bg-rose-50 text-rose-700 border-rose-200/80',
    WHITE: 'bg-amber-50 text-amber-700 border-amber-200/80',
    ROSE: 'bg-pink-50 text-pink-700 border-pink-200/80',
    SPARKLING: 'bg-sky-50 text-sky-700 border-sky-200/80',
    RESERVE: 'bg-purple-50 text-purple-700 border-purple-200/80',
    DESSERT: 'bg-orange-50 text-orange-700 border-orange-200/80',
    TASTING: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    VINEYARD_TOUR: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    EVENTS: 'bg-blue-50 text-blue-700 border-blue-200/80',
    FOOD: 'bg-amber-50 text-amber-700 border-amber-200/80',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full border ${styles[category] || 'bg-stone-50 text-stone-600 border-stone-200/80'}`}>
      {category.replace(/_/g, ' ')}
    </span>
  );
}

function ReviewStatusBadge({ status }: { status: string }) {
  const config: Record<string, { style: string; label: string }> = {
    APPROVED: { style: 'bg-emerald-50 text-emerald-800 border-emerald-200/80', label: 'Approved' },
    PENDING: { style: 'bg-amber-50 text-amber-800 border-amber-200/80', label: 'Pending' },
    REJECTED: { style: 'bg-rose-50 text-rose-800 border-rose-200/80', label: 'Rejected' },
  };
  const c = config[status] || config.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full border ${c.style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {c.label}
    </span>
  );
}

function getEventBookingTicketCount(eventBooking: GuestData['eventBookings'][number]) {
  return eventBooking.tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
}

function getEventBookingTicketSummary(eventBooking: GuestData['eventBookings'][number]) {
  if (eventBooking.tickets.length === 0) {
    return 'No ticket lines';
  }

  return eventBooking.tickets
    .map((ticket) => `${ticket.ticketType?.name || 'Archived ticket'} x ${ticket.quantity}`)
    .join(', ');
}

export function GuestDetailClient({ guest }: { guest: GuestData }) {
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const completedBookings = guest.bookings.filter((b) => b.status === 'COMPLETED').length;
  const uniqueWinesTasted = new Set(guest.tastingRecords.map((r) => r.wineVintage.wine.name)).size;
  const avgRating = guest.tastingRecords.length > 0
    ? (guest.tastingRecords.reduce((sum, r) => sum + Number(r.rating), 0) / guest.tastingRecords.length).toFixed(1)
    : null;

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Wine Preferences', icon: Heart, count: guest.winePreference ? 1 : 0 },
    { id: 'bookings', label: 'Bookings', icon: CalendarDays, count: guest.bookings.length },
    { id: 'tastings', label: 'Tastings', icon: GlassWater, count: guest.tastingRecords.length },
    { id: 'wines', label: 'Wine Journey', icon: Wine, count: uniqueWinesTasted },
    { id: 'reviews', label: 'Reviews', icon: Star, count: guest.reviews.length },
    { id: 'events', label: 'Events', icon: Ticket, count: guest.eventBookings.length },
  ];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/guests"
            className="p-2 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
                Domaine Élysée • Guest CRM
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium">
                {guest.name}
              </h1>
              <StatusBadge status="ACTIVE" size="md" />
            </div>
          </div>
        </div>
      </div>

      {/* CRM Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Bookings"
          value={guest.bookings.length}
          subtitle={`${completedBookings} completed`}
          icon={CalendarDays}
        />
        <StatCard
          title="Tastings"
          value={guest.tastingRecords.length}
          subtitle={`${guest.tastingSessions.length} sessions`}
          icon={GlassWater}
        />
        <StatCard
          title="Wines Tasted"
          value={uniqueWinesTasted}
          subtitle={avgRating ? `Avg ${avgRating}/5` : undefined}
          icon={Wine}
        />
        <StatCard
          title="Reviews"
          value={guest.reviews.length}
          icon={Star}
        />
        <StatCard
          title="Events"
          value={guest.eventBookings.length}
          icon={Ticket}
        />
        <StatCard
          title="Visits"
          value={guest.visitsCount}
          icon={MapPin}
        />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-stone-200/60">
        <div className="flex overflow-x-auto -mb-px gap-1 scrollbar-thin">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-[#6c2432] text-[#6c2432]'
                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded-full ${
                    isActive ? 'bg-[#6c2432]/10 text-[#6c2432]' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <>
              <SectionCard title="Guest Profile" description="Personal information and contact details">
                <div className="space-y-6">
                  {/* Avatar and Name */}
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-stone-200/80 bg-[#faf8f5]/40">
                    <div className="w-16 h-16 rounded-full bg-[#461822]/10 border border-[#461822]/20 flex items-center justify-center text-[#6c2432] font-serif font-medium text-xl">
                      {guest.name?.charAt(0)?.toUpperCase() || 'G'}
                    </div>
                    <div>
                      <h2 className="font-serif font-medium text-lg text-stone-900">{guest.name}</h2>
                      <p className="text-xs text-stone-500 mt-0.5">Guest ID: {guest.id.slice(0, 8)}...</p>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Contact Information</h4>
                      <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 text-stone-400 mt-0.5" />
                        <div>
                          <p className="text-[10px] uppercase font-mono text-stone-500">Email</p>
                          <p className="text-sm font-medium text-stone-900">{guest.user.email}</p>
                        </div>
                      </div>
                      {guest.phone && (
                        <div className="flex items-start gap-3">
                          <Phone className="w-4 h-4 text-stone-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] uppercase font-mono text-stone-500">Phone</p>
                            <p className="text-sm font-medium text-stone-900">{guest.phone}</p>
                          </div>
                        </div>
                      )}
                      {guest.dateOfBirth && (
                        <div className="flex items-start gap-3">
                          <Cake className="w-4 h-4 text-stone-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] uppercase font-mono text-stone-500">Date of Birth</p>
                            <p className="text-sm font-medium text-stone-900">{formatDate(guest.dateOfBirth)}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Notification Preferences</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-stone-400" />
                          <span className="text-sm text-stone-700">Email:</span>
                          {guest.emailNotifications ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-stone-300" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-stone-400" />
                          <span className="text-sm text-stone-700">SMS:</span>
                          {guest.smsNotifications ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-stone-300" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-stone-400" />
                          <span className="text-sm text-stone-700">WhatsApp:</span>
                          {guest.whatsappNotifications ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-stone-300" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dietary & Notes */}
                  {(guest.dietaryPreferences || guest.notes) && (
                    <div className="space-y-3">
                      {guest.dietaryPreferences && (
                        <div className="flex items-start gap-3">
                          <FileText className="w-4 h-4 text-stone-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] uppercase font-mono text-stone-500">Dietary Preferences</p>
                            <p className="text-sm text-stone-700">{guest.dietaryPreferences}</p>
                          </div>
                        </div>
                      )}
                      {guest.notes && (
                        <div className="flex items-start gap-3">
                          <MessageSquare className="w-4 h-4 text-stone-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] uppercase font-mono text-stone-500">Notes</p>
                            <p className="text-sm text-stone-700">{guest.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Account Information" description="User account details and membership">
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">User ID</span>
                    <span className="font-mono text-stone-700 text-[10px]">{guest.user.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Account Role</span>
                    <StatusBadge status={guest.user.role} size="sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Account Created</span>
                    <span className="font-mono text-stone-700">{formatDate(guest.user.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Profile Created</span>
                    <span className="font-mono text-stone-700">{formatDate(guest.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Last Updated</span>
                    <span className="font-mono text-stone-700">{formatDate(guest.updatedAt)}</span>
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {/* Wine Preferences Tab */}
          {activeTab === 'preferences' && (
            <SectionCard
              title="Wine Preferences"
              description="Taste profile and preference data"
            >
              {guest.winePreference ? (
                <div className="space-y-6">
                  {/* Favorite Varietals */}
                  {guest.winePreference.favoriteVarietals.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Favorite Varietals</h4>
                      <div className="flex flex-wrap gap-2">
                        {guest.winePreference.favoriteVarietals.map((varietal) => (
                          <span
                            key={varietal}
                            className="px-3 py-1 text-xs font-medium bg-[#461822]/5 text-[#6c2432] border border-[#461822]/10 rounded-full"
                          >
                            {varietal}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Taste Profile */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {guest.winePreference.preferredSweetness && (
                      <div className="p-3 rounded-lg bg-[#faf8f5] border border-stone-200/60">
                        <p className="text-[10px] uppercase font-mono text-stone-500 mb-1">Sweetness</p>
                        <p className="text-sm font-medium text-stone-900">{guest.winePreference.preferredSweetness}</p>
                      </div>
                    )}
                    {guest.winePreference.preferredBody && (
                      <div className="p-3 rounded-lg bg-[#faf8f5] border border-stone-200/60">
                        <p className="text-[10px] uppercase font-mono text-stone-500 mb-1">Body</p>
                        <p className="text-sm font-medium text-stone-900">{guest.winePreference.preferredBody}</p>
                      </div>
                    )}
                    {guest.winePreference.preferredAcidity && (
                      <div className="p-3 rounded-lg bg-[#faf8f5] border border-stone-200/60">
                        <p className="text-[10px] uppercase font-mono text-stone-500 mb-1">Acidity</p>
                        <p className="text-sm font-medium text-stone-900">{guest.winePreference.preferredAcidity}</p>
                      </div>
                    )}
                  </div>

                  {/* Favorite Wine */}
                  {guest.winePreference.favoriteWine && (
                    <div className="p-4 rounded-xl border border-stone-200/80 bg-[#faf8f5]/40">
                      <h4 className="text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-2">Favorite Wine</h4>
                      <div className="flex items-center gap-3">
                        <Wine className="w-4 h-4 text-[#6c2432]" />
                        <div>
                          <p className="text-sm font-serif font-medium text-stone-900">{guest.winePreference.favoriteWine.name}</p>
                          <CategoryBadge category={guest.winePreference.favoriteWine.category} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Heart className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-xs text-stone-500">No wine preferences recorded yet</p>
                  <p className="text-[11px] text-stone-400 mt-1">Preferences are captured during tasting sessions</p>
                </div>
              )}
            </SectionCard>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <SectionCard
              title="Booking History"
              description={`${guest.bookings.length} total booking${guest.bookings.length !== 1 ? 's' : ''}`}
            >
              {guest.bookings.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-xs text-stone-500">No bookings found for this guest</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {guest.bookings.map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/admin/bookings/${booking.bookingNumber}`}
                      className="block p-4 rounded-xl border border-stone-200/80 bg-white hover:bg-[#faf8f5]/40 transition"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-[#6c2432] hover:text-[#461822] text-sm">
                              {booking.bookingNumber}
                            </span>
                            <StatusBadge status={booking.status} size="sm" />
                          </div>
                          <p className="text-xs text-stone-500 mt-1">
                            {booking.items[0]?.experience?.title || booking.items[0]?.title || 'Estate Tasting'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-medium text-stone-900 text-sm">
                            {booking.currency} {Number(booking.totalPrice).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-stone-600">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {formatDate(booking.date)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {booking.time}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {booking.totalGuests} guest{booking.totalGuests !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {/* Tastings Tab */}
          {activeTab === 'tastings' && (
            <SectionCard
              title="Tasting History"
              description={`${guest.tastingRecords.length} wine${guest.tastingRecords.length !== 1 ? 's' : ''} tasted across ${guest.tastingSessions.length} session${guest.tastingSessions.length !== 1 ? 's' : ''}`}
            >
              {guest.tastingRecords.length === 0 ? (
                <div className="text-center py-8">
                  <GlassWater className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-xs text-stone-500">No tasting records found for this guest</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {guest.tastingRecords.map((record) => (
                    <div
                      key={record.id}
                      className="p-4 rounded-xl border border-stone-200/80 bg-white hover:bg-[#faf8f5]/40 transition"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h4 className="font-serif font-medium text-stone-900 text-sm">
                            {record.wineNameSnapshot}
                          </h4>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            {record.wineVintage.wine.category} • Vintage {record.vintageYear}
                          </p>
                          {record.experienceName && (
                            <p className="text-[10px] text-stone-400 mt-0.5">
                              {record.experienceName}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span className="font-mono font-semibold text-sm text-stone-900">
                              {Number(record.rating).toFixed(1)}
                            </span>
                          </div>
                          <DrinkAgainBadge preference={record.wouldDrinkAgain} />
                        </div>
                      </div>

                      {record.tastingSession && (
                        <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mb-2">
                          <GlassWater className="w-3 h-3" />
                          <span>Session: {formatDate(record.tastingSession.sessionDate)}</span>
                          {record.tastingSession.id && (
                            <Link
                              href={`/admin/tastings/${record.tastingSession.id}`}
                              className="text-[#6c2432] hover:underline ml-1"
                            >
                              View Session
                            </Link>
                          )}
                        </div>
                      )}

                      {record.tasteCharacteristics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {record.tasteCharacteristics.map((char) => (
                            <span
                              key={char}
                              className="px-2 py-0.5 text-[10px] font-medium bg-[#461822]/5 text-[#6c2432] border border-[#461822]/10 rounded-full"
                            >
                              {char}
                            </span>
                          ))}
                        </div>
                      )}

                      {record.notes && (
                        <p className="text-xs text-stone-600 italic leading-relaxed">{record.notes}</p>
                      )}

                      <div className="mt-2 pt-2 border-t border-stone-100 text-[10px] text-stone-400 font-mono">
                        {formatDateTime(record.tastedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {/* Wine Journey Tab */}
          {activeTab === 'wines' && (
            <SectionCard
              title="Wine Journey"
              description={`${uniqueWinesTasted} unique wine${uniqueWinesTasted !== 1 ? 's' : ''} tasted by this guest`}
            >
              {guest.tastingRecords.length === 0 ? (
                <div className="text-center py-8">
                  <Wine className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-xs text-stone-500">No wines tasted yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.from(
                    new Map(
                      guest.tastingRecords.map((r) => [
                        r.wineVintage.wine.name,
                        {
                          wine: r.wineVintage.wine,
                          records: guest.tastingRecords.filter(
                            (tr) => tr.wineVintage.wine.name === r.wineVintage.wine.name
                          ),
                        },
                      ])
                    ).values()
                  ).map(({ wine, records }) => {
                    const avgWineRating = records.length > 0
                      ? (records.reduce((sum, r) => sum + Number(r.rating), 0) / records.length).toFixed(1)
                      : null;
                    const drinkAgainYes = records.filter((r) => r.wouldDrinkAgain === 'YES').length;
                    const tastingDates = records.map((r) => r.tastedAt).sort();
                    const lastTasted = tastingDates[tastingDates.length - 1];

                    return (
                      <div
                        key={wine.id}
                        className="p-4 rounded-xl border border-stone-200/80 bg-white hover:bg-[#faf8f5]/40 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#461822]/10 border border-[#461822]/20 flex items-center justify-center text-[#6c2432] shrink-0">
                              <Wine className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-serif font-medium text-stone-900 text-sm">{wine.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <CategoryBadge category={wine.category} />
                                <span className="text-[10px] text-stone-400">•</span>
                                <span className="text-[10px] font-mono text-stone-500">
                                  {records.length} tasting{records.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {avgWineRating && (
                              <div className="flex items-center gap-1 justify-end">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                <span className="font-mono font-semibold text-sm text-stone-900">{avgWineRating}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 justify-end mt-1">
                              <ThumbsUp className="w-3 h-3 text-emerald-500" />
                              <span className="text-[10px] text-stone-500">
                                {drinkAgainYes}/{records.length} drink again
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-stone-100 flex items-center gap-3 text-[10px] text-stone-400 font-mono">
                          <span>Vintages: {[...new Set(records.map((r) => r.vintageYear))].sort().join(', ')}</span>
                          {lastTasted && (
                            <span>Last tasted: {formatDate(lastTasted)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <SectionCard
              title="Reviews"
              description={`${guest.reviews.length} review${guest.reviews.length !== 1 ? 's' : ''} submitted`}
            >
              {guest.reviews.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-xs text-stone-500">No reviews submitted yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {guest.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-4 rounded-xl border border-stone-200/80 bg-white"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h4 className="font-serif font-medium text-stone-900 text-sm">{review.title}</h4>
                          <p className="text-[11px] text-stone-500 mt-0.5">{review.targetName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CategoryBadge category={review.category} />
                          <ReviewStatusBadge status={review.status} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= review.rating
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-stone-200'
                            }`}
                          />
                        ))}
                        <span className="text-xs font-mono text-stone-600 ml-1">{review.rating}/5</span>
                      </div>
                      <p className="text-xs text-stone-700 leading-relaxed">{review.comment}</p>
                      <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                        <span>{formatDate(review.createdAt)}</span>
                        {review.verified && (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <SectionCard
              title="Event Participation"
              description={`${guest.eventBookings.length} event booking${guest.eventBookings.length !== 1 ? 's' : ''}`}
            >
              {guest.eventBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Ticket className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-xs text-stone-500">No event bookings found</p>
                  <p className="text-[11px] text-stone-400 mt-1">Events booked through the public booking flow will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {guest.eventBookings.map((eventBooking) => (
                    <div
                      key={eventBooking.id}
                      className="p-4 rounded-xl border border-stone-200/80 bg-white"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h4 className="font-serif font-medium text-stone-900 text-sm">
                            {eventBooking.event.title}
                          </h4>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            {getEventBookingTicketSummary(eventBooking)} - {getEventBookingTicketCount(eventBooking)} ticket{getEventBookingTicketCount(eventBooking) !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <StatusBadge status={eventBooking.event.status} size="sm" />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-stone-600">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {formatDate(eventBooking.event.eventDate)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {eventBooking.eventSchedule.timeSlot}
                        </div>
                        <div className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          {Number(eventBooking.totalPrice).toFixed(2)}
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-stone-100 text-[10px] text-stone-400 font-mono">
                        Booked: {formatDate(eventBooking.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}
        </div>

        {/* Right Sidebar: Quick Info */}
        <div className="space-y-6">
          {/* Quick Summary */}
          <SectionCard title="Quick Summary" description="Guest overview">
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-stone-200/80 bg-[#faf8f5]/40">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-[#461822]/10 border border-[#461822]/20 flex items-center justify-center text-[#6c2432] font-serif font-medium text-lg">
                    {guest.name?.charAt(0)?.toUpperCase() || 'G'}
                  </div>
                  <div>
                    <p className="font-serif font-medium text-stone-900">{guest.name}</p>
                    <p className="text-[11px] text-stone-500">{guest.user.email}</p>
                  </div>
                </div>
                {guest.phone && (
                  <div className="flex items-center gap-2 text-xs text-stone-600 mb-1">
                    <Phone className="w-3 h-3" />
                    {guest.phone}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[#faf8f5] border border-stone-200/60 text-center">
                  <p className="text-xl font-serif font-medium text-stone-900">{guest.bookings.length}</p>
                  <p className="text-[10px] uppercase font-mono text-stone-500">Bookings</p>
                </div>
                <div className="p-3 rounded-lg bg-[#faf8f5] border border-stone-200/60 text-center">
                  <p className="text-xl font-serif font-medium text-stone-900">{guest.tastingRecords.length}</p>
                  <p className="text-[10px] uppercase font-mono text-stone-500">Tastings</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[#faf8f5] border border-stone-200/60 text-center">
                  <p className="text-xl font-serif font-medium text-stone-900">{uniqueWinesTasted}</p>
                  <p className="text-[10px] uppercase font-mono text-stone-500">Wines</p>
                </div>
                <div className="p-3 rounded-lg bg-[#faf8f5] border border-stone-200/60 text-center">
                  <p className="text-xl font-serif font-medium text-stone-900">{guest.reviews.length}</p>
                  <p className="text-[10px] uppercase font-mono text-stone-500">Reviews</p>
                </div>
              </div>

              {avgRating && (
                <div className="p-3 rounded-lg bg-[#faf8f5] border border-stone-200/60 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <p className="text-xl font-serif font-medium text-stone-900">{avgRating}</p>
                    <span className="text-sm text-stone-400">/ 5.0</span>
                  </div>
                  <p className="text-[10px] uppercase font-mono text-stone-500 mt-1">Avg Tasting Rating</p>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Profile Metadata */}
          <SectionCard title="Record Info" description="System metadata">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Profile ID</span>
                <span className="font-mono text-stone-700 text-[10px]">{guest.id.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Created</span>
                <span className="font-mono text-stone-700">{formatDate(guest.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Updated</span>
                <span className="font-mono text-stone-700">{formatDate(guest.updatedAt)}</span>
              </div>
            </div>
          </SectionCard>

          {/* Related Links */}
          <SectionCard title="Quick Actions" description="Navigate to related records">
            <div className="space-y-2">
              {guest.bookings.length > 0 && (
                <Link
                  href={`/admin/bookings/${guest.bookings[0].bookingNumber}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-stone-200/80 bg-white hover:bg-[#faf8f5] transition text-xs"
                >
                  <CalendarDays className="w-4 h-4 text-[#6c2432]" />
                  <div>
                    <p className="font-medium text-stone-900">Latest Booking</p>
                    <p className="text-[10px] text-stone-500">{guest.bookings[0].bookingNumber}</p>
                  </div>
                </Link>
              )}
              {guest.tastingSessions.length > 0 && (
                <Link
                  href={`/admin/tastings/${guest.tastingSessions[0].id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-stone-200/80 bg-white hover:bg-[#faf8f5] transition text-xs"
                >
                  <GlassWater className="w-4 h-4 text-[#6c2432]" />
                  <div>
                    <p className="font-medium text-stone-900">Latest Tasting</p>
                    <p className="text-[10px] text-stone-500">{formatDate(guest.tastingSessions[0].sessionDate)}</p>
                  </div>
                </Link>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
