import React from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { mockWines } from '@/data/wines';
import WineTasteSliders from '@/components/wine/WineTasteSliders';
import WineRadarProfile from '@/components/wine/WineRadarProfile';
import WineCard from '@/components/wine/WineCard';
import RatingStars from '@/components/common/RatingStars';
import { ArrowLeft, Thermometer, Utensils, Award } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return mockWines.map((wine) => ({
    slug: wine.slug
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const wine = mockWines.find((w) => w.slug === slug);
  if (!wine) return { title: 'Wine Not Found | Domaine Élysée' };
  return {
    title: `${wine.name} (${wine.vintage}) | Domaine Élysée`,
    description: wine.shortDescription,
    openGraph: {
      title: `${wine.name} · Vintage ${wine.vintage}`,
      description: wine.shortDescription,
      images: [{ url: wine.image }]
    }
  };
}

export default async function WineDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const wine = mockWines.find((w) => w.slug === slug);

  if (!wine) {
    notFound();
  }

  const relatedWines = mockWines.filter((w) => w.id !== wine.id).slice(0, 3);

  return (
    <div className="w-full pt-20">
      {/* Editorial Breadcrumb */}
      <div className="bg-[#faf8f5] border-b border-[#e6dece] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs">
          <Link
            href="/wines"
            className="inline-flex items-center gap-1.5 text-[#525960] hover:text-[#2d1117] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Wine Collection</span>
          </Link>
          <span className="text-[#8a3243] font-semibold tracking-wider uppercase">
            {wine.category} Selection · {wine.vintage}
          </span>
        </div>
      </div>

      {/* Hero Wine Showcase */}
      <section className="py-16 sm:py-24 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Left: Bottle & Terroir Photography */}
            <div className="lg:col-span-6 relative">
              <div className="relative h-[480px] sm:h-[620px] rounded-3xl overflow-hidden border border-[#e6dece] shadow-2xl bg-[#f4f0e8]">
                <Image
                  src={wine.image}
                  alt={wine.name}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1e0c10]/80 via-transparent to-transparent opacity-70" />

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-6 left-6 right-6 text-[#faf8f5]">
                  <span className="text-xs uppercase tracking-[0.2em] text-[#c5a059] block font-semibold mb-1">
                    Single Vineyard Terroir
                  </span>
                  <p className="font-serif text-2xl font-light">{wine.vineyardParcel}</p>
                </div>
              </div>
            </div>

            {/* Right: Wine Profile Narrative */}
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#2d1117] text-[#c5a059] text-xs font-semibold uppercase tracking-wider">
                    Vintage {wine.vintage}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#f4f0e8] text-[#8a3243] text-xs font-semibold uppercase tracking-wider border border-[#e6dece]">
                    {wine.category}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-serif font-bold text-[#8a3243]">
                    ${wine.price}
                  </span>
                  <span className="text-xs text-[#525960] block">750ml / Allocation</span>
                </div>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#191c1f] leading-tight">
                {wine.name}
              </h1>

              <div className="flex items-center gap-3 py-2 border-y border-[#e6dece]">
                <RatingStars rating={wine.rating} size="md" showNumber />
                <span className="text-xs text-[#525960]">
                  Based on {wine.reviewCount} verified guest tastings
                </span>
              </div>

              <p className="text-base text-[#525960] leading-relaxed">
                {wine.description}
              </p>

              {/* Aromas Pill Grid */}
              <div>
                <h4 className="text-xs uppercase tracking-[0.2em] font-semibold text-[#191c1f] mb-3">
                  Aromatic Bouquet
                </h4>
                <div className="flex flex-wrap gap-2">
                  {wine.aroma.map((note, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-white border border-[#e6dece] text-xs font-medium text-[#461822] shadow-sm"
                    >
                      {note}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-4 flex flex-col sm:flex-row items-center gap-4 border-t border-[#e6dece]">
                <Link
                  href={`/book?experience=exp-signature-tasting`}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] text-xs font-semibold uppercase tracking-widest transition-all shadow-md text-center"
                >
                  Taste This Wine at the Estate
                </Link>
                <Link
                  href="/experiences"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-full border border-[#8a3243] text-[#8a3243] hover:bg-[#f4f0e8] text-xs font-semibold uppercase tracking-wider transition-colors text-center"
                >
                  View Tasting Flights
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sensory Radar & Taste Sliders Section */}
      <section className="py-20 bg-[#f4f0e8] border-y border-[#e6dece]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8a3243] block mb-2">
              Sommelier Palate Analysis
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#191c1f]">
              Sensory Architecture
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Visual Radar Profile */}
            <div className="lg:col-span-5 bg-white p-8 rounded-3xl border border-[#e6dece] shadow-sm flex flex-col items-center justify-center">
              <h3 className="font-serif text-lg text-[#2d1117] mb-6">Four-Axis Diamond Balance</h3>
              <WineRadarProfile
                body={wine.tasteProfile.body}
                acidity={wine.tasteProfile.acidity}
                sweetness={wine.tasteProfile.sweetness}
                tannin={wine.tasteProfile.tannin}
                size={220}
              />
            </div>

            {/* Precision Taste Gauges */}
            <div className="lg:col-span-7 bg-white p-8 rounded-3xl border border-[#e6dece] shadow-sm">
              <h3 className="font-serif text-xl text-[#191c1f] mb-6">Palate Spectrum</h3>
              <WineTasteSliders
                body={wine.tasteProfile.body}
                acidity={wine.tasteProfile.acidity}
                sweetness={wine.tasteProfile.sweetness}
                tannin={wine.tasteProfile.tannin}
              />

              <div className="mt-8 pt-6 border-t border-[#e6dece] grid grid-cols-2 gap-4 text-xs text-[#525960]">
                <div>
                  <span className="font-semibold uppercase tracking-wider text-[#191c1f] block">
                    Alcohol by Volume
                  </span>
                  <span>{wine.tasteProfile.alcohol}</span>
                </div>
                <div>
                  <span className="font-semibold uppercase tracking-wider text-[#191c1f] block">
                    Oak Maturation
                  </span>
                  <span>{wine.tasteProfile.oakAging}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Serving, Food Pairings & Terroir Story */}
      <section className="py-20 sm:py-28 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Food Pairings */}
            <div className="bg-white p-8 rounded-3xl border border-[#e6dece] shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-full bg-[#f4f0e8] text-[#8a3243] flex items-center justify-center">
                <Utensils className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl text-[#191c1f] font-medium">Culinary Pairings</h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#525960]">
                {wine.foodPairings.map((pairing, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059] mt-2 shrink-0" />
                    <span>{pairing}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Serving & Cellar */}
            <div className="bg-white p-8 rounded-3xl border border-[#e6dece] shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-full bg-[#f4f0e8] text-[#8a3243] flex items-center justify-center">
                <Thermometer className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl text-[#191c1f] font-medium">Service & Cellaring</h3>
              <div className="space-y-3 text-xs sm:text-sm text-[#525960]">
                <div>
                  <span className="font-semibold text-[#191c1f] block uppercase tracking-wider text-[11px]">
                    Ideal Temperature
                  </span>
                  <p>{wine.servingTemp}</p>
                </div>
                <div>
                  <span className="font-semibold text-[#191c1f] block uppercase tracking-wider text-[11px]">
                    Cellar Longevity
                  </span>
                  <p>{wine.cellarPotential}</p>
                </div>
              </div>
            </div>

            {/* Terroir & Parcel Story */}
            <div className="bg-white p-8 rounded-3xl border border-[#e6dece] shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-full bg-[#f4f0e8] text-[#8a3243] flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl text-[#191c1f] font-medium">Terroir Chronicles</h3>
              <p className="text-xs sm:text-sm text-[#525960] leading-relaxed">
                {wine.story}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Related Wines */}
      <section className="py-20 bg-[#f4f0e8] border-t border-[#e6dece]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8a3243] block mb-1">
                You May Also Appreciate
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-[#191c1f]">
                Complementary Estate Cuvées
              </h3>
            </div>
            <Link
              href="/wines"
              className="text-xs font-semibold uppercase tracking-widest text-[#8a3243] hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {relatedWines.map((rel) => (
              <WineCard key={rel.id} wine={rel} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
