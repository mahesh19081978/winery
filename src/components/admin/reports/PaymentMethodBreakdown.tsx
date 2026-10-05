import React from 'react';
import { PaymentMethodItem } from '@/lib/services/reports.service';
import { Banknote, CreditCard, Landmark, Globe, Smartphone, HelpCircle } from 'lucide-react';

interface PaymentMethodBreakdownProps {
  data: PaymentMethodItem[];
  currency: string;
}

function formatAmount(val: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(val);
}

const METHOD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Cash: Banknote,
  UPI: Smartphone,
  Card: CreditCard,
  'Bank Transfer': Landmark,
  Online: Globe,
  'Other / Complimentary': HelpCircle,
};

const METHOD_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  Cash: { bar: 'bg-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  UPI: { bar: 'bg-violet-600', text: 'text-violet-700', bg: 'bg-violet-50' },
  Card: { bar: 'bg-blue-600', text: 'text-blue-700', bg: 'bg-blue-50' },
  'Bank Transfer': { bar: 'bg-amber-600', text: 'text-amber-700', bg: 'bg-amber-50' },
  Online: { bar: 'bg-[#6c2432]', text: 'text-[#6c2432]', bg: 'bg-[#461822]/10' },
  'Other / Complimentary': { bar: 'bg-stone-500', text: 'text-stone-700', bg: 'bg-stone-100' },
};

export function PaymentMethodBreakdown({ data, currency }: PaymentMethodBreakdownProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-10 text-stone-400 text-xs">
        No payment records found for this period.
      </div>
    );
  }

  const totalCollectedAcrossMethods = data.reduce((sum, item) => sum + item.totalCollected, 0);

  return (
    <div className="space-y-6">
      {/* Visual Stacked Progress Bar */}
      <div className="space-y-2">
        <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden flex">
          {data.map((item) => {
            const pct = totalCollectedAcrossMethods > 0
              ? (item.totalCollected / totalCollectedAcrossMethods) * 100
              : 0;
            if (pct <= 0) return null;
            const colors = METHOD_COLORS[item.method] || { bar: 'bg-stone-500' };
            return (
              <div
                key={item.method}
                className={`h-full ${colors.bar} transition-all`}
                style={{ width: `${pct}%` }}
                title={`${item.method} (Gross Share): ${pct.toFixed(1)}%`}
              />
            );
          })}
        </div>

        {/* Aggregate distribution tags */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          {data.map((item) => {
            const pct = totalCollectedAcrossMethods > 0
              ? (item.totalCollected / totalCollectedAcrossMethods) * 100
              : 0;
            const colors = METHOD_COLORS[item.method] || { bar: 'bg-stone-500', text: 'text-stone-700' };
            return (
              <div key={item.method} className="flex items-center gap-1.5 font-sans text-stone-600">
                <span className={`w-2.5 h-2.5 rounded-full ${colors.bar}`} />
                <span className="font-medium text-stone-800">{item.method}</span>
                <span className="font-mono text-[11px] text-stone-400">
                  (Gross Share: {pct.toFixed(1)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {data.map((item) => {
          const Icon = METHOD_ICONS[item.method] || Globe;
          const colors = METHOD_COLORS[item.method] || {
            bar: 'bg-stone-500',
            text: 'text-stone-700',
            bg: 'bg-stone-50',
          };
          const pct = totalCollectedAcrossMethods > 0
            ? ((item.totalCollected / totalCollectedAcrossMethods) * 100).toFixed(1)
            : '0.0';

          return (
            <div
              key={item.method}
              className="p-4 rounded-xl border border-stone-200/80 bg-white hover:border-stone-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg} ${colors.text}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-medium text-stone-500 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-100">
                    Gross Share: {pct}%
                  </span>
                </div>

                <div className="mt-3">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-600 truncate" title={item.method}>
                    {item.method}
                  </h4>
                  <div className="text-lg font-serif font-medium text-stone-900 mt-1">
                    {formatAmount(item.netCollected, currency)}
                  </div>
                  <div className="text-[11px] font-mono text-stone-500 mt-0.5">
                    Net Collected
                  </div>
                </div>
              </div>


              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] font-mono text-stone-500">
                <span>{item.count} payment{item.count !== 1 ? 's' : ''}</span>
                {item.refundedAmount > 0 && (
                  <span className="text-rose-600">
                    -{formatAmount(item.refundedAmount, currency)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Method Table */}
      <div className="overflow-x-auto -mx-5 -mb-5 border-t border-stone-100 bg-[#faf8f5]/40">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="text-stone-500 uppercase tracking-wider font-mono text-[10px] border-b border-stone-100 bg-[#faf8f5]/80">
              <th className="py-2.5 px-5">Method</th>
              <th className="py-2.5 px-4 text-center">Transactions</th>
              <th className="py-2.5 px-4 text-right">Total Collected</th>
              <th className="py-2.5 px-4 text-right">Refunded</th>
              <th className="py-2.5 px-5 text-right">Net Collected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
            {data.map((item) => (
              <tr key={item.method} className="hover:bg-stone-50/60 transition-colors">
                <td className="py-2.5 px-5 text-stone-800 font-sans font-medium flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${METHOD_COLORS[item.method]?.bar || 'bg-stone-400'}`} />
                  {item.method}
                </td>
                <td className="py-2.5 px-4 text-center text-stone-600">
                  {item.count}
                </td>
                <td className="py-2.5 px-4 text-right text-stone-900">
                  {formatAmount(item.totalCollected, currency)}
                </td>
                <td className="py-2.5 px-4 text-right text-rose-600">
                  {item.refundedAmount > 0 ? formatAmount(item.refundedAmount, currency) : '—'}
                </td>
                <td className="py-2.5 px-5 text-right font-semibold text-stone-900">
                  {formatAmount(item.netCollected, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
