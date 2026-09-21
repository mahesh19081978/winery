import { z } from 'zod';

export const BookingCreateSchema = z.object({
  experienceSlug: z.string().min(1, 'Experience slug is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time: z.string().min(1, 'Time is required'),
  adults: z.number().int().min(1, 'At least 1 adult is required').max(30),
  children: z.number().int().min(0).default(0),
  guestName: z.string().min(2, 'Guest name must be at least 2 characters'),
  guestEmail: z.string().email('Invalid email address'),
  guestPhone: z.string().optional().default(''),
  specialRequests: z.string().optional().default(''),
  dietaryRequirements: z.string().optional().default(''),
});

export type BookingCreateInput = z.infer<typeof BookingCreateSchema>;

export const GuestProfileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
  dietaryPreferences: z.string().optional(),
  notes: z.string().optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
  }).optional(),
  winePreferences: z.object({
    favoriteVarietals: z.array(z.string()).optional(),
    preferredSweetness: z.string().optional(),
    preferredBody: z.string().optional(),
    preferredAcidity: z.string().optional(),
    favoriteWineId: z.string().optional(),
  }).optional(),
});

export type GuestProfileUpdateInput = z.infer<typeof GuestProfileUpdateSchema>;

export const TastingRecordCreateSchema = z.object({
  guestEmail: z.string().email('Guest email is required'),
  wineSlug: z.string().min(1, 'Wine slug is required'),
  vintageYear: z.number().int().min(1900).max(2100).optional(),
  wineVintageId: z.string().uuid().optional(),
  rating: z.number().min(1).max(5),
  notes: z.string().min(1, 'Notes are required'),
  tasteCharacteristics: z.array(z.string()).default([]),
  wouldDrinkAgain: z.enum(['YES', 'MAYBE', 'NO']).default('YES'),
  experienceName: z.string().optional(),
  body: z.number().int().min(1).max(10).default(5),
  acidity: z.number().int().min(1).max(10).default(5),
  sweetness: z.number().int().min(1).max(10).default(2),
  tannin: z.number().int().min(1).max(10).default(5),
}).refine((data) => data.vintageYear !== undefined || data.wineVintageId !== undefined, {
  message: 'Either vintageYear or wineVintageId must be provided explicitly',
  path: ['vintageYear'],
});

export type TastingRecordCreateInput = z.infer<typeof TastingRecordCreateSchema>;

export const ReviewCreateSchema = z.object({
  authorName: z.string().min(2, 'Author name is required'),
  guestEmail: z.string().email().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  comment: z.string().min(10, 'Review comment must be at least 10 characters'),
  category: z.enum(['WINE_TASTING', 'VINEYARD_TOUR', 'EVENTS', 'FOOD']),
  targetName: z.string().min(1, 'Target name is required'),
  experienceSlug: z.string().optional(),
  wineSlug: z.string().optional(),
  eventSlug: z.string().optional(),
  bookingNumber: z.string().optional(),
});

export type ReviewCreateInput = z.infer<typeof ReviewCreateSchema>;
export const AdminLoginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type AdminLoginInput = z.infer<typeof AdminLoginSchema>;
