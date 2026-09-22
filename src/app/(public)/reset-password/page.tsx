'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="text-center">
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 text-left">
          <ShieldAlert className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <span>This password reset link is invalid or incomplete. Please request a new one.</span>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center justify-center gap-2 py-3.5 px-8 rounded-full bg-[#8a3243] hover:bg-[#732937] text-white font-medium transition shadow-md text-sm uppercase tracking-wider"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/guest/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Password reset failed');
      }
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="text-center">
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-start gap-3 text-left">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
          <span>Your password has been updated. You can now sign in with your new password.</span>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 py-3.5 px-8 rounded-full bg-[#8a3243] hover:bg-[#732937] text-white font-medium transition shadow-md text-sm uppercase tracking-wider"
        >
          Sign In
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs uppercase tracking-wider text-stone-600 font-medium mb-2">
            New Password
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full pl-11 pr-4 py-3 bg-[#faf8f5] border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#8a3243] focus:ring-1 focus:ring-[#8a3243] transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-stone-600 font-medium mb-2">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your new password"
              className="w-full pl-11 pr-4 py-3 bg-[#faf8f5] border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#8a3243] focus:ring-1 focus:ring-[#8a3243] transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-[#8a3243] hover:bg-[#732937] text-white font-medium transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
        >
          {loading ? 'Updating...' : 'Update Password'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <p className="text-center text-sm text-stone-500 mt-6">
        Link no longer works?{' '}
        <Link href="/forgot-password" className="text-[#8a3243] font-semibold hover:underline">
          Request a new reset link
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-[#faf8f5]">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-stone-900 font-light">Choose a New Password</h1>
          <p className="text-sm text-stone-500 mt-2">Enter a new password for your guest account</p>
        </div>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
