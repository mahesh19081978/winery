import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { PaymentsListClient } from './PaymentsListClient';

export default async function AdminPaymentsPage() {
  await requirePagePermission('payments.view');

  return <PaymentsListClient />;
}
