'use client';

import React from 'react';
import { X, Wine } from 'lucide-react';
import TastingForm from './TastingForm';
import { useGuest } from '@/context/GuestContext';

interface TastingFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultWineName?: string;
  defaultVintage?: number;
  defaultExperience?: string;
  onSuccess?: () => void;
}

export default function TastingFeedbackModal({
  isOpen,
  onClose,
  defaultWineName,
  defaultVintage,
  defaultExperience,
  onSuccess
}: TastingFeedbackModalProps) {
  const { addTastingRecord } = useGuest();

  if (!isOpen) return null;

  const handleSubmit = (data: {
    wineName: string;
    vintage: number;
    experienceName: string;
    rating: number;
    tasteCharacteristics: string[];
    notes: string;
    wouldDrinkAgain: 'Yes' | 'Maybe' | 'No';
    sensoryProfile: { body: number; acidity: number; sweetness: number; tannin: number };
  }) => {
    addTastingRecord({
      wineId: 'wine-custom',
      wineName: data.wineName,
      vintage: data.vintage,
      experienceName: data.experienceName,
      rating: data.rating,
      tasteCharacteristics: data.tasteCharacteristics,
      notes: data.notes,
      wouldDrinkAgain: data.wouldDrinkAgain,
      sensoryProfile: data.sensoryProfile
    });
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e0c10]/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#faf8f5] rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#e6dece] my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#e6dece]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#461822] text-[#c5a059] flex items-center justify-center">
              <Wine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl sm:text-2xl text-[#191c1f]">
                Log Wine Tasting Record
              </h3>
              <p className="text-xs text-[#525960]">
                Capture your palate reflections in your personal Wine Journey
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-[#525960] hover:text-[#191c1f] hover:bg-[#f4f0e8] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <TastingForm
          initialWineName={defaultWineName}
          initialVintage={defaultVintage}
          initialExperience={defaultExperience}
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
