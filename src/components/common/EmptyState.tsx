import React from 'react';
import Link from 'next/link';
import { Wine } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionText,
  actionHref,
  onAction
}: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-4 bg-white border border-[#e6dece] rounded-xl max-w-md mx-auto my-8">
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#f4f0e8] flex items-center justify-center text-[#461822]">
        {icon || <Wine className="w-7 h-7" />}
      </div>
      <h3 className="font-serif text-xl font-medium text-[#191c1f] mb-2">{title}</h3>
      <p className="text-sm text-[#525960] mb-6 leading-relaxed">{description}</p>
      {actionText && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center px-6 py-2.5 rounded-full bg-[#2d1117] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider hover:bg-[#461822] transition-colors"
        >
          {actionText}
        </Link>
      )}
      {actionText && onAction && !actionHref && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center px-6 py-2.5 rounded-full bg-[#2d1117] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider hover:bg-[#461822] transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
