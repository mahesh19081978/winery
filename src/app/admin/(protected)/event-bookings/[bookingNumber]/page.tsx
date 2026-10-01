import React from 'react';
import { getPermissions, requirePagePermission } from '@/lib/auth/permissions';
import { EventBookingDetailClient } from './EventBookingDetailClient';

export default async function AdminEventBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingNumber: string }>;
}) {
  const session = await requirePagePermission('eventBookings.manage');
  const { bookingNumber } = await params;

  return (
    <EventBookingDetailClient
      bookingNumber={bookingNumber}
      permissions={getPermissions(session.role)}
    />
  );
}
