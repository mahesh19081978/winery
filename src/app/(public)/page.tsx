import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Clock, MapPin, Sparkles } from 'lucide-react';
import SectionHeading from '@/components/common/SectionHeading';
import ExperienceCard from '@/components/experiences/ExperienceCard';
import WineCard from '@/components/wine/WineCard';
import EventCard from '@/components/events/EventCard';
import ReviewCard from '@/components/reviews/ReviewCard';
import { mockExperiences } from '@/data/experiences';
import { mockWines } from '@/data/wines';
import { mockEvents } from '@/data/events';
import { mockReviews } from '@/data/reviews';

export default function HomePage() {
  const featuredExperiences = mockExperiences.slice(0, 3);
  const signatureWines = mockWines.slice(0, 3);
  const upcomingEvents = mockEvents.filter((e) => !e.isPast).slice(0, 3);
  const featuredReviews = mockReviews.slice(0, 3);

  return (
    <div className="w-full">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=2000&q=90"
          alt="Sunlit terraces and vineyards of Domaine Élysée"
          fill
          priority
          className="object-cover object-center scale-105 animate-in fade-in duration-1000"
        />
        {/* Editorial Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1e0c10] via-[#1e0c10]/40 to-[#1e0c10]/70" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white py-32 sm:py-40">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs uppercase tracking-[0.25em] text-[#c5a059] mb-6 animate-in slide-in-from-bottom-4 duration-700">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Val de Rêve Estate · Fondé en 1784</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-tight text-[#faf8f5] mb-6 leading-[1.08]">
            Discover. Taste. <br className="hidden sm:inline" />
            <span className="italic font-light text-[#c5a059]">Experience.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-[#e6dece]/90 font-light leading-relaxed mb-10">
            Four centuries of biodynamic mastery upon sun-drenched limestone terraces. Savor world-class cuvées, subterranean barrel journeys, and tranquil sunset hospitality.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/book"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#c5a059] hover:bg-[#d6b774] text-[#1e0c10] text-xs font-bold uppercase tracking-[0.2em] transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              Book an Experience
            </Link>
            <Link
              href="/wines"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 text-[#faf8f5] border border-white/30 text-xs font-semibold uppercase tracking-[0.2em] backdrop-blur-md transition-all"
            >
              Explore Wines
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-white/60 text-xs tracking-widest uppercase">
          <span className="text-[10px] mb-2 tracking-[0.3em]">Scroll to Explore</span>
          <div className="w-[1px] h-8 bg-gradient-to-b from-[#c5a059] to-transparent animate-pulse" />
        </div>
      </section>

      {/* 2. INTRODUCTION TO WINERY (Split Layout) */}
      <section className="py-24 sm:py-32 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Image Composition */}
            <div className="lg:col-span-6 relative">
              <div className="relative h-[480px] sm:h-[580px] rounded-3xl overflow-hidden shadow-2xl border border-[#e6dece]">
                <Image
                  src="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=85"
                  alt="Winemaker pouring estate vintage in stone cellar"
                  fill
                  className="object-cover"
                />
              </div>
              {/* Floating Stat Card */}
              <div className="absolute -bottom-6 -right-6 sm:bottom-8 sm:-right-8 bg-[#2d1117] text-[#faf8f5] p-6 rounded-2xl border border-[#c5a059]/40 shadow-xl max-w-xs">
                <span className="font-serif text-3xl sm:text-4xl text-[#c5a059] block font-bold">
                  240+
                </span>
                <span className="text-xs uppercase tracking-widest text-[#e6dece]/80 mt-1 block">
                  Years of Unbroken Terroir Heritage
                </span>
              </div>
            </div>

            {/* Right Story Text */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8a3243] block">
                Heritage & Terroir
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#191c1f] leading-tight">
                Where ancient limestone meets the cooling mountain breeze.
              </h2>
              <p className="text-base text-[#525960] leading-relaxed">
                Domaine Élysée rests upon the steep southern terraces of the Val de Rêve valley. Protected by the jagged ridgeline from northern frosts and blessed with morning valley mists, each vine struggles deep into mineral-rich chalk soils, producing grapes of unyielding concentration and tension.
              </p>
              <p className="text-base text-[#525960] leading-relaxed">
                Today, Julien and Élisabeth de Rêve maintain a radical commitment to biodynamics: zero synthetic inputs, lunar-cycle harvesting, indigenous fermentations, and subterranean oak aging in the 18th-century chalk caves.
              </p>

              <div className="pt-4 flex flex-wrap items-center gap-6">
                <Link
                  href="/our-story"
                  className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#8a3243] hover:text-[#2d1117] transition-colors"
                >
                  <span>Read the Full Story</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <span className="text-[#e6dece]">|</span>
                <Link
                  href="/visit"
                  className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#525960] hover:text-[#191c1f] transition-colors"
                >
                  <MapPin className="w-4 h-4 text-[#c5a059]" />
                  <span>View Estate Location</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED EXPERIENCES */}
      <section className="py-24 bg-[#f4f0e8] border-y border-[#e6dece]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <SectionHeading
                subtitle="Immersive Visits"
                title="Curated Estate Experiences"
                description="From guided sensory flights to subterranean barrel tastings, each experience is tailored to awaken your palate."
                centered={false}
              />
            </div>
            <Link
              href="/experiences"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#8a3243] hover:text-[#2d1117] transition-colors pb-4"
            >
              <span>View All Experiences</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredExperiences.map((exp) => (
              <ExperienceCard key={exp.id} experience={exp} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. SIGNATURE WINES */}
      <section className="py-24 sm:py-32 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            subtitle="The Cellar Collection"
            title="Handcrafted Estate Vintages"
            description="Pure expressions of parcel-specific terroir, bottled with patience and uncompromising integrity."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {signatureWines.map((wine) => (
              <WineCard key={wine.id} wine={wine} />
            ))}
          </div>

          <div className="mt-14 text-center">
            <Link
              href="/wines"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-[#2d1117] hover:bg-[#2d1117] text-[#2d1117] hover:text-[#faf8f5] text-xs font-semibold uppercase tracking-widest transition-all shadow-sm"
            >
              <span>Explore Complete Wine Catalogue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. UPCOMING EVENTS */}
      <section className="py-24 bg-[#f4f0e8] border-y border-[#e6dece]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <SectionHeading
                subtitle="Gatherings & Celebrations"
                title="Upcoming Estate Events"
                description="Join winemakers, visiting chefs, and jazz artists for intimate seasonal events beneath the vine canopy."
                centered={false}
              />
            </div>
            <Link
              href="/events"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#8a3243] hover:text-[#2d1117] transition-colors pb-4"
            >
              <span>View Full Calendar</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {upcomingEvents.map((evt) => (
              <EventCard key={evt.id} event={evt} />
            ))}
          </div>
        </div>
      </section>

      {/* 6. VINEYARD / WINERY VISUAL SECTION (Cinematic Panorama) */}
      <section className="relative py-32 sm:py-40 bg-[#1e0c10] text-white overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?auto=format&fit=crop&w=2000&q=85"
          alt="Oak barrels in candlelit cellar"
          fill
          className="object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1e0c10] via-[#1e0c10]/80 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-6">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#c5a059] block">
              Subterranean Architecture
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-normal text-[#faf8f5] leading-tight">
              Carved beneath 40 feet of solid limestone.
            </h2>
            <p className="text-base sm:text-lg text-[#e6dece]/80 leading-relaxed">
              In 1784, stonemasons excavated our underground labyrinth. Kept at a natural 12°C and 85% humidity throughout all seasons, these vaulted chambers provide the peaceful repose required for our reserve wines to develop complex bouquet and silken texture.
            </p>
            <div className="pt-4 flex items-center gap-4">
              <Link
                href="/experiences/barrel-cellar-tour"
                className="px-6 py-3 rounded-full bg-[#c5a059] hover:bg-[#d6b774] text-[#1e0c10] text-xs font-semibold uppercase tracking-wider transition-all"
              >
                Tour the Cellar
              </Link>
              <Link
                href="/gallery"
                className="px-6 py-3 rounded-full border border-white/20 text-[#faf8f5] hover:bg-white/10 text-xs font-semibold uppercase tracking-wider transition-all"
              >
                View Gallery
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. WINE TASTING PHILOSOPHY */}
      <section className="py-24 sm:py-32 bg-[#faf8f5]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <SectionHeading
            subtitle="The Domaine Ritual"
            title="Our Philosophy of Savoring"
            description="We believe wine tasting is not an examination, but an unhurried communion with nature, climate, and the passage of time."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 text-left">
            <div className="p-8 bg-white border border-[#e6dece] rounded-2xl shadow-sm">
              <span className="font-serif text-3xl text-[#c5a059] font-bold block mb-3">01</span>
              <h3 className="font-serif text-xl text-[#191c1f] mb-2 font-medium">Listening to Terroir</h3>
              <p className="text-xs sm:text-sm text-[#525960] leading-relaxed">
                Every parcel tells its own geological story. We respect the subtle variations of sun, wind, and mineral depths without heavy filtration or excessive extraction.
              </p>
            </div>

            <div className="p-8 bg-white border border-[#e6dece] rounded-2xl shadow-sm">
              <span className="font-serif text-3xl text-[#c5a059] font-bold block mb-3">02</span>
              <h3 className="font-serif text-xl text-[#191c1f] mb-2 font-medium">Harmonic Pairings</h3>
              <p className="text-xs sm:text-sm text-[#525960] leading-relaxed">
                Great wine awakens in the company of fine food. Our tastings feature ingredients harvested directly from estate heirloom vegetable gardens and neighboring artisan dairies.
              </p>
            </div>

            <div className="p-8 bg-white border border-[#e6dece] rounded-2xl shadow-sm">
              <span className="font-serif text-3xl text-[#c5a059] font-bold block mb-3">03</span>
              <h3 className="font-serif text-xl text-[#191c1f] mb-2 font-medium">A Living Journal</h3>
              <p className="text-xs sm:text-sm text-[#525960] leading-relaxed">
                Your wine journey doesn&apos;t end when you leave. Our digital guest journal allows you to preserve your personal tasting impressions, flavor radars, and cellar milestones.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. GUEST TESTIMONIALS */}
      <section className="py-24 bg-[#f4f0e8] border-y border-[#e6dece]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <SectionHeading
                subtitle="Guest Voices"
                title="Echoes from the Valley"
                description="Authentic impressions shared by travelers, collectors, and wine lovers."
                centered={false}
              />
            </div>
            <Link
              href="/reviews"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#8a3243] hover:text-[#2d1117] transition-colors pb-4"
            >
              <span>Read All Reviews</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredReviews.map((rev) => (
              <ReviewCard key={rev.id} review={rev} />
            ))}
          </div>
        </div>
      </section>

      {/* 9. VISIT INFORMATION */}
      <section className="py-24 sm:py-32 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <SectionHeading
                subtitle="Estate Hospitality"
                title="Plan Your Pilgrimage"
                description="We welcome visitors Wednesday through Sunday for unhurried cellar tours, seasonal tastings, and leisurely lunches."
                centered={false}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="p-5 bg-white border border-[#e6dece] rounded-xl">
                  <Clock className="w-5 h-5 text-[#8a3243] mb-2" />
                  <h4 className="font-serif text-lg font-medium text-[#191c1f] mb-1">Hours of Service</h4>
                  <p className="text-xs sm:text-sm text-[#525960]">
                    Wednesday – Sunday: 10:00 AM – 7:00 PM<br />
                    Monday & Tuesday: Private Cellar Allocations
                  </p>
                </div>

                <div className="p-5 bg-white border border-[#e6dece] rounded-xl">
                  <MapPin className="w-5 h-5 text-[#8a3243] mb-2" />
                  <h4 className="font-serif text-lg font-medium text-[#191c1f] mb-1">Estate Location</h4>
                  <p className="text-xs sm:text-sm text-[#525960]">
                    4800 Terrasses du Rêve, Coteaux de l&apos;Est<br />
                    Valley Wine Region (45 mins from International Airport)
                  </p>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <Link
                  href="/visit"
                  className="px-6 py-3 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm"
                >
                  Visitor Guidelines & Map
                </Link>
                <Link
                  href="/book"
                  className="px-6 py-3 rounded-full border border-[#8a3243] text-[#8a3243] hover:bg-[#f4f0e8] text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  Reserve Your Visit
                </Link>
              </div>
            </div>

            {/* Map Placeholder Graphic */}
            <div className="lg:col-span-5 relative h-80 sm:h-96 rounded-3xl overflow-hidden border border-[#e6dece] shadow-md bg-[#e6dece] flex items-center justify-center text-center p-6">
              <Image
                src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80"
                alt="Winery grounds and estate driveway"
                fill
                className="object-cover opacity-75"
              />
              <div className="relative z-10 bg-[#faf8f5]/95 backdrop-blur-md p-6 rounded-2xl border border-[#c5a059]/40 max-w-xs shadow-lg">
                <MapPin className="w-6 h-6 text-[#8a3243] mx-auto mb-2" />
                <h5 className="font-serif text-base font-semibold text-[#191c1f]">
                  Val de Rêve Estate Map
                </h5>
                <p className="text-xs text-[#525960] mt-1 mb-3">
                  Complimentary EV charging & private valet parking available on arrival.
                </p>
                <Link
                  href="/visit"
                  className="text-xs font-bold text-[#8a3243] uppercase tracking-wider hover:underline inline-flex items-center gap-1"
                >
                  Directions & Parking <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FINAL BOOKING CTA BANNER */}
      <section className="relative py-24 sm:py-28 bg-[#2d1117] text-[#faf8f5] overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <Image
            src="https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=2000&q=85"
            alt="Sunset over vineyard"
            fill
            className="object-cover"
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <span className="text-xs uppercase tracking-[0.3em] font-semibold text-[#c5a059] block mb-3">
            Your Table Awaits
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl font-normal text-[#faf8f5] mb-6 leading-tight">
            Reserve your place at the estate.
          </h2>
          <p className="text-base sm:text-lg text-[#e6dece]/80 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            Due to our commitment to intimate, unhurried hospitality, tasting flights and cellar visits are limited each day. Reserve your journey in advance.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/book"
              className="w-full sm:w-auto px-9 py-4 rounded-full bg-[#c5a059] hover:bg-[#d6b774] text-[#1e0c10] text-xs font-bold uppercase tracking-[0.2em] transition-all shadow-xl hover:scale-105"
            >
              Book an Experience
            </Link>
            <Link
              href="/experiences"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 text-[#faf8f5] border border-white/30 text-xs font-semibold uppercase tracking-[0.2em] transition-all"
            >
              Explore Experiences
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

