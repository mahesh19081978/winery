'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useGuest } from '@/context/GuestContext';
import { mockWines } from '@/data/wines';
import { 
  Sparkles, 
  Wine, 
  Star, 
  Calendar, 
  Compass, 
  Award,
  ChevronRight
} from 'lucide-react';

export default function WineJourneyPage() {
  const { tastings } = useGuest();

  // Sort tasting records newest first
  const sortedRecords = [...tastings].sort(
    (a, b) => new Date(b.dateTasted).getTime() - new Date(a.dateTasted).getTime()
  );

  return (
    <div className="space-y-12">
      {/* Journey Banner */}
      <div className="rounded-3xl bg-[#faf8f5] border border-stone-200/80 p-8 md:p-12 relative overflow-hidden">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/15 border border-[#c5a059]/30 text-xs font-semibold uppercase tracking-wider text-[#8a3243] mb-4">
            <Compass className="w-3.5 h-3.5 text-[#c5a059]" />
            Sommelier Odyssey
          </div>
          <h1 className="font-serif text-3xl md:text-5xl text-stone-900 font-light mb-4">
            My Wine Journey
          </h1>
          <p className="text-stone-600 font-light text-base md:text-lg leading-relaxed">
            Every vintage tells a story of weather, soil, and craft. Follow the chronological chronicle of your palate discoveries, sensory milestones, and vineyard masterclasses.
          </p>
        </div>

        {/* Milestone Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-stone-200">
          <div className="p-4 rounded-2xl bg-white border border-stone-200/80">
            <Award className="w-6 h-6 text-[#c5a059] mb-2" />
            <div className="text-lg font-serif text-stone-900 font-semibold">Stage IV Explorer</div>
            <div className="text-xs text-stone-500 mt-0.5">Level of Palate Mastery</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-stone-200/80">
            <Wine className="w-6 h-6 text-[#8a3243] mb-2" />
            <div className="text-lg font-serif text-stone-900 font-semibold">{tastings.length} Vintages</div>
            <div className="text-xs text-stone-500 mt-0.5">Officially Logged</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-stone-200/80">
            <Sparkles className="w-6 h-6 text-[#c5a059] mb-2" />
            <div className="text-lg font-serif text-stone-900 font-semibold">Rutherford & Napa</div>
            <div className="text-xs text-stone-500 mt-0.5">Primary Appellations</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-stone-200/80">
            <Star className="w-6 h-6 text-[#8a3243] mb-2" />
            <div className="text-lg font-serif text-stone-900 font-semibold">4.8 Avg Rating</div>
            <div className="text-xs text-stone-500 mt-0.5">Evaluated Palate Score</div>
          </div>
        </div>
      </div>

      {/* Chronological Tasting Timeline */}
      <section className="space-y-8">
        <div>
          <h2 className="font-serif text-2xl md:text-3xl text-stone-900 font-normal">Chronological Timeline</h2>
          <p className="text-stone-500 text-sm mt-1">A step-by-step archive of every bottle tasted and reviewed</p>
        </div>

        <div className="relative border-l-2 border-stone-200 ml-4 md:ml-6 pl-6 md:pl-10 space-y-12">
          {sortedRecords.map((record) => {
            const wine = mockWines.find(w => w.id === record.wineId);

            return (
              <div key={record.id} className="relative group">
                {/* Timeline node icon */}
                <div className="absolute -left-[35px] md:-left-[51px] top-1.5 w-6 h-6 rounded-full bg-[#8a3243] text-white flex items-center justify-center text-xs font-semibold ring-4 ring-[#faf8f5]">
                  <Wine className="w-3 h-3" />
                </div>

                {/* Timeline Card */}
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm hover:border-[#c5a059]/50 transition">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-20 relative bg-[#faf8f5] rounded-xl overflow-hidden shrink-0 border border-stone-100">
                        <Image
                          src={wine?.image || 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=400&auto=format&fit=crop'}
                          alt={wine?.name || record.wineName}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-stone-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{record.dateTasted}</span>
                          <span>·</span>
                          <span className="text-[#8a3243] font-medium">{record.experienceName}</span>
                        </div>
                        <h3 className="font-serif text-xl md:text-2xl text-stone-900 font-normal">
                          {wine?.name || record.wineName}
                        </h3>
                        <p className="text-xs text-stone-500">
                          Vintage {record.vintage} · {wine?.category || 'Estate Selection'}
                        </p>
                      </div>
                    </div>

                    {/* Rating & Action */}
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-1.5 bg-[#faf8f5] px-4 py-2 rounded-2xl border border-stone-200">
                        <Star className="w-4 h-4 text-[#c5a059] fill-current" />
                        <span className="font-serif text-lg font-semibold text-stone-900">{record.rating}</span>
                        <span className="text-xs text-stone-400">/ 5</span>
                      </div>
                      <Link
                        href={`/app/tastings/${record.id}`}
                        className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-xs font-medium uppercase tracking-wider hover:border-[#8a3243] hover:text-[#8a3243] transition inline-flex items-center gap-1"
                      >
                        Sensory Details <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Sommelier Tasting Notes & Flavors */}
                  <div className="mt-6 pt-6 border-t border-stone-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <h4 className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-2">My Sensory Notes</h4>
                      <p className="text-stone-700 text-sm italic font-serif leading-relaxed">
                        &ldquo;{record.notes}&rdquo;
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-2">Identified Aromas</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {record.tasteCharacteristics.map((fl: string, i: number) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 font-medium">
                            {fl}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
