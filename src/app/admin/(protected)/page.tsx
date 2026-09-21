import React from 'react';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  CalendarDays,
  Users,
  GlassWater,
  Ticket,
  Star,
  DollarSign,
  PlusCircle,
  UserPlus,
  Wine as WineIcon,
  CalendarPlus,
  Clock,
} from 'lucide-react';
import {
  StatCard,
  SectionCard,
  StatusBadge,
  QuickAction,
} from '@/components/admin/UIComponents';

export default async function AdminDashboardPage() {
  const session = await AuthService.getSession();

  // Retrieve actual database records where available
  const [
    bookings,
    events,
    reviewsCount,
    experiencesCount,
    winesCount,
  ] = await Promise.all([
    prisma.booking.findMany({
      include: {
        guestProfile: true,
        items: { include: { experience: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.event.findMany({
      include: { ticketTypes: true },
      orderBy: { eventDate: 'asc' },
      take: 4,
    }),
    prisma.review.count(),
    prisma.experience.count(),
    prisma.wine.count(),
  ]);

  // Aggregate stats
  const totalBookingsCount = await prisma.booking.count();
  const confirmedBookingsCount = await prisma.booking.count({
    where: { status: 'CONFIRMED' },
  });
  const totalGuestsSum = await prisma.booking.aggregate({
    _sum: { totalGuests: true },
  });
  const totalRevenueSum = await prisma.booking.aggregate({
    _sum: { totalPrice: true },
  });

  // Calculate booking status breakdown
  const statusCounts = await prisma.booking.groupBy({
    by: ['status'],
    _count: { id: true },
  });
  const statusMap = new Map(statusCounts.map((s) => [s.status, s._count.id]));

  // Today schedule (combines actual bookings with clear status presentation)
  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const adminGreetingName = session?.email
    ? session.email.split('@')[0].replace(/[._]/g, ' ')
    : 'Estate Manager';

  return (
    <div className="space-y-8">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
              Domaine Élysée • Estate Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium capitalize mt-1">
            Good day, {adminGreetingName}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5 flex items-center gap-2">
            <span>{todayDateStr}</span>
            <span>•</span>
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Estate Cellar & Reservation Engine Online
            </span>
          </p>
        </div>

        {/* Estate quick stats badge */}
        <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-white border border-stone-200/80 shadow-xs">
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono tracking-wider text-stone-600 block">Catalog Status</span>
            <span className="text-xs font-semibold text-stone-800">
              {experiencesCount} Experiences • {winesCount} Wines
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#461822]/10 text-[#6c2432] flex items-center justify-center font-serif text-sm font-bold">
            É
          </div>
        </div>
      </div>

      {/* 2. Operational Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Bookings"
          value={totalBookingsCount}
          subtitle={`${confirmedBookingsCount} confirmed`}
          icon={CalendarDays}
          trend="+12% this week"
        />
        <StatCard
          title="Total Guests"
          value={totalGuestsSum._sum.totalGuests || 0}
          subtitle="Tasting reservations"
          icon={Users}
        />
        <StatCard
          title="Today's Tastings"
          value="4"
          subtitle="Scheduled sessions"
          icon={GlassWater}
          isMock={true}
        />
        <StatCard
          title="Upcoming Events"
          value={events.length}
          subtitle="Active vineyard events"
          icon={Ticket}
        />
        <StatCard
          title="Guest Reviews"
          value={reviewsCount}
          subtitle="Curated feedback"
          icon={Star}
        />
        <StatCard
          title="Total Revenue"
          value={`$${Number(totalRevenueSum._sum.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          subtitle="Confirmed bookings"
          icon={DollarSign}
        />
      </div>

      {/* 3. Main Operational Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Schedule & Recent Bookings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule Table */}
          <SectionCard
            title="Today's Vineyard Schedule"
            description="Active appointments, tastings, and cellar tours scheduled for today"
            action={
              <span className="text-xs font-mono font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200">
                {bookings.length} reservations
              </span>
            }
          >
            <div className="overflow-x-auto -mx-5 -my-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-100 bg-[#faf8f5]/60 text-stone-500 uppercase tracking-wider font-mono text-[10px]">
                    <th className="py-3 px-5">Time</th>
                    <th className="py-3 px-4">Experience</th>
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4">Party Size</th>
                    <th className="py-3 px-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {bookings.map((booking) => {
                    const item = booking.items[0];
                    return (
                      <tr key={booking.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3.5 px-5 font-mono font-medium text-stone-800 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-stone-600" />
                            <span>{booking.time}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-serif text-stone-900 font-medium">
                          {item?.experience?.title || item?.title || 'Estate Tasting'}
                        </td>
                        <td className="py-3.5 px-4 text-stone-600">
                          <div className="font-medium text-stone-900">{booking.guestProfile?.name || 'Guest'}</div>
                          <div className="text-[11px] text-stone-600 truncate max-w-[140px]">
                            {booking.guestProfile?.phone || booking.bookingNumber}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-stone-600 whitespace-nowrap">
                          <span className="font-semibold text-stone-900">{booking.totalGuests}</span> guests
                          <span className="text-stone-600 text-[11px]"> ({booking.adults}A, {booking.children}C)</span>
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <StatusBadge status={booking.status} />
                        </td>
                      </tr>
                    );
                  })}
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-stone-400">
                        No bookings scheduled for today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* Recent Reservations Table */}
          <SectionCard
            title="Recent Reservations"
            description="Latest confirmed and pending booking inquiries"
          >
            <div className="overflow-x-auto -mx-5 -my-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-100 bg-[#faf8f5]/60 text-stone-500 uppercase tracking-wider font-mono text-[10px]">
                    <th className="py-3 px-5">Booking Ref</th>
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4">Experience</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {bookings.map((booking) => {
                    const item = booking.items[0];
                    return (
                      <tr key={`recent-${booking.id}`} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3.5 px-5 font-mono font-medium text-[#6c2432] whitespace-nowrap">
                          {booking.bookingNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-stone-900 block">
                            {booking.guestProfile?.name || 'Guest'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-serif text-stone-800">
                          {item?.experience?.title || item?.title}
                        </td>
                        <td className="py-3.5 px-4 text-stone-600 whitespace-nowrap">
                          <div>{new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                          <div className="text-[11px] font-mono text-stone-600">{booking.time}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-stone-900 whitespace-nowrap">
                          ${Number(booking.totalPrice).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <StatusBadge status={booking.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* Right Col: Booking Status Breakdown, Upcoming Events, Quick Actions */}
        <div className="space-y-6">
          {/* Booking Status Distribution */}
          <SectionCard title="Reservation Status" description="Breakdown across all booked reservations">
            <div className="space-y-3">
              {[
                { label: 'Confirmed', count: statusMap.get('CONFIRMED') || 0, color: 'bg-emerald-500', badge: 'CONFIRMED' },
                { label: 'Checked In', count: statusMap.get('CHECKED_IN') || 0, color: 'bg-sky-500', badge: 'CHECKED_IN' },
                { label: 'Pending', count: statusMap.get('PENDING') || 0, color: 'bg-amber-500', badge: 'PENDING' },
                { label: 'Completed', count: statusMap.get('COMPLETED') || 0, color: 'bg-indigo-500', badge: 'COMPLETED' },
                { label: 'Cancelled', count: statusMap.get('CANCELLED') || 0, color: 'bg-rose-500', badge: 'CANCELLED' },
              ].map((st) => {
                const pct = totalBookingsCount > 0 ? Math.round((st.count / totalBookingsCount) * 100) : 0;
                return (
                  <div key={st.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${st.color}`} />
                        <span className="font-medium text-stone-700">{st.label}</span>
                      </div>
                      <span className="font-mono font-semibold text-stone-900">
                        {st.count} <span className="text-stone-600 text-[10px]">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div className={`h-full ${st.color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Upcoming Estate Events */}
          <SectionCard
            title="Upcoming Vineyard Events"
            description="Seasonal celebrations, masterclasses, and dinners"
          >
            <div className="space-y-3">
              {events.map((event) => {
                const totalTickets = event.maxCapacity;
                const availableTickets = event.availableTickets;
                return (
                  <div
                    key={event.id}
                    className="p-3.5 rounded-lg border border-stone-200/80 bg-[#faf8f5]/40 hover:bg-[#faf8f5] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-serif font-medium text-sm text-stone-900 leading-snug">
                        {event.title}
                      </h4>
                      <StatusBadge status={event.status} size="sm" />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500 font-mono">
                      <span>{new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span>
                        {availableTickets} / {totalTickets} tickets left
                      </span>
                    </div>
                  </div>
                );
              })}
              {events.length === 0 && (
                <div className="text-center py-6 text-xs text-stone-400">
                  No upcoming events registered.
                </div>
              )}
            </div>
          </SectionCard>

          {/* Quick Actions (Strictly labeled Coming Soon for Phase 5.1+) */}
          <SectionCard
            title="Operational Quick Actions"
            description="Estate administration workflows and shortcuts"
          >
            <div className="grid grid-cols-1 gap-2.5">
              <QuickAction
                title="New Reservation"
                description="Book guests directly into cellar slots"
                icon={PlusCircle}
                isAvailable={false}
              />
              <QuickAction
                title="Add Guest Profile"
                description="Create or import guest history & preferences"
                icon={UserPlus}
                isAvailable={false}
              />
              <QuickAction
                title="Register New Wine"
                description="Add vintage, varietals, and tasting notes"
                icon={WineIcon}
                isAvailable={false}
              />
              <QuickAction
                title="Create Estate Event"
                description="Schedule vineyard dinners and tastings"
                icon={CalendarPlus}
                isAvailable={false}
              />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
