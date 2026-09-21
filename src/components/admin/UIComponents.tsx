import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

export interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'burgundy';
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, variant = 'default', size = 'sm' }: StatusBadgeProps) {
  const normalized = status.toUpperCase().replace(/\s+/g, '_');

  let style = 'bg-stone-100 text-stone-700 border-stone-200';

  if (variant === 'success' || ['CONFIRMED', 'ACTIVE', 'APPROVED', 'CHECKED_IN', 'AVAILABLE'].includes(normalized)) {
    style = 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
  } else if (variant === 'warning' || ['PENDING', 'UPCOMING', 'LIMITED'].includes(normalized)) {
    style = 'bg-amber-50 text-amber-800 border-amber-200/80';
  } else if (variant === 'danger' || ['CANCELLED', 'REJECTED', 'CLOSED', 'BLOCKED', 'NO_SHOW'].includes(normalized)) {
    style = 'bg-rose-50 text-rose-800 border-rose-200/80';
  } else if (variant === 'info' || ['COMPLETED', 'FINISHED'].includes(normalized)) {
    style = 'bg-sky-50 text-sky-800 border-sky-200/80';
  } else if (variant === 'burgundy' || ['SUPER_ADMIN', 'VIP'].includes(normalized)) {
    style = 'bg-[#461822]/10 text-[#461822] border-[#461822]/20 font-serif';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border tracking-wide uppercase ${sizeClasses} ${style}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      <span>{status.replace(/_/g, ' ')}</span>
    </span>
  );
}

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  isMock?: boolean;
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, isMock = false }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-stone-200/80 p-5 shadow-xs hover:shadow-sm transition-all relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider font-semibold text-stone-500">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-serif font-medium text-stone-900">{value}</span>
            {isMock && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60">
                Demo
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-stone-500">{subtitle}</p>}
        </div>
        <div className="w-11 h-11 rounded-lg bg-[#faf8f5] border border-stone-200/60 flex items-center justify-center text-[#6c2432] group-hover:scale-105 transition-transform">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center text-xs font-medium text-emerald-700">
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}

export interface SectionCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, description, action, children, className = '' }: SectionCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-stone-200/80 shadow-xs overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-[#fdfcfb]">
        <div>
          <h3 className="font-serif font-medium text-base text-stone-900">{title}</h3>
          {description && <p className="text-xs text-stone-500 mt-0.5">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export interface QuickActionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  isAvailable?: boolean;
}

export function QuickAction({ title, description, icon: Icon, href, isAvailable = false }: QuickActionProps) {
  const content = (
    <div
      className={`p-4 rounded-xl border transition-all text-left flex items-start gap-3.5 relative ${
        isAvailable
          ? 'bg-white hover:bg-[#faf8f5] border-stone-200/80 cursor-pointer shadow-xs hover:border-[#aa853e]'
          : 'bg-stone-50/70 border-stone-200/60 opacity-85 cursor-not-allowed'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          isAvailable ? 'bg-[#461822]/10 text-[#6c2432]' : 'bg-stone-200/70 text-stone-400'
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-stone-900">{title}</h4>
          {!isAvailable && (
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-stone-200 text-stone-600">
              Coming Soon
            </span>
          )}
        </div>
        <p className="text-xs text-stone-500 mt-0.5 truncate">{description}</p>
      </div>
    </div>
  );

  if (isAvailable && href) {
    return <Link href={href}>{content}</Link>;
  }

  return <div>{content}</div>;
}
