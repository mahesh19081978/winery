import React from 'react';
import { EventBookingDetailClient } from './EventBookingDetailClient';

export default async function AdminEventBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingNumber: string }>;
}) {
  const { bookingNumber } = await params;
  return <EventBookingDetailClient bookingNumber={bookingNumber} />;
}
