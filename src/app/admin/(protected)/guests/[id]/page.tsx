import React from 'react';
import { notFound } from 'next/navigation';
import { GuestService } from '@/server/services';
import { getPermissions, requirePagePermission } from '@/lib/auth/permissions';
import { GuestDetailClient } from './GuestDetailClient';

export default async function AdminGuestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission('guests.view');
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
      permissions={getPermissions(session.role)}
    />
  );
}
