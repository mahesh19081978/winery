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
