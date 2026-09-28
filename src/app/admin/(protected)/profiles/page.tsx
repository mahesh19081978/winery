import React from 'react';
import { WineProfilesClient } from './WineProfilesClient';

export const metadata = {
  title: 'Guest Wine Profiles & Taste Palates | VINORA Admin',
  description: 'Sommelier concierge view of guest wine preferences, favorite varietals, and palate profiles',
};

export default function AdminWineProfilesPage() {
  return <WineProfilesClient />;
}
