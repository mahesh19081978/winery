'use client';

import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopHeader } from './AdminTopHeader';
import { UserRole } from '@prisma/client';
import { ShieldCheck } from 'lucide-react';

interface AdminShellClientProps {
  adminEmail: string;
  adminRole: UserRole;
  children: React.ReactNode;
}

export function AdminShellClient({ adminEmail, adminRole, children }: AdminShellClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#191c1f] flex font-sans">
      {/* Sidebar Navigation */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Top Header Bar */}
        <AdminTopHeader
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          adminEmail={adminEmail}
          adminRole={adminRole}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Compact Admin Footer */}
        <footer className="border-t border-stone-200 bg-white/70 py-4 px-6 text-xs text-stone-500 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#6c2432]" />
            <span>VINORA Staff Administration • Protected Estate Session</span>
          </div>
          <div className="text-[11px] font-mono text-stone-400">
            Session active: 8h expiration • Winery &amp; Wine Experience Platform
          </div>
        </footer>
      </div>
    </div>
  );
}
