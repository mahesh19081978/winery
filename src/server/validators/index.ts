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

export const ALLOWED_VARIETALS = [
  'Cabernet Sauvignon',
  'Cabernet Franc',
  'Merlot',
  'Pinot Noir',
  'Syrah',
  'Chardonnay',
  'Sauvignon Blanc',
  'Champagne / Sparkling',
  'Rosé',
] as const;

export const ALLOWED_SWEETNESS = [
  'Bone Dry (1–2)',
  'Dry (1–3)',
  'Off-Dry (4–6)',
  'Sweet / Dessert (7–10)',
] as const;

export const ALLOWED_BODY = [
  'Light & Delicate (2–4)',
  'Medium-Bodied (4–6)',
  'Full & Opulent (7–9)',
  'Monumental Reserve (9–10)',
] as const;

export const ALLOWED_ACIDITY = [
  'Soft & Mellow (3–5)',
  'Balanced (5–7)',
  'Vibrant & Crisp (6–8)',
  'Electric & Chalky (8–10)',
] as const;

export const GuestWineProfileUpdateSchema = z.object({
  favoriteVarietals: z.array(z.enum(ALLOWED_VARIETALS)).optional(),
  preferredSweetness: z.enum(ALLOWED_SWEETNESS).nullable().optional().or(z.literal('').transform(() => null)),
  preferredBody: z.enum(ALLOWED_BODY).nullable().optional().or(z.literal('').transform(() => null)),
  preferredAcidity: z.enum(ALLOWED_ACIDITY).nullable().optional().or(z.literal('').transform(() => null)),
  favoriteWineId: z.string().uuid('Favorite wine ID must be a valid UUID').nullable().optional().or(z.literal('').transform(() => null)),
});

export type GuestWineProfileUpdateInput = z.infer<typeof GuestWineProfileUpdateSchema>;

export const GuestProfileUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters').optional(),
  phone: z.string().trim().max(30, 'Phone must not exceed 30 characters').optional().nullable(),
  avatar: z.string().url('Avatar must be a valid URL').optional().nullable(),
  dietaryPreferences: z.string().max(1000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  notifications: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
  }).optional(),
  winePreferences: z.object({
    favoriteVarietals: z.array(z.string().trim().min(1)).optional(),
    preferredSweetness: z.string().trim().max(100).optional().nullable(),
    preferredBody: z.string().trim().max(100).optional().nullable(),
    preferredAcidity: z.string().trim().max(100).optional().nullable(),
    favoriteWineId: z.string().uuid('Favorite wine ID must be a valid UUID').optional().nullable(),
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

export const TastingSessionCreateSchema = z.object({
  bookingNumber: z.string().min(1, 'Booking number is required'),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export type TastingSessionCreateInput = z.infer<typeof TastingSessionCreateSchema>;

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

// --- Guest Reviews (Phase 6.7) ---
// Only guest-authored content fields. Identity (guestProfileId), moderation
// (status), and relational/author fields are NEVER accepted from the client;
// the server derives them from the authenticated session and database.
// bookingNumber targets a completed estate visit; eventBookingNumber targets a
// concluded event the guest attended. Exactly one must be provided. wineId is
// an optional visit-wine target that the server validates against wines the
// guest actually tasted on that visit — never trusted as an arbitrary Wine ID.
export const GuestReviewCreateSchema = z
  .object({
    bookingNumber: z.string().trim().min(1).optional(),
    eventBookingNumber: z.string().trim().min(1).optional(),
    wineId: z.string().trim().min(1).optional(),
    rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
    title: z.string().trim().min(3, 'Title must be at least 3 characters').max(191, 'Title must not exceed 191 characters'),
    comment: z.string().trim().min(10, 'Review comment must be at least 10 characters').max(5000, 'Review comment must not exceed 5000 characters'),
    category: z.enum(['WINE_TASTING', 'VINEYARD_TOUR', 'EVENTS', 'FOOD']),
  })
  .superRefine((data, ctx) => {
    const hasVisit = Boolean(data.bookingNumber);
    const hasEvent = Boolean(data.eventBookingNumber);
    if (hasVisit === hasEvent) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide exactly one of bookingNumber or eventBookingNumber',
      });
    }
    if (hasEvent && data.wineId) {
      ctx.addIssue({
        code: 'custom',
        message: 'wineId is only valid when reviewing a visit booking',
      });
    }
  });

export type GuestReviewCreateInput = z.infer<typeof GuestReviewCreateSchema>;

export const GuestReviewListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  search: z.string().trim().max(200).optional(),
});

export type GuestReviewListQuery = z.infer<typeof GuestReviewListQuerySchema>;

// --- Admin Review Moderation (Phase 6.9) ---
export const AdminReviewModerationSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT'], { message: 'Invalid action. Must be APPROVE or REJECT' }),
  reason: z.string().trim().max(1000).optional(),
});

export type AdminReviewModerationInput = z.infer<typeof AdminReviewModerationSchema>;

export const BookingStatusUpdateSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  notes: z.string().optional().default(''),
});

export type BookingStatusUpdateInput = z.infer<typeof BookingStatusUpdateSchema>;

export const AdminLoginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type AdminLoginInput = z.infer<typeof AdminLoginSchema>;

// --- Guest Authentication (Phase 6.1) ---
export const GuestRegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Valid email is required').transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  confirmPassword: z.string().min(8, 'Password confirmation is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type GuestRegisterInput = z.infer<typeof GuestRegisterSchema>;

export const GuestLoginSchema = z.object({
  email: z.string().email('Valid email is required').transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});

export type GuestLoginInput = z.infer<typeof GuestLoginSchema>;

export const GuestForgotPasswordSchema = z.object({
  email: z.string().email('Valid email is required').transform((v) => v.trim().toLowerCase()),
});

export type GuestForgotPasswordInput = z.infer<typeof GuestForgotPasswordSchema>;

export const GuestResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  confirmPassword: z.string().min(8, 'Password confirmation is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type GuestResetPasswordInput = z.infer<typeof GuestResetPasswordSchema>;

export const EventBookingTicketSelectionSchema = z.object({
  eventTicketTypeId: z.string().uuid('Valid ticket type ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(30, 'Quantity cannot exceed 30'),
});

export const EventBookingCreateSchema = z.object({
  eventId: z.string().uuid('Valid event ID is required'),
  eventScheduleId: z.string().uuid('Valid schedule ID is required'),
  guestName: z.string().min(2, 'Guest name must be at least 2 characters'),
  guestEmail: z.string().email('Invalid email address'),
  guestPhone: z.string().optional().default(''),
  tickets: z
    .array(EventBookingTicketSelectionSchema)
    .min(1, 'At least one ticket selection is required')
    .refine(
      (arr) => new Set(arr.map((t) => t.eventTicketTypeId)).size === arr.length,
      { message: 'Duplicate ticket type not allowed' }
    ),
});

export type EventBookingCreateInput = z.infer<typeof EventBookingCreateSchema>;

// --- Event Management Admin (Phase 5.11) ---
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const EventCreateSchema = z.object({
  slug: z.string().min(2).max(100).regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens (e.g. my-event)'),
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'eventDate must be YYYY-MM-DD'),
  timeRange: z.string().min(2, 'Time range is required').max(100),
  venue: z.string().min(2, 'Venue is required').max(200),
  price: z.number().min(0, 'Price cannot be negative').max(100000),
  currency: z.string().min(2).max(10).default('USD').optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  shortDescription: z.string().min(10, 'Short description must be at least 10 characters'),
  availability: z.enum(['AVAILABLE', 'FEW_SEATS_LEFT', 'SOLD_OUT']),
  availableTickets: z.number().int().min(0, 'Available tickets cannot be negative'),
  maxCapacity: z.number().int().min(0, 'Max capacity cannot be negative'),
  entertainment: z.string().max(500).optional().nullable(),
  featuredImage: z.string().min(1, 'Featured image is required').max(2000),
  winesServed: z.array(z.string().min(1)).default([]),
  culinaryMenu: z.array(z.string().min(1)).default([]),
  galleryImages: z.array(z.string().min(1)).default([]),
  isPast: z.boolean().default(false).optional(),
  status: z.enum(['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED']),
}).refine((data) => data.availableTickets <= data.maxCapacity, {
  message: 'availableTickets cannot exceed maxCapacity',
  path: ['availableTickets'],
});

export const EventUpdateSchema = z.object({
  slug: z.string().min(2).max(100).regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  title: z.string().min(2).max(200).optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'eventDate must be YYYY-MM-DD').optional(),
  timeRange: z.string().min(2).max(100).optional(),
  venue: z.string().min(2).max(200).optional(),
  price: z.number().min(0).max(100000).optional(),
  currency: z.string().min(2).max(10).optional(),
  description: z.string().min(10).optional(),
  shortDescription: z.string().min(10).optional(),
  availability: z.enum(['AVAILABLE', 'FEW_SEATS_LEFT', 'SOLD_OUT']).optional(),
  availableTickets: z.number().int().min(0).optional(),
  maxCapacity: z.number().int().min(0).optional(),
  entertainment: z.string().max(500).optional().nullable(),
  featuredImage: z.string().min(1).max(2000).optional(),
  winesServed: z.array(z.string().min(1)).optional(),
  culinaryMenu: z.array(z.string().min(1)).optional(),
  galleryImages: z.array(z.string().min(1)).optional(),
  isPast: z.boolean().optional(),
  status: z.enum(['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional(),
}).refine((data) => {
  if (data.availableTickets !== undefined && data.maxCapacity !== undefined) {
    return data.availableTickets <= data.maxCapacity;
  }
  return true;
}, {
  message: 'availableTickets cannot exceed maxCapacity',
  path: ['availableTickets'],
});

export type EventCreateInput = z.infer<typeof EventCreateSchema>;
export type EventUpdateInput = z.infer<typeof EventUpdateSchema>;

export const EventScheduleCreateSchema = z.object({
  timeSlot: z.string().min(1, 'Time slot is required').max(50),
  activity: z.string().min(2, 'Activity is required').max(500),
  sortOrder: z.number().int().min(0).default(0).optional(),
});
export const EventScheduleUpdateSchema = z.object({
  timeSlot: z.string().min(1).max(50).optional(),
  activity: z.string().min(2).max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
});
export type EventScheduleCreateInput = z.infer<typeof EventScheduleCreateSchema>;
export type EventScheduleUpdateInput = z.infer<typeof EventScheduleUpdateSchema>;

export const EventTicketTypeCreateSchema = z.object({
  name: z.string().min(2, 'Ticket name is required').max(100),
  price: z.number().min(0, 'Price cannot be negative').max(100000),
  capacity: z.number().int().min(0, 'Capacity cannot be negative').max(100000),
});
export const EventTicketTypeUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  price: z.number().min(0).max(100000).optional(),
  capacity: z.number().int().min(0).max(100000).optional(),
});
export type EventTicketTypeCreateInput = z.infer<typeof EventTicketTypeCreateSchema>;
export type EventTicketTypeUpdateInput = z.infer<typeof EventTicketTypeUpdateSchema>;

export const EventFAQCreateSchema = z.object({
  question: z.string().min(5, 'Question must be at least 5 characters').max(500),
  answer: z.string().min(10, 'Answer must be at least 10 characters'),
  sortOrder: z.number().int().min(0).default(0).optional(),
});
export const EventFAQUpdateSchema = z.object({
  question: z.string().min(5).max(500).optional(),
  answer: z.string().min(10).optional(),
  sortOrder: z.number().int().min(0).optional(),
});
export type EventFAQCreateInput = z.infer<typeof EventFAQCreateSchema>;
export type EventFAQUpdateInput = z.infer<typeof EventFAQUpdateSchema>;

// --- Wine Management Admin (Phase 5.12) ---
export const WineCreateSchema = z.object({
  slug: z.string().min(2).max(100).regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens (e.g. my-wine)'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  category: z.enum(['RED', 'WHITE', 'ROSE', 'SPARKLING', 'RESERVE', 'DESSERT']),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  shortDescription: z.string().min(10, 'Short description must be at least 10 characters'),
  story: z.string().max(5000).optional().nullable(),
  vineyardParcel: z.string().max(200).optional().nullable(),
  servingTemp: z.string().max(100).optional().nullable(),
  cellarPotential: z.string().max(200).optional().nullable(),
  featured: z.boolean().default(false).optional(),
  characteristics: z.array(z.string().min(1)).default([]),
  images: z.array(z.object({
    url: z.string().min(1, 'Image URL is required').max(2000),
    altText: z.string().max(500).optional().nullable(),
    isPrimary: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })).optional().default([]),
  foodPairings: z.array(z.object({
    dishName: z.string().min(1, 'Dish name is required').max(200),
    description: z.string().max(1000).optional().nullable(),
  })).optional().default([]),
});

export const WineUpdateSchema = z.object({
  slug: z.string().min(2).max(100).regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  name: z.string().min(2).max(200).optional(),
  category: z.enum(['RED', 'WHITE', 'ROSE', 'SPARKLING', 'RESERVE', 'DESSERT']).optional(),
  description: z.string().min(10).optional(),
  shortDescription: z.string().min(10).optional(),
  story: z.string().max(5000).optional().nullable(),
  vineyardParcel: z.string().max(200).optional().nullable(),
  servingTemp: z.string().max(100).optional().nullable(),
  cellarPotential: z.string().max(200).optional().nullable(),
  featured: z.boolean().optional(),
  characteristics: z.array(z.string().min(1)).optional(),
  images: z.array(z.object({
    url: z.string().min(1).max(2000),
    altText: z.string().max(500).optional().nullable(),
    isPrimary: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })).optional(),
  foodPairings: z.array(z.object({
    dishName: z.string().min(1).max(200),
    description: z.string().max(1000).optional().nullable(),
  })).optional(),
});

export type WineCreateInput = z.infer<typeof WineCreateSchema>;
export type WineUpdateInput = z.infer<typeof WineUpdateSchema>;

export const WineVintageCreateSchema = z.object({
  vintageYear: z.number().int().min(1900, 'Vintage year must be >= 1900').max(2100, 'Vintage year must be <= 2100'),
  price: z.number().min(0, 'Price cannot be negative').max(100000),
  currency: z.string().min(2).max(10).default('USD').optional(),
  alcohol: z.string().min(1, 'Alcohol is required').max(20),
  oakAging: z.string().max(500).optional().nullable(),
  tastingNotes: z.string().max(5000).optional().nullable(),
  aromaTags: z.array(z.string().min(1)).default([]),
  body: z.number().int().min(1).max(10).default(5),
  acidity: z.number().int().min(1).max(10).default(5),
  sweetness: z.number().int().min(1).max(10).default(2),
  tannin: z.number().int().min(1).max(10).default(5),
  isAvailable: z.boolean().default(true).optional(),
  inventoryCount: z.number().int().min(0, 'Inventory count cannot be negative').max(1000000).default(0),
});

export const WineVintageUpdateSchema = z.object({
  vintageYear: z.number().int().min(1900).max(2100).optional(),
  price: z.number().min(0).max(100000).optional(),
  currency: z.string().min(2).max(10).optional(),
  alcohol: z.string().min(1).max(20).optional(),
  oakAging: z.string().max(500).optional().nullable(),
  tastingNotes: z.string().max(5000).optional().nullable(),
  aromaTags: z.array(z.string().min(1)).optional(),
  body: z.number().int().min(1).max(10).optional(),
  acidity: z.number().int().min(1).max(10).optional(),
  sweetness: z.number().int().min(1).max(10).optional(),
  tannin: z.number().int().min(1).max(10).optional(),
  isAvailable: z.boolean().optional(),
  inventoryCount: z.number().int().min(0).max(1000000).optional(),
});

export type WineVintageCreateInput = z.infer<typeof WineVintageCreateSchema>;
export type WineVintageUpdateInput = z.infer<typeof WineVintageUpdateSchema>;

export const guestNotificationListQuerySchema = z.object({
  type: z.enum(['all', 'unread']).default('all'),
  page: z.preprocess((val) => (val === undefined || val === null || val === '' ? 1 : Number(val)), z.number().int().min(1)),
  pageSize: z.preprocess((val) => (val === undefined || val === null || val === '' ? 20 : Number(val)), z.number().int().min(1).max(50)),
});
export type GuestNotificationListQuery = z.infer<typeof guestNotificationListQuerySchema>;

export const guestNotificationActionSchema = z.object({
  action: z.literal('MARK_READ'),
});
export type GuestNotificationActionInput = z.infer<typeof guestNotificationActionSchema>;

export const guestNotificationBatchActionSchema = z.object({
  action: z.literal('MARK_ALL_READ'),
});
export type GuestNotificationBatchActionInput = z.infer<typeof guestNotificationBatchActionSchema>;
