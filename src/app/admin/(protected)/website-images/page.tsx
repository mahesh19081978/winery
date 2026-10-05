import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { WebsiteImageService } from '@/server/services';
import { WebsiteImageRepository } from '@/server/repositories';
import { WebsiteImagesClient } from './WebsiteImagesClient';

export const metadata = {
  title: 'Website Images | VINORA Admin',
  description: 'Replace hero and marketing imagery used across the public VINORA website',
};

export default async function AdminWebsiteImagesPage() {
  const session = await requirePagePermission('website.images.manage');

  let wineryId = session.wineryId ?? null;
  if (!wineryId) {
    wineryId = await WebsiteImageRepository.findDefaultWineryId();
  }

  const initialRecords = wineryId
    ? await WebsiteImageService.getAdminRecords(wineryId)
    : [];

  return <WebsiteImagesClient initialRecords={initialRecords} />;
}
