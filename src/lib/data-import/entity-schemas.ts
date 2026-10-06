import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Helper to parse pipe-separated arrays: "item1 | item2" -> ["item1", "item2"] */
export function parsePipedArray(val?: string | null): string[] {
  if (!val) return [];
  return val
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Helper to parse booleans */
export function parseBoolean(val?: string | null, defaultValue = false): boolean {
  if (val === undefined || val === null || val === '') return defaultValue;
  const lower = val.toLowerCase().trim();
  return lower === 'true' || lower === 'yes' || lower === '1';
}

/** Helper to parse numbers */
export function parseNumber(val?: string | null, defaultValue?: number): number | undefined {
  if (val === undefined || val === null || val === '') return defaultValue;
  const num = Number(val);
  return isNaN(num) ? defaultValue : num;
}

// ==========================================
// 1. WINE SCHEMA & SPECIFICATION
// ==========================================

export const WINE_CSV_HEADERS = [
  'slug',
  'name',
  'category',
  'shortDescription',
  'description',
  'story',
  'vineyardParcel',
  'servingTemp',
  'cellarPotential',
  'featured',
  'characteristics',
  'vintageYear',
  'price',
  'alcohol',
  'oakAging',
  'tastingNotes',
  'aromaTags',
  'body',
  'acidity',
  'sweetness',
  'tannin',
  'imageUrl',
  'foodPairings',
] as const;

export const WINE_REQUIRED_HEADERS = [
  'slug',
  'name',
  'category',
  'shortDescription',
  'description',
] as const;

export const WineImportRowSchema = z.object({
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100)
    .regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens (e.g. estate-cabernet)'),
  name: z.string().min(2, 'Wine name must be at least 2 characters').max(200),
  category: z.enum(['RED', 'WHITE', 'ROSE', 'SPARKLING', 'RESERVE', 'DESSERT'], {
    message: 'Category must be one of: RED, WHITE, ROSE, SPARKLING, RESERVE, DESSERT',
  }),
  shortDescription: z.string().min(10, 'Short description must be at least 10 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  story: z.string().max(5000).optional().nullable(),
  vineyardParcel: z.string().max(200).optional().nullable(),
  servingTemp: z.string().max(100).optional().nullable(),
  cellarPotential: z.string().max(200).optional().nullable(),
  featured: z.boolean().default(false),
  characteristics: z.array(z.string()).default([]),
  vintageYear: z.number().int().min(1900).max(2100).optional().nullable(),
  price: z.number().min(0, 'Price must be >= 0').optional().nullable(),
  alcohol: z.string().max(20).optional().nullable(),
  oakAging: z.string().max(500).optional().nullable(),
  tastingNotes: z.string().max(5000).optional().nullable(),
  aromaTags: z.array(z.string()).default([]),
  body: z.number().int().min(1).max(10).optional().nullable(),
  acidity: z.number().int().min(1).max(10).optional().nullable(),
  sweetness: z.number().int().min(1).max(10).optional().nullable(),
  tannin: z.number().int().min(1).max(10).optional().nullable(),
  imageUrl: z.string().url('Image URL must be valid').or(z.string().startsWith('/')).optional().nullable(),
  foodPairings: z.array(z.string()).default([]),
});

export type WineImportRow = z.infer<typeof WineImportRowSchema>;

// ==========================================
// 2. EXPERIENCE SCHEMA & SPECIFICATION
// ==========================================

export const EXPERIENCE_CSV_HEADERS = [
  'slug',
  'title',
  'category',
  'durationMinutes',
  'durationText',
  'price',
  'currency',
  'shortDescription',
  'description',
  'capacity',
  'minGuests',
  'maxGuests',
  'foodPairing',
  'highlights',
  'includedItems',
  'guestExpectations',
  'importantInfo',
  'featured',
  'badge',
  'isActive',
  'imageUrl',
] as const;

export const EXPERIENCE_REQUIRED_HEADERS = [
  'slug',
  'title',
  'category',
  'durationMinutes',
  'price',
  'shortDescription',
  'description',
] as const;

export const ExperienceImportRowSchema = z.object({
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100)
    .regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens (e.g. signature-tasting)'),
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  category: z.enum(['TASTING', 'TOUR', 'CULINARY', 'PRIVATE'], {
    message: 'Category must be one of: TASTING, TOUR, CULINARY, PRIVATE',
  }),
  durationMinutes: z.number().int().min(5, 'Duration must be at least 5 minutes').max(1440),
  durationText: z.string().max(50).default('60 Minutes'),
  price: z.number().min(0, 'Price must be >= 0').max(100000),
  currency: z.string().min(2).max(10).default('USD'),
  shortDescription: z.string().min(10, 'Short description must be at least 10 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  capacity: z.number().int().min(1).max(500).default(12),
  minGuests: z.number().int().min(1).default(1),
  maxGuests: z.number().int().min(1).default(12),
  foodPairing: z.string().max(1000).optional().nullable(),
  highlights: z.array(z.string()).default([]),
  includedItems: z.array(z.string()).default([]),
  guestExpectations: z.array(z.string()).default([]),
  importantInfo: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  badge: z.string().max(50).optional().nullable(),
  isActive: z.boolean().default(true),
  imageUrl: z.string().url('Image URL must be valid').or(z.string().startsWith('/')).optional().nullable(),
});

export type ExperienceImportRow = z.infer<typeof ExperienceImportRowSchema>;

// ==========================================
// 3. EVENT SCHEMA & SPECIFICATION
// ==========================================

export const EVENT_CSV_HEADERS = [
  'slug',
  'title',
  'eventDate',
  'timeRange',
  'venue',
  'price',
  'currency',
  'shortDescription',
  'description',
  'availableTickets',
  'maxCapacity',
  'availability',
  'status',
  'featuredImage',
  'entertainment',
  'winesServed',
  'culinaryMenu',
] as const;

export const EVENT_REQUIRED_HEADERS = [
  'slug',
  'title',
  'eventDate',
  'timeRange',
  'venue',
  'price',
  'shortDescription',
  'description',
  'availableTickets',
  'maxCapacity',
  'featuredImage',
] as const;

export const EventImportRowSchema = z
  .object({
    slug: z
      .string()
      .min(2, 'Slug must be at least 2 characters')
      .max(100)
      .regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens (e.g. harvest-gala-2026)'),
    title: z.string().min(2, 'Title must be at least 2 characters').max(200),
    eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'eventDate must be in YYYY-MM-DD format'),
    timeRange: z.string().min(2, 'Time range is required').max(100),
    venue: z.string().min(2, 'Venue is required').max(200),
    price: z.number().min(0, 'Price must be >= 0').max(100000),
    currency: z.string().min(2).max(10).default('USD'),
    shortDescription: z.string().min(10, 'Short description must be at least 10 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    availableTickets: z.number().int().min(0, 'availableTickets must be >= 0'),
    maxCapacity: z.number().int().min(0, 'maxCapacity must be >= 0'),
    availability: z
      .enum(['AVAILABLE', 'FEW_SEATS_LEFT', 'SOLD_OUT'], {
        message: 'Availability must be one of: AVAILABLE, FEW_SEATS_LEFT, SOLD_OUT',
      })
      .default('AVAILABLE'),
    status: z
      .enum(['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'], {
        message: 'Status must be one of: UPCOMING, ONGOING, COMPLETED, CANCELLED',
      })
      .default('UPCOMING'),
    featuredImage: z.string().min(1, 'Featured image is required').max(2000),
    entertainment: z.string().max(500).optional().nullable(),
    winesServed: z.array(z.string()).default([]),
    culinaryMenu: z.array(z.string()).default([]),
  })
  .refine((data) => data.availableTickets <= data.maxCapacity, {
    message: 'availableTickets cannot exceed maxCapacity',
    path: ['availableTickets'],
  });

export type EventImportRow = z.infer<typeof EventImportRowSchema>;
