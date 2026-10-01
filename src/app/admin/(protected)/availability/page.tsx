import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { AvailabilityClient } from './AvailabilityClient';

export default async function AdminAvailabilityPage() {
  await requirePagePermission('availability.view');

  return <AvailabilityClient />;
}
