import React from 'react';
import { DailyBookingDataPoint } from '@/lib/services/reports.service';

interface BookingTrendChartProps {
  data: DailyBookingDataPoint[];
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

export function BookingTrendChart({ data }: BookingTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-10 text-stone-400 text-xs">
        No booking activity recorded for this selection.
      </div>
    );
  }

  const maxVal = Math.max(...data.flatMap((d) => [d.validBookings, d.guests]), 5);

  const chartHeight = 180;
  const chartWidth = 720;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const pointsCount = data.length;
  const stepX = pointsCount > 1 ? innerWidth / (pointsCount - 1) : innerWidth / 2;

  const getX = (index: number) => paddingLeft + (pointsCount > 1 ? index * stepX : innerWidth / 2);
  const getY = (val: number) => paddingTop + innerHeight - (Math.max(0, val) / maxVal) * innerHeight;

  const bookingsPoints = data.map((d, i) => `${getX(i)},${getY(d.validBookings)}`).join(' ');
  const guestsPoints = data.map((d, i) => `${getX(i)},${getY(d.guests)}`).join(' ');

  const guestsAreaPath =
    pointsCount > 1
      ? `M ${getX(0)},${paddingTop + innerHeight} L ${data
          .map((d, i) => `${getX(i)},${getY(d.guests)}`)
          .join(' L ')} L ${getX(pointsCount - 1)},${paddingTop + innerHeight} Z`
      : '';

  const yTicks = [0, Math.ceil(maxVal * 0.5), maxVal];
  const stride = Math.ceil(pointsCount / 7);

  const totalValidBookings = data.reduce((sum, d) => sum + d.validBookings, 0);
  const totalGuests = data.reduce((sum, d) => sum + d.guests, 0);

  return (
    <div className="space-y-4">
      {/* Legend & Aggregate KPI */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4 text-stone-600 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#6c2432]" />
            <span>Daily Valid Bookings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-sky-600" />
            <span>Daily Guests</span>
          </div>
        </div>

        <div className="flex items-center gap-4 font-mono text-[11px] text-stone-500 bg-[#faf8f5] px-3 py-1 rounded-md border border-stone-200/60">
          <span>Total Bookings: <strong className="text-stone-900">{totalValidBookings}</strong></span>
          <span>Total Guests: <strong className="text-stone-900">{totalGuests}</strong></span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto min-w-[540px] text-[10px] font-mono select-none"
        >
          <defs>
            <linearGradient id="guestsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
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
                  {Math.round(tickVal)}
                </text>
              </g>
            );
          })}

          {/* Guests Area */}
          {guestsAreaPath && <path d={guestsAreaPath} fill="url(#guestsGradient)" />}

          {/* Lines */}
          <polyline
            fill="none"
            stroke="#0284c7"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={guestsPoints}
          />
          <polyline
            fill="none"
            stroke="#6c2432"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={bookingsPoints}
          />

          {/* Data Points */}
          {pointsCount <= 14 &&
            data.map((d, i) => (
              <g key={i}>
                <circle cx={getX(i)} cy={getY(d.guests)} r="3" fill="#0284c7" />
                <circle cx={getX(i)} cy={getY(d.validBookings)} r="3" fill="#6c2432" />
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

      {/* Recent Activity Table */}
      <div className="overflow-x-auto -mx-5 -mb-5 border-t border-stone-100 bg-[#faf8f5]/40">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="text-stone-500 uppercase tracking-wider font-mono text-[10px] border-b border-stone-100 bg-[#faf8f5]/80">
              <th className="py-2.5 px-5">Date</th>
              <th className="py-2.5 px-4 text-right">Valid Bookings</th>
              <th className="py-2.5 px-5 text-right">Seated Guests</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
            {data.slice(-7).reverse().map((d) => (
              <tr key={d.date} className="hover:bg-stone-50/60 transition-colors">
                <td className="py-2.5 px-5 text-stone-700 font-sans">{d.date}</td>
                <td className="py-2.5 px-4 text-right font-medium text-stone-900">
                  {d.validBookings}
                </td>
                <td className="py-2.5 px-5 text-right text-sky-800 font-semibold">
                  {d.guests}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
