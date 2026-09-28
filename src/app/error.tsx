'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled public application error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-24 text-center bg-[#faf8f5]">
      <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 mb-6 shadow-sm">
        <AlertCircle className="w-8 h-8" />
      </div>

      <span className="text-xs uppercase tracking-[0.25em] font-semibold text-rose-800 block mb-2">
        Cellar Service Interruption
      </span>
      <h1 className="font-serif text-3xl sm:text-5xl text-[#191c1f] font-normal mb-4 max-w-md">
        An Unexpected Error Occurred
      </h1>
      <p className="text-sm text-[#525960] max-w-md mb-8 leading-relaxed">
        Our concierge desk has logged this incident. Please refresh the page or return to the estate home.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] text-xs font-semibold uppercase tracking-wider transition-all shadow-md"
        >
          <RotateCcw className="w-4 h-4 text-[#c5a059]" />
          <span>Try Again</span>
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-stone-300 text-stone-700 hover:bg-[#f4f0e8] text-xs font-semibold uppercase tracking-wider transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Return to Homepage</span>
        </Link>
      </div>
    </div>
  );
}
