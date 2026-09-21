import React from 'react';
import { QrCode } from 'lucide-react';

interface QRCodePlaceholderProps {
  code: string;
  size?: number;
  label?: string;
}

export default function QRCodePlaceholder({
  code,
  size = 180,
  label = 'Scan upon arrival at Estate Lounge'
}: QRCodePlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white border border-[#e6dece] rounded-2xl shadow-sm text-center">
      <div
        className="relative bg-[#faf8f5] p-4 rounded-xl border border-dashed border-[#c5a059] flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <QrCode className="w-full h-full text-[#2d1117] stroke-[1.2]" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-white border border-[#c5a059] flex items-center justify-center text-[9px] font-bold text-[#6c2432]">
            DÉ
          </div>
        </div>
      </div>
      <p className="font-mono text-xs font-semibold text-[#191c1f] mt-3 tracking-widest uppercase">
        {code}
      </p>
      {label && <p className="text-[11px] text-[#525960] mt-1">{label}</p>}
    </div>
  );
}
