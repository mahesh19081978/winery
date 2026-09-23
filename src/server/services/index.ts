import {
  WineRepository,
  WineVintageRepository,
  ExperienceRepository,
  EventRepository,
  EventScheduleRepository,
  EventTicketTypeRepository,
  EventFAQRepository,
  AvailabilityRepository,
  BookingRepository,
  EventBookingRepository,
  FrontDeskRepository,
  GuestRepository,
  TastingRepository,
  ReviewRepository,
} from '../repositories';
import {
  BookingCreateInput,
  EventBookingCreateInput,
  GuestProfileUpdateInput,
  TastingRecordCreateInput,
  ReviewCreateInput,
  TastingSessionCreateInput,
  EventCreateInput,
  EventUpdateInput,
  EventScheduleCreateInput,
  EventScheduleUpdateInput,
  EventTicketTypeCreateInput,
  EventTicketTypeUpdateInput,
  EventFAQCreateInput,
  EventFAQUpdateInput,
  WineCreateInput,
  WineUpdateInput,
  WineVintageCreateInput,
  WineVintageUpdateInput,
} from '../validators';
import { prisma } from '@/lib/db';
import { BookingStatus, Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

export class EventBookingError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'EventBookingError';
    this.statusCode = statusCode;
  }
}

function generateEventBookingNumber(): string {
  const year = new Date().getFullYear();
  const randomCode = Math.floor(10000 + Math.random() * 90000);
  return `EVT-${year}-${randomCode}`;
}

function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  );
}

export class WineService {
  static async getAllWines() {
    return WineRepository.findAll();
  }

  static async getWineBySlug(slug: string) {
    const wine = await WineRepository.findBySlug(slug);
    if (!wine) {
      throw new Error(`Wine with slug '${slug}' not found`);
    }
    return wine;
  }

  static async listWinesAdmin(filters: {
    search?: string;
    category?: string;
    featured?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    return WineRepository.findAllAdmin(filters);
  }

  static async getWineBySlugAdmin(slug: string) {
    const wine = await WineRepository.findBySlugAdmin(slug);
    if (!wine) {
      throw new Error(`Wine with slug '${slug}' not found`);
    }
    return wine;
  }

  private static async resolveWineryId(): Promise<string> {
    const winery = await prisma.winery.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (!winery) throw new EventBookingError('Default winery not found', 500);
    return winery.id;
  }

  static async createWine(input: WineCreateInput) {
    const wineryId = await this.resolveWineryId();
    const existing = await WineRepository.findBySlugForWinery(wineryId, input.slug);
    if (existing) throw new EventBookingError(`Slug '${input.slug}' already exists`, 409);

    const data: Prisma.WineCreateInput = {
      winery: { connect: { id: wineryId } },
      slug: input.slug,
      name: input.name,
      category: input.category as import('@prisma/client').WineCategory,
      description: input.description,
      shortDescription: input.shortDescription,
      story: input.story || null,
      vineyardParcel: input.vineyardParcel || null,
      servingTemp: input.servingTemp || null,
      cellarPotential: input.cellarPotential || null,
      featured: input.featured ?? false,
      rating: new Prisma.Decimal(0),
      reviewCount: 0,
      characteristics: input.characteristics || [],
    };

    if (input.images && input.images.length > 0) {
      data.images = {
        createMany: {
          data: input.images.map((image, index) => ({
            url: image.url,
            altText: image.altText || null,
            isPrimary: image.isPrimary ?? index === 0,
            sortOrder: image.sortOrder ?? index,
          })),
        },
      };
    }

    if (input.foodPairings && input.foodPairings.length > 0) {
      data.foodPairings = {
        createMany: {
          data: input.foodPairings.map((pairing) => ({
            dishName: pairing.dishName,
            description: pairing.description || null,
          })),
        },
      };
    }

    return prisma.wine.create({
      data,
      include: { vintages: true, images: true, foodPairings: true },
    });
  }

  static async updateWine(slug: string, input: WineUpdateInput) {
    const existing = await WineRepository.findBySlugForMutation(slug);
    if (!existing) throw new EventBookingError(`Wine with slug '${slug}' not found`, 404);

    if (input.slug && input.slug !== existing.slug) {
      const dupe = await WineRepository.findBySlugForWinery(existing.wineryId, input.slug);
      if (dupe && dupe.id !== existing.id) throw new EventBookingError(`Slug '${input.slug}' already exists`, 409);
    }

    const data: Prisma.WineUpdateInput = {};
    if (input.slug !== undefined) data.slug = input.slug;
    if (input.name !== undefined) data.name = input.name;
    if (input.category !== undefined) data.category = input.category as import('@prisma/client').WineCategory;
    if (input.description !== undefined) data.description = input.description;
    if (input.shortDescription !== undefined) data.shortDescription = input.shortDescription;
    if (input.story !== undefined) data.story = input.story;
    if (input.vineyardParcel !== undefined) data.vineyardParcel = input.vineyardParcel;
    if (input.servingTemp !== undefined) data.servingTemp = input.servingTemp;
    if (input.cellarPotential !== undefined) data.cellarPotential = input.cellarPotential;
    if (input.featured !== undefined) data.featured = input.featured;
    if (input.characteristics !== undefined) data.characteristics = input.characteristics;

    if (input.images !== undefined) {
      data.images = {
        deleteMany: {},
        createMany: {
          data: input.images.map((image, index) => ({
            url: image.url,
            altText: image.altText || null,
            isPrimary: image.isPrimary ?? index === 0,
            sortOrder: image.sortOrder ?? index,
          })),
        },
      };
    }

    if (input.foodPairings !== undefined) {
      data.foodPairings = {
        deleteMany: {},
        createMany: {
          data: input.foodPairings.map((pairing) => ({
            dishName: pairing.dishName,
            description: pairing.description || null,
          })),
        },
      };
    }

    if (input.images !== undefined || input.foodPairings !== undefined) {
      return prisma.wine.update({
        where: { id: existing.id },
        data,
        include: { vintages: true, images: true, foodPairings: true },
      });
    }

    return WineRepository.update(existing.id, data);
  }

  static async deleteWine(slug: string) {
    const existing = await prisma.wine.findFirst({ where: { slug }, select: { id: true, slug: true } });
    if (!existing) throw new EventBookingError(`Wine with slug '${slug}' not found`, 404);

    const expCount = await WineRepository.countExperienceWines(existing.id);
    if (expCount > 0) throw new EventBookingError(`Cannot delete this wine because it is used by ${expCount} experience(s).`, 409);

    const tastingCount = await WineRepository.countTastingRecordsForWine(existing.id);
    if (tastingCount > 0) throw new EventBookingError(`Cannot delete this wine because its vintages have ${tastingCount} historical tasting record(s).`, 409);

    return WineRepository.delete(existing.id);
  }

  // Vintage CRUD
  static async createVintage(wineId: string, input: WineVintageCreateInput) {
    const wine = await WineRepository.findById(wineId);
    if (!wine) throw new EventBookingError(`Wine with id '${wineId}' not found`, 404);

    const existing = await WineVintageRepository.findByWineIdAndYear(wineId, input.vintageYear);
    if (existing) throw new EventBookingError(`Vintage year ${input.vintageYear} already exists for this wine`, 409);

    const data: Prisma.WineVintageCreateInput = {
      wine: { connect: { id: wineId } },
      vintageYear: input.vintageYear,
      price: new Prisma.Decimal(input.price.toFixed(2)),
      currency: input.currency || 'USD',
      alcohol: input.alcohol,
      oakAging: input.oakAging || null,
      tastingNotes: input.tastingNotes || null,
      aromaTags: input.aromaTags || [],
      body: input.body ?? 5,
      acidity: input.acidity ?? 5,
      sweetness: input.sweetness ?? 2,
      tannin: input.tannin ?? 5,
      isAvailable: input.isAvailable ?? true,
      inventoryCount: input.inventoryCount ?? 0,
    };
    return WineVintageRepository.create(data);
  }

  static async updateVintage(wineId: string, vintageId: string, input: WineVintageUpdateInput) {
    const vintage = await WineVintageRepository.findById(vintageId);
    if (!vintage || vintage.wineId !== wineId) throw new EventBookingError('Vintage not found for this wine', 404);

    if (input.vintageYear !== undefined && input.vintageYear !== vintage.vintageYear) {
      const tastingCount = await WineVintageRepository.countTastingRecords(vintageId);
      if (tastingCount > 0) throw new EventBookingError(`Cannot change vintage year because it has ${tastingCount} historical tasting record(s).`, 409);
      const dupe = await WineVintageRepository.findByWineIdAndYear(wineId, input.vintageYear);
      if (dupe && dupe.id !== vintageId) throw new EventBookingError(`Vintage year ${input.vintageYear} already exists for this wine`, 409);
    }

    const data: Prisma.WineVintageUpdateInput = {};
    if (input.vintageYear !== undefined) data.vintageYear = input.vintageYear;
    if (input.price !== undefined) data.price = new Prisma.Decimal(input.price.toFixed(2));
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.alcohol !== undefined) data.alcohol = input.alcohol;
    if (input.oakAging !== undefined) data.oakAging = input.oakAging;
    if (input.tastingNotes !== undefined) data.tastingNotes = input.tastingNotes;
    if (input.aromaTags !== undefined) data.aromaTags = input.aromaTags;
    if (input.body !== undefined) data.body = input.body;
    if (input.acidity !== undefined) data.acidity = input.acidity;
    if (input.sweetness !== undefined) data.sweetness = input.sweetness;
    if (input.tannin !== undefined) data.tannin = input.tannin;
    if (input.isAvailable !== undefined) data.isAvailable = input.isAvailable;
    if (input.inventoryCount !== undefined) data.inventoryCount = input.inventoryCount;

    return WineVintageRepository.update(vintageId, data);
  }

  static async deleteVintage(wineId: string, vintageId: string) {
    const vintage = await WineVintageRepository.findById(vintageId);
    if (!vintage || vintage.wineId !== wineId) throw new EventBookingError('Vintage not found for this wine', 404);

    const count = await WineVintageRepository.countTastingRecords(vintageId);
    if (count > 0) throw new EventBookingError(`Cannot delete vintage ${vintage.vintageYear} because it has ${count} historical tasting record(s).`, 409);

    return WineVintageRepository.delete(vintageId);
  }
}

export class ExperienceService {
  static async getAllExperiences() {
    return ExperienceRepository.findAll();
  }

  static async getExperienceBySlug(slug: string) {
    const experience = await ExperienceRepository.findBySlug(slug);
    if (!experience) {
      throw new Error(`Experience with slug '${slug}' not found`);
    }
    return experience;
  }

  static async listExperiencesAdmin(filters: {
    search?: string;
    category?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    return ExperienceRepository.findAllAdmin(filters);
  }

  static async getExperienceBySlugAdmin(slug: string) {
    const experience = await ExperienceRepository.findBySlugAdmin(slug);
    if (!experience) {
      throw new Error(`Experience with slug '${slug}' not found`);
    }
    return experience;
  }
}

export class EventService {
  static async getAllEvents() {
    return EventRepository.findAll();
  }

  static async getEventBySlug(slug: string) {
    const event = await EventRepository.findBySlug(slug);
    if (!event) {
      throw new Error(`Event with slug '${slug}' not found`);
    }
    return event;
  }

  static async listEventsAdmin(filters: {
    search?: string;
    status?: string;
    availability?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    return EventRepository.findAllAdmin(filters);
  }

  static async getEventAdmin(id: string) {
    const event = await EventRepository.findByIdAdmin(id);
    if (!event) {
      throw new Error(`Event with id '${id}' not found`);
    }
    return event;
  }

  private static async resolveWineryId(): Promise<string> {
    const winery = await prisma.winery.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (!winery) throw new Error('Default winery not found');
    return winery.id;
  }

  static async createEvent(input: EventCreateInput) {
    const wineryId = await this.resolveWineryId();
    const existing = await EventRepository.findBySlugForWinery(wineryId, input.slug);
    if (existing) {
      throw new EventBookingError(`Slug '${input.slug}' already exists`, 409);
    }
    const eventDate = new Date(input.eventDate);
    if (isNaN(eventDate.getTime())) throw new EventBookingError('Invalid eventDate', 400);
    const data: Prisma.EventCreateInput = {
      winery: { connect: { id: wineryId } },
      slug: input.slug,
      title: input.title,
      eventDate,
      timeRange: input.timeRange,
      venue: input.venue,
      price: new Prisma.Decimal(input.price.toFixed(2)),
      currency: input.currency || 'USD',
      description: input.description,
      shortDescription: input.shortDescription,
      availability: input.availability as import('@prisma/client').EventAvailability,
      availableTickets: input.availableTickets,
      maxCapacity: input.maxCapacity,
      entertainment: input.entertainment || null,
      featuredImage: input.featuredImage,
      winesServed: input.winesServed || [],
      culinaryMenu: input.culinaryMenu || [],
      galleryImages: input.galleryImages || [],
      isPast: input.isPast ?? false,
      status: input.status as import('@prisma/client').EventStatus,
    };
    return EventRepository.create(data);
  }

  static async updateEvent(id: string, input: EventUpdateInput) {
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) throw new EventBookingError(`Event with id '${id}' not found`, 404);
    // Slug uniqueness check if changed
    if (input.slug && input.slug !== existing.slug) {
      const dupe = await EventRepository.findBySlugForWinery(existing.wineryId, input.slug);
      if (dupe && dupe.id !== id) {
        throw new EventBookingError(`Slug '${input.slug}' already exists`, 409);
      }
    }
    const data: Prisma.EventUpdateInput = {};
    if (input.slug !== undefined) data.slug = input.slug;
    if (input.title !== undefined) data.title = input.title;
    if (input.eventDate !== undefined) {
      const d = new Date(input.eventDate);
      if (isNaN(d.getTime())) throw new EventBookingError('Invalid eventDate', 400);
      data.eventDate = d;
    }
    if (input.timeRange !== undefined) data.timeRange = input.timeRange;
    if (input.venue !== undefined) data.venue = input.venue;
    if (input.price !== undefined) data.price = new Prisma.Decimal(input.price.toFixed(2));
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.description !== undefined) data.description = input.description;
    if (input.shortDescription !== undefined) data.shortDescription = input.shortDescription;
    if (input.availability !== undefined) data.availability = input.availability as import('@prisma/client').EventAvailability;
    if (input.availableTickets !== undefined) data.availableTickets = input.availableTickets;
    if (input.maxCapacity !== undefined) data.maxCapacity = input.maxCapacity;
    if (input.entertainment !== undefined) data.entertainment = input.entertainment;
    if (input.featuredImage !== undefined) data.featuredImage = input.featuredImage;
    if (input.winesServed !== undefined) data.winesServed = input.winesServed;
    if (input.culinaryMenu !== undefined) data.culinaryMenu = input.culinaryMenu;
    if (input.galleryImages !== undefined) data.galleryImages = input.galleryImages;
    if (input.isPast !== undefined) data.isPast = input.isPast;
    if (input.status !== undefined) data.status = input.status as import('@prisma/client').EventStatus;

    // Cross-field validation for availableTickets/maxCapacity
    const nextAvailable = input.availableTickets !== undefined ? input.availableTickets : existing.availableTickets;
    const nextMax = input.maxCapacity !== undefined ? input.maxCapacity : existing.maxCapacity;
    if (nextAvailable > nextMax) {
      throw new EventBookingError('availableTickets cannot exceed maxCapacity', 400);
    }

    return EventRepository.update(id, data);
  }

  // Schedules
  static async createSchedule(eventId: string, input: EventScheduleCreateInput) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new EventBookingError(`Event with id '${eventId}' not found`, 404);
    return EventScheduleRepository.create({
      event: { connect: { id: eventId } },
      timeSlot: input.timeSlot,
      activity: input.activity,
      sortOrder: input.sortOrder ?? 0,
    });
  }

  static async updateSchedule(eventId: string, scheduleId: string, input: EventScheduleUpdateInput) {
    const schedule = await EventScheduleRepository.findById(scheduleId);
    if (!schedule || schedule.eventId !== eventId) throw new EventBookingError('Schedule not found for this event', 404);
    const data: Prisma.EventScheduleUpdateInput = {};
    if (input.timeSlot !== undefined) data.timeSlot = input.timeSlot;
    if (input.activity !== undefined) data.activity = input.activity;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    return EventScheduleRepository.update(scheduleId, data);
  }

  static async deleteSchedule(eventId: string, scheduleId: string) {
    const schedule = await EventScheduleRepository.findById(scheduleId);
    if (!schedule || schedule.eventId !== eventId) throw new EventBookingError('Schedule not found for this event', 404);
    const count = await EventScheduleRepository.countBookingsForSchedule(scheduleId);
    if (count > 0) {
      throw new EventBookingError(`Cannot delete schedule: ${count} booking(s) reference this schedule`, 409);
    }
    return EventScheduleRepository.delete(scheduleId);
  }

  // Ticket Types
  static async createTicketType(eventId: string, input: EventTicketTypeCreateInput) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new EventBookingError(`Event with id '${eventId}' not found`, 404);
    const existing = await prisma.eventTicketType.findUnique({ where: { eventId_name: { eventId, name: input.name } } }).catch(() => null);
    if (existing) throw new EventBookingError(`Ticket type name '${input.name}' already exists for this event`, 409);
    return EventTicketTypeRepository.create({
      event: { connect: { id: eventId } },
      name: input.name,
      price: new Prisma.Decimal(input.price.toFixed(2)),
      capacity: input.capacity,
    });
  }

  static async updateTicketType(eventId: string, ticketTypeId: string, input: EventTicketTypeUpdateInput) {
    const tt = await EventTicketTypeRepository.findById(ticketTypeId);
    if (!tt || tt.eventId !== eventId) throw new EventBookingError('Ticket type not found for this event', 404);
    if (input.name && input.name !== tt.name) {
      const dupe = await prisma.eventTicketType.findUnique({ where: { eventId_name: { eventId, name: input.name } } }).catch(() => null);
      if (dupe && dupe.id !== ticketTypeId) throw new EventBookingError(`Ticket type name '${input.name}' already exists`, 409);
    }
    if (input.capacity !== undefined && input.capacity < tt.soldCount) {
      throw new EventBookingError(`Capacity cannot be reduced below current soldCount (${tt.soldCount})`, 400);
    }
    // Explicitly strip any soldCount if caller somehow injected it (Zod strips but double-guard)
    const data: Prisma.EventTicketTypeUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.price !== undefined) data.price = new Prisma.Decimal(input.price.toFixed(2));
    if (input.capacity !== undefined) data.capacity = input.capacity;
    return EventTicketTypeRepository.update(ticketTypeId, data);
  }

  static async deleteTicketType(eventId: string, ticketTypeId: string) {
    const tt = await EventTicketTypeRepository.findById(ticketTypeId);
    if (!tt || tt.eventId !== eventId) throw new EventBookingError('Ticket type not found for this event', 404);
    const count = await EventTicketTypeRepository.countBookingTicketsForType(ticketTypeId);
    if (count > 0) {
      throw new EventBookingError(`Cannot delete ticket type: ${count} booking ticket(s) reference it`, 409);
    }
    if (tt.soldCount > 0) {
      throw new EventBookingError(`Cannot delete ticket type with sold tickets (soldCount=${tt.soldCount})`, 409);
    }
    return EventTicketTypeRepository.delete(ticketTypeId);
  }

  // FAQs
  static async createFAQ(eventId: string, input: EventFAQCreateInput) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new EventBookingError(`Event with id '${eventId}' not found`, 404);
    return EventFAQRepository.create({
      event: { connect: { id: eventId } },
      question: input.question,
      answer: input.answer,
      sortOrder: input.sortOrder ?? 0,
    });
  }

  static async updateFAQ(eventId: string, faqId: string, input: EventFAQUpdateInput) {
    const faq = await EventFAQRepository.findById(faqId);
    if (!faq || faq.eventId !== eventId) throw new EventBookingError('FAQ not found for this event', 404);
    const data: Prisma.EventFAQUpdateInput = {};
    if (input.question !== undefined) data.question = input.question;
    if (input.answer !== undefined) data.answer = input.answer;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    return EventFAQRepository.update(faqId, data);
  }

  static async deleteFAQ(eventId: string, faqId: string) {
    const faq = await EventFAQRepository.findById(faqId);
    if (!faq || faq.eventId !== eventId) throw new EventBookingError('FAQ not found for this event', 404);
    return EventFAQRepository.delete(faqId);
  }
}

// Utility: convert "HH:mm" to minutes from midnight
function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

// Utility: convert minutes from midnight to "h:mm A" string
function formatMinutesToTimeString(minutes: number): string {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minsPadded = mins < 10 ? `0${mins}` : `${mins}`;
  return `${hours12}:${minsPadded} ${period}`;
}

export class AvailabilityService {
  static async getAvailableSlots(experienceSlug: string, dateStr: string) {
    const experience = await prisma.experience.findFirst({
      where: { slug: experienceSlug, isActive: true },
      include: { winery: true },
    });

    if (!experience) {
      throw new Error(`Experience with slug '${experienceSlug}' not found`);
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }

    // 1. Check winery closures
    const closures = await AvailabilityRepository.getWineryClosures(
      experience.wineryId,
      date,
      date
    );
    if (closures.length > 0) {
      return {
        date: dateStr,
        isClosed: true,
        closureReason: closures[0].reason,
        status: 'CLOSED',
        availableSlots: [],
      };
    }

    // 2. Determine day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = date.getUTCDay();

    // 3. Find availability rules from schema (strictly database-driven)
    const rules = await AvailabilityRepository.getExperienceRules(
      experience.wineryId,
      experience.id
    );

    const matchingRules = rules.filter((r) => r.dayOfWeek === dayOfWeek);

    // 4. Find date-specific overrides from schema
    const overrides = await AvailabilityRepository.getTimeSlotOverrides(
      experience.id,
      date
    );

    // If no availability rules exist for this day and no overrides exist, return NO_CONFIGURATION
    if (matchingRules.length === 0 && overrides.length === 0) {
      return {
        date: dateStr,
        experienceTitle: experience.title,
        isClosed: false,
        status: 'NO_CONFIGURATION',
        message: `No availability schedule configured for day of week ${dayOfWeek}. Operational schedule requires administrator setup.`,
        availableSlots: [],
      };
    }

    // 5. Query active bookings on that date
    const booked = await AvailabilityRepository.getBookedGuestsForDate(
      experience.id,
      date
    );

    const bookedByTime = new Map<string, number>();
    for (const b of booked) {
      const current = bookedByTime.get(b.time) || 0;
      bookedByTime.set(b.time, current + b.totalGuests);
    }

    // 6. Generate slots dynamically from active AvailabilityRules
    const slotsMap = new Map<string, { capacity: number; isBlocked?: boolean; reason?: string }>();

    for (const rule of matchingRules) {
      const startMin = parseTimeToMinutes(rule.startTime);
      const endMin = parseTimeToMinutes(rule.endTime);
      const interval = rule.slotInterval > 0 ? rule.slotInterval : 60;

      for (let m = startMin; m + interval <= endMin; m += interval) {
        const timeLabel = formatMinutesToTimeString(m);
        slotsMap.set(timeLabel, { capacity: rule.capacity });
      }
    }

    // Apply TimeSlotOverrides (can introduce extra slots, alter capacity, or block)
    for (const ov of overrides) {
      // ov.time may be in "14:00" or "2:00 PM" format
      let timeLabel = ov.time;
      if (ov.time.includes(':') && !ov.time.toUpperCase().includes('M')) {
        const mins = parseTimeToMinutes(ov.time);
        timeLabel = formatMinutesToTimeString(mins);
      }
      slotsMap.set(timeLabel, {
        capacity: ov.capacity,
        isBlocked: ov.isBlocked,
        reason: ov.reason || undefined,
      });
    }

    const availableSlots = Array.from(slotsMap.entries()).map(([timeStr, config]) => {
      if (config.isBlocked) {
        return {
          time: timeStr,
          capacity: 0,
          bookedGuests: 0,
          remainingCapacity: 0,
          isAvailable: false,
          reason: config.reason || 'Blocked',
        };
      }

      const bookedCount = bookedByTime.get(timeStr) || 0;
      const remaining = Math.max(0, config.capacity - bookedCount);

      return {
        time: timeStr,
        capacity: config.capacity,
        bookedGuests: bookedCount,
        remainingCapacity: remaining,
        isAvailable: remaining > 0,
      };
    });

    return {
      date: dateStr,
      experienceTitle: experience.title,
      isClosed: false,
      status: 'AVAILABLE',
      availableSlots,
    };
  }

  static async getAvailabilityOverview(wineryId: string) {
    const [rules, overrides, closures] = await Promise.all([
      AvailabilityRepository.findAllRules(wineryId),
      AvailabilityRepository.findAllOverrides(wineryId),
      AvailabilityRepository.findAllClosures(wineryId),
    ]);
    return { rules, overrides, closures };
  }

  static async getScheduleView(wineryId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return AvailabilityRepository.getScheduleForDateRange(wineryId, start, end);
  }
}

export class BookingService {
  static async getBookingByNumber(bookingNumber: string) {
    const booking = await BookingRepository.findByBookingNumber(bookingNumber);
    if (!booking) {
      throw new Error(`Booking ${bookingNumber} not found`);
    }
    return booking;
  }

  static async listBookings(filters: {
    search?: string;
    status?: string;
    experienceId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    return BookingRepository.findMany(filters);
  }

  static async updateBookingStatus(
    bookingNumber: string,
    toStatus: import('@prisma/client').BookingStatus,
    changedBy: string,
    notes?: string
  ) {
    const booking = await BookingRepository.findByBookingNumber(bookingNumber);
    if (!booking) {
      throw new Error(`Booking ${bookingNumber} not found`);
    }

    return BookingRepository.updateStatus(booking.id, toStatus, changedBy, notes);
  }

  static async createBooking(
    input: BookingCreateInput,
    guestSession?: import('@/lib/auth/guest').GuestSessionPayload | null
  ) {
    const experience = await prisma.experience.findFirst({
      where: { slug: input.experienceSlug, isActive: true },
      include: { winery: true },
    });

    if (!experience) {
      throw new Error(`Experience '${input.experienceSlug}' not found`);
    }

    const bookingDate = new Date(input.date);
    const totalGuests = input.adults + input.children;

    // 1. Capacity & availability pre-flight validation
    const availability = await AvailabilityService.getAvailableSlots(
      input.experienceSlug,
      input.date
    );

    if (availability.isClosed) {
      throw new Error(`Winery is closed on ${input.date}: ${availability.closureReason}`);
    }

    let maxAllowedCapacity = experience.capacity || 12;
    if (availability.status === 'AVAILABLE' && availability.availableSlots.length > 0) {
      const slot = availability.availableSlots.find((s) => s.time === input.time);
      if (slot) {
        if (!slot.isAvailable) {
          throw new Error(`Time slot ${input.time} is no longer available`);
        }
        if (slot.remainingCapacity < totalGuests) {
          throw new Error(
            `Insufficient capacity. Requested ${totalGuests} guests, but only ${slot.remainingCapacity} seats remain.`
          );
        }
        maxAllowedCapacity = slot.capacity;
      }
    }

    // 2. Resolve GuestProfile ownership:
    // If an authenticated guest session is present, ALWAYS derive ownership strictly from session.guestProfileId.
    // Client-supplied email/userId is ignored for ownership identity.
    let guestProfileId: string;
    if (guestSession?.guestProfileId) {
      const authenticatedProfile = await prisma.guestProfile.findUnique({
        where: { id: guestSession.guestProfileId },
      });
      if (!authenticatedProfile) {
        throw new Error('Authenticated guest profile not found');
      }
      guestProfileId = authenticatedProfile.id;
    } else {
      // Unauthenticated public flow: lookup or create guest user/profile by input.guestEmail
      let guestProfile = await prisma.guestProfile.findFirst({
        where: { user: { email: input.guestEmail } },
      });

      if (!guestProfile) {
        let user = await prisma.user.findUnique({
          where: { email: input.guestEmail },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: input.guestEmail,
              wineryId: experience.wineryId,
              role: 'GUEST',
            },
          });
        }

        guestProfile = await prisma.guestProfile.create({
          data: {
            userId: user.id,
            name: input.guestName,
            phone: input.guestPhone,
          },
        });
      }
      guestProfileId = guestProfile.id;
    }

    // 3. Monetary calculations (Strict Decimal, server-calculated)
    const expPrice = Number(experience.price);
    const basePriceNum = (input.adults * expPrice) + (input.children * (expPrice * 0.4));
    const taxAmountNum = Number((basePriceNum * 0.09).toFixed(2));
    const totalPriceNum = Number((basePriceNum + taxAmountNum).toFixed(2));

    const subtotal = new Prisma.Decimal(basePriceNum.toFixed(2));
    const taxAmount = new Prisma.Decimal(taxAmountNum.toFixed(2));
    const totalPrice = new Prisma.Decimal(totalPriceNum.toFixed(2));

    // Generate unique booking number
    const randomCode = Math.floor(10000 + Math.random() * 90000);
    const year = bookingDate.getFullYear();
    const bookingNumber = `DVR-${year}-${randomCode}`;

    // 4. Atomic database transaction with row-level concurrency lock
    return BookingRepository.createBookingWithTransaction({
      bookingNumber,
      wineryId: experience.wineryId,
      guestProfileId,
      date: bookingDate,
      time: input.time,
      adults: input.adults,
      children: input.children,
      totalGuests,
      subtotal,
      taxAmount,
      totalPrice,
      specialRequests: input.specialRequests,
      dietaryRequirements: input.dietaryRequirements,
      itemTitle: experience.title,
      itemUnitPrice: experience.price,
      experienceId: experience.id,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
    }, maxAllowedCapacity);
  }

  static async cancelBooking(bookingNumber: string, reason?: string) {
    const booking = await BookingRepository.findByBookingNumber(bookingNumber);
    if (!booking) {
      throw new Error(`Booking ${bookingNumber} not found`);
    }

    return BookingRepository.cancelBooking(booking.id, reason);
  }
}

export class EventBookingService {
  static async getBookingByNumber(bookingNumber: string) {
    const booking = await EventBookingRepository.findByBookingNumber(bookingNumber);
    if (!booking) {
      throw new EventBookingError(`Event booking ${bookingNumber} not found`, 404);
    }
    return booking;
  }

  static async createBooking(input: EventBookingCreateInput) {
    // Validate event exists and is bookable
    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
    });
    if (!event) {
      throw new EventBookingError(`Event ${input.eventId} not found`, 404);
    }
    if (event.status === 'CANCELLED' || event.status === 'COMPLETED' || event.isPast) {
      throw new EventBookingError(`Event '${event.title}' is not bookable (status: ${event.status})`, 400);
    }

    // Validate schedule exists and belongs to event
    const schedule = await prisma.eventSchedule.findUnique({
      where: { id: input.eventScheduleId },
    });
    if (!schedule) {
      throw new EventBookingError(`Event schedule ${input.eventScheduleId} not found`, 404);
    }
    if (schedule.eventId !== input.eventId) {
      throw new EventBookingError('Event schedule does not belong to the specified event', 400);
    }

    // Fetch and validate ticket types
    const ticketTypeIds = input.tickets.map((t) => t.eventTicketTypeId);
    const ticketTypes = await prisma.eventTicketType.findMany({
      where: { id: { in: ticketTypeIds } },
    });

    const ticketTypeMap = new Map(ticketTypes.map((tt) => [tt.id, tt]));

    for (const sel of input.tickets) {
      const tt = ticketTypeMap.get(sel.eventTicketTypeId);
      if (!tt) {
        throw new EventBookingError(`Ticket type ${sel.eventTicketTypeId} not found`, 404);
      }
      if (tt.eventId !== input.eventId) {
        throw new EventBookingError(`Ticket type '${tt.name}' does not belong to this event`, 400);
      }
    }

    // Ensure or retrieve GuestProfile (reuse existing User+GuestProfile pattern, avoid duplicates)
    let guestProfile = await prisma.guestProfile.findFirst({
      where: { user: { email: input.guestEmail } },
    });

    if (!guestProfile) {
      let user = await prisma.user.findUnique({
        where: { email: input.guestEmail },
      });

      if (!user) {
        try {
          user = await prisma.user.create({
            data: {
              email: input.guestEmail,
              wineryId: event.wineryId,
              role: 'GUEST',
            },
          });
        } catch (e) {
          if (isPrismaUniqueViolation(e)) {
            user = await prisma.user.findUnique({ where: { email: input.guestEmail } });
            if (!user) throw new EventBookingError('Failed to create guest user', 500);
          } else {
            throw e;
          }
        }
      }

      try {
        guestProfile = await prisma.guestProfile.create({
          data: {
            userId: user.id,
            name: input.guestName,
            phone: input.guestPhone,
          },
        });
      } catch (e) {
        if (isPrismaUniqueViolation(e)) {
          guestProfile = await prisma.guestProfile.findFirst({ where: { userId: user.id } });
          if (!guestProfile) {
            // Fallback: find by email again
            guestProfile = await prisma.guestProfile.findFirst({ where: { user: { email: input.guestEmail } } });
          }
          if (!guestProfile) throw new EventBookingError('Failed to create guest profile', 500);
        } else {
          throw e;
        }
      }
    }

    // Server-side pricing: quantity x current price per ticket type
    const ticketsWithPricing: Array<{ eventTicketTypeId: string; quantity: number; unitPrice: Prisma.Decimal }> = [];
    let totalPriceNum = 0;

    for (const sel of input.tickets) {
      const tt = ticketTypeMap.get(sel.eventTicketTypeId)!;
      const unitPriceDecimal = new Prisma.Decimal(tt.price.toString());
      const unitPriceNum = Number(tt.price);
      totalPriceNum += unitPriceNum * sel.quantity;
      ticketsWithPricing.push({
        eventTicketTypeId: sel.eventTicketTypeId,
        quantity: sel.quantity,
        unitPrice: unitPriceDecimal,
      });
    }

    const totalPrice = new Prisma.Decimal(totalPriceNum.toFixed(2));

    // Transactional creation with collision-safe booking number
    const maxRetries = 5;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const bookingNumber = generateEventBookingNumber();
      try {
        const booking = await EventBookingRepository.createBookingWithTransaction({
          bookingNumber,
          eventId: input.eventId,
          eventScheduleId: input.eventScheduleId,
          guestProfileId: guestProfile.id,
          totalPrice,
          tickets: ticketsWithPricing,
        });
        return booking;
      } catch (error: unknown) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);

        // Insufficient capacity is a business error - do not retry
        if (message.includes('Insufficient capacity') || message.includes('does not belong')) {
          // Map to appropriate status
          const isNotFound = message.includes('not found');
          throw new EventBookingError(message, isNotFound ? 404 : 409);
        }

        // Booking number collision - retry
        if (isPrismaUniqueViolation(error)) {
          // Check if it's bookingNumber collision via error meta
          const meta = (error as { meta?: { target?: string[] } }).meta;
          if (meta?.target?.includes('bookingNumber') || message.includes('bookingNumber') || attempt < maxRetries - 1) {
            // If we can identify it's bookingNumber uniqueness, retry; otherwise also retry for generic P2002 on event_booking
            // Only retry if it's likely bookingNumber - we retry up to maxRetries for any P2002 here since tickets unique is not expected
            if (attempt < maxRetries - 1) continue;
          }
        }

        // For other Prisma/content errors, check if capacity related
        if (message.includes('Capacity overflow')) {
          throw new EventBookingError(message, 409);
        }

        throw error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Failed to create event booking after retries');
  }

  static async cancelBooking(bookingNumber: string, reason?: string) {
    const existing = await EventBookingRepository.findByBookingNumber(bookingNumber);
    if (!existing) {
      throw new EventBookingError(`Event booking ${bookingNumber} not found`, 404);
    }

    // Idempotent: if already cancelled, return
    if (existing.status === BookingStatus.CANCELLED) {
      return existing;
    }

    try {
      return await EventBookingRepository.cancelBooking(existing.id, reason);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Cannot cancel') || message.includes('cannot be cancelled')) {
        throw new EventBookingError(message, 400);
      }
      throw error;
    }
  }

  static async listEventBookingsAdmin(filters: {
    search?: string;
    status?: string;
    eventId?: string;
    eventScheduleId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    return EventBookingRepository.findManyAdmin(filters);
  }

  static async getEventBookingAdmin(bookingNumber: string) {
    const booking = await EventBookingRepository.findByBookingNumberAdmin(bookingNumber);
    if (!booking) {
      throw new EventBookingError(`Event booking ${bookingNumber} not found`, 404);
    }
    return booking;
  }

  static async cancelBookingAdmin(bookingNumber: string, reason?: string) {
    // Reuse existing cancellation logic (transactional, capacity release)
    return EventBookingService.cancelBooking(bookingNumber, reason);
  }
}

function getDatePartsForTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [year, month, day] = formatter.format(date).split('-');
  return { year, month, day, dateString: `${year}-${month}-${day}` };
}

function getMinutesForTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || '0');
  return hour * 60 + minute;
}

function parseBookingTimeToMinutes(time: string) {
  const match = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return Number.MAX_SAFE_INTEGER;

  let hour = Number(match[1]);
  const minute = Number(match[2] || '0');
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  return hour * 60 + minute;
}

export class FrontDeskService {
  static async getTodayOperations() {
    const winery = await FrontDeskRepository.getDefaultWinery();
    const timezone = winery?.timezone || 'America/Los_Angeles';
    const now = new Date();
    const today = getDatePartsForTimeZone(now, timezone);
    const todayDate = new Date(`${today.dateString}T00:00:00.000Z`);
    const currentMinutes = getMinutesForTimeZone(now, timezone);

    const bookings = await FrontDeskRepository.findBookingsForDate(todayDate);
    const sortedBookings = [...bookings].sort((a, b) => {
      const byTime = parseBookingTimeToMinutes(a.time) - parseBookingTimeToMinutes(b.time);
      if (byTime !== 0) return byTime;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const awaitingArrival = sortedBookings.filter((booking) =>
      booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED
    );
    const upcomingArrivals = awaitingArrival.filter((booking) =>
      parseBookingTimeToMinutes(booking.time) >= currentMinutes
    );
    const checkedIn = sortedBookings.filter((booking) => booking.status === BookingStatus.CHECKED_IN);
    const noShows = sortedBookings.filter((booking) => booking.status === BookingStatus.NO_SHOW);
    const completed = sortedBookings.filter((booking) => booking.status === BookingStatus.COMPLETED);

    return {
      winery,
      date: today.dateString,
      timezone,
      currentMinutes,
      summary: {
        totalBookings: sortedBookings.length,
        awaitingArrival: awaitingArrival.length,
        upcomingArrivals: upcomingArrivals.length,
        checkedIn: checkedIn.length,
        noShows: noShows.length,
        completed: completed.length,
      },
      todayArrivals: awaitingArrival,
      upcomingArrivals,
      checkedIn,
      noShows,
      completed,
      allBookings: sortedBookings,
    };
  }
}

export class GuestService {
  static async listGuests(filters: {
    search?: string;
    hasBookings?: string;
    hasTastings?: string;
    hasReviews?: string;
    page?: number;
    pageSize?: number;
  }) {
    return GuestRepository.findAllAdmin(filters);
  }

  static async getGuestAdmin(id: string) {
    const guest = await GuestRepository.findByIdAdmin(id);
    if (!guest) {
      throw new Error(`Guest with id '${id}' not found`);
    }
    return guest;
  }

  static async getGuestProfile(email: string) {
    const profile = await GuestRepository.findByEmail(email);
    if (!profile) {
      throw new Error(`Guest with email '${email}' not found`);
    }
    return profile;
  }

  static async updateGuestProfile(email: string, input: GuestProfileUpdateInput) {
    const profile = await GuestRepository.findByEmail(email);
    if (!profile) {
      throw new Error(`Guest with email '${email}' not found`);
    }

    if (input.winePreferences?.favoriteWineId) {
      const wineExists = await prisma.wine.findUnique({
        where: { id: input.winePreferences.favoriteWineId },
        select: { id: true },
      });
      if (!wineExists) {
        throw new EventBookingError('Selected favorite wine does not exist', 400);
      }
    }

    return GuestRepository.updateProfile(profile.id, {
      name: input.name,
      phone: input.phone,
      avatar: input.avatar,
      dietaryPreferences: input.dietaryPreferences,
      notes: input.notes,
      notifications: input.notifications,
      winePreferences: input.winePreferences,
    });
  }
}

export class TastingService {
  static async getGuestTastings(email: string) {
    return TastingRepository.findByGuestEmail(email);
  }

  static async getTastingSession(sessionId: string) {
    const session = await TastingRepository.findSessionById(sessionId);
    if (!session) {
      throw new Error(`Tasting session '${sessionId}' not found`);
    }
    return session;
  }

  static async listTastingSessions(filters: {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    hasBooking?: string;
    page?: number;
    pageSize?: number;
  }) {
    return TastingRepository.findAllSessionsAdmin(filters);
  }

  static async getTastingSessionAdmin(sessionId: string) {
    const session = await TastingRepository.findSessionByIdAdmin(sessionId);
    if (!session) {
      throw new Error(`Tasting session '${sessionId}' not found`);
    }
    return session;
  }

  static async startSessionForBooking(input: TastingSessionCreateInput) {
    const booking = await BookingRepository.findByBookingNumber(input.bookingNumber);
    if (!booking) {
      throw new Error(`Booking ${input.bookingNumber} not found`);
    }

    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw new Error('A tasting session can only be started for a checked-in booking');
    }

    const existing = await TastingRepository.findSessionByBookingId(booking.id);
    if (existing) {
      return existing;
    }

    return TastingRepository.createSessionForBooking({
      bookingId: booking.id,
      guestProfileId: booking.guestProfileId,
      location: input.location,
      notes: input.notes,
    });
  }

  static async createTastingRecord(input: TastingRecordCreateInput) {
    const guest = await prisma.guestProfile.findFirst({
      where: { user: { email: input.guestEmail } },
    });
    if (!guest) {
      throw new Error(`Guest with email '${input.guestEmail}' not found`);
    }

    const wine = await prisma.wine.findFirst({
      where: { slug: input.wineSlug },
      include: { vintages: true },
    });
    if (!wine || wine.vintages.length === 0) {
      throw new Error(`Wine with slug '${input.wineSlug}' not found`);
    }

    // Explicit vintage resolution
    const vintage = wine.vintages.find((v) => {
      if (input.wineVintageId && v.id === input.wineVintageId) return true;
      if (input.vintageYear && v.vintageYear === input.vintageYear) return true;
      return false;
    });

    if (!vintage) {
      throw new Error(
        `Specific vintage (${input.vintageYear || input.wineVintageId}) not found for wine '${wine.name}'`
      );
    }

    return TastingRepository.createRecord({
      guestProfileId: guest.id,
      wineVintageId: vintage.id,
      wineNameSnapshot: wine.name,
      vintageYear: vintage.vintageYear,
      rating: new Prisma.Decimal(input.rating.toFixed(1)),
      notes: input.notes,
      tasteCharacteristics: input.tasteCharacteristics,
      wouldDrinkAgain: input.wouldDrinkAgain,
      experienceName: input.experienceName,
      body: input.body,
      acidity: input.acidity,
      sweetness: input.sweetness,
      tannin: input.tannin,
    });
  }
}

export class ReviewService {
  static async getApprovedReviews() {
    const winery = await prisma.winery.findFirst({
      where: { slug: 'domaine-elysee' },
    });
    if (!winery) throw new Error('Winery not found');

    return ReviewRepository.findApproved(winery.id);
  }

  static async createReview(input: ReviewCreateInput) {
    const winery = await prisma.winery.findFirst({
      where: { slug: 'domaine-elysee' },
    });
    if (!winery) throw new Error('Winery not found');

    let guestProfileId: string | undefined;
    if (input.guestEmail) {
      const guest = await prisma.guestProfile.findFirst({
        where: { user: { email: input.guestEmail } },
      });
      if (guest) guestProfileId = guest.id;
    }

    let experienceId: string | undefined;
    if (input.experienceSlug) {
      const exp = await prisma.experience.findFirst({
        where: { slug: input.experienceSlug },
      });
      if (exp) experienceId = exp.id;
    }

    let wineId: string | undefined;
    if (input.wineSlug) {
      const wine = await prisma.wine.findFirst({
        where: { slug: input.wineSlug },
      });
      if (wine) wineId = wine.id;
    }

    let eventId: string | undefined;
    if (input.eventSlug) {
      const evt = await prisma.event.findFirst({
        where: { slug: input.eventSlug },
      });
      if (evt) eventId = evt.id;
    }

    let bookingId: string | undefined;
    if (input.bookingNumber) {
      const b = await prisma.booking.findUnique({
        where: { bookingNumber: input.bookingNumber },
      });
      if (b) bookingId = b.id;
    }

    return ReviewRepository.createReview({
      wineryId: winery.id,
      authorName: input.authorName,
      guestProfileId,
      rating: input.rating,
      title: input.title,
      comment: input.comment,
      category: input.category,
      targetName: input.targetName,
      experienceId,
      wineId,
      eventId,
      bookingId,
    });
  }
}
export class AdminAuthService {
  static async login(input: import('../validators').AdminLoginInput) {
    const user = await import('../repositories').then(m => m.UserRepository.findByEmail(input.email));
    if (!user || !user.passwordHash) {
      throw new Error('Invalid email or password');
    }

    const { AuthService } = await import('@/lib/auth');
    const isMatch = await AuthService.verifyPassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    if (!AuthService.isStaffRole(user.role)) {
      throw new Error('Access denied: user role is not authorized for admin operations');
    }

    const token = await AuthService.createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      wineryId: user.wineryId,
    });

    await AuthService.setSessionCookie(token);

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      wineryId: user.wineryId,
    };
  }

  static async logout() {
    const { AuthService } = await import('@/lib/auth');
    await AuthService.clearSessionCookie();
  }

  static async getCurrentAdmin() {
    const { AuthService } = await import('@/lib/auth');
    const session = await AuthService.getSession();
    if (!session) return null;

    if (!AuthService.isStaffRole(session.role)) {
      return null;
    }

    return session;
  }

  static async provisionInitialAdmin() {
    const email = process.env.INITIAL_ADMIN_EMAIL;
    const password = process.env.INITIAL_ADMIN_PASSWORD;

    if (!email || !password) {
      return { provisioned: false, reason: 'INITIAL_ADMIN_EMAIL or INITIAL_ADMIN_PASSWORD environment variables not defined' };
    }

    const { prisma } = await import('@/lib/db');
    const winery = await prisma.winery.findFirst({
      where: { slug: 'domaine-elysee' },
    });

    if (!winery) {
      throw new Error('Cannot provision admin: default winery does not exist');
    }

    const { AuthService } = await import('@/lib/auth');
    const passwordHash = await AuthService.hashPassword(password);
    const { UserRole } = await import('@prisma/client');

    const adminUser = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        wineryId: winery.id,
      },
      create: {
        email,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        wineryId: winery.id,
      },
    });

    return {
      provisioned: true,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      },
    };
  }
}

export class GuestAuthService {
  static async register(input: import('../validators').GuestRegisterInput) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const { GuestAuth } = await import('@/lib/auth/guest');
    const { AuthService } = await import('@/lib/auth');

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new EventBookingError('Email already registered', 409);
    }

    let wineryId: string | null = null;
    try {
      const winery = await prisma.winery.findFirst({ where: { slug: 'domaine-elysee' }, select: { id: true } });
      if (winery) wineryId = winery.id;
    } catch {
      // ignore
    }

    const passwordHash = await AuthService.hashPassword(input.password);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: 'GUEST',
          wineryId,
        },
      });
      const guestProfile = await tx.guestProfile.create({
        data: {
          userId: user.id,
          name: input.name.trim(),
        },
      });
      return { user, guestProfile };
    });

    const token = await GuestAuth.createSessionToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      guestProfileId: result.guestProfile.id,
      name: result.guestProfile.name,
    });
    await GuestAuth.setSessionCookie(token);

    return {
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      guestProfileId: result.guestProfile.id,
      name: result.guestProfile.name,
    };
  }

  static async login(input: import('../validators').GuestLoginInput) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const { GuestAuth } = await import('@/lib/auth/guest');
    const { AuthService } = await import('@/lib/auth');

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { guestProfile: true },
    });

    if (!user || !user.passwordHash) {
      throw new EventBookingError('Invalid email or password', 401);
    }

    if (user.role !== 'GUEST') {
      throw new EventBookingError('Invalid email or password', 401);
    }

    const isMatch = await AuthService.verifyPassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw new EventBookingError('Invalid email or password', 401);
    }

    let guestProfile = user.guestProfile;
    if (!guestProfile) {
      // Recovery: create missing profile
      guestProfile = await prisma.guestProfile.create({
        data: {
          userId: user.id,
          name: user.email.split('@')[0],
        },
      });
    }

    const token = await GuestAuth.createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      guestProfileId: guestProfile.id,
      name: guestProfile.name,
    });
    await GuestAuth.setSessionCookie(token);

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      guestProfileId: guestProfile.id,
      name: guestProfile.name,
    };
  }

  static async logout() {
    const { GuestAuth } = await import('@/lib/auth/guest');
    await GuestAuth.clearSessionCookie();
  }

  static async getCurrentGuest() {
    const { GuestAuth } = await import('@/lib/auth/guest');
    const session = await GuestAuth.getSession();
    if (!session) return null;

    // Verify DB still has GUEST user + profile
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { guestProfile: { include: { winePreference: { include: { favoriteWine: true } } } } },
    });
    if (!user || user.role !== 'GUEST' || !user.guestProfile) return null;
    if (user.email !== session.email) return null;
    if (user.guestProfile.id !== session.guestProfileId) return null;

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      guestProfileId: user.guestProfile.id,
      name: user.guestProfile.name,
      phone: user.guestProfile.phone,
      avatar: user.guestProfile.avatar,
      visitsCount: user.guestProfile.visitsCount,
      emailNotifications: user.guestProfile.emailNotifications,
      smsNotifications: user.guestProfile.smsNotifications,
      whatsappNotifications: user.guestProfile.whatsappNotifications,
      createdAt: user.guestProfile.createdAt,
      winePreference: user.guestProfile.winePreference,
      guestProfile: user.guestProfile,
    };
  }
}

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const GENERIC_RESET_LINK_ERROR = 'This password reset link is invalid or has expired. Please request a new one.';

function hashResetToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export class GuestPasswordResetService {
  // Never reveals whether an email is registered; tokens are only created for GUEST accounts.
  static async requestReset(email: string, requestedIp?: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== 'GUEST' || !user.passwordHash) return;

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await prisma.$transaction([
      // A new request invalidates all previous unused tokens for this user.
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt, requestedIp },
      }),
    ]);

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    try {
      const { sendPasswordResetEmail } = await import('@/lib/email');
      await sendPasswordResetEmail(user.email, resetUrl, RESET_TOKEN_EXPIRY_MS / 60000);
    } catch (error) {
      // Delivery failure must not leak account existence; the API response stays generic.
      console.error('[PasswordReset] Failed to send reset email:', error instanceof Error ? error.message : error);
    }
  }

  static async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(rawToken) },
      include: { user: true },
    });

    const invalid = new EventBookingError(GENERIC_RESET_LINK_ERROR, 400);
    if (!record) throw invalid;
    if (record.usedAt) throw invalid;
    if (record.expiresAt.getTime() < Date.now()) throw invalid;
    if (record.user.role !== 'GUEST') throw invalid; // defense in depth: guest flow never touches staff/admin

    const { AuthService } = await import('@/lib/auth');
    const passwordHash = await AuthService.hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (consumed.count === 0) throw invalid; // consumed concurrently
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    });
  }
}
