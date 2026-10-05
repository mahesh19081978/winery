import React from 'react';
import { DailyRevenueDataPoint } from '@/lib/services/reports.service';

interface RevenueTrendChartProps {
  data: DailyRevenueDataPoint[];
  currency: string;
}

function formatAmount(val: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(val);
}

function formatShortDate(isoDate: string) {
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return `${monthNames[m]} ${d}`;
  }
  return isoDate;
}

export function RevenueTrendChart({ data, currency }: RevenueTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-10 text-stone-400 text-xs">
        No revenue data recorded for this selection.
      </div>
    );
  }

  // Find max value to scale chart
  const maxVal = Math.max(
    ...data.flatMap((d) => [
      d.grossBookingValue,
      d.collectedAmount,
      d.netCollected,
      d.refunds,
    ]),
    100
  );

  const chartHeight = 180;
  const chartWidth = 720;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const pointsCount = data.length;
  const stepX = pointsCount > 1 ? innerWidth / (pointsCount - 1) : innerWidth / 2;

  const getX = (index: number) => paddingLeft + (pointsCount > 1 ? index * stepX : innerWidth / 2);
  const getY = (val: number) => paddingTop + innerHeight - (Math.max(0, val) / maxVal) * innerHeight;

  // Build SVG path strings
  const gbvPoints = data.map((d, i) => `${getX(i)},${getY(d.grossBookingValue)}`).join(' ');
  const collectedPoints = data.map((d, i) => `${getX(i)},${getY(d.collectedAmount)}`).join(' ');
  const netPoints = data.map((d, i) => `${getX(i)},${getY(d.netCollected)}`).join(' ');
  const refundsPoints = data.map((d, i) => `${getX(i)},${getY(d.refunds)}`).join(' ');

  // SVG Area for Net Collected
  const netAreaPath =
    pointsCount > 1
      ? `M ${getX(0)},${paddingTop + innerHeight} L ${data
          .map((d, i) => `${getX(i)},${getY(d.netCollected)}`)
          .join(' L ')} L ${getX(pointsCount - 1)},${paddingTop + innerHeight} Z`
      : '';

  // Y-axis grid ticks (0, 50%, 100%)
  const yTicks = [0, maxVal * 0.5, maxVal];

  // X-axis label stride to prevent clutter
  const stride = Math.ceil(pointsCount / 7);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-stone-600">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#6c2432]" />
          <span>Gross Booking Value</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-600" />
          <span>Collected Amount</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-600" />
          <span>Net Collected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-rose-500" />
          <span>Refunds</span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto min-w-[540px] text-[10px] font-mono select-none"
        >
          <defs>
            <linearGradient id={`netGradient-${currency}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((tickVal, i) => {
            const y = getY(tickVal);
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="#e7e5e4"
                  strokeDasharray={i === 0 ? 'none' : '3,3'}
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-stone-400 text-[9px]"
                >
                  {tickVal >= 1000 ? `${(tickVal / 1000).toFixed(0)}k` : Math.round(tickVal)}
                </text>
              </g>
            );
          })}

          {/* Net Collected Area */}
          {netAreaPath && (
            <path d={netAreaPath} fill={`url(#netGradient-${currency})`} />
          )}

          {/* Lines */}
          <polyline
            fill="none"
            stroke="#6c2432"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={gbvPoints}
          />
          <polyline
            fill="none"
            stroke="#059669"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={collectedPoints}
          />
          <polyline
            fill="none"
            stroke="#d97706"
            strokeWidth="2"
            strokeDasharray="4,3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={netPoints}
          />
          <polyline
            fill="none"
            stroke="#f43f5e"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={refundsPoints}
          />

          {/* Points for small datasets */}
          {pointsCount <= 14 &&
            data.map((d, i) => (
              <g key={i}>
                <circle cx={getX(i)} cy={getY(d.grossBookingValue)} r="3" fill="#6c2432" />
                <circle cx={getX(i)} cy={getY(d.collectedAmount)} r="3" fill="#059669" />
                <circle cx={getX(i)} cy={getY(d.netCollected)} r="3" fill="#d97706" />
                {d.refunds > 0 && (
                  <circle cx={getX(i)} cy={getY(d.refunds)} r="3" fill="#f43f5e" />
                )}
              </g>
            ))}

          {/* X Axis dates */}
          {data.map((d, i) => {
            if (i % stride !== 0 && i !== pointsCount - 1) return null;
            return (
              <text
                key={i}
                x={getX(i)}
                y={chartHeight - 8}
                textAnchor="middle"
                className="fill-stone-400 text-[9px]"
              >
                {formatShortDate(d.date)}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Summary Table for details */}
      <div className="overflow-x-auto -mx-5 -mb-5 border-t border-stone-100 bg-[#faf8f5]/40">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="text-stone-500 uppercase tracking-wider font-mono text-[10px] border-b border-stone-100 bg-[#faf8f5]/80">
              <th className="py-2.5 px-5">Date</th>
              <th className="py-2.5 px-4 text-right">Gross Booking Value</th>
              <th className="py-2.5 px-4 text-right">Collected Amount</th>
              <th className="py-2.5 px-4 text-right">Refunds</th>
              <th className="py-2.5 px-5 text-right">Net Collected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
            {data.slice(-7).reverse().map((d) => (
              <tr key={d.date} className="hover:bg-stone-50/60 transition-colors">
                <td className="py-2.5 px-5 text-stone-700 font-sans">{d.date}</td>
                <td className="py-2.5 px-4 text-right text-stone-900 font-medium">
                  {formatAmount(d.grossBookingValue, currency)}
                </td>
                <td className="py-2.5 px-4 text-right text-emerald-700">
                  {formatAmount(d.collectedAmount, currency)}
                </td>
                <td className="py-2.5 px-4 text-right text-rose-600">
                  {d.refunds > 0 ? formatAmount(d.refunds, currency) : '—'}
                </td>
                <td className="py-2.5 px-5 text-right font-semibold text-stone-900">
                  {formatAmount(d.netCollected, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
