import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Leaf, Mountain, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Our Heritage & Terroir | Domaine Élysée',
  description: 'Four centuries of viticultural devotion in the Rutherford bench, dedicated to organic and biodynamic winemaking.'
};

export default function OurStoryPage() {
  return (
    <div className="w-full pt-20">
      {/* Editorial Hero */}
      <section className="relative py-24 sm:py-36 bg-[#1e0c10] text-[#faf8f5] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=2000&q=85"
          alt="Ancient terraced vineyards"
          fill
          priority
          className="object-cover opacity-35"
        />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-[#c5a059] block mb-3 font-semibold">
            Chronicles of Terroir
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-normal text-[#faf8f5] mb-6 leading-tight">
            Four Centuries of Viticultural Devotion
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#e6dece]/90 leading-relaxed font-light">
            Founded in 1784 by Henri de Rêve, Domaine Élysée remains an unbroken testament to patience, biodiversity, and the profound eloquence of living soil.
          </p>
        </div>
      </section>

      {/* Chapter 1: The Terroir & Geology */}
      <section className="py-20 sm:py-32 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8a3243] block">
                Chapter I · Terroir & Geology
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#191c1f] leading-tight">
                The ancient chalk amphitheatre of Val de Rêve.
              </h2>
              <p className="text-base text-[#525960] leading-relaxed">
                Forty million years ago, the valley was a warm subterranean seabed. As tectonic shifts elevated the limestone terraces, fossilized shells and marine sediment formed the bedrock of our current estate parcel matrix.
              </p>
              <p className="text-base text-[#525960] leading-relaxed">
                This white chalk reflects gentle heat back into the canopy by night while acting as a natural sponge, holding vital water deep beneath the summer sun. The result is wines that possess an unmistakable tensile minerality and effortless vitality.
              </p>
            </div>

            <div className="lg:col-span-6 relative">
              <div className="relative h-[480px] rounded-3xl overflow-hidden shadow-2xl border border-[#e6dece]">
                <Image
                  src="https://images.unsplash.com/photo-1528823872057-9c018a7a7553?auto=format&fit=crop&w=1200&q=85"
                  alt="Ancient vine roots in limestone"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chapter 2: Biodynamic Winemaking Philosophy */}
      <section className="py-20 sm:py-32 bg-[#f4f0e8] border-y border-[#e6dece]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1 relative">
              <div className="relative h-[480px] rounded-3xl overflow-hidden shadow-2xl border border-[#e6dece]">
                <Image
                  src="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=85"
                  alt="Winemaker inspecting barrels"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8a3243] block">
                Chapter II · The Winemaking Philosophy
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#191c1f] leading-tight">
                Listening rather than imposing.
              </h2>
              <p className="text-base text-[#525960] leading-relaxed">
                In the cellar, human intervention is guided by humility. All fruit is picked exclusively by hand at dawn. We employ no artificial yeasts, no chemical additives, and zero fining agents.
              </p>
              <p className="text-base text-[#525960] leading-relaxed">
                Fermentation unfolds spontaneously in unlined oak vats, followed by lengthy aging sur lie in French barriques sourced from sustainable cooperages in the forests of Allier and Tronçais. Time is our greatest ally.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-4 text-xs font-semibold text-[#191c1f]">
                <div className="p-4 bg-white rounded-2xl border border-[#e6dece]">
                  <Leaf className="w-5 h-5 text-[#8a3243] mb-2" />
                  <span>100% Certified Biodynamic</span>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-[#e6dece]">
                  <Mountain className="w-5 h-5 text-[#8a3243] mb-2" />
                  <span>Subterranean Gravity Cellar</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chapter 3: The Family & Generations */}
      <section className="py-20 sm:py-32 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8a3243] block mb-2">
              The Custodians
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl text-[#191c1f]">
              Generations of Stewardship
            </h2>
            <p className="text-sm sm:text-base text-[#525960] mt-4 leading-relaxed">
              Meet the artisans who dedicate their lives to crafting the estate’s liquid heritage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border border-[#e6dece] rounded-3xl p-6 text-center space-y-4 shadow-sm">
              <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-[#c5a059]">
                <Image
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80"
                  alt="Julien de Rêve"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="font-serif text-xl text-[#191c1f] font-medium">Julien de Rêve</h3>
                <span className="text-xs text-[#8a3243] uppercase tracking-wider font-semibold">
                  Head Vigneron & Cellar Master
                </span>
              </div>
              <p className="text-xs text-[#525960] leading-relaxed">
                4th-generation winemaker trained in Bordeaux and Burgundy, returning in 2012 to transition all 42 hectares of estate vineyards to strict biodynamics.
              </p>
            </div>

            <div className="bg-white border border-[#e6dece] rounded-3xl p-6 text-center space-y-4 shadow-sm">
              <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-[#c5a059]">
                <Image
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80"
                  alt="Élisabeth de Rêve"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="font-serif text-xl text-[#191c1f] font-medium">Élisabeth de Rêve</h3>
                <span className="text-xs text-[#8a3243] uppercase tracking-wider font-semibold">
                  Estate Director & Botanist
                </span>
              </div>
              <p className="text-xs text-[#525960] leading-relaxed">
                Oversees estate biodiversity, heirloom polyculture orchards, and guest hospitality, preserving the historical stone grounds for future generations.
              </p>
            </div>

            <div className="bg-white border border-[#e6dece] rounded-3xl p-6 text-center space-y-4 shadow-sm">
              <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-[#c5a059]">
                <Image
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80"
                  alt="Laurent Mercier"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="font-serif text-xl text-[#191c1f] font-medium">Laurent Mercier</h3>
                <span className="text-xs text-[#8a3243] uppercase tracking-wider font-semibold">
                  Master Sommelier & Culinary Director
                </span>
              </div>
              <p className="text-xs text-[#525960] leading-relaxed">
                Curates our museum vintage library, private barrel masterclasses, and pairings with Michelin-level regional gastronomic partners.
              </p>
            </div>
          </div>

          <div className="mt-16 text-center">
            <Link
              href="/experiences"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] text-xs font-bold uppercase tracking-widest transition-all shadow-lg"
            >
              <span>Taste Our Heritage in Person</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
