import React from 'react';
import { PaymentDetailClient } from './PaymentDetailClient';

export default async function AdminPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaymentDetailClient paymentId={id} />;
}
