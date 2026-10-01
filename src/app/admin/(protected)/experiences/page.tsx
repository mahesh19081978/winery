import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { ExperiencesListClient } from './ExperiencesListClient';

export default async function AdminExperiencesPage() {
  await requirePagePermission('experiences.view');

  return <ExperiencesListClient />;
}
