import { WineCategory } from '@prisma/client';

const CATEGORY_LABELS: Record<string, string> = {
  RED: 'Red',
  WHITE: 'White',
  ROSE: 'Rosé',
  SPARKLING: 'Sparkling',
  RESERVE: 'Reserve',
  DESSERT: 'Dessert',
};

export function mapWineCategoryLabel(dbCategory: string): string {
  return CATEGORY_LABELS[dbCategory] || dbCategory;
}

export function mapWineCategoryToDb(label: string): WineCategory | null {
  const upper = label.toUpperCase();
  if (['RED', 'WHITE', 'ROSE', 'SPARKLING', 'RESERVE', 'DESSERT'].includes(upper)) {
    return upper as WineCategory;
  }
  // Handle Rosé accent
  if (label === 'Rosé' || label.toLowerCase() === 'rosé') return 'ROSE' as WineCategory;
  return null;
}

/**
 * Deterministic vintage selection for public price/display.
 * Rule: latest available vintage (highest vintageYear where isAvailable=true), fallback to latest vintage overall.
 * This is documented deterministic and does not invent Wine.price.
 */
export function selectDisplayVintage(vintages: Array<{ vintageYear: number; price: unknown; isAvailable: boolean }>) {
  if (!vintages || vintages.length === 0) return null;
  const available = vintages.filter(v => v.isAvailable);
  const pool = available.length > 0 ? available : vintages;
  return pool.reduce((best, cur) => (cur.vintageYear > best.vintageYear ? cur : best));
}

export interface PublicWineShape {
  id: string;
  slug: string;
  name: string;
  vintage: number;
  category: string;
  price: number;
  shortDescription: string;
  description: string;
  story: string;
  vineyardParcel: string;
  aroma: string[];
  tasteProfile: {
    body: number;
    acidity: number;
    sweetness: number;
    tannin: number;
    alcohol: string;
    oakAging: string;
  };
  tastingNotes: string;
  foodPairings: string[];
  servingTemp: string;
  cellarPotential: string;
  image: string;
  featured: boolean;
  rating: number;
  reviewCount: number;
  characteristics: string[];
}

export function toPublicWine(dbWine: {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  shortDescription: string;
  story: string | null;
  vineyardParcel: string | null;
  servingTemp: string | null;
  cellarPotential: string | null;
  featured: boolean;
  rating: unknown;
  reviewCount: number;
  characteristics: string[];
  vintages: Array<{ vintageYear: number; price: unknown; isAvailable: boolean; alcohol: string; oakAging: string | null; tastingNotes: string | null; aromaTags: string[]; body: number; acidity: number; sweetness: number; tannin: number }>;
  images: Array<{ url: string; isPrimary: boolean; sortOrder: number }>;
  foodPairings: Array<{ dishName: string }>;
}): PublicWineShape {
  const display = selectDisplayVintage(dbWine.vintages);
  const vintageYear = display?.vintageYear ?? (dbWine.vintages[0]?.vintageYear ?? new Date().getFullYear());
  const price = display ? Number(display.price) : 0;
  const alcohol = (display as { alcohol?: string })?.alcohol || dbWine.vintages[0]?.alcohol || '';
  const oakAging = (display as { oakAging?: string | null })?.oakAging || dbWine.vintages[0]?.oakAging || '';
  const aroma = (display as { aromaTags?: string[] })?.aromaTags || dbWine.vintages[0]?.aromaTags || [];
  const tastingNotes = (display as { tastingNotes?: string | null })?.tastingNotes || dbWine.vintages[0]?.tastingNotes || '';
  const body = (display as { body?: number })?.body ?? dbWine.vintages[0]?.body ?? 5;
  const acidity = (display as { acidity?: number })?.acidity ?? dbWine.vintages[0]?.acidity ?? 5;
  const sweetness = (display as { sweetness?: number })?.sweetness ?? dbWine.vintages[0]?.sweetness ?? 2;
  const tannin = (display as { tannin?: number })?.tannin ?? dbWine.vintages[0]?.tannin ?? 5;

  const sortedImages = [...dbWine.images].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return a.sortOrder - b.sortOrder;
  });
  const image = sortedImages[0]?.url || 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80';

  return {
    id: dbWine.id,
    slug: dbWine.slug,
    name: dbWine.name,
    vintage: vintageYear,
    category: mapWineCategoryLabel(dbWine.category),
    price,
    shortDescription: dbWine.shortDescription,
    description: dbWine.description,
    story: dbWine.story || '',
    vineyardParcel: dbWine.vineyardParcel || '',
    aroma,
    tasteProfile: { body, acidity, sweetness, tannin, alcohol, oakAging },
    tastingNotes,
    foodPairings: dbWine.foodPairings.map(f => f.dishName),
    servingTemp: dbWine.servingTemp || '',
    cellarPotential: dbWine.cellarPotential || '',
    image,
    featured: dbWine.featured,
    rating: Number(dbWine.rating),
    reviewCount: dbWine.reviewCount,
    characteristics: dbWine.characteristics,
  };
}
