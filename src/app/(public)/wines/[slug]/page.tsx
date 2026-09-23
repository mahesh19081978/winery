import React from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { WineService } from '@/server/services';
import { toPublicWine } from '@/lib/wine-map';
import WineTasteSliders from '@/components/wine/WineTasteSliders';
import WineRadarProfile from '@/components/wine/WineRadarProfile';
import WineCard from '@/components/wine/WineCard';
import RatingStars from '@/components/common/RatingStars';
import { ArrowLeft, Thermometer, Utensils, Award } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const wines = await prisma.wine.findMany({ select: { slug: true } });
    if (wines.length > 0) return wines.map((w) => ({ slug: w.slug }));
  } catch {
    // DB unavailable at build time — return empty to avoid build failure
  }
  return [];
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const wine = await WineService.getWineBySlug(slug);
    const pub = toPublicWine(wine as unknown as Parameters<typeof toPublicWine>[0]);
    return {
      title: `${pub.name} (${pub.vintage}) | VINORA`,
      description: pub.shortDescription,
      openGraph: {
        title: `${pub.name} · Vintage ${pub.vintage}`,
        description: pub.shortDescription,
        images: [{ url: pub.image }],
      },
    };
  } catch {
    return { title: 'Wine Not Found | VINORA' };
  }
}

export default async function WineDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let wine;
  try {
    wine = await WineService.getWineBySlug(slug);
  } catch {
    notFound();
  }

  const pub = toPublicWine(wine as unknown as Parameters<typeof toPublicWine>[0]);

  let relatedPubs: ReturnType<typeof toPublicWine>[] = [];
  try {
    const all = await WineService.getAllWines();
    relatedPubs = all
      .filter((w) => w.slug !== pub.slug)
      .slice(0, 3)
      .map((w) => toPublicWine(w as unknown as Parameters<typeof toPublicWine>[0]));
  } catch {
    relatedPubs = [];
  }

  return (
    <div className="w-full pt-20">
      <div className="bg-[#faf8f5] border-b border-[#e6dece] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs">
          <Link href="/wines" className="inline-flex items-center gap-1.5 text-[#525960] hover:text-[#2d1117] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Wine Collection</span>
          </Link>
          <span className="text-[#8a3243] font-semibold tracking-wider uppercase">
            {pub.category} Selection · {pub.vintage}
          </span>
        </div>
      </div>

      <section className="py-16 sm:py-24 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-6 relative">
              <div className="relative h-[480px] sm:h-[620px] rounded-3xl overflow-hidden border border-[#e6dece] shadow-2xl bg-[#f4f0e8]">
                <Image src={pub.image} alt={pub.name} fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1e0c10]/80 via-transparent to-transparent opacity-70" />
                <div className="absolute bottom-6 left-6 right-6 text-[#faf8f5]">
                  <span className="text-xs uppercase tracking-[0.2em] text-[#c5a059] block font-semibold mb-1">Single Vineyard Terroir</span>
                  <p className="font-serif text-2xl font-light">{pub.vineyardParcel}</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#2d1117] text-[#c5a059] text-xs font-semibold uppercase tracking-wider">Vintage {pub.vintage}</span>
                  <span className="px-3 py-1 rounded-full bg-[#f4f0e8] text-[#8a3243] text-xs font-semibold uppercase tracking-wider border border-[#e6dece]">{pub.category}</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-serif font-bold text-[#8a3243]">${pub.price}</span>
                  <span className="text-xs text-[#525960] block">750ml / Allocation</span>
                </div>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#191c1f] leading-tight">{pub.name}</h1>

              <div className="flex items-center gap-3 py-2 border-y border-[#e6dece]">
                <RatingStars rating={pub.rating} size="md" showNumber />
                <span className="text-xs text-[#525960]">Based on {pub.reviewCount} verified guest tastings</span>
              </div>

              <p className="text-base text-[#525960] leading-relaxed">{pub.description}</p>

              <div>
                <h4 className="text-xs uppercase tracking-[0.2em] font-semibold text-[#191c1f] mb-3">Aromatic Bouquet</h4>
                <div className="flex flex-wrap gap-2">
                  {pub.aroma.map((note, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-white border border-[#e6dece] text-xs font-medium text-[#461822] shadow-sm">{note}</span>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center gap-4 border-t border-[#e6dece]">
                <Link href={`/book?experience=exp-signature-tasting`} className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] text-xs font-semibold uppercase tracking-widest transition-all shadow-md text-center">Taste This Wine at the Estate</Link>
                <Link href="/experiences" className="w-full sm:w-auto px-6 py-3.5 rounded-full border border-[#8a3243] text-[#8a3243] hover:bg-[#f4f0e8] text-xs font-semibold uppercase tracking-wider transition-colors text-center">View Tasting Flights</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#f4f0e8] border-y border-[#e6dece]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8a3243] block mb-2">Sommelier Palate Analysis</span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#191c1f]">Sensory Architecture</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 bg-white p-8 rounded-3xl border border-[#e6dece] shadow-sm flex flex-col items-center justify-center">
              <h3 className="font-serif text-lg text-[#2d1117] mb-6">Four-Axis Diamond Balance</h3>
              <WineRadarProfile body={pub.tasteProfile.body} acidity={pub.tasteProfile.acidity} sweetness={pub.tasteProfile.sweetness} tannin={pub.tasteProfile.tannin} size={220} />
            </div>

            <div className="lg:col-span-7 bg-white p-8 rounded-3xl border border-[#e6dece] shadow-sm">
              <h3 className="font-serif text-xl text-[#191c1f] mb-6">Palate Spectrum</h3>
              <WineTasteSliders body={pub.tasteProfile.body} acidity={pub.tasteProfile.acidity} sweetness={pub.tasteProfile.sweetness} tannin={pub.tasteProfile.tannin} />
              <div className="mt-8 pt-6 border-t border-[#e6dece] grid grid-cols-2 gap-4 text-xs text-[#525960]">
                <div><span className="font-semibold uppercase tracking-wider text-[#191c1f] block">Alcohol by Volume</span><span>{pub.tasteProfile.alcohol}</span></div>
                <div><span className="font-semibold uppercase tracking-wider text-[#191c1f] block">Oak Maturation</span><span>{pub.tasteProfile.oakAging}</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-[#e6dece] shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-full bg-[#f4f0e8] text-[#8a3243] flex items-center justify-center"><Utensils className="w-5 h-5" /></div>
              <h3 className="font-serif text-xl text-[#191c1f] font-medium">Culinary Pairings</h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#525960]">
                {pub.foodPairings.map((pairing, idx) => (
                  <li key={idx} className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#c5a059] mt-2 shrink-0" /><span>{pairing}</span></li>
                ))}
              </ul>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-[#e6dece] shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-full bg-[#f4f0e8] text-[#8a3243] flex items-center justify-center"><Thermometer className="w-5 h-5" /></div>
              <h3 className="font-serif text-xl text-[#191c1f] font-medium">Service & Cellaring</h3>
              <div className="space-y-3 text-xs sm:text-sm text-[#525960]">
                <div><span className="font-semibold text-[#191c1f] block uppercase tracking-wider text-[11px]">Ideal Temperature</span><p>{pub.servingTemp}</p></div>
                <div><span className="font-semibold text-[#191c1f] block uppercase tracking-wider text-[11px]">Cellar Longevity</span><p>{pub.cellarPotential}</p></div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-[#e6dece] shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-full bg-[#f4f0e8] text-[#8a3243] flex items-center justify-center"><Award className="w-5 h-5" /></div>
              <h3 className="font-serif text-xl text-[#191c1f] font-medium">Terroir Chronicles</h3>
              <p className="text-xs sm:text-sm text-[#525960] leading-relaxed">{pub.story}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#f4f0e8] border-t border-[#e6dece]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8a3243] block mb-1">You May Also Appreciate</span>
              <h3 className="font-serif text-2xl sm:text-3xl text-[#191c1f]">Complementary Estate Cuvées</h3>
            </div>
            <Link href="/wines" className="text-xs font-semibold uppercase tracking-widest text-[#8a3243] hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {relatedPubs.map((rel) => (
              <WineCard key={rel.id} wine={rel as unknown as import('@/types').Wine} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
