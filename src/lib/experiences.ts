import type { Experience } from '@/types';

export const CATEGORY_LABELS: Record<string, Experience['category']> = {
  TASTING: 'Tasting',
  TOUR: 'Tour',
  CULINARY: 'Culinary',
  PRIVATE: 'Private',
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=85';

type DbExperience = {
  id: string;
  slug: string;
  title: string;
  category: string;
  durationMinutes: number;
  durationText: string;
  price: { toString(): string };
  capacity: number;
  minGuests: number;
  maxGuests: number;
  shortDescription: string;
  description: string;
  rating: { toString(): string };
  reviewCount: number;
  highlights: string[];
  includedItems: string[];
  guestExpectations: string[];
  importantInfo: string[];
  foodPairing: string | null;
  featured: boolean;
  badge: string | null;
  images: { url: string; isPrimary: boolean }[];
  faqs: { question: string; answer: string }[];
  timelines: { timeRange: string; title: string; description: string }[];
  includedWines: { notes: string | null; wine: { name: string } }[];
};

export function toExperienceView(exp: DbExperience): Experience {
  const primaryImage =
    exp.images.find((image) => image.isPrimary)?.url || exp.images[0]?.url || FALLBACK_IMAGE;

  return {
    id: exp.id,
    slug: exp.slug,
    title: exp.title,
    category: CATEGORY_LABELS[exp.category] || 'Tasting',
    duration: exp.durationText || `${exp.durationMinutes} Minutes`,
    price: Number(exp.price),
    capacity: exp.capacity,
    minGuests: exp.minGuests,
    maxGuests: exp.maxGuests,
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
