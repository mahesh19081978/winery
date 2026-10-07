import React from 'react';
import { getPermissions, requirePagePermission } from '@/lib/auth/permissions';
import { FrontDeskClient } from './FrontDeskClient';

export default async function AdminFrontDeskPage() {
  const session = await requirePagePermission('frontDesk.access');

  return <FrontDeskClient permissions={getPermissions(session.role)} />;
}
