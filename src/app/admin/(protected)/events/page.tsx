import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { EventsListClient } from './EventsListClient';

export default async function AdminEventsPage() {
  await requirePagePermission('events.manage');

  return <EventsListClient />;
}
