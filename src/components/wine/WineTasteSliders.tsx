import React from 'react';

interface WineTasteSlidersProps {
  body: number; // 1 to 10
  acidity: number; // 1 to 10
  sweetness: number; // 1 to 10
  tannin: number; // 1 to 10
  theme?: 'light' | 'dark';
}

export default function WineTasteSliders({
  body,
  acidity,
  sweetness,
  tannin,
  theme = 'light'
}: WineTasteSlidersProps) {
  const isDark = theme === 'dark';

  const metrics = [
    { label: 'Body', value: body, lowDesc: 'Light & Airy', highDesc: 'Full & Rich' },
    { label: 'Acidity', value: acidity, lowDesc: 'Soft & Gentle', highDesc: 'Crisp & Bright' },
    { label: 'Sweetness', value: sweetness, lowDesc: 'Bone Dry', highDesc: 'Lush & Sweet' },
    { label: 'Tannin', value: tannin, lowDesc: 'Silk & Smooth', highDesc: 'Firm & Grippy' }
  ];

  return (
    <div className="space-y-4">
      {metrics.map((m) => (
        <div key={m.label} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span
              className={`font-semibold uppercase tracking-wider ${
                isDark ? 'text-[#faf8f5]' : 'text-[#191c1f]'
              }`}
            >
              {m.label}
            </span>
            <span
              className={`text-[11px] ${
                isDark ? 'text-[#c5a059]' : 'text-[#8a3243]'
              } font-medium`}
            >
              {m.value <= 4 ? m.lowDesc : m.value >= 7 ? m.highDesc : 'Balanced'} ({m.value}/10)
            </span>
          </div>

          {/* Elegant 10-pip bar */}
          <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={m.value} aria-valuemin={1} aria-valuemax={10}>
            {Array.from({ length: 10 }).map((_, index) => {
              const active = index < m.value;
              return (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-sm transition-all duration-300 ${
                    active
                      ? isDark
                        ? 'bg-[#c5a059]'
                        : 'bg-[#6c2432]'
                      : isDark
                      ? 'bg-white/10'
                      : 'bg-[#e6dece]'
                  }`}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
