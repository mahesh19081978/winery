import React from 'react';
import { notFound } from 'next/navigation';
import { requirePagePermission } from '@/lib/auth/permissions';
import { TastingService } from '@/server/services';
import { TastingDetailClient } from './TastingDetailClient';

export default async function AdminTastingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission('tastings.manage');
  const { id } = await params;

  let tastingSession;
  try {
    tastingSession = await TastingService.getTastingSessionAdmin(id);
  } catch {
    notFound();
  }

  if (!tastingSession) {
    notFound();
  }

  if (
    session.role !== 'SUPER_ADMIN' &&
    session.wineryId &&
    tastingSession.booking?.wineryId &&
    tastingSession.booking.wineryId !== session.wineryId
  ) {
    notFound();
  }

  return (
    <TastingDetailClient
      session={JSON.parse(JSON.stringify(tastingSession))}
      adminEmail={session.email || ''}
      adminRole={session.role || ''}
    />
  );
}
