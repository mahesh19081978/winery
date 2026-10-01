import React from 'react';
import { notFound } from 'next/navigation';
import { ExperienceService } from '@/server/services';
import { requirePagePermission } from '@/lib/auth/permissions';
import { ExperienceDetailClient } from './ExperienceDetailClient';

export default async function AdminExperienceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requirePagePermission('experiences.view');
  const { slug } = await params;

  let experience;
  try {
    experience = await ExperienceService.getExperienceBySlugAdmin(slug);
  } catch {
    notFound();
  }

  if (!experience) {
    notFound();
  }

  if (session.role !== 'SUPER_ADMIN' && session.wineryId && experience.wineryId !== session.wineryId) {
    notFound();
  }

  return <ExperienceDetailClient experience={JSON.parse(JSON.stringify(experience))} />;
}
