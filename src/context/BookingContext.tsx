'use client';

import React, { createContext, useContext, useState } from 'react';
import { mockExperiences } from '@/data/experiences';

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
  calculatePricing: () => { basePrice: number; taxAmount: number; totalPrice: number };
  getExperienceSlug: () => string;
}

const defaultFormState: BookingFormState = {
  experienceId: mockExperiences[0].id,
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

  const updateBooking = (data: Partial<BookingFormState>) => {
    setCurrentBooking((prev) => ({ ...prev, ...data }));
  };

  const resetBookingForm = () => {
    setCurrentBooking(defaultFormState);
  };

  const calculatePricing = () => {
    const selectedExp = mockExperiences.find((e) => e.id === currentBooking.experienceId) || mockExperiences[0];
    const expPrice = selectedExp ? selectedExp.price : 65;
    const basePrice = (currentBooking.adults * expPrice) + (currentBooking.children * (expPrice * 0.4));
    const taxAmount = Number((basePrice * 0.09).toFixed(2));
    const totalPrice = Number((basePrice + taxAmount).toFixed(2));
    return { basePrice, taxAmount, totalPrice };
  };

  const getExperienceSlug = () => {
    const selectedExp = mockExperiences.find((e) => e.id === currentBooking.experienceId) || mockExperiences[0];
    return selectedExp.slug;
  };

  return (
    <BookingContext.Provider
      value={{
        currentBooking,
        updateBooking,
        resetBookingForm,
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
