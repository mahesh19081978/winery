'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useGuest } from '@/context/GuestContext';
import {
  Compass,
  Calendar,
  BookOpen,
  Wine,
  Sparkles,
  MessageSquare,
  User,
  ArrowLeft,
  Sliders,
  Bell,
  ChevronDown,
  Grape,
  Ticket,
  ClipboardList,
  CircleUser,
  type LucideIcon,
} from 'lucide-react';

type NavLink = { label: string; href: string; icon: LucideIcon };
type NavEntry = { label: string; icon: LucideIcon; href?: string; children?: NavLink[] };

const ACCOUNT_NAV: NavEntry[] = [
  { label: 'Overview', href: '/app', icon: Compass },
  {
    label: 'Cellar',
    icon: Grape,
    children: [
      { label: 'My Wines', href: '/app/wines', icon: Sparkles },
      { label: 'My Wine Journey', href: '/app/journey', icon: BookOpen },
      { label: 'My Tastings', href: '/app/tastings', icon: Wine },
      { label: 'My Reviews', href: '/app/reviews', icon: MessageSquare },
    ],
  },
  {
    label: 'Visit',
    icon: Calendar,
    children: [
      { label: 'My Bookings', href: '/app/bookings', icon: ClipboardList },
      { label: 'Events', href: '/app/events', icon: Ticket },
    ],
  },
  {
    label: 'Account',
    icon: User,
    children: [
      { label: 'Notifications', href: '/app/notifications', icon: Bell },
      { label: 'My Wine Profile', href: '/app/wine-profile', icon: Sliders },
      { label: 'Profile', href: '/app/profile', icon: CircleUser },
    ],
  },
];

export default function GuestAccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isAuthenticated, isLoading } = useGuest();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isActivePath = (href: string) =>
    pathname === href || (href !== '/app' && pathname.startsWith(href + '/'));

  // Close any open submenu when the route changes (render-phase adjustment)
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpenMenu(null);
  }

  useEffect(() => {
    if (!openMenu) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-[#faf8f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-[0.25em] text-stone-500">Loading your cellar…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pt-20 pb-24 bg-[#faf8f5] min-h-screen">
      {/* Top Banner with "Back to Winery" and Profile Identity */}
      <div className="bg-[#2d1117] text-[#faf8f5] border-b border-[#461822] py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[#c5a059] bg-[#461822] flex items-center justify-center font-serif text-xl font-bold text-[#c5a059]">
              {profile.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#c5a059] block font-semibold">
                VINORA Guest Member
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl text-[#faf8f5]">
                {profile.name}
              </h1>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs uppercase tracking-wider text-[#e6dece] transition-colors border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Winery Public Site</span>
          </Link>
        </div>
      </div>

      {/* Account Navigation Bar — grouped tabs with dropdown submenus */}
      <div className="border-b border-[#e6dece] sticky top-16 z-20 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center gap-1 sm:gap-2 py-2" aria-label="Account">
            {ACCOUNT_NAV.map((entry) => {
              const Icon = entry.icon;
              const isActive = entry.href
                ? isActivePath(entry.href)
                : (entry.children ?? []).some((child) => isActivePath(child.href));

              const pillClass = (active: boolean) =>
                `flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                  active
                    ? 'bg-[#2d1117] text-[#faf8f5] shadow-sm'
                    : 'text-[#525960] hover:bg-[#f4f0e8] hover:text-[#191c1f]'
                }`;

              if (entry.href) {
                return (
                  <Link key={entry.href} href={entry.href} className={pillClass(isActive)}>
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#c5a059]' : 'text-[#8a3243]'}`} />
                    <span>{entry.label}</span>
                  </Link>
                );
              }

              const isOpen = openMenu === entry.label;
              return (
                <div key={entry.label} className="relative" ref={isOpen ? menuRef : undefined}>
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    onClick={() => setOpenMenu(isOpen ? null : entry.label)}
                    className={pillClass(isActive)}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#c5a059]' : 'text-[#8a3243]'}`} />
                    <span>{entry.label}</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isOpen && (
                    <div
                      role="menu"
                      className="absolute left-0 top-full mt-2 z-30 min-w-[230px] rounded-xl border border-[#e6dece] bg-white py-1.5 shadow-[0_12px_32px_rgba(45,17,23,0.14)]"
                    >
                      {entry.children?.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive = isActivePath(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            role="menuitem"
                            className={`flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                              childActive
                                ? 'bg-[#f4f0e8] text-[#2d1117]'
                                : 'text-[#525960] hover:bg-[#f4f0e8] hover:text-[#191c1f]'
                            }`}
                          >
                            <ChildIcon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                childActive ? 'text-[#c5a059]' : 'text-[#8a3243]'
                              }`}
                            />
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Account Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {children}
      </main>
    </div>
  );
}
