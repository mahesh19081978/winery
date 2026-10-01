import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { CalendarClient } from './CalendarClient';

export const metadata = {
  title: 'Estate Operations Calendar | VINORA Admin',
  description: 'Master operational schedule for tasting sessions, vineyard events, and cellar bookings',
};

export default async function AdminCalendarPage() {
  await requirePagePermission('calendar.view');

  return <CalendarClient />;
}
