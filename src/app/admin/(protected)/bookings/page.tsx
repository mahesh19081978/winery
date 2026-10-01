import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { BookingListClient } from './BookingListClient';

export default async function AdminBookingsPage() {
  await requirePagePermission('bookings.view');

  return <BookingListClient />;
}
