import React from 'react';
import { notFound } from 'next/navigation';
import { GuestService } from '@/server/services';
import { GuestDetailClient } from './GuestDetailClient';

export default async function AdminGuestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let guest;
  try {
    guest = await GuestService.getGuestAdmin(id);
  } catch {
    notFound();
  }

  if (!guest) {
    notFound();
  }

  return (
    <GuestDetailClient
      guest={JSON.parse(JSON.stringify(guest))}
    />
  );
}
