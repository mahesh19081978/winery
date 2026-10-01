import React from 'react';
import { notFound } from 'next/navigation';
import { WineService } from '@/server/services';
import { requirePagePermission } from '@/lib/auth/permissions';
import { WineEditClient } from './WineEditClient';

export default async function AdminWineEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await requirePagePermission('wines.manage');
  const { slug } = await params;
  let wine;
  try {
    wine = await WineService.getWineBySlugAdmin(slug);
  } catch {
    notFound();
  }
  if (!wine) notFound();
  if (session.role !== 'SUPER_ADMIN' && wine.wineryId && wine.wineryId !== session.wineryId) notFound();
  return <WineEditClient wine={JSON.parse(JSON.stringify(wine))} />;
}
