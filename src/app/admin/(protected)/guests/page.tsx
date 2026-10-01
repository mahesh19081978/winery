import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { GuestListClient } from './GuestListClient';

export default async function AdminGuestsPage() {
  await requirePagePermission('guests.view');

  return <GuestListClient />;
}
