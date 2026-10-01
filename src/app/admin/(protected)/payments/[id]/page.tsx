import React from 'react';
import { getPermissions, requirePagePermission } from '@/lib/auth/permissions';
import { PaymentDetailClient } from './PaymentDetailClient';

export default async function AdminPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission('payments.view');
  const { id } = await params;

  return <PaymentDetailClient paymentId={id} permissions={getPermissions(session.role)} />;
}
