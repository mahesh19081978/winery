import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export const metadata = {
  title: 'Access Denied | VINORA Admin',
  description: 'Your role is not permitted to access this module',
};

interface ForbiddenPageProps {
  searchParams: Promise<{ permission?: string }>;
}

export default async function AdminForbiddenPage({ searchParams }: ForbiddenPageProps) {
  const { permission } = await searchParams;

  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-8 text-center border-b border-stone-100 bg-[#faf8f5]">
          <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mb-4">
            <ShieldAlert className="w-6 h-6 text-rose-700" />
          </div>
          <h1 className="font-serif text-xl font-medium text-stone-900">Access Denied</h1>
          <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
            Your current staff role is not authorized to use this module.
            Contact an administrator if you believe you need access.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {permission && (
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/80">
              <p className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
                Required permission
              </p>
              <p className="text-xs font-mono font-medium text-stone-800 mt-1">{permission}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Link
              href="/admin"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-white bg-[#6c2432] rounded-lg hover:bg-[#461822] transition"
            >
              <Home className="w-3.5 h-3.5" />
              Back to Dashboard
            </Link>
            <Link
              href="/admin"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Go Back
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
