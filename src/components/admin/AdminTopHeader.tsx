'use client';

import React from 'react';
import { Menu, Search, Bell, LogOut, User } from 'lucide-react';
import { UserRole } from '@prisma/client';

interface AdminTopHeaderProps {
  onToggleSidebar: () => void;
  adminEmail: string;
  adminRole: UserRole;
}

export function AdminTopHeader({ onToggleSidebar, adminEmail, adminRole }: AdminTopHeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-stone-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-2xs">
      {/* Left: Mobile Toggle & Quick Search */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Input Placeholder */}
        <div className="relative w-full max-w-xs hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search bookings, guests, wines..."
            disabled
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-700 placeholder-stone-400 focus:outline-none cursor-not-allowed"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] uppercase font-mono px-1 rounded bg-stone-200/70 text-stone-500">
            Soon
          </span>
        </div>
      </div>

      {/* Right: Notifications, Admin Info, Logout */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Notification Bell Placeholder */}
        <div className="relative">
          <button
            type="button"
            disabled
            className="p-2 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition cursor-not-allowed relative"
            title="Notifications (Coming Soon)"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-[#aa853e] absolute top-1.5 right-1.5" />
          </button>
        </div>

        <div className="h-6 w-px bg-stone-200 hidden sm:block" />

        {/* Current Admin Email & Role Badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#461822]/10 border border-[#461822]/20 flex items-center justify-center text-[#6c2432]">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block text-left">
            <span className="block text-xs font-semibold text-stone-800 leading-tight">
              {adminEmail}
            </span>
            <span className="inline-block text-[10px] font-medium uppercase tracking-wider text-[#6c2432]">
              {adminRole.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Sign Out Action */}
        <form action="/api/admin/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-800 text-xs font-medium transition border border-stone-200 hover:border-rose-200"
            title="Sign out of administration portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
