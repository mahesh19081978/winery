'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function GuestBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to the full canonical booking ticket and receipt view
    if (id) {
      router.replace(`/booking/${encodeURIComponent(id)}`);
    }
  }, [id, router]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-12 text-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-[#8a3243] animate-spin" />
        <p className="text-sm font-medium text-stone-600">
          Loading your reservation details...
        </p>
        <Link
          href={`/booking/${id}`}
          className="text-xs uppercase tracking-wider text-[#8a3243] underline hover:text-[#732937]"
        >
          Click here if not redirected automatically
        </Link>
      </div>

      <div className="pt-4">
        <Link
          href="/app/bookings"
          className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-stone-500 hover:text-[#8a3243] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Reservations
        </Link>
      </div>
    </div>
  );
}
