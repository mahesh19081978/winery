import React from 'react';
import { notFound } from 'next/navigation';
import { EventService } from '@/server/services';
import { requirePagePermission } from '@/lib/auth/permissions';
import { EventDetailClient } from './EventDetailClient';

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission('events.manage');
  const { id } = await params;

  let event;
  try {
    event = await EventService.getEventAdmin(id);
  } catch {
    notFound();
  }

  if (session.role !== 'SUPER_ADMIN' && session.wineryId && event.wineryId !== session.wineryId) {
    notFound();
  }

  return <EventDetailClient event={JSON.parse(JSON.stringify(event))} />;
}
