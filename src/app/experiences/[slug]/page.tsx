import React from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { mockExperiences } from '@/data/experiences';
import ExperienceCard from '@/components/experiences/ExperienceCard';
import RatingStars from '@/components/common/RatingStars';
import FAQ from '@/components/common/FAQ';
import {
  ArrowLeft,
  Clock,
  Wine as WineIcon,
  Utensils,
  Check,
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return mockExperiences.map((exp) => ({
    slug: exp.slug
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const exp = mockExperiences.find((e) => e.slug === slug);
  if (!exp) return { title: 'Experience Not Found | Domaine Élysée' };
  return {
    title: `${exp.title} | Domaine Élysée Experiences`,
    description: exp.shortDescription,
    openGraph: {
      title: exp.title,
      description: exp.shortDescription,
      images: [{ url: exp.image }]
    }
  };
}

export default async function ExperienceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const exp = mockExperiences.find((e) => e.slug === slug);

  if (!exp) {
    notFound();
  }

  const relatedExperiences = mockExperiences.filter((e) => e.id !== exp.id).slice(0, 3);

  return (
    <div className="w-full pt-20">
      {/* Editorial Breadcrumb */}
      <div className="bg-[#faf8f5] border-b border-[#e6dece] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs">
          <Link
            href="/experiences"
            className="inline-flex items-center gap-1.5 text-[#525960] hover:text-[#2d1117] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Experiences</span>
          </Link>
          <span className="text-[#8a3243] font-semibold tracking-wider uppercase">
            {exp.category} · {exp.duration}
          </span>
        </div>
      </div>

      {/* Experience Hero */}
      <section className="relative py-20 sm:py-28 bg-[#1e0c10] text-[#faf8f5] overflow-hidden">
        <Image
          src={exp.image}
          alt={exp.title}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-30"
        />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {exp.badge && (
              <span className="px-3 py-1 rounded-full bg-[#c5a059] text-[#1e0c10] text-xs font-bold uppercase tracking-wider">
                {exp.badge}
              </span>
            )}
            <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#faf8f5] text-xs font-medium uppercase tracking-wider">
              {exp.category} Experience
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal text-[#faf8f5] mb-6 leading-tight">
            {exp.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm text-[#e6dece]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#c5a059]" />
              <span>{exp.duration}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <WineIcon className="w-4 h-4 text-[#c5a059]" />
              <span>{exp.winesCount} Included Tastings</span>
            </div>
            <div className="flex items-center gap-1.5">
              <RatingStars rating={exp.rating} size="sm" />
              <span className="font-semibold text-white">
                {exp.rating.toFixed(1)} ({exp.reviewCount} reviews)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Content & Booking Sidebar */}
      <section className="py-16 sm:py-24 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Main Information Column */}
            <div className="lg:col-span-8 space-y-12">
              {/* Overview */}
              <div>
                <h3 className="font-serif text-2xl text-[#191c1f] mb-4">The Experience</h3>
                <p className="text-base text-[#525960] leading-relaxed">
                  {exp.description}
                </p>
              </div>

              {/* What's Included */}
              <div className="p-8 bg-white border border-[#e6dece] rounded-3xl shadow-sm">
                <h3 className="font-serif text-xl text-[#191c1f] mb-6">What Is Included</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {exp.included.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#f4f0e8] text-[#8a3243] flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm text-[#191c1f] font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wines Included */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif text-2xl text-[#191c1f]">Estate Wines Poured</h3>
                  <span className="text-xs uppercase tracking-wider text-[#8a3243] font-semibold">
                    {exp.includedWines.length} Vintages
                  </span>
                </div>
                <div className="space-y-3">
                  {exp.includedWines.map((wineName, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white border border-[#e6dece] rounded-2xl flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#f4f0e8] text-[#8a3243] flex items-center justify-center">
                          <WineIcon className="w-4 h-4" />
                        </div>
                        <span className="font-serif text-base text-[#191c1f] font-medium">
                          {wineName}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[#8a3243] uppercase tracking-wider">
                        Sample Glass
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Progression */}
              <div>
                <h3 className="font-serif text-2xl text-[#191c1f] mb-6">Experience Timeline</h3>
                <div className="relative border-l-2 border-[#e6dece] ml-3 pl-6 space-y-8">
                  {exp.timeline.map((slot, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-[#8a3243] border-2 border-white shadow-sm" />
                      <span className="text-xs font-mono font-semibold text-[#8a3243] uppercase tracking-wider">
                        {slot.time}
                      </span>
                      <h4 className="font-serif text-lg font-medium text-[#191c1f] mt-0.5">
                        {slot.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-[#525960] mt-1 leading-relaxed">
                        {slot.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Food Pairing Details */}
              <div className="p-8 bg-[#f4f0e8] border border-[#e6dece] rounded-3xl flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white text-[#8a3243] flex items-center justify-center shrink-0 mt-1 shadow-sm">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif text-xl text-[#191c1f] mb-2 font-medium">
                    Artisanal Culinary Pairing
                  </h4>
                  <p className="text-xs sm:text-sm text-[#525960] leading-relaxed">
                    {exp.foodPairing}
                  </p>
                </div>
              </div>

              {/* Guest Expectations & Important Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-6 bg-white border border-[#e6dece] rounded-2xl">
                  <h4 className="font-serif text-lg text-[#191c1f] mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#c5a059]" />
                    What to Expect
                  </h4>
                  <ul className="space-y-2 text-xs text-[#525960]">
                    {exp.guestExpectations.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8a3243] mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 bg-white border border-[#e6dece] rounded-2xl">
                  <h4 className="font-serif text-lg text-[#191c1f] mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#8a3243]" />
                    Important Notice
                  </h4>
                  <ul className="space-y-2 text-xs text-[#525960]">
                    {exp.importantInfo.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8a3243] mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* FAQs */}
              <FAQ items={exp.faqs} />
            </div>

            {/* Desktop Booking Card Sidebar (Sticky) */}
            <div className="lg:col-span-4 sticky top-24">
              <div className="bg-white border border-[#e6dece] rounded-3xl p-8 shadow-xl">
                <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#8a3243] block mb-1">
                  Reservations
                </span>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="font-serif text-4xl font-bold text-[#191c1f]">
                    ${exp.price}
                  </span>
                  <span className="text-xs text-[#525960]">/ guest (incl. tasting flight)</span>
                </div>

                <div className="space-y-3 mb-6 text-xs text-[#525960]">
                  <div className="flex items-center justify-between py-2 border-b border-[#e6dece]">
                    <span>Duration</span>
                    <span className="font-semibold text-[#191c1f]">{exp.duration}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#e6dece]">
                    <span>Wines Sampled</span>
                    <span className="font-semibold text-[#191c1f]">{exp.winesCount} Vintages</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#e6dece]">
                    <span>Availability</span>
                    <span className="text-emerald-700 font-semibold">Daily Sessions</span>
                  </div>
                </div>

                <Link
                  href={`/book?experience=${exp.id}`}
                  className="w-full block py-4 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] text-xs font-bold uppercase tracking-[0.2em] text-center transition-all shadow-md hover:shadow-lg mb-4"
                >
                  Book This Experience
                </Link>

                <p className="text-[11px] text-[#525960] text-center leading-relaxed">
                  Free cancellation up to 24 hours in advance. No immediate card charge required for reservations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Mobile Booking CTA (Bottom) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#faf8f5]/95 backdrop-blur-md border-t border-[#e6dece] p-4 flex items-center justify-between shadow-2xl">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#8a3243] block font-semibold">
            From ${exp.price} / guest
          </span>
          <span className="font-serif text-base font-bold text-[#191c1f] truncate max-w-[180px] block">
            {exp.title}
          </span>
        </div>
        <Link
          href={`/book?experience=${exp.id}`}
          className="px-6 py-3 rounded-full bg-[#2d1117] text-[#faf8f5] text-xs font-bold uppercase tracking-wider shadow-md"
        >
          Book This Experience
        </Link>
      </div>

      {/* Related Experiences */}
      <section className="py-20 bg-[#f4f0e8] border-t border-[#e6dece] mb-16 lg:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8a3243] block mb-1">
                Other Discoveries
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-[#191c1f]">
                Related Tasting Experiences
              </h3>
            </div>
            <Link
              href="/experiences"
              className="text-xs font-semibold uppercase tracking-widest text-[#8a3243] hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {relatedExperiences.map((rel) => (
              <ExperienceCard key={rel.id} experience={rel} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
