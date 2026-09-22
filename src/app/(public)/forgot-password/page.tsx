'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/guest/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Request failed');
      }
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-[#faf8f5]">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-stone-900 font-light">Reset Your Password</h1>
          <p className="text-sm text-stone-500 mt-2">
            Enter the email address associated with your guest account
          </p>
        </div>

        {submitted ? (
          <div className="text-center">
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-start gap-3 text-left">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
              <span>If an account exists for this email, a password reset link has been sent.</span>
            </div>
            <p className="text-sm text-stone-500 mb-6">
              The link expires in 1 hour. If you don&apos;t see the email, check your spam folder.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 py-3.5 px-8 rounded-full bg-[#8a3243] hover:bg-[#732937] text-white font-medium transition shadow-md text-sm uppercase tracking-wider"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
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
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 py-3 bg-[#faf8f5] border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#8a3243] focus:ring-1 focus:ring-[#8a3243] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-[#8a3243] hover:bg-[#732937] text-white font-medium transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-center text-sm text-stone-500 mt-6">
              Remembered your password?{' '}
              <Link href="/login" className="text-[#8a3243] font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
