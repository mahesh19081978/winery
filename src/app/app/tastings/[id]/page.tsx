'use client';

import { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useGuest } from '@/context/GuestContext';
import { mockWines } from '@/data/wines';
import { 
  ArrowLeft, 
  Star, 
  Calendar, 
  MapPin, 
  ChevronRight,
  Share2
} from 'lucide-react';
import WineRadarProfile from '@/components/wine/WineRadarProfile';

export default function TastingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { tastings } = useGuest();

  const record = tastings.find((r) => r.id === id);

  if (!record) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-stone-200 p-8">
        <h2 className="font-serif text-2xl text-stone-900 mb-2">Tasting Record Not Found</h2>
        <p className="text-stone-500 text-sm mb-6">We could not locate this tasting impression.</p>
        <Link
          href="/app/tastings"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#8a3243] text-white text-sm font-medium hover:bg-[#732937] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Journal
        </Link>
      </div>
    );
  }

  const wine = mockWines.find((w) => w.id === record.wineId);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          href="/app/tastings"
          className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-stone-500 hover:text-[#8a3243] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Tasting Journal
        </Link>
      </div>

      {/* Wine Header Card */}
      <div className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-sm flex flex-col md:flex-row items-center gap-8">
        <div className="w-32 h-44 relative bg-[#faf8f5] rounded-2xl overflow-hidden shrink-0 border border-stone-100">
          <Image
            src={wine?.image || 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=400&auto=format&fit=crop'}
            alt={wine?.name || record.wineName}
            fill
            className="object-cover"
          />
        </div>

        <div className="space-y-3 flex-1 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="text-xs uppercase tracking-widest text-[#8a3243] font-semibold">
              {wine?.vineyardParcel || 'Val de Rêve Estate'}
            </span>
            <span className="text-stone-300">·</span>
            <span className="text-xs text-stone-500 font-mono">Vintage {record.vintage}</span>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl text-stone-900 font-normal">
            {wine?.name || record.wineName}
          </h1>

          <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-stone-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-stone-400" />
              <span>Tasted {record.dateTasted}</span>
            </div>
            <span>·</span>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-stone-400" />
              <span>{record.experienceName}</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-center md:justify-start gap-3">
            <div className="flex items-center gap-1.5 bg-[#faf8f5] px-4 py-1.5 rounded-full border border-stone-200">
              <Star className="w-4 h-4 text-[#c5a059] fill-current" />
              <span className="font-serif font-semibold text-stone-900">{record.rating} / 5</span>
            </div>
            {wine && (
              <Link
                href={`/wines/${wine.slug}`}
                className="text-xs uppercase tracking-wider text-[#8a3243] font-semibold hover:underline inline-flex items-center gap-1"
              >
                View Full Estate Profile <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Sensory Radar & Impressions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Sensory Radar Graphic */}
        <div className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-sm flex flex-col items-center justify-center text-center">
          <h2 className="font-serif text-xl text-stone-900 mb-1">Palate Architecture</h2>
          <p className="text-xs text-stone-500 mb-6">Sensory radar mapped from estate cellar tasting analysis</p>
          
          <WineRadarProfile
            body={record.sensoryProfile.body}
            acidity={record.sensoryProfile.acidity}
            sweetness={record.sensoryProfile.sweetness}
            tannin={record.sensoryProfile.tannin}
            size={240}
          />

          <div className="grid grid-cols-4 gap-4 w-full mt-6 pt-6 border-t border-stone-100 text-center">
            <div>
              <div className="text-xs text-stone-400 uppercase">Body</div>
              <div className="font-serif text-lg text-stone-800 font-semibold">{record.sensoryProfile.body}/10</div>
            </div>
            <div>
              <div className="text-xs text-stone-400 uppercase">Acidity</div>
              <div className="font-serif text-lg text-stone-800 font-semibold">{record.sensoryProfile.acidity}/10</div>
            </div>
            <div>
              <div className="text-xs text-stone-400 uppercase">Sweet</div>
              <div className="font-serif text-lg text-stone-800 font-semibold">{record.sensoryProfile.sweetness}/10</div>
            </div>
            <div>
              <div className="text-xs text-stone-400 uppercase">Tannin</div>
              <div className="font-serif text-lg text-stone-800 font-semibold">{record.sensoryProfile.tannin}/10</div>
            </div>
          </div>
        </div>

        {/* Guest Notes & Sommelier Observations */}
        <div className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl text-stone-900 mb-3">Your Tasting Impressions</h2>
              <div className="p-4 rounded-2xl bg-[#faf8f5] border border-stone-200/80">
                <p className="font-serif italic text-stone-800 text-base leading-relaxed">
                  &ldquo;{record.notes}&rdquo;
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-2">Identified Aromas & Palate Notes</h3>
              <div className="flex flex-wrap gap-2">
                {record.tasteCharacteristics.map((fl: string, i: number) => (
                  <span key={i} className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 text-xs font-medium">
                    {fl}
                  </span>
                ))}
              </div>
            </div>

            {wine && (
              <div>
                <h3 className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-2">Culinary Pairings Recommended</h3>
                <ul className="text-xs text-stone-600 space-y-1 list-disc list-inside">
                  {wine.foodPairings.map((pair: string, i: number) => (
                    <li key={i}>{pair}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
            <span>Entry ID: #{record.id}</span>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `${wine?.name || record.wineName} Tasting Notes`,
                    text: record.notes,
                    url: window.location.href,
                  }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Tasting note link copied.');
                }
              }}
              className="text-[#8a3243] hover:underline inline-flex items-center gap-1 font-semibold"
            >
              <Share2 className="w-3.5 h-3.5" /> Share Tasting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
