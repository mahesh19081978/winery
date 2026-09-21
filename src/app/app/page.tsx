'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useBooking } from '@/context/BookingContext';
import { useGuest } from '@/context/GuestContext';
import { mockExperiences } from '@/data/experiences';
import { mockWines } from '@/data/wines';
import { 
  Calendar, 
  Clock, 
  Users, 
  Wine, 
  Sparkles, 
  ArrowRight, 
  QrCode, 
  Star,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import QRCodePlaceholder from '@/components/booking/QRCodePlaceholder';

export default function GuestOverviewPage() {
  const { bookings } = useBooking();
  const { profile, tastings, savedWineIds } = useGuest();

  // Find upcoming booking
  const upcomingBooking = bookings.find(b => b.status === 'Confirmed');
  const upcomingExp = upcomingBooking ? mockExperiences.find(e => e.id === upcomingBooking.experienceId) : null;

  // Recommended wines
  const recommendedWines = mockWines.slice(0, 3);

  // Recent tastings
  const recentTastings = tastings.slice(0, 3);

  return (
    <div className="space-y-12">
      {/* Welcome Hero Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#2d1117] via-[#4a1c24] to-[#1a0a0d] text-white p-8 md:p-12 shadow-xl border border-[#c5a059]/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#c5a059]/15 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/20 border border-[#c5a059]/30 text-xs font-medium tracking-widest text-[#f5ebd7] uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" />
            Grand Cru Circle Member
          </div>
          <h1 className="font-serif text-3xl md:text-5xl font-light mb-4 leading-tight">
            Bienvenue, {profile.name}
          </h1>
          <p className="text-stone-300 font-light text-base md:text-lg leading-relaxed mb-8">
            Your personal cellar door companion. Track your estate visits, sensory tasting logs, and tailored allocations from our cellar master.
          </p>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/10">
            <div>
              <div className="text-2xl md:text-3xl font-serif text-[#c5a059]">{profile.visitsCount || 4}</div>
              <div className="text-xs text-stone-400 uppercase tracking-wider mt-1">Estate Visits</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-serif text-[#c5a059]">{tastings.length}</div>
              <div className="text-xs text-stone-400 uppercase tracking-wider mt-1">Wines Tasted</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-serif text-[#c5a059]">{savedWineIds.length}</div>
              <div className="text-xs text-stone-400 uppercase tracking-wider mt-1">Cellar Wishlist</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-serif text-[#c5a059]">{profile.eventsAttendedCount || 2}</div>
              <div className="text-xs text-stone-400 uppercase tracking-wider mt-1">Events Booked</div>
            </div>
          </div>
        </div>
      </div>

      {/* Next Upcoming Experience / Digital Pass */}
      {upcomingBooking && upcomingExp ? (
        <section className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-sm relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8a3243]">
                <Calendar className="w-4 h-4" /> Next Upcoming Visit
              </div>
              <h2 className="font-serif text-2xl md:text-3xl text-stone-900 font-normal">
                {upcomingExp.title}
              </h2>
              <p className="text-stone-600 text-sm leading-relaxed">
                {upcomingExp.shortDescription}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 text-sm text-stone-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#8a3243]" />
                  <span>{new Date(upcomingBooking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#8a3243]" />
                  <span>{upcomingBooking.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#8a3243]" />
                  <span>{upcomingBooking.totalGuests} {upcomingBooking.totalGuests === 1 ? 'Guest' : 'Guests'}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Link
                  href={`/app/bookings/${upcomingBooking.id}`}
                  className="px-6 py-2.5 rounded-full bg-[#8a3243] text-white text-sm font-medium hover:bg-[#732937] transition inline-flex items-center gap-2 shadow-sm"
                >
                  <QrCode className="w-4 h-4" /> View Digital Pass
                </Link>
                <Link
                  href={`/experiences/${upcomingExp.slug}`}
                  className="px-6 py-2.5 rounded-full border border-stone-300 text-stone-700 text-sm font-medium hover:border-[#8a3243] hover:text-[#8a3243] transition"
                >
                  Experience Details
                </Link>
              </div>
            </div>

            {/* QR Code Pass Preview */}
            <div className="flex flex-col items-center justify-center p-6 bg-[#faf8f5] rounded-2xl border border-stone-200/80 text-center w-full lg:w-72 shrink-0">
              <QRCodePlaceholder code={`WINERY-${upcomingBooking.id}`} size={140} />
              <div className="mt-4 font-mono text-xs uppercase tracking-wider text-stone-500 font-semibold">
                Pass #{upcomingBooking.id}
              </div>
              <div className="text-xs text-stone-400 mt-1">
                Scan upon arrival at Cellar Reception
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-sm text-center">
          <Wine className="w-12 h-12 text-[#c5a059] mx-auto mb-4 stroke-1" />
          <h2 className="font-serif text-2xl text-stone-900 mb-2">No Upcoming Reservations</h2>
          <p className="text-stone-500 text-sm max-w-md mx-auto mb-6">
            Immerse yourself in our terroirs. Book a private cave tour, tasting flight, or harvest dining experience.
          </p>
          <Link
            href="/experiences"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#8a3243] text-white text-sm font-medium hover:bg-[#732937] transition"
          >
            Explore Experiences <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      )}

      {/* Two Column Layout: Recent Tasting Logs & Sommelier Allocations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Tasting Logs */}
        <section className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-serif text-2xl text-stone-900 font-normal">Recent Tasting Journal</h3>
                <p className="text-xs text-stone-500 mt-0.5">Your personal sensory impressions and scores</p>
              </div>
              <Link
                href="/app/tastings"
                className="text-xs uppercase tracking-wider text-[#8a3243] font-semibold hover:underline inline-flex items-center gap-1"
              >
                All Logs <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-4">
              {recentTastings.map((log) => {
                const wine = mockWines.find(w => w.id === log.wineId);
                return (
                  <Link
                    key={log.id}
                    href={`/app/tastings/${log.id}`}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-stone-100 bg-[#faf8f5] hover:border-[#c5a059]/40 hover:bg-[#f5ede4] transition group"
                  >
                    <div className="w-12 h-14 relative bg-stone-100 rounded-lg overflow-hidden shrink-0">
                      <Image
                        src={wine?.image || 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=400&auto=format&fit=crop'}
                        alt={wine?.name || 'Wine'}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif font-medium text-stone-900 text-sm truncate group-hover:text-[#8a3243] transition">
                          {wine?.name || log.wineName}
                        </h4>
                        <div className="flex items-center gap-1 text-[#c5a059] text-xs font-semibold">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{log.rating}</span>
                        </div>
                      </div>
                      <p className="text-xs text-stone-500 truncate mt-1">
                        {log.notes || 'Cellared impressions recorded.'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {log.tasteCharacteristics.slice(0, 2).map((fl: string, i: number) => (
                          <span key={i} className="text-[10px] uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-600">
                            {fl}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-stone-100 flex items-center justify-between">
            <span className="text-xs text-stone-500">Record a new sensory vintage:</span>
            <Link
              href="/app/tastings"
              className="text-xs font-medium px-4 py-2 rounded-full bg-[#faf8f5] border border-stone-200 hover:border-[#8a3243] hover:text-[#8a3243] transition inline-flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" /> Log Tasting Note
            </Link>
          </div>
        </section>

        {/* Sommelier Recommendations */}
        <section className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-serif text-2xl text-stone-900 font-normal">Cellar Recommendations</h3>
                <p className="text-xs text-stone-500 mt-0.5">Curated for your palate preferences</p>
              </div>
              <Link
                href="/wines"
                className="text-xs uppercase tracking-wider text-[#8a3243] font-semibold hover:underline inline-flex items-center gap-1"
              >
                Catalogue <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-4">
              {recommendedWines.map((wine) => (
                <Link
                  key={wine.id}
                  href={`/wines/${wine.slug}`}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-stone-100 bg-[#faf8f5] hover:border-[#c5a059]/40 hover:bg-[#f5ede4] transition group"
                >
                  <div className="w-12 h-14 relative bg-stone-100 rounded-lg overflow-hidden shrink-0">
                    <Image
                      src={wine.image}
                      alt={wine.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif font-medium text-stone-900 text-sm truncate group-hover:text-[#8a3243] transition">
                        {wine.name}
                      </h4>
                      <span className="text-xs font-medium text-stone-900 font-serif">
                        ${wine.price}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      {wine.vintage} · {wine.category} · {wine.tasteProfile.alcohol}
                    </div>
                    <div className="text-[11px] text-stone-400 italic truncate mt-1">
                      {wine.foodPairings.slice(0, 2).join(', ')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-stone-100 flex items-center justify-between">
            <span className="text-xs text-stone-500">Fine-tune your sensory profile:</span>
            <Link
              href="/app/profile"
              className="text-xs font-medium px-4 py-2 rounded-full bg-[#faf8f5] border border-stone-200 hover:border-[#8a3243] hover:text-[#8a3243] transition inline-flex items-center gap-1.5"
            >
              Taste Profile Preferences
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
