import React from 'react';
import { notFound } from 'next/navigation';
import { WineService } from '@/server/services';
import { WineDetailClient } from './WineDetailClient';

export default async function AdminWineDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let wine;
  try {
    wine = await WineService.getWineBySlugAdmin(slug);
  } catch {
    notFound();
  }

  if (!wine) {
    notFound();
  }

  return <WineDetailClient wine={JSON.parse(JSON.stringify(wine))} />;
}
