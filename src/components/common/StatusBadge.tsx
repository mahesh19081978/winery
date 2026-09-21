import React from 'react';

interface StatusBadgeProps {
  status: 'Confirmed' | 'Completed' | 'Cancelled' | 'Available' | 'Few Seats Left' | 'Sold Out' | string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const getColors = () => {
    switch (status) {
      case 'Confirmed':
      case 'Available':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Few Seats Left':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Completed':
        return 'bg-stone-100 text-stone-700 border-stone-200';
      case 'Cancelled':
      case 'Sold Out':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-[#f4f0e8] text-[#461822] border-[#e6dece]';
    }
  };

  const sizeClass = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs sm:text-sm';

  return (
    <span
      className={`inline-flex items-center font-medium tracking-wider uppercase rounded-full border ${getColors()} ${sizeClass}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75"></span>
      {status}
    </span>
  );
}
