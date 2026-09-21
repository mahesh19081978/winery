'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, User } from 'lucide-react';
import MobileMenu from './MobileMenu';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHome = pathname === '/';

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#faf8f5]/95 backdrop-blur-md shadow-sm py-3 border-b border-[#e6dece]'
            : isHome
            ? 'bg-gradient-to-b from-[#1e0c10]/80 via-[#1e0c10]/30 to-transparent py-5 text-white'
            : 'bg-[#faf8f5] py-4 border-b border-[#e6dece]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo Brand */}
          <Link href="/" className="flex flex-col group">
            <span
              className={`font-serif text-xl sm:text-2xl font-bold tracking-[0.15em] transition-colors ${
                isScrolled || !isHome ? 'text-[#2d1117]' : 'text-[#faf8f5]'
              }`}
            >
              DOMAINE ÉLYSÉE
            </span>
            <span
              className={`text-[9px] sm:text-[10px] uppercase tracking-[0.3em] -mt-1 font-medium transition-colors ${
                isScrolled || !isHome ? 'text-[#8a3243]' : 'text-[#c5a059]'
              }`}
            >
              Val de Rêve Estate
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link
              href="/wines"
              className={`text-xs font-semibold uppercase tracking-widest transition-colors hover:text-[#c5a059] ${
                isScrolled || !isHome
                  ? pathname.startsWith('/wines')
                    ? 'text-[#8a3243] font-bold'
                    : 'text-[#191c1f]'
                  : pathname.startsWith('/wines')
                  ? 'text-[#c5a059] font-bold'
                  : 'text-[#faf8f5]/90'
              }`}
            >
              Wines
            </Link>

            <Link
              href="/experiences"
              className={`text-xs font-semibold uppercase tracking-widest transition-colors hover:text-[#c5a059] ${
                isScrolled || !isHome
                  ? pathname.startsWith('/experiences')
                    ? 'text-[#8a3243] font-bold'
                    : 'text-[#191c1f]'
                  : pathname.startsWith('/experiences')
                  ? 'text-[#c5a059] font-bold'
                  : 'text-[#faf8f5]/90'
              }`}
            >
              Experiences
            </Link>

            <Link
              href="/events"
              className={`text-xs font-semibold uppercase tracking-widest transition-colors hover:text-[#c5a059] ${
                isScrolled || !isHome
                  ? pathname.startsWith('/events')
                    ? 'text-[#8a3243] font-bold'
                    : 'text-[#191c1f]'
                  : pathname.startsWith('/events')
                  ? 'text-[#c5a059] font-bold'
                  : 'text-[#faf8f5]/90'
              }`}
            >
              Events
            </Link>

            <Link
              href="/our-story"
              className={`text-xs font-semibold uppercase tracking-widest transition-colors hover:text-[#c5a059] ${
                pathname === '/our-story'
                  ? 'text-[#8a3243] font-bold'
                  : isScrolled || !isHome
                  ? 'text-[#191c1f]'
                  : 'text-[#faf8f5]/90'
              }`}
            >
              Our Story
            </Link>

            <Link
              href="/gallery"
              className={`text-xs font-semibold uppercase tracking-widest transition-colors hover:text-[#c5a059] ${
                pathname === '/gallery'
                  ? 'text-[#8a3243] font-bold'
                  : isScrolled || !isHome
                  ? 'text-[#191c1f]'
                  : 'text-[#faf8f5]/90'
              }`}
            >
              Gallery
            </Link>

            <Link
              href="/visit"
              className={`text-xs font-semibold uppercase tracking-widest transition-colors hover:text-[#c5a059] ${
                pathname === '/visit'
                  ? 'text-[#8a3243] font-bold'
                  : isScrolled || !isHome
                  ? 'text-[#191c1f]'
                  : 'text-[#faf8f5]/90'
              }`}
            >
              Visit Us
            </Link>
          </nav>

          {/* Right Action CTAs */}
          <div className="hidden lg:flex items-center space-x-4">
            <Link
              href="/app"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
                isScrolled || !isHome
                  ? 'text-[#461822] hover:bg-[#f4f0e8]'
                  : 'text-[#faf8f5] hover:bg-white/10'
              }`}
              title="My Wine Journey Account"
            >
              <User className="w-4 h-4" />
              <span>Account</span>
            </Link>

            <Link
              href="/book"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] text-xs font-semibold uppercase tracking-widest transition-all shadow-sm hover:shadow"
            >
              Book an Experience
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link
              href="/book"
              className="px-3.5 py-1.5 rounded-full bg-[#2d1117] text-[#faf8f5] text-[11px] font-semibold uppercase tracking-wider"
            >
              Book
            </Link>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`p-2 rounded-lg transition-colors focus:outline-none ${
                isScrolled || !isHome ? 'text-[#2d1117]' : 'text-[#faf8f5]'
              }`}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
}
