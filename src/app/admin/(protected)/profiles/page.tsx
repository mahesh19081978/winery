import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { WineProfilesClient } from './WineProfilesClient';

export const metadata = {
  title: 'Guest Wine Profiles & Taste Palates | VINORA Admin',
  description: 'Sommelier concierge view of guest wine preferences, favorite varietals, and palate profiles',
};

export default async function AdminWineProfilesPage() {
  await requirePagePermission('profiles.view');

  return <WineProfilesClient />;
}
