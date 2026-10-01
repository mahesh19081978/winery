import React from 'react';
import { notFound } from 'next/navigation';
import { ExperienceService } from '@/server/services';
import { requirePagePermission } from '@/lib/auth/permissions';
import { ExperienceForm } from '../../components/ExperienceForm';

export default async function AdminExperienceEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requirePagePermission('experiences.manage');
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
