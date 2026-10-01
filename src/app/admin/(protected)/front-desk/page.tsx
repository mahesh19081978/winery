import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { FrontDeskClient } from './FrontDeskClient';

export default async function AdminFrontDeskPage() {
  await requirePagePermission('frontDesk.access');

  return <FrontDeskClient />;
}
