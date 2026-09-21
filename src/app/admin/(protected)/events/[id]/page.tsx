import React from 'react';
import { notFound } from 'next/navigation';
import { EventService } from '@/server/services';
import { EventDetailClient } from './EventDetailClient';

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let event;
  try {
    event = await EventService.getEventAdmin(id);
  } catch {
    notFound();
  }

  return <EventDetailClient event={JSON.parse(JSON.stringify(event))} />;
}
