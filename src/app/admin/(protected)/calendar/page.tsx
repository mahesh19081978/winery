import React from 'react';
import { CalendarClient } from './CalendarClient';

export const metadata = {
  title: 'Estate Operations Calendar | VINORA Admin',
  description: 'Master operational schedule for tasting sessions, vineyard events, and cellar bookings',
};

export default function AdminCalendarPage() {
  return <CalendarClient />;
}
