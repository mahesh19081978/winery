'use client';

import React, { useEffect } from 'react';
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
} from 'lucide-react';

const ACCOUNT_NAV = [
  { label: 'Overview', href: '/app', icon: Compass },
  { label: 'My Bookings', href: '/app/bookings', icon: Calendar },
  { label: 'My Wine Journey', href: '/app/journey', icon: BookOpen },
  { label: 'My Tastings', href: '/app/tastings', icon: Wine },
  { label: 'My Wines', href: '/app/wines', icon: Sparkles },
  { label: 'Events', href: '/app/events', icon: Calendar },
  { label: 'My Reviews', href: '/app/reviews', icon: MessageSquare },
  { label: 'Notifications', href: '/app/notifications', icon: Bell },
  { label: 'My Wine Profile', href: '/app/wine-profile', icon: Sliders },
  { label: 'Profile', href: '/app/profile', icon: User },
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

      {/* Account Navigation Bar (Horizontal Scroll / Desktop Tabs) */}
      <div className="bg-white border-b border-[#e6dece] sticky top-16 z-20 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
            {ACCOUNT_NAV.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/app' && pathname.startsWith(item.href + '/'));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all shrink-0 ${
                    isActive
                      ? 'bg-[#2d1117] text-[#faf8f5] shadow-sm'
                      : 'text-[#525960] hover:bg-[#f4f0e8] hover:text-[#191c1f]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#c5a059]' : 'text-[#8a3243]'}`} />
                  <span>{item.label}</span>
                </Link>
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
