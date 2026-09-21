import React from 'react';

interface WineRadarProfileProps {
  body: number;
  acidity: number;
  sweetness: number;
  tannin: number;
  size?: number;
}

export default function WineRadarProfile({
  body,
  acidity,
  sweetness,
  tannin,
  size = 200
}: WineRadarProfileProps) {
  // 4-axis diamond radar chart
  const center = size / 2;
  const radius = size * 0.38;

  // Normalized (0 to 1)
  const normBody = Math.min(Math.max(body / 10, 0.1), 1);
  const normSweet = Math.min(Math.max(sweetness / 10, 0.1), 1);
  const normAcidity = Math.min(Math.max(acidity / 10, 0.1), 1);
  const normTannin = Math.min(Math.max(tannin / 10, 0.1), 1);

  // Coordinates: Top = Body, Right = Sweetness, Bottom = Tannin, Left = Acidity
  const pTop = { x: center, y: center - radius * normBody };
  const pRight = { x: center + radius * normSweet, y: center };
  const pBottom = { x: center, y: center + radius * normTannin };
  const pLeft = { x: center - radius * normAcidity, y: center };

  const polygonPoints = `${pTop.x},${pTop.y} ${pRight.x},${pRight.y} ${pBottom.x},${pBottom.y} ${pLeft.x},${pLeft.y}`;

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background Grids */}
        {[0.25, 0.5, 0.75, 1].map((lvl, idx) => {
          const r = radius * lvl;
          return (
            <polygon
              key={idx}
              points={`${center},${center - r} ${center + r},${center} ${center},${center + r} ${center - r},${center}`}
              fill="none"
              stroke="#e6dece"
              strokeWidth="1"
              strokeDasharray={lvl === 1 ? 'none' : '2,2'}
            />
          );
        })}

        {/* Cross Axes */}
        <line x1={center} y1={center - radius} x2={center} y2={center + radius} stroke="#e6dece" strokeWidth="1" />
        <line x1={center - radius} y1={center} x2={center + radius} y2={center} stroke="#e6dece" strokeWidth="1" />

        {/* Sensory Shape */}
        <polygon
          points={polygonPoints}
          fill="#8a3243"
          fillOpacity="0.25"
          stroke="#6c2432"
          strokeWidth="2"
        />

        {/* Data Vertices */}
        <circle cx={pTop.x} cy={pTop.y} r="4" fill="#6c2432" />
        <circle cx={pRight.x} cy={pRight.y} r="4" fill="#6c2432" />
        <circle cx={pBottom.x} cy={pBottom.y} r="4" fill="#6c2432" />
        <circle cx={pLeft.x} cy={pLeft.y} r="4" fill="#6c2432" />

        {/* Axis Labels */}
        <text x={center} y={center - radius - 10} textAnchor="middle" className="text-[10px] font-semibold uppercase tracking-wider fill-[#461822]">
          Body ({body})
        </text>
        <text x={center + radius + 12} y={center + 3} textAnchor="start" className="text-[10px] font-semibold uppercase tracking-wider fill-[#461822]">
          Sweetness ({sweetness})
        </text>
        <text x={center} y={center + radius + 16} textAnchor="middle" className="text-[10px] font-semibold uppercase tracking-wider fill-[#461822]">
          Tannin ({tannin})
        </text>
        <text x={center - radius - 12} y={center + 3} textAnchor="end" className="text-[10px] font-semibold uppercase tracking-wider fill-[#461822]">
          Acidity ({acidity})
        </text>
      </svg>
    </div>
  );
}
