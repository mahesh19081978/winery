import React from 'react';
import { notFound } from 'next/navigation';
import { AuthService } from '@/lib/auth';
import { TastingService } from '@/server/services';
import { TastingDetailClient } from './TastingDetailClient';

export default async function AdminTastingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await AuthService.getSession();
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

  return (
    <TastingDetailClient
      session={JSON.parse(JSON.stringify(tastingSession))}
      adminEmail={session?.email || ''}
      adminRole={session?.role || ''}
    />
  );
}
