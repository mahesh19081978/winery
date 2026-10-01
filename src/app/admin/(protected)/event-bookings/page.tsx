import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { EventBookingsListClient } from './EventBookingsListClient';

export default async function AdminEventBookingsPage() {
  await requirePagePermission('eventBookings.manage');

  return <EventBookingsListClient />;
}
