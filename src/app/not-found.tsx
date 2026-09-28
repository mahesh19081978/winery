import React from 'react';
import Link from 'next/link';
import { Wine, Compass, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-24 text-center bg-[#faf8f5]">
      <div className="w-16 h-16 rounded-full bg-[#f4f0e8] border border-[#e6dece] flex items-center justify-center text-[#8a3243] mb-6 shadow-sm">
        <Wine className="w-8 h-8 stroke-1" />
      </div>

      <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8a3243] block mb-2">
        Vintage Not Found · 404
      </span>
      <h1 className="font-serif text-3xl sm:text-5xl text-[#191c1f] font-normal mb-4 max-w-md">
        This Cellar Path Does Not Exist
      </h1>
      <p className="text-sm text-[#525960] max-w-md mb-8 leading-relaxed">
        The estate page, wine vintage, or reservation link you are seeking may have been archived or moved to another cellar corridor.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4 text-[#c5a059]" />
          <span>Return Home</span>
        </Link>
        <Link
          href="/wines"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#8a3243] text-[#8a3243] hover:bg-[#f4f0e8] text-xs font-semibold uppercase tracking-wider transition-colors"
        >
          <Compass className="w-4 h-4" />
          <span>Browse Wine Collection</span>
        </Link>
      </div>
    </div>
  );
}
