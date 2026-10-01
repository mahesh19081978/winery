'use client';

import React, { useState } from 'react';
import { X, CreditCard, Banknote, Landmark, Gift, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RecordPaymentModalProps {
  bookingNumber: string;
  bookingType: 'EXPERIENCE' | 'EVENT';
  outstandingAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'CARD_TERMINAL', label: 'Card Terminal', icon: CreditCard },
  { value: 'UPI', label: 'UPI / Wallet', icon: Wallet },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Landmark },
  { value: 'COMPLIMENTARY', label: 'Complimentary', icon: Gift },
];

export function RecordPaymentModal({
  bookingNumber,
  bookingType,
  outstandingAmount,
  onClose,
  onSuccess,
}: RecordPaymentModalProps) {
  const router = useRouter();
  const [amount, setAmount] = useState<string>(outstandingAmount.toString());
  const [method, setMethod] = useState<string>('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be greater than zero');
      setIsSubmitting(false);
      return;
    }
    if (numAmount > outstandingAmount) {
      setError(`Amount cannot exceed outstanding balance (₹${outstandingAmount})`);
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/payments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingNumber,
          bookingType,
          amount: numAmount,
          paymentMethod: method,
          reference: reference || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record payment');
      }

      onSuccess();
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-[#faf8f5]">
          <h3 className="font-serif text-lg font-medium text-stone-900">Record Payment</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error && (
            <div className="p-3 text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider text-stone-500 mb-1">
              Amount to Collect
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-medium">₹</span>
              <input
                type="number"
                step="0.01"
                max={outstandingAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c2432]/20 focus:border-[#6c2432] transition"
                required
              />
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Outstanding balance: <span className="font-medium text-stone-900">₹{outstandingAmount}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider text-stone-500 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                const isSelected = method === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition ${
                      isSelected
                        ? 'bg-[#6c2432]/5 border-[#6c2432] text-[#6c2432]'
                        : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-1">
                Reference ID (Optional)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. Transaction ID, Check Number"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c2432]/20 focus:border-[#6c2432] transition"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-stone-500 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any internal notes about this payment"
                rows={2}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c2432]/20 focus:border-[#6c2432] transition resize-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-xs font-medium text-white bg-[#6c2432] hover:bg-[#461822] rounded-lg transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
