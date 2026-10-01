import React from 'react';
import { requirePagePermission } from '@/lib/auth/permissions';
import { ExperienceForm } from '../components/ExperienceForm';

export default async function AdminExperienceCreatePage() {
  await requirePagePermission('experiences.manage');

  return <ExperienceForm />;
}
