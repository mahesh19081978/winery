'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Wine, Calendar, Compass, BookOpen, MapPin, User, Sparkles, LogOut, LogIn } from 'lucide-react';
import { useConcierge } from '@/context/ConciergeContext';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { openConcierge } = useConcierge();
  const router = useRouter();
  const [guest, setGuest] = useState<{ name: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/auth/guest/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success && data.data) setGuest({ name: data.data.name });
        else setGuest(null);
      })
      .catch(() => setGuest(null));
  }, [isOpen]);

  const handleLogout = async () => {
    await fetch('/api/auth/guest/logout', { method: 'POST' });
    setGuest(null);
    onClose();
    router.push('/');
    router.refresh();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1e0c10]/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-[#faf8f5] shadow-2xl flex flex-col justify-between p-6 z-10 overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-[#e6dece]">
            <div>
              <span className="font-serif text-xl font-bold tracking-wider text-[#2d1117] block">
                DOMAINE ÉLYSÉE
              </span>
              <span className="text-[10px] tracking-[0.25em] text-[#8a3243] uppercase">
                Val de Rêve Estate
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[#461822] hover:text-[#1e0c10] focus:outline-none"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-8 space-y-4">
            <Link
              href="/wines"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#191c1f] hover:bg-[#f4f0e8] hover:text-[#461822] font-medium text-base transition-colors"
            >
              <Wine className="w-5 h-5 text-[#8a3243]" />
              <span>Wines Collection</span>
            </Link>

            <Link
              href="/experiences"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#191c1f] hover:bg-[#f4f0e8] hover:text-[#461822] font-medium text-base transition-colors"
            >
              <Compass className="w-5 h-5 text-[#8a3243]" />
              <span>Experiences & Tastings</span>
            </Link>

            <Link
              href="/events"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#191c1f] hover:bg-[#f4f0e8] hover:text-[#461822] font-medium text-base transition-colors"
            >
              <Calendar className="w-5 h-5 text-[#8a3243]" />
              <span>Events & Calendar</span>
            </Link>

            <Link
              href="/our-story"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#191c1f] hover:bg-[#f4f0e8] hover:text-[#461822] font-medium text-base transition-colors"
            >
              <BookOpen className="w-5 h-5 text-[#8a3243]" />
              <span>Our Story & Terroir</span>
            </Link>

            <Link
              href="/gallery"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#191c1f] hover:bg-[#f4f0e8] hover:text-[#461822] font-medium text-base transition-colors"
            >
              <Sparkles className="w-5 h-5 text-[#8a3243]" />
              <span>Visual Gallery</span>
            </Link>

            <Link
              href="/visit"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#191c1f] hover:bg-[#f4f0e8] hover:text-[#461822] font-medium text-base transition-colors"
            >
              <MapPin className="w-5 h-5 text-[#8a3243]" />
              <span>Visit Us</span>
            </Link>

            <Link
              href="/reviews"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#191c1f] hover:bg-[#f4f0e8] hover:text-[#461822] font-medium text-base transition-colors"
            >
              <Sparkles className="w-5 h-5 text-[#8a3243]" />
              <span>Guest Reviews</span>
            </Link>

            <div className="pt-3 border-t border-[#e6dece]">
              <Link
                href="/app"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#191c1f] bg-[#f4f0e8] hover:bg-[#e6dece] font-medium text-base transition-colors"
              >
                <User className="w-5 h-5 text-[#461822]" />
                <span>My Wine Journey (Account)</span>
              </Link>
            </div>
          </nav>
        </div>

        {/* Bottom CTAs */}
        <div className="pt-6 border-t border-[#e6dece] space-y-3">
          <Link
            href="/book"
            onClick={onClose}
            className="w-full block text-center py-3 px-4 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] font-semibold text-xs uppercase tracking-widest transition-colors shadow-md"
          >
            Book an Experience
          </Link>
          <button
            type="button"
            onClick={() => {
              onClose();
              openConcierge();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full border border-[#c5a059] text-[#2d1117] hover:bg-[#f4f0e8] font-medium text-xs uppercase tracking-wider transition-colors"
          >
            <Wine className="w-4 h-4 text-[#c5a059]" />
            <span>Ask Wine Concierge</span>
          </button>
        </div>
      </div>
    </div>
  );
}
