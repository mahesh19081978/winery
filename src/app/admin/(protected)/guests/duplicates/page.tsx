import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { DuplicateGuestsClient } from './DuplicateGuestsClient';

export default async function AdminDuplicateGuestsPage() {
  await requirePagePermission('guests.view');

  return <DuplicateGuestsClient />;
}
