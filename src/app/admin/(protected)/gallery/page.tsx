import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { GalleryAdminClient } from './GalleryAdminClient';

export const metadata = {
  title: 'Estate Visual Assets & Gallery | VINORA Admin',
  description: 'Curate estate photography, cellar visuals, vineyard harvest assets, and visitor highlights',
};

export default async function AdminGalleryPage() {
  await requirePagePermission('gallery.manage');

  return <GalleryAdminClient />;
}
