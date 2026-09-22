'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { GuestProfile, TastingRecord, Review } from '@/types';
import { mockTastingRecords } from '@/data/tastings';
import { mockReviews } from '@/data/reviews';

interface GuestWinePreferenceDto {
  id: string;
  guestProfileId: string;
  favoriteVarietals: string[];
  preferredSweetness: string | null;
  preferredBody: string | null;
  preferredAcidity: string | null;
  favoriteWineId: string | null;
}

interface GuestMeDto {
  userId: string;
  email: string;
  role: string;
  guestProfileId: string;
  name: string;
  phone: string | null;
  avatar: string | null;
  visitsCount: number;
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  createdAt: string;
  winePreference: GuestWinePreferenceDto | null;
}

interface GuestContextType {
  profile: GuestProfile;
  isAuthenticated: boolean;
  isLoading: boolean;
  tastings: TastingRecord[];
  reviews: Review[];
  savedWineIds: string[];
  toggleSavedWine: (wineId: string) => void;
  isWineSaved: (wineId: string) => boolean;
  addTastingRecord: (record: Omit<TastingRecord, 'id' | 'dateTasted'>) => TastingRecord;
  addReview: (review: Omit<Review, 'id' | 'date' | 'verified' | 'helpfulCount'>) => Review;
  updateProfile: (data: Partial<GuestProfile>) => Promise<boolean>;
  getTastingById: (id: string) => TastingRecord | undefined;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

const UNAUTHENTICATED_PROFILE: GuestProfile = {
  name: 'Guest',
  email: '',
  phone: '',
  avatar: '',
  visitsCount: 0,
  winesTastedCount: 0,
  eventsAttendedCount: 0,
  favoriteWineId: '',
  preferences: {
    favoriteVarietals: [],
    preferredSweetness: '',
    preferredBody: '',
    preferredAcidity: '',
  },
  notifications: { email: true, sms: false, whatsapp: false },
};

function mapSessionToProfile(me: GuestMeDto): GuestProfile {
  return {
    name: me.name,
    email: me.email,
    phone: me.phone ?? '',
    avatar: me.avatar ?? '',
    visitsCount: me.visitsCount ?? 0,
    winesTastedCount: 0,
    eventsAttendedCount: 0,
    favoriteWineId: me.winePreference?.favoriteWineId ?? '',
    preferences: {
      favoriteVarietals: me.winePreference?.favoriteVarietals ?? [],
      preferredSweetness: me.winePreference?.preferredSweetness ?? '',
      preferredBody: me.winePreference?.preferredBody ?? '',
      preferredAcidity: me.winePreference?.preferredAcidity ?? '',
    },
    notifications: {
      email: me.emailNotifications,
      sms: me.smsNotifications,
      whatsapp: me.whatsappNotifications,
    },
  };
}

export function GuestProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<GuestProfile>(UNAUTHENTICATED_PROFILE);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/guest/me', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json.data) {
          setProfile(mapSessionToProfile(json.data as GuestMeDto));
          setIsAuthenticated(true);
          return;
        }
      }
    } catch {
      // Network or server error: treat as unauthenticated
    }
    setProfile(UNAUTHENTICATED_PROFILE);
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await refreshSession();
      if (active) setIsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refreshSession]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/guest/logout', { method: 'POST' });
    } catch {
      // Still clear local state even if the request fails
    }
    setProfile(UNAUTHENTICATED_PROFILE);
    setIsAuthenticated(false);
  }, []);

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

  const updateProfile = async (data: Partial<GuestProfile>): Promise<boolean> => {
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.avatar !== undefined) payload.avatar = data.avatar;
    if (data.notifications !== undefined) payload.notifications = data.notifications;
    if (data.favoriteWineId !== undefined || data.preferences !== undefined) {
      payload.winePreferences = {
        ...(data.preferences ?? {}),
        ...(data.favoriteWineId !== undefined ? { favoriteWineId: data.favoriteWineId } : {}),
      };
    }

    try {
      const res = await fetch('/api/guest/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return false;
      const json = await res.json();
      if (!json?.success || !json.data) return false;
      setProfile(mapSessionToProfile(json.data as GuestMeDto));
      setIsAuthenticated(true);
      return true;
    } catch {
      return false;
    }
  };

  const getTastingById = (id: string) => {
    return tastings.find((t) => t.id === id);
  };

  return (
    <GuestContext.Provider
      value={{
        profile,
        isAuthenticated,
        isLoading,
        tastings,
        reviews,
        savedWineIds,
        toggleSavedWine,
        isWineSaved,
        addTastingRecord,
        addReview,
        updateProfile,
        getTastingById,
        logout,
        refreshSession,
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
