import { ExperienceService, WebsiteImageService } from '@/server/services';
import { toExperienceView } from '@/lib/experiences';
import ExperienceListClient from './ExperienceListClient';

export const dynamic = 'force-dynamic';

export default async function ExperiencesPage() {
  const dbExperiences = await ExperienceService.getAllExperiences();
  const experiences = dbExperiences.map(toExperienceView);
  const hero = await WebsiteImageService.resolvePublicImage('EXPERIENCES_HERO');

  return (
    <ExperienceListClient experiences={experiences} hero={{ url: hero.url, alt: hero.alt }} />
  );
}
