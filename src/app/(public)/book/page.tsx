import React, { Suspense } from 'react';
import { ExperienceService } from '@/server/services';
import { mockExperiences } from '@/data/experiences';
import type { Experience } from '@/types';
import BookingContent from './BookingContent';

export const dynamic = 'force-dynamic';

type DbExperience = Awaited<ReturnType<typeof ExperienceService.getAllExperiences>>[number];

const CATEGORY_LABELS: Record<string, Experience['category']> = {
  TASTING: 'Tasting',
  TOUR: 'Tour',
  CULINARY: 'Culinary',
  PRIVATE: 'Private',
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=85';

function toBookExperience(exp: DbExperience): Experience {
  const primaryImage =
    exp.images.find((image) => image.isPrimary)?.url || exp.images[0]?.url || FALLBACK_IMAGE;

  return {
    id: exp.id,
    slug: exp.slug,
    title: exp.title,
    category: CATEGORY_LABELS[exp.category] || 'Tasting',
    duration: exp.durationText || `${exp.durationMinutes} Minutes`,
    price: Number(exp.price),
    shortDescription: exp.shortDescription,
    description: exp.description,
    rating: Number(exp.rating),
    reviewCount: exp.reviewCount,
    winesCount: exp.includedWines.length,
    highlights: exp.highlights || [],
    included: exp.includedItems || [],
    includedWines: exp.includedWines.map((ew) => ew.notes || ew.wine.name),
    timeline: exp.timelines.map((t) => ({
      time: t.timeRange,
      title: t.title,
      description: t.description,
    })),
    foodPairing: exp.foodPairing || '',
    guestExpectations: exp.guestExpectations || [],
    importantInfo: exp.importantInfo || [],
    faqs: exp.faqs.map((f) => ({ question: f.question, answer: f.answer })),
    image: primaryImage,
    featured: exp.featured,
    badge: exp.badge || undefined,
  };
}

function buildLegacyIdAlias(): Record<string, string> {
  const legacyIdToSlug: Record<string, string> = {};
  for (const mock of mockExperiences) {
    legacyIdToSlug[mock.id] = mock.slug;
  }
  return legacyIdToSlug;
}

export default async function BookingPage() {
  const dbExperiences = await ExperienceService.getAllExperiences();
  const experiences = dbExperiences.map(toBookExperience);
  const legacyIdToSlug = buildLegacyIdAlias();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen pt-32 pb-24 text-center">Loading reservation engine...</div>
      }
    >
      <BookingContent experiences={experiences} legacyIdToSlug={legacyIdToSlug} />
    </Suspense>
  );
}
