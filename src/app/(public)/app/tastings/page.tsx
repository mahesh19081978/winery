'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useGuest } from '@/context/GuestContext';
import { mockWines } from '@/data/wines';
import { 
  Plus, 
  Search, 
  Star, 
  Calendar, 
  ChevronRight,
} from 'lucide-react';
import TastingFeedbackModal from '@/components/tasting/TastingFeedbackModal';
import EmptyState from '@/components/common/EmptyState';

export default function TastingsPage() {
  const { tastings } = useGuest();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRating, setSelectedRating] = useState<number | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter records
  const filteredRecords = tastings.filter(record => {
    const wine = mockWines.find(w => w.id === record.wineId);
    const wineName = (wine?.name || record.wineName).toLowerCase();
    const notes = record.notes.toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = wineName.includes(query) || notes.includes(query) || record.tasteCharacteristics.some((f: string) => f.toLowerCase().includes(query));
    const matchesRating = selectedRating === 'all' || record.rating >= selectedRating;

    return matchesSearch && matchesRating;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-stone-900 font-light">Tasting Journal</h1>
          <p className="text-stone-500 text-sm mt-1">Your personal archive of sensory evaluations, aromas, and cellar ratings</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 rounded-full bg-[#8a3243] text-white text-sm font-medium hover:bg-[#732937] transition inline-flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" /> Log New Tasting
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by wine name, flavor note (e.g. blackberry, cedar, minerality)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:border-[#8a3243] text-stone-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <span className="text-xs text-stone-400 uppercase tracking-wider font-semibold">Min Rating:</span>
          {(['all', 4, 4.5, 5] as const).map(val => (
            <button
              key={val}
              onClick={() => setSelectedRating(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedRating === val
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {val === 'all' ? 'All' : `${val}+ ★`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Tasting Records */}
      {filteredRecords.length === 0 ? (
        <EmptyState
          title="No tasting records found"
          description={
            searchQuery
              ? `No wine records matched "${searchQuery}". Try a different keyword.`
              : 'You have not recorded any tasting notes yet.'
          }
          actionText="Log Your First Tasting"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRecords.map(record => {
            const wine = mockWines.find(w => w.id === record.wineId);

            return (
              <div 
                key={record.id}
                className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm hover:border-[#c5a059]/40 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-18 relative bg-stone-100 rounded-xl overflow-hidden shrink-0 border border-stone-100">
                        <Image
                          src={wine?.image || 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=400&auto=format&fit=crop'}
                          alt={wine?.name || record.wineName}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{record.dateTasted}</span>
                        </div>
                        <h3 className="font-serif text-lg font-medium text-stone-900 leading-snug">
                          {wine?.name || record.wineName}
                        </h3>
                        <p className="text-xs text-stone-500">
                          Vintage {record.vintage} · {wine?.category || 'Estate Bottled'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-[#faf8f5] px-3 py-1.5 rounded-xl border border-stone-200">
                      <Star className="w-3.5 h-3.5 text-[#c5a059] fill-current" />
                      <span className="font-serif font-semibold text-sm text-stone-900">{record.rating}</span>
                    </div>
                  </div>

                  <p className="text-stone-600 text-xs italic font-serif leading-relaxed line-clamp-3 bg-[#faf8f5] p-3 rounded-xl border border-stone-100">
                    &ldquo;{record.notes}&rdquo;
                  </p>

                  {/* Flavor badges */}
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {record.tasteCharacteristics.map((fl: string, i: number) => (
                      <span key={i} className="text-[11px] px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">
                        {fl}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs text-stone-400">
                    {record.experienceName}
                  </span>
                  <Link
                    href={`/app/tastings/${record.id}`}
                    className="text-xs font-semibold text-[#8a3243] hover:underline inline-flex items-center gap-1"
                  >
                    View Radar Profile <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tasting Feedback / Log Modal */}
      {isModalOpen && (
        <TastingFeedbackModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          defaultWineName={mockWines[0].name}
          defaultVintage={mockWines[0].vintage}
        />
      )}
    </div>
  );
}
