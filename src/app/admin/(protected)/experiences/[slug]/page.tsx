import React from 'react';
import { notFound } from 'next/navigation';
import { ExperienceService } from '@/server/services';
import { ExperienceDetailClient } from './ExperienceDetailClient';

export default async function AdminExperienceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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

  return <ExperienceDetailClient experience={JSON.parse(JSON.stringify(experience))} />;
}
