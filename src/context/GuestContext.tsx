'use client';

import React, { createContext, useContext, useState } from 'react';
import { GuestProfile, TastingRecord, Review } from '@/types';
import { mockGuestProfile, mockTastingRecords } from '@/data/tastings';
import { mockReviews } from '@/data/reviews';

interface GuestContextType {
  profile: GuestProfile;
  tastings: TastingRecord[];
  reviews: Review[];
  savedWineIds: string[];
  toggleSavedWine: (wineId: string) => void;
  isWineSaved: (wineId: string) => boolean;
  addTastingRecord: (record: Omit<TastingRecord, 'id' | 'dateTasted'>) => TastingRecord;
  addReview: (review: Omit<Review, 'id' | 'date' | 'verified' | 'helpfulCount'>) => Review;
  updateProfile: (data: Partial<GuestProfile>) => void;
  getTastingById: (id: string) => TastingRecord | undefined;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export function GuestProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<GuestProfile>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('elysee_guest_profile');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return mockGuestProfile;
  });

  const [tastings, setTastings] = useState<TastingRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('elysee_guest_tastings');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return mockTastingRecords;
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('elysee_guest_reviews');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return mockReviews;
  });

  const [savedWineIds, setSavedWineIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('elysee_saved_wines');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return ['wine-1', 'wine-2'];
  });

  const toggleSavedWine = (wineId: string) => {
    const updated = savedWineIds.includes(wineId)
      ? savedWineIds.filter((id) => id !== wineId)
      : [...savedWineIds, wineId];
    setSavedWineIds(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('elysee_saved_wines', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const isWineSaved = (wineId: string) => savedWineIds.includes(wineId);

  const addTastingRecord = (record: Omit<TastingRecord, 'id' | 'dateTasted'>): TastingRecord => {
    const newRecord: TastingRecord = {
      ...record,
      id: 'taste-' + Date.now(),
      dateTasted: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    };
    const updated = [newRecord, ...tastings];
    setTastings(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('elysee_guest_tastings', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
    return newRecord;
  };

  const addReview = (newRev: Omit<Review, 'id' | 'date' | 'verified' | 'helpfulCount'>): Review => {
    const fullReview: Review = {
      ...newRev,
      id: 'rev-' + Date.now(),
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      verified: true,
      helpfulCount: 0
    };
    const updated = [fullReview, ...reviews];
    setReviews(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('elysee_guest_reviews', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
    return fullReview;
  };

  const updateProfile = (data: Partial<GuestProfile>) => {
    const updated = { ...profile, ...data };
    setProfile(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('elysee_guest_profile', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const getTastingById = (id: string) => {
    return tastings.find((t) => t.id === id);
  };

  return (
    <GuestContext.Provider
      value={{
        profile,
        tastings,
        reviews,
        savedWineIds,
        toggleSavedWine,
        isWineSaved,
        addTastingRecord,
        addReview,
        updateProfile,
        getTastingById
      }}
    >
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const context = useContext(GuestContext);
  if (!context) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
}
