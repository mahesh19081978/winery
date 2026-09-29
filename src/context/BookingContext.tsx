'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import type { Experience } from '@/types';

export interface BookingFormState {
  experienceId: string;
  date: string;
  time: string;
  adults: number;
  children: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  specialRequests: string;
}

interface BookingContextType {
  currentBooking: BookingFormState;
  updateBooking: (data: Partial<BookingFormState>) => void;
  resetBookingForm: () => void;
  setExperienceCatalog: (experiences: Experience[]) => void;
  calculatePricing: () => { basePrice: number; taxAmount: number; totalPrice: number };
  getExperienceSlug: () => string;
}

const defaultFormState: BookingFormState = {
  experienceId: '',
  date: '',
  time: '',
  adults: 2,
  children: 0,
  guestName: '',
  guestEmail: '',
  guestPhone: '',
  specialRequests: ''
};

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [currentBooking, setCurrentBooking] = useState<BookingFormState>(defaultFormState);
  const [experiences, setExperiences] = useState<Experience[]>([]);

  const updateBooking = useCallback((data: Partial<BookingFormState>) => {
    setCurrentBooking((prev) => ({ ...prev, ...data }));
  }, []);

  const resetBookingForm = useCallback(() => {
    setCurrentBooking(defaultFormState);
  }, []);

  const setExperienceCatalog = useCallback((catalog: Experience[]) => {
    setExperiences(catalog);
  }, []);

  const findSelectedExperience = (): Experience | undefined =>
    experiences.find((e) => e.id === currentBooking.experienceId) ||
    experiences.find((e) => e.slug === currentBooking.experienceId);

  const calculatePricing = () => {
    const selectedExp = findSelectedExperience();
    const expPrice = selectedExp ? selectedExp.price : 0;
    const basePrice = (currentBooking.adults * expPrice) + (currentBooking.children * (expPrice * 0.4));
    const taxAmount = Number((basePrice * 0.09).toFixed(2));
    const totalPrice = Number((basePrice + taxAmount).toFixed(2));
    return { basePrice, taxAmount, totalPrice };
  };

  const getExperienceSlug = () => {
    const selectedExp = findSelectedExperience();
    return selectedExp ? selectedExp.slug : '';
  };

  return (
    <BookingContext.Provider
      value={{
        currentBooking,
        updateBooking,
        resetBookingForm,
        setExperienceCatalog,
        calculatePricing,
        getExperienceSlug
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}
