'use client';

import React from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { usePathname } from 'next/navigation';
import logoMark from '../../../public/logo-mark.png';
import {
  Wine,
  LayoutDashboard,
  CalendarDays,
  Calendar,
  Sparkles,
  Clock,
  Layers,
  GlassWater,
  Users,
  UserCheck,
  HeartHandshake,
  Ticket,
  CalendarCheck,
  Star,
  Image,
  MessagesSquare,
  PhoneCall,
  Bell,
  ShieldCheck,
  Settings,
  X,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isImplemented?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAVIGATION_SECTIONS: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, isImplemented: true },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { name: 'Front Desk', href: '/admin/front-desk', icon: UserCheck, isImplemented: true },
      { name: 'Bookings', href: '/admin/bookings', icon: CalendarDays, isImplemented: true },
      { name: 'Calendar', href: '/admin/calendar', icon: Calendar, isImplemented: false },
      { name: 'Experiences', href: '/admin/experiences', icon: Sparkles, isImplemented: true },
      { name: 'Availability', href: '/admin/availability', icon: Clock, isImplemented: true },
    ],
  },
  {
    title: 'WINE',
    items: [
      { name: 'Wines', href: '/admin/wines', icon: Wine, isImplemented: true },
      { name: 'Vintages', href: '/admin/vintages', icon: Layers, isImplemented: false },
      { name: 'Tastings', href: '/admin/tastings', icon: GlassWater, isImplemented: true },
    ],
  },
  {
    title: 'GUESTS',
    items: [
      { name: 'Guests', href: '/admin/guests', icon: Users, isImplemented: true },
      { name: 'Guest CRM', href: '/admin/guests', icon: UserCheck, isImplemented: true },
      { name: 'Wine Profiles', href: '/admin/profiles', icon: HeartHandshake, isImplemented: false },
    ],
  },
  {
    title: 'EVENTS',
    items: [
      { name: 'Events', href: '/admin/events', icon: Ticket, isImplemented: true },
      { name: 'Event Bookings', href: '/admin/event-bookings', icon: CalendarCheck, isImplemented: true },
    ],
  },
  {
    title: 'ENGAGEMENT',
    items: [
      { name: 'Reviews', href: '/admin/reviews', icon: Star, isImplemented: true },
      { name: 'Gallery', href: '/admin/gallery', icon: Image, isImplemented: false },
    ],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { name: 'Conversations', href: '/admin/conversations', icon: MessagesSquare, isImplemented: false },
      { name: 'Voice Calls', href: '/admin/calls', icon: PhoneCall, isImplemented: false },
      { name: 'Notifications', href: '/admin/notifications', icon: Bell, isImplemented: false },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { name: 'Staff & Roles', href: '/admin/staff', icon: ShieldCheck, isImplemented: false },
      { name: 'Settings', href: '/admin/settings', icon: Settings, isImplemented: false },
    ],
  },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#2d1117] text-[#f4f0e8] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-[#461822] shadow-xl lg:shadow-none`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#461822]/80 bg-[#1e0c10]/40">
          <Link href="/admin" className="flex items-center gap-3 group">
            <span className="w-9 h-9 shrink-0 rounded-lg bg-[#faf8f5] border border-[#aa853e]/40 flex items-center justify-center overflow-hidden shadow-xs group-hover:scale-105 transition-transform">
              <NextImage
                src={logoMark}
                alt="VINORA"
                width={36}
                height={36}
                unoptimized
                className="w-8 h-8 object-contain"
              />
            </span>
            <div>
              <span className="font-serif tracking-wide text-white text-base font-semibold block leading-tight">
                VINORA
              </span>
              <span className="text-[10px] tracking-widest text-[#d6b774] uppercase font-mono font-medium">
                Estate Operations
              </span>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-[#461822] transition"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 scrollbar-thin">
          {NAVIGATION_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[#d6b774]/70">
                {section.title}
              </div>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = item.name === 'Guest CRM'
                    ? pathname.startsWith('/admin/guests/')
                    : item.name === 'Guests'
                      ? pathname === '/admin/guests'
                      : pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  if (item.isImplemented) {
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-[#6c2432] text-white shadow-xs font-semibold'
                              : 'text-stone-300 hover:bg-[#461822]/60 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-[#d6b774]' : 'text-stone-400'}`} />
                            <span>{item.name}</span>
                          </div>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#d6b774]" />
                          )}
                        </Link>
                      </li>
                    );
                  }

                  // Non-implemented module (Disabled with Coming Soon badge)
                  return (
                    <li key={item.name}>
                      <div
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-normal text-stone-400/60 cursor-not-allowed select-none hover:bg-white/[0.02]"
                        title="Module activation scheduled for subsequent phase"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-stone-500/50" />
                          <span>{item.name}</span>
                        </div>
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-stone-400/80 border border-white/5 font-mono">
                          Soon
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer info in sidebar */}
        <div className="p-4 border-t border-[#461822] bg-[#1e0c10]/30 text-xs text-stone-400 flex items-center justify-between">
          <div>
            <span className="text-white block font-serif text-xs font-medium">Winery &amp; Wine Experience Platform</span>
            <span className="text-[10px] text-stone-400">Next.js 16 • PostgreSQL</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#461822] text-[#d6b774] border border-[#aa853e]/30">
            v5.0 Shell
          </span>
        </div>
      </aside>
    </>
  );
}
