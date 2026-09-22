import React from 'react';
import { notFound } from 'next/navigation';
import { WineService } from '@/server/services';
import { WineEditClient } from './WineEditClient';

export default async function AdminWineEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let wine;
  try {
    wine = await WineService.getWineBySlugAdmin(slug);
  } catch {
    notFound();
  }
  if (!wine) notFound();
  return <WineEditClient wine={JSON.parse(JSON.stringify(wine))} />;
}
