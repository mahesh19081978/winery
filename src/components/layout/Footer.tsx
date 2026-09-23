import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Phone, Mail, Clock, ShieldCheck, Award } from 'lucide-react';
import logoFull from '../../../public/logo.png';

export default function Footer() {
  return (
    <footer className="bg-[#1e0c10] text-[#faf8f5] pt-16 pb-12 border-t border-[#461822]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Upper Brand Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
          {/* Col 1 & 2: Estate Story */}
          <div className="lg:col-span-2 space-y-4">
            <div className="inline-flex items-center justify-center rounded-2xl bg-[#faf8f5] p-3 shadow-sm">
              <Image
                src={logoFull}
                alt="VINORA — Winery & Wine Experience Platform by CIS"
                width={144}
                height={144}
                priority
                unoptimized
                className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
              />
            </div>
            <p className="text-sm text-[#e6dece]/80 leading-relaxed max-w-sm">
              Nestled along the sun-drenched terraced slopes of the southern valley, VINORA produces world-class organic estate wines honoring four generations of biodynamic stewardship and artisanal winemaking.
            </p>
            <div className="pt-2 flex items-center gap-4 text-xs text-[#c5a059]">
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                Grand Terroir Certified
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                100% Biodynamic Estate
              </span>
            </div>
          </div>

          {/* Col 3: Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c5a059]">
              Explore
            </h4>
            <ul className="space-y-2 text-sm text-[#e6dece]/80">
              <li>
                <Link href="/wines" className="hover:text-[#faf8f5] transition-colors">
                  Estate Wines
                </Link>
              </li>
              <li>
                <Link href="/experiences" className="hover:text-[#faf8f5] transition-colors">
                  Tasting Experiences
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-[#faf8f5] transition-colors">
                  Estate Events
                </Link>
              </li>
              <li>
                <Link href="/our-story" className="hover:text-[#faf8f5] transition-colors">
                  Our Terroir & Story
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="hover:text-[#faf8f5] transition-colors">
                  Visual Gallery
                </Link>
              </li>
              <li>
                <Link href="/reviews" className="hover:text-[#faf8f5] transition-colors">
                  Guest Testimonials
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Guest Journey */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c5a059]">
              Guest Experience
            </h4>
            <ul className="space-y-2 text-sm text-[#e6dece]/80">
              <li>
                <Link href="/book" className="hover:text-[#faf8f5] transition-colors">
                  Reserve a Tasting
                </Link>
              </li>
              <li>
                <Link href="/app" className="hover:text-[#faf8f5] transition-colors">
                  My Wine Journey
                </Link>
              </li>
              <li>
                <Link href="/app/bookings" className="hover:text-[#faf8f5] transition-colors">
                  My Reservations
                </Link>
              </li>
              <li>
                <Link href="/app/journey" className="hover:text-[#faf8f5] transition-colors">
                  Tasting Journal
                </Link>
              </li>
              <li>
                <Link href="/visit" className="hover:text-[#faf8f5] transition-colors">
                  Visitor Guidelines
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Visit & Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c5a059]">
              Visit Us
            </h4>
            <div className="space-y-2.5 text-xs text-[#e6dece]/80">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#c5a059] shrink-0 mt-0.5" />
                <span>4800 Terrasses du Rêve, Coteaux de l&apos;Est, Valley Region</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#c5a059] shrink-0" />
                <span>+1 (555) 392-8733</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#c5a059] shrink-0" />
                <span>concierge@domaine-elysee.com</span>
              </div>
              <div className="flex items-start gap-2 pt-1">
                <Clock className="w-4 h-4 text-[#c5a059] shrink-0 mt-0.5" />
                <div>
                  <p>Wednesday – Sunday</p>
                  <p className="text-white/60">10:00 AM – 7:00 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lower Copyright & Legal */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#e6dece]/60 gap-4">
          <p>© {new Date().getFullYear()} VINORA — Winery & Wine Experience Platform by CIS. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <span>Please savor responsibly. Minimum legal age required for alcohol consumption.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
