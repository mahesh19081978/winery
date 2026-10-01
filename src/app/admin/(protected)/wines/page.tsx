import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { WinesListClient } from './WinesListClient';

export default async function AdminWinesPage() {
  await requirePagePermission('wines.manage');
  return <WinesListClient />;
}
