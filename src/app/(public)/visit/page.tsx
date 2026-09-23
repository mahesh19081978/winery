import React from 'react';
import NextLink from 'next/link';
import Image from 'next/image';
import SectionHeading from '@/components/common/SectionHeading';
import FAQ from '@/components/common/FAQ';
import type { Metadata } from 'next';
import {
  MapPin,
  Clock,
  Car,
  Phone,
  Mail,
  CheckCircle,
  Accessibility
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Plan Your Visit | VINORA',
  description: 'Hours, directions, valet parking, and hospitality guidelines for visiting VINORA.'
};

const VISIT_FAQS = [
  {
    question: 'Are reservations required to visit the estate?',
    answer: 'We strongly recommend reserving in advance, particularly for seated tasting flights, cellar tours, and weekend dining. Walk-ins for our terrace wine bar are accommodated on a first-come, first-served basis as capacity permits.'
  },
  {
    question: 'What is the dress code?',
    answer: 'Smart casual attire is standard. Because our vineyard walks and subterranean cellar visits involve historical stone steps and 12°C temperatures, we recommend sensible footwear and a light sweater or jacket.'
  },
  {
    question: 'Are children and pets welcome?',
    answer: 'Well-behaved children are welcome across outdoor tasting areas and picnic knolls under parental supervision. Leashed, friendly dogs are permitted in all outdoor vineyard and garden grounds.'
  },
  {
    question: 'How do we reach the estate by public transit or airport?',
    answer: 'VINORA is located 45 minutes by car from the International Airport. Private car service and helicopter transfers to our certified landing pad can be coordinated directly with our estate concierge.'
  }
];

export default function VisitPage() {
  return (
    <div className="w-full pt-20">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 bg-[#1e0c10] text-[#faf8f5] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=2000&q=85"
          alt="Estate entrance and vineyard road"
          fill
          priority
          className="object-cover opacity-25"
        />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-[#c5a059] block mb-3 font-semibold">
            Estate Hospitality
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl font-normal text-[#faf8f5] mb-4">
            Visit VINORA
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#e6dece]/85 leading-relaxed font-light">
            An oasis of calm and artisanal viticulture. Here is everything you need to know to prepare for an unhurried day in the valley.
          </p>
        </div>
      </section>

      {/* Main Grid: Location, Hours, Etiquette */}
      <section className="py-16 sm:py-24 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left 7 Columns */}
            <div className="lg:col-span-7 space-y-10">
              <div>
                <SectionHeading
                  subtitle="Hours & Access"
                  title="Estate Hours & Directions"
                  description="Located in the heart of the southern valley, surrounded by ancient terraced hills."
                  centered={false}
                />
              </div>

              {/* Hours Card */}
              <div className="p-8 bg-white border border-[#e6dece] rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f4f0e8] text-[#8a3243] flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl text-[#191c1f]">Hours of Operation</h3>
                    <span className="text-xs text-[#525960]">Tasting Salon & Vineyard Grounds</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2 text-sm text-[#525960] divide-y divide-[#e6dece]">
                  <div className="flex justify-between pt-2">
                    <span className="font-medium text-[#191c1f]">Wednesday – Friday</span>
                    <span>10:00 AM – 7:00 PM</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="font-medium text-[#191c1f]">Saturday & Sunday</span>
                    <span>10:00 AM – 8:00 PM</span>
                  </div>
                  <div className="flex justify-between pt-2 text-[#8a3243]">
                    <span className="font-medium">Monday & Tuesday</span>
                    <span>Private Allocations & Cellar Maintenance</span>
                  </div>
                </div>
              </div>

              {/* Parking & Transport */}
              <div className="p-8 bg-white border border-[#e6dece] rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f4f0e8] text-[#8a3243] flex items-center justify-center">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl text-[#191c1f]">Parking & Transit</h3>
                    <span className="text-xs text-[#525960]">Complimentary guest parking on premises</span>
                  </div>
                </div>
                <ul className="space-y-2.5 text-xs sm:text-sm text-[#525960]">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-[#8a3243] mt-0.5 shrink-0" />
                    <span>Private shaded parking directly adjacent to the reception lodge.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-[#8a3243] mt-0.5 shrink-0" />
                    <span>6 high-speed Level 2 EV charging stations complimentary for guests.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-[#8a3243] mt-0.5 shrink-0" />
                    <span>Designated private driver lounge with refreshments.</span>
                  </li>
                </ul>
              </div>

              {/* Accessibility & Etiquette */}
              <div className="p-8 bg-white border border-[#e6dece] rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f4f0e8] text-[#8a3243] flex items-center justify-center">
                    <Accessibility className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl text-[#191c1f]">Accessibility & Etiquette</h3>
                    <span className="text-xs text-[#525960]">Comfortable, inclusive hospitality</span>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-[#525960] space-y-3 leading-relaxed">
                  <p>
                    The main tasting salon, garden terraces, and restaurant are fully step-free and wheelchair accessible. The subterranean 18th-century cellar features historic stone stairs, but a dedicated flat-access observation alcove is available upon request.
                  </p>
                  <p>
                    To honor delicate aromatic nuances of our wines, we gently request guests refrain from wearing heavy perfumes, colognes, or smoking on the premises.
                  </p>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Map Representation & Contact */}
            <div className="lg:col-span-5 space-y-8 sticky top-24">
              {/* Interactive map representation */}
              <div className="relative h-80 rounded-3xl overflow-hidden border border-[#e6dece] shadow-lg bg-[#e6dece]">
                <Image
                  src="https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&q=85"
                  alt="Vineyard overhead terrain"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[#1e0c10]/40 flex items-center justify-center p-6 text-center text-white">
                  <div className="bg-[#faf8f5] text-[#191c1f] p-6 rounded-2xl border border-[#c5a059] max-w-xs shadow-2xl">
                    <MapPin className="w-8 h-8 text-[#8a3243] mx-auto mb-2" />
                    <h4 className="font-serif text-base font-bold">VINORA</h4>
                    <p className="text-xs text-[#525960] my-1">
                      4800 Terrasses du Rêve, Coteaux de l&apos;Est
                    </p>
                    <a
                      href="https://maps.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block px-4 py-1.5 rounded-full bg-[#2d1117] text-[#faf8f5] text-[11px] font-semibold uppercase tracking-wider hover:bg-[#461822]"
                    >
                      Open in Maps
                    </a>
                  </div>
                </div>
              </div>

              {/* Contact Box */}
              <div className="p-8 bg-white border border-[#e6dece] rounded-3xl shadow-sm space-y-4">
                <h4 className="font-serif text-xl text-[#191c1f]">Estate Concierge Desk</h4>
                <div className="space-y-3 text-xs text-[#525960]">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#8a3243]" />
                    <span>Tasting Inquiries: +1 (555) 392-8733</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#8a3243]" />
                    <span>Email: concierge@domaine-elysee.com</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#8a3243] mt-0.5 shrink-0" />
                    <span>4800 Terrasses du Rêve, Coteaux de l&apos;Est, Valley Region</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#e6dece]">
                  <NextLink
                    href="/book"
                    className="w-full block py-3.5 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] text-xs font-bold uppercase tracking-[0.2em] text-center transition-colors shadow-md"
                  >
                    Book an Experience
                  </NextLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visitor FAQs */}
      <section className="py-20 bg-[#f4f0e8] border-t border-[#e6dece]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <FAQ items={VISIT_FAQS} title="Visitor Questions & Guidelines" />
        </div>
      </section>
    </div>
  );
}
