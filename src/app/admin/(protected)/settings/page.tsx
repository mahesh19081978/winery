import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { SettingsClient } from './SettingsClient';

export const metadata = {
  title: 'Estate Operations Settings | VINORA Admin',
  description: 'Global winery configuration, localized operational hours, terroir details, and notification defaults',
};

export default async function AdminSettingsPage() {
  await requirePagePermission('settings.view');

  return <SettingsClient />;
}
