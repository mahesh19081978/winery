'use client';

import { useState } from 'react';
import { useGuest } from '@/context/GuestContext';
import { mockWines } from '@/data/wines';
import { Sparkles } from 'lucide-react';
import WineCard from '@/components/wine/WineCard';
import EmptyState from '@/components/common/EmptyState';

export default function MyWinesPage() {
  const { savedWineIds, tastings } = useGuest();
  const [activeTab, setActiveTab] = useState<'saved' | 'rated' | 'recommended'>('saved');

  // Favorite / Saved wines
  const favoriteWinesList = mockWines.filter(w => savedWineIds.includes(w.id));

  // Highly rated wines from tasting records (e.g. rating >= 4.5)
  const highlyRatedWineIds = tastings
    .filter((r) => r.rating >= 4.5)
    .map((r) => r.wineId);
  const highlyRatedWinesList = mockWines.filter(w => highlyRatedWineIds.includes(w.id));

  // Sommelier recommended (e.g. not tasted yet or signature reserve)
  const recommendedWinesList = mockWines.filter(w => !tastings.some((r) => r.wineId === w.id)).slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl md:text-4xl text-stone-900 font-light">My Cellar Collection</h1>
        <p className="text-stone-500 text-sm mt-1">Manage your saved bottles, cellar wishlist, and sommelier vintage picks</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-5 py-2 rounded-full text-xs font-medium uppercase tracking-wider transition ${
            activeTab === 'saved' 
              ? 'bg-stone-900 text-white' 
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Wishlist & Saved ({favoriteWinesList.length})
        </button>
        <button
          onClick={() => setActiveTab('rated')}
          className={`px-5 py-2 rounded-full text-xs font-medium uppercase tracking-wider transition ${
            activeTab === 'rated' 
              ? 'bg-stone-900 text-white' 
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Highest Rated ({highlyRatedWinesList.length})
        </button>
        <button
          onClick={() => setActiveTab('recommended')}
          className={`px-5 py-2 rounded-full text-xs font-medium uppercase tracking-wider transition ${
            activeTab === 'recommended' 
              ? 'bg-stone-900 text-white' 
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Sommelier Picks ({recommendedWinesList.length})
        </button>
      </div>

      {/* Wine Grid */}
      {activeTab === 'saved' && (
        favoriteWinesList.length === 0 ? (
          <EmptyState
            title="Your cellar wishlist is empty"
            description="Tap the heart icon on any wine in our catalogue to save it to your personal allocation collection."
            actionText="Explore Wine Catalogue"
            actionHref="/wines"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteWinesList.map(wine => (
              <WineCard key={wine.id} wine={wine} />
            ))}
          </div>
        )
      )}

      {activeTab === 'rated' && (
        highlyRatedWinesList.length === 0 ? (
          <EmptyState
            title="No 5-star wines logged yet"
            description="Log your tasting impressions in your journal to bookmark your favorite high-rated vintages."
            actionText="Go to Tasting Journal"
            actionHref="/app/tastings"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {highlyRatedWinesList.map(wine => (
              <WineCard key={wine.id} wine={wine} />
            ))}
          </div>
        )
      )}

      {activeTab === 'recommended' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-[#faf8f5] border border-stone-200/80 flex items-center gap-3 text-xs text-stone-600">
            <Sparkles className="w-4 h-4 text-[#c5a059] shrink-0" />
            <span>These vintages match your profile preference for balanced acidity, dark fruit aromatics, and French oak barrel aging.</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedWinesList.map(wine => (
              <WineCard key={wine.id} wine={wine} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
