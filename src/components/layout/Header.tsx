'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, User, LogOut } from 'lucide-react';
import MobileMenu from './MobileMenu';
import logoMark from '../../../public/logo-mark.png';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [guest, setGuest] = useState<{ name: string; email: string } | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/guest/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.success && data.data) {
          setGuest({ name: data.data.name, email: data.data.email });
        } else if (!cancelled) {
          setGuest(null);
        }
      })
      .catch(() => {
        if (!cancelled) setGuest(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/guest/logout', { method: 'POST' });
    setGuest(null);
    router.push('/');
    router.refresh();
  };

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
  const onLightSurface = isScrolled || !isHome;

  const navLinkClass = (isActive: boolean) =>
    `whitespace-nowrap shrink-0 text-xs font-semibold uppercase tracking-wider transition-colors hover:text-[#c5a059] ${
      isActive
        ? onLightSurface
          ? 'text-[#8a3243] font-bold'
          : 'text-[#c5a059] font-bold'
        : onLightSurface
        ? 'text-[#191c1f]'
        : 'text-[#faf8f5]/90'
    }`;

  const accountLinkClass = `flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap shrink-0 transition-colors ${
    onLightSurface ? 'text-[#461822] hover:bg-[#f4f0e8]' : 'text-[#faf8f5] hover:bg-white/10'
  }`;

  const mainNav = [
    { href: '/wines', label: 'Wines', active: pathname.startsWith('/wines') },
    { href: '/experiences', label: 'Experiences', active: pathname.startsWith('/experiences') },
    { href: '/events', label: 'Events', active: pathname.startsWith('/events') },
    { href: '/our-story', label: 'Our Story', active: pathname === '/our-story' },
    { href: '/gallery', label: 'Gallery', active: pathname === '/gallery' },
    { href: '/visit', label: 'Visit Us', active: pathname === '/visit' },
  ];

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 xl:gap-5">
          {/* Logo Brand */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 group"
            aria-label="VINORA — Winery & Wine Experience Platform by CIS"
          >
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white ring-1 ring-black/10 shadow-sm overflow-hidden shrink-0">
              <Image
                src={logoMark}
                alt="VINORA"
                width={40}
                height={40}
                priority
                unoptimized
                className="w-9 h-9 object-contain"
              />
            </span>
            <span
              className={`font-serif text-xl sm:text-2xl font-bold tracking-[0.15em] whitespace-nowrap transition-colors ${
                onLightSurface ? 'text-[#2d1117]' : 'text-[#faf8f5]'
              }`}
            >
              VINORA
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden xl:flex flex-1 min-w-0 items-center justify-center gap-3"
            aria-label="Primary"
          >
            {mainNav.map((item) => (
              <Link key={item.href} href={item.href} className={navLinkClass(item.active)}>
                {item.label}
              </Link>
            ))}

            <span
              aria-hidden="true"
              className={`h-4 w-px shrink-0 ${onLightSurface ? 'bg-[#191c1f]/20' : 'bg-white/25'}`}
            />

            {guest ? (
              <>
                <Link href="/app" className={accountLinkClass} title={guest.email}>
                  <User className="w-4 h-4" />
                  <span>Account</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className={accountLinkClass}
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`px-2.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap shrink-0 transition-colors ${
                    onLightSurface
                      ? 'text-[#461822] hover:bg-[#f4f0e8]'
                      : 'text-[#faf8f5] hover:bg-white/10'
                  }`}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className={`px-2.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap shrink-0 transition-colors border ${
                    onLightSurface
                      ? 'border-[#e6dece] text-[#461822] hover:bg-[#f4f0e8]'
                      : 'border-white/30 text-[#faf8f5] hover:bg-white/10'
                  }`}
                >
                  Register
                </Link>
                <Link href="/app" className={accountLinkClass} title="My Wine Journey Account">
                  <User className="w-4 h-4" />
                  <span>Account</span>
                </Link>
              </>
            )}
          </nav>

          {/* Primary CTA */}
          <Link
            href="/book"
            className="hidden xl:inline-flex items-center justify-center px-4 2xl:px-5 py-2 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider whitespace-nowrap shrink-0 transition-all shadow-sm hover:shadow"
          >
            Book an Experience
          </Link>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center gap-2 xl:hidden">
            <Link
              href="/book"
              className="px-3.5 py-1.5 rounded-full bg-[#2d1117] text-[#faf8f5] text-[11px] font-semibold uppercase tracking-wider"
            >
              Book
            </Link>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`p-2 rounded-lg transition-colors focus:outline-none ${
                onLightSurface ? 'text-[#2d1117]' : 'text-[#faf8f5]'
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
