import React from 'react';
import { notFound } from 'next/navigation';
import { ExperienceService } from '@/server/services';
import { ExperienceForm } from '../../components/ExperienceForm';

export default async function AdminExperienceEditPage({
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

  return <ExperienceForm initialData={JSON.parse(JSON.stringify(experience))} />;
}
