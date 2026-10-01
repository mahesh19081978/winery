import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { WineCreateClient } from './WineCreateClient';

export default async function AdminWineNewPage() {
  await requirePagePermission('wines.manage');
  return <WineCreateClient />;
}
