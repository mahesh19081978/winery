'use client';

import React, { createContext, useContext, useState } from 'react';
import { Booking } from '@/types';
import { initialMockBookings } from '@/data/bookings';
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
  bookings: Booking[];
  currentBooking: BookingFormState;
  updateBooking: (data: Partial<BookingFormState>) => void;
  resetBookingForm: () => void;
  confirmBooking: () => Booking;
  cancelBooking: (id: string) => void;
  getBookingById: (id: string) => Booking | undefined;
  calculatePricing: () => { basePrice: number; taxAmount: number; totalPrice: number };
}

const defaultFormState: BookingFormState = {
  experienceId: mockExperiences[0].id,
  date: '',
  time: '',
  adults: 2,
  children: 0,
  guestName: 'Eleanor Vance',
  guestEmail: 'eleanor.vance@example.com',
  guestPhone: '+1 (555) 234-5678',
  specialRequests: ''
};

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('elysee_bookings');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return initialMockBookings;
  });

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

  const confirmBooking = (): Booking => {
    const selectedExp = mockExperiences.find((e) => e.id === currentBooking.experienceId) || mockExperiences[0];
    const { basePrice, taxAmount, totalPrice } = calculatePricing();
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const newBooking: Booking = {
      id: 'DVR-2026-' + randomSuffix,
      experienceId: selectedExp.id,
      experienceTitle: selectedExp.title,
      date: currentBooking.date || '2026-10-20',
      time: currentBooking.time || '2:00 PM',
      adults: currentBooking.adults,
      children: currentBooking.children,
      totalGuests: currentBooking.adults + currentBooking.children,
      guestName: currentBooking.guestName || 'Eleanor Vance',
      guestEmail: currentBooking.guestEmail || 'eleanor.vance@example.com',
      guestPhone: currentBooking.guestPhone || '+1 (555) 234-5678',
      specialRequests: currentBooking.specialRequests,
      basePrice,
      taxAmount,
      totalPrice,
      status: 'Confirmed',
      createdAt: new Date().toISOString()
    };

    const updated = [newBooking, ...bookings];
    setBookings(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('elysee_bookings', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
    return newBooking;
  };

  const cancelBooking = (id: string) => {
    const updated = bookings.map((b) => (b.id === id ? { ...b, status: 'Cancelled' as const } : b));
    setBookings(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('elysee_bookings', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const getBookingById = (id: string) => {
    return bookings.find((b) => b.id === id);
  };

  return (
    <BookingContext.Provider
      value={{
        bookings,
        currentBooking,
        updateBooking,
        resetBookingForm,
        confirmBooking,
        cancelBooking,
        getBookingById,
        calculatePricing
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
