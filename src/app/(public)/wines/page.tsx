import React from 'react';
import { WineService } from '@/server/services';
import { toPublicWine } from '@/lib/wine-map';
import WinesClient from './WinesClient';

export const dynamic = 'force-dynamic';

export default async function WinesPage() {
  let publicWines: ReturnType<typeof toPublicWine>[] = [];
  try {
    const dbWines = await WineService.getAllWines();
    publicWines = dbWines.map((w) => toPublicWine(w as unknown as Parameters<typeof toPublicWine>[0]));
  } catch {
    publicWines = [];
  }
  return <WinesClient wines={publicWines} />;
}
