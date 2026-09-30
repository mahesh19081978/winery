import { ExperienceService } from '@/server/services';
import { toExperienceView } from '@/lib/experiences';
import ExperienceListClient from './ExperienceListClient';

export const dynamic = 'force-dynamic';

export default async function ExperiencesPage() {
  const dbExperiences = await ExperienceService.getAllExperiences();
  const experiences = dbExperiences.map(toExperienceView);

  return <ExperienceListClient experiences={experiences} />;
}
