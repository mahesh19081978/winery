import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { DataImportClient } from './DataImportClient';

export default async function AdminDataImportPage() {
  // Page guard - wines.manage is granted to SUPER_ADMIN, ADMIN, and WINE_STAFF
  await requirePagePermission('wines.manage');

  return <DataImportClient />;
}
