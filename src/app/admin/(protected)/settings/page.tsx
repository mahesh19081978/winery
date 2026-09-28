import React from 'react';
import { SettingsClient } from './SettingsClient';

export const metadata = {
  title: 'Estate Operations Settings | VINORA Admin',
  description: 'Global winery configuration, localized operational hours, terroir details, and notification defaults',
};

export default function AdminSettingsPage() {
  return <SettingsClient />;
}
