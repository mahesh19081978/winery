'use client';

import React, { useState } from 'react';
import RatingStars from '../common/RatingStars';

interface TastingFormProps {
  initialWineName?: string;
  initialVintage?: number;
  initialExperience?: string;
  onSubmit: (data: {
    wineName: string;
    vintage: number;
    experienceName: string;
    rating: number;
    tasteCharacteristics: string[];
    notes: string;
    wouldDrinkAgain: 'Yes' | 'Maybe' | 'No';
    sensoryProfile: { body: number; acidity: number; sweetness: number; tannin: number };
  }) => void;
  onCancel?: () => void;
}

const AVAILABLE_CHARACTERISTICS = [
  'Fruity',
  'Dry',
  'Sweet',
  'Spicy',
  'Woody',
  'Smooth',
  'Light',
  'Full-bodied',
  'Mineral',
  'Floral',
  'Earthy',
  'Tannic'
];

export default function TastingForm({
  initialWineName = 'Domaine Élysée Cabernet Sauvignon',
  initialVintage = 2024,
  initialExperience = 'Estate Visit',
  onSubmit,
  onCancel
}: TastingFormProps) {
  const [wineName, setWineName] = useState(initialWineName);
  const [vintage, setVintage] = useState(initialVintage);
  const [experienceName, setExperienceName] = useState(initialExperience);
  const [rating, setRating] = useState(5);
  const [selectedCharacteristics, setSelectedCharacteristics] = useState<string[]>([
    'Full-bodied',
    'Smooth'
  ]);
  const [notes, setNotes] = useState('');
  const [wouldDrinkAgain, setWouldDrinkAgain] = useState<'Yes' | 'Maybe' | 'No'>('Yes');
  const [body, setBody] = useState(7);
  const [acidity, setAcidity] = useState(6);
  const [sweetness, setSweetness] = useState(2);
  const [tannin, setTannin] = useState(7);

  const toggleCharacteristic = (char: string) => {
    setSelectedCharacteristics((prev) =>
      prev.includes(char) ? prev.filter((c) => c !== char) : [...prev, char]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      wineName,
      vintage,
      experienceName,
      rating,
      tasteCharacteristics: selectedCharacteristics,
      notes,
      wouldDrinkAgain,
      sensoryProfile: { body, acidity, sweetness, tannin }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      {/* Wine Info Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1">
            Wine Name
          </label>
          <input
            type="text"
            required
            value={wineName}
            onChange={(e) => setWineName(e.target.value)}
            className="w-full bg-[#f4f0e8] border border-[#e6dece] rounded-xl px-4 py-2.5 text-sm text-[#191c1f] focus:outline-none focus:border-[#8a3243] focus:bg-white transition-all"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1">
            Vintage
          </label>
          <input
            type="number"
            required
            value={vintage}
            onChange={(e) => setVintage(Number(e.target.value))}
            className="w-full bg-[#f4f0e8] border border-[#e6dece] rounded-xl px-4 py-2.5 text-sm text-[#191c1f] focus:outline-none focus:border-[#8a3243] focus:bg-white transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1">
          Tasting Experience / Setting
        </label>
        <input
          type="text"
          value={experienceName}
          onChange={(e) => setExperienceName(e.target.value)}
          className="w-full bg-[#f4f0e8] border border-[#e6dece] rounded-xl px-4 py-2.5 text-sm text-[#191c1f] focus:outline-none focus:border-[#8a3243] focus:bg-white transition-all"
        />
      </div>

      {/* Star Rating */}
      <div className="p-4 bg-[#f4f0e8] rounded-xl border border-[#e6dece] flex items-center justify-between">
        <div>
          <label className="block text-xs uppercase tracking-wider font-semibold text-[#2d1117]">
            Overall Impression Rating
          </label>
          <span className="text-xs text-[#525960]">Click stars to set score</span>
        </div>
        <RatingStars rating={rating} size="lg" interactive onRate={(r) => setRating(r)} />
      </div>

      {/* Taste Characteristics Chips */}
      <div>
        <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-2">
          Taste Characteristics
        </label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_CHARACTERISTICS.map((char) => {
            const isSelected = selectedCharacteristics.includes(char);
            return (
              <button
                key={char}
                type="button"
                onClick={() => toggleCharacteristic(char)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all border ${
                  isSelected
                    ? 'bg-[#2d1117] text-[#faf8f5] border-[#2d1117]'
                    : 'bg-white text-[#525960] border-[#e6dece] hover:border-[#8a3243]'
                }`}
              >
                {char} {isSelected && '✓'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sensory Radar Sliders */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-white border border-[#e6dece] rounded-xl">
        <div>
          <label className="block text-[11px] uppercase font-semibold text-[#461822] mb-1">
            Body ({body}/10)
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={body}
            onChange={(e) => setBody(Number(e.target.value))}
            className="w-full accent-[#8a3243]"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase font-semibold text-[#461822] mb-1">
            Acidity ({acidity}/10)
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={acidity}
            onChange={(e) => setAcidity(Number(e.target.value))}
            className="w-full accent-[#8a3243]"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase font-semibold text-[#461822] mb-1">
            Sweetness ({sweetness}/10)
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={sweetness}
            onChange={(e) => setSweetness(Number(e.target.value))}
            className="w-full accent-[#8a3243]"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase font-semibold text-[#461822] mb-1">
            Tannin ({tannin}/10)
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={tannin}
            onChange={(e) => setTannin(Number(e.target.value))}
            className="w-full accent-[#8a3243]"
          />
        </div>
      </div>

      {/* Would drink again? */}
      <div>
        <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-2">
          Would you drink this wine again?
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['Yes', 'Maybe', 'No'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setWouldDrinkAgain(opt)}
              className={`py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all ${
                wouldDrinkAgain === opt
                  ? 'bg-[#8a3243] text-[#faf8f5] border-[#8a3243] shadow-sm'
                  : 'bg-white text-[#525960] border-[#e6dece] hover:border-[#8a3243]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Tasting notes */}
      <div>
        <label className="block text-xs uppercase tracking-wider font-semibold text-[#191c1f] mb-1">
          Tasting Notes & Personal Reflections
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Aromas, mouthfeel, finish, memorable food pairings..."
          className="w-full bg-[#f4f0e8] border border-[#e6dece] rounded-xl px-4 py-2.5 text-sm text-[#191c1f] focus:outline-none focus:border-[#8a3243] focus:bg-white transition-all"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e6dece]">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-full border border-[#e6dece] text-xs font-semibold uppercase tracking-wider text-[#525960] hover:bg-[#f4f0e8] transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-6 py-2.5 rounded-full bg-[#2d1117] hover:bg-[#461822] text-[#faf8f5] text-xs font-semibold uppercase tracking-widest transition-colors shadow-sm"
        >
          Record in Wine Journal
        </button>
      </div>
    </form>
  );
}
