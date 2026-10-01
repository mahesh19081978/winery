import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { TastingListClient } from './TastingListClient';

export default async function AdminTastingsPage() {
  await requirePagePermission('tastings.manage');
  return <TastingListClient />;
}
