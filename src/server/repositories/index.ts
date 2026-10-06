import { computeGuestFinancialMetrics } from '@/lib/crm/financial-metrics';
import { prisma } from '@/lib/db';
import { BookingStatus, PaymentStatus, ReviewStatus, Prisma, NotificationChannel, NotificationType, GuestStatus } from '@prisma/client';
import { deriveEventAvailability } from '@/lib/events/availability';

const VALID_BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
  [BookingStatus.CONFIRMED]: [BookingStatus.CHECKED_IN, BookingStatus.NO_SHOW, BookingStatus.CANCELLED],
  [BookingStatus.CHECKED_IN]: [BookingStatus.COMPLETED],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.NO_SHOW]: [],
};

export type GuestBookingTimelineFilter = 'upcoming' | 'past' | 'cancelled';

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
];
const PAST_BOOKING_STATUSES: BookingStatus[] = [BookingStatus.COMPLETED, BookingStatus.NO_SHOW];

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function experienceTimelineWhere(filter: GuestBookingTimelineFilter): Prisma.BookingWhereInput {
  const today = startOfTodayUtc();
  if (filter === 'upcoming') {
    return { date: { gte: today }, status: { in: ACTIVE_BOOKING_STATUSES } };
  }
  if (filter === 'cancelled') {
    return { status: BookingStatus.CANCELLED };
  }
  return {
    status: { not: BookingStatus.CANCELLED },
    OR: [{ date: { lt: today } }, { status: { in: PAST_BOOKING_STATUSES } }],
  };
}

function eventTimelineWhere(filter: GuestBookingTimelineFilter): Prisma.EventBookingWhereInput {
  const today = startOfTodayUtc();
  if (filter === 'upcoming') {
    return { event: { eventDate: { gte: today } }, status: { in: ACTIVE_BOOKING_STATUSES } };
  }
  if (filter === 'cancelled') {
    return { status: BookingStatus.CANCELLED };
  }
  return {
    status: { not: BookingStatus.CANCELLED },
    OR: [{ event: { eventDate: { lt: today } } }, { status: { in: PAST_BOOKING_STATUSES } }],
  };
}

export class WineRepository {
  static async findAll() {
    return prisma.wine.findMany({
      include: {
        vintages: true,
        images: true,
        foodPairings: true,
        experienceWines: {
          include: {
            experience: {
              select: { id: true, slug: true, title: true, isActive: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async findBySlug(slug: string) {
    return prisma.wine.findFirst({
      where: { slug },
      include: {
        vintages: true,
        images: true,
        foodPairings: true,
        experienceWines: {
          include: {
            experience: {
              select: { id: true, slug: true, title: true, isActive: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        reviews: {
          where: { status: ReviewStatus.APPROVED },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  static async findAllAdmin(filters: {
    search?: string;
    category?: string;
    featured?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.WineWhereInput = {};

    if (filters.search) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { slug: { contains: searchTerm, mode: 'insensitive' } },
        { shortDescription: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (filters.category) {
      where.category = filters.category as import('@prisma/client').WineCategory;
    }

    if (filters.featured !== undefined) {
      where.featured = filters.featured;
    }

    const [wines, total] = await Promise.all([
      prisma.wine.findMany({
        where,
        include: {
          vintages: { select: { id: true, vintageYear: true, price: true, isAvailable: true, inventoryCount: true } },
          images: { select: { id: true, url: true, isPrimary: true } },
          _count: { select: { reviews: true, experienceWines: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.wine.count({ where }),
    ]);

    return {
      wines,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  static async findBySlugAdmin(slug: string) {
    return prisma.wine.findFirst({
      where: { slug },
      include: {
        vintages: {
          include: {
            tastingRecords: {
              select: { id: true, rating: true, notes: true },
              orderBy: { tastedAt: 'desc' },
              take: 10,
            },
          },
          orderBy: { vintageYear: 'desc' },
        },
        images: { orderBy: { sortOrder: 'asc' } },
        foodPairings: { orderBy: { dishName: 'asc' } },
        experienceWines: {
          include: {
            experience: { select: { id: true, title: true, slug: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        reviews: {
          where: { status: ReviewStatus.APPROVED },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { reviews: true, experienceWines: true, favoredByGuests: true } },
      },
    });
  }

  static async findBySlugForMutation(slug: string) {
    return prisma.wine.findFirst({
      where: { slug },
      select: { id: true, slug: true, wineryId: true },
    });
  }

  static async findById(id: string) {
    return prisma.wine.findUnique({
      where: { id },
      include: {
        vintages: { orderBy: { vintageYear: 'desc' } },
        images: { orderBy: { sortOrder: 'asc' } },
        foodPairings: true,
      },
    });
  }

  static async findBySlugForWinery(wineryId: string, slug: string) {
    return prisma.wine.findUnique({ where: { wineryId_slug: { wineryId, slug } } });
  }

  static async create(data: Prisma.WineCreateInput) {
    return prisma.wine.create({ data });
  }

  static async update(id: string, data: Prisma.WineUpdateInput) {
    return prisma.wine.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.wine.delete({ where: { id } });
  }

  static async countExperienceWines(wineId: string) {
    return prisma.experienceWine.count({ where: { wineId } });
  }

  static async countTastingRecordsForWine(wineId: string) {
    return prisma.tastingRecord.count({ where: { wineVintage: { wineId } } });
  }
}

export class WineVintageRepository {
  static async findById(id: string) {
    return prisma.wineVintage.findUnique({ where: { id } });
  }

  static async findByWineIdAndYear(wineId: string, vintageYear: number) {
    return prisma.wineVintage.findUnique({ where: { wineId_vintageYear: { wineId, vintageYear } } });
  }

  static async create(data: Prisma.WineVintageCreateInput) {
    return prisma.wineVintage.create({ data });
  }

  static async update(id: string, data: Prisma.WineVintageUpdateInput) {
    return prisma.wineVintage.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.wineVintage.delete({ where: { id } });
  }

  static async countTastingRecords(vintageId: string) {
    return prisma.tastingRecord.count({ where: { wineVintageId: vintageId } });
  }
}

export class ExperienceRepository {
  static async create(data: import('@prisma/client').Prisma.ExperienceCreateInput) {
    return prisma.experience.create({ data });
  }

  static async findAll() {
    return prisma.experience.findMany({
      where: { isActive: true },
      include: {
        images: true,
        faqs: { orderBy: { sortOrder: 'asc' } },
        timelines: { orderBy: { sortOrder: 'asc' } },
        includedWines: {
          include: {
            wine: {
              include: { vintages: true, images: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { price: 'asc' },
    });
  }

  static async findBySlug(slug: string) {
    return prisma.experience.findFirst({
      where: { slug, isActive: true },
      include: {
        images: true,
        faqs: { orderBy: { sortOrder: 'asc' } },
        timelines: { orderBy: { sortOrder: 'asc' } },
        includedWines: {
          include: {
            wine: {
              include: { vintages: true, images: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        reviews: {
          where: { status: ReviewStatus.APPROVED },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  static async findAllAdmin(filters: {
    search?: string;
    category?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ExperienceWhereInput = {};

    if (filters.search) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { slug: { contains: searchTerm, mode: 'insensitive' } },
        { shortDescription: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (filters.category) {
      where.category = filters.category as import('@prisma/client').ExperienceCategory;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const [dbExperiences, total] = await Promise.all([
      prisma.experience.findMany({
        where,
        include: {
          images: true,
          availabilityRules: { select: { time: true, capacity: true } },
          _count: { select: { bookingItems: true, reviews: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.experience.count({ where }),
    ]);

    return {
      experiences: dbExperiences,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  static async findBySlugAdmin(slug: string) {
    return prisma.experience.findFirst({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        faqs: { orderBy: { sortOrder: 'asc' } },
        timelines: { orderBy: { sortOrder: 'asc' } },
        includedWines: {
          include: {
            wine: {
              include: { vintages: true, images: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        availabilityRules: {
          orderBy: { dayOfWeek: 'asc' },
        },
        timeSlotOverrides: {
          orderBy: { date: 'desc' },
          take: 50,
        },
        _count: { select: { bookingItems: true, reviews: true } },
      },
    });
  }
  static async updateExperienceAdmin(id: string, data: Record<string, unknown>, includedWines?: unknown[], images?: unknown[], timelines?: unknown[], faqs?: unknown[]) {
    // Separate the scalar data from relations if needed
    const { ...scalarData } = data;

    const updatePayload: Prisma.ExperienceUpdateInput = { ...scalarData };

    if (images && Array.isArray(images)) {
      updatePayload.images = {
        deleteMany: {},
        createMany: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: images.map((image: any, index) => ({
            url: String(image.url),
            altText: image.altText ? String(image.altText) : null,
            isPrimary: image.isPrimary !== undefined ? Boolean(image.isPrimary) : index === 0,
            sortOrder: image.sortOrder !== undefined ? Number(image.sortOrder) : index,
          })),
        },
      };
    }

    if (includedWines && Array.isArray(includedWines)) {
      updatePayload.includedWines = {
        deleteMany: {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: includedWines.map((w: any, index) => ({
          wine: { connect: { id: String(w.wineId) } },
          notes: w.notes ? String(w.notes) : null,
          sortOrder: index,
        })),
      };
    }

    if (timelines && Array.isArray(timelines)) {
      updatePayload.timelines = {
        deleteMany: {},
        createMany: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: timelines.map((t: any, index) => ({
            timeRange: String(t.timeRange),
            title: String(t.title),
            description: t.description ? String(t.description) : '',
            sortOrder: t.sortOrder !== undefined ? Number(t.sortOrder) : index,
          })),
        },
      };
    }

    if (faqs && Array.isArray(faqs)) {
      updatePayload.faqs = {
        deleteMany: {},
        createMany: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: faqs.map((f: any, index) => ({
            question: String(f.question),
            answer: String(f.answer),
            sortOrder: f.sortOrder !== undefined ? Number(f.sortOrder) : index,
          })),
        },
      };
    }

    return prisma.experience.update({
      where: { id },
      data: updatePayload,
      include: {
        images: true,
        faqs: true,
        timelines: true,
        includedWines: {
          include: { wine: true },
        },
      },
    });
  }
}

export class EventRepository {
  static async findAll() {
    const events = await prisma.event.findMany({
      include: {
        schedules: { orderBy: { sortOrder: 'asc' } },
        faqs: { orderBy: { sortOrder: 'asc' } },
        ticketTypes: true,
      },
      orderBy: { eventDate: 'asc' },
    });

    const now = new Date();
    return events.map(e => {
      const isPast = e.status !== 'CANCELLED' && new Date(e.eventDate) < now;
      const availability = deriveEventAvailability(e.ticketTypes);
      return isPast
        ? { ...e, status: 'COMPLETED' as const, isPast: true, availability }
        : { ...e, availability };
    });
  }

  static async findBySlug(slug: string) {
    const e = await prisma.event.findFirst({
      where: { slug },
      include: {
        schedules: { orderBy: { sortOrder: 'asc' } },
        faqs: { orderBy: { sortOrder: 'asc' } },
        ticketTypes: true,
        reviews: {
          where: { status: ReviewStatus.APPROVED },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!e) return null;
    const isPast = e.status !== 'CANCELLED' && new Date(e.eventDate) < new Date();
    const availability = deriveEventAvailability(e.ticketTypes);
    return isPast
      ? { ...e, status: 'COMPLETED' as const, isPast: true, availability }
      : { ...e, availability };
  }

  static async findAllAdmin(filters: {
    search?: string;
    status?: string;
    availability?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.EventWhereInput = {};

    if (filters.search) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { slug: { contains: searchTerm, mode: 'insensitive' } },
        { shortDescription: { contains: searchTerm, mode: 'insensitive' } },
        { venue: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (filters.status) {
      where.status = filters.status as import('@prisma/client').EventStatus;
    }

    if (filters.availability) {
      where.availability = filters.availability as import('@prisma/client').EventAvailability;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.eventDate = {};
      if (filters.dateFrom) {
        where.eventDate.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.eventDate.lte = new Date(filters.dateTo);
      }
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          schedules: { orderBy: { sortOrder: 'asc' } },
          ticketTypes: true,
          _count: { select: { eventBookings: true, reviews: true } },
        },
        orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.event.count({ where }),
    ]);

    const now = new Date();
    const mappedEvents = events.map(event => {
      const isPast = event.status !== 'CANCELLED' && new Date(event.eventDate) < now;
      const availability = deriveEventAvailability(event.ticketTypes);
      return isPast
        ? { ...event, status: 'COMPLETED' as const, isPast: true, availability }
        : { ...event, availability };
    });

    return {
      events: mappedEvents,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  static async findByIdAdmin(id: string) {
    const e = await prisma.event.findUnique({
      where: { id },
      include: {
        schedules: { orderBy: { sortOrder: 'asc' } },
        faqs: { orderBy: { sortOrder: 'asc' } },
        ticketTypes: true,
        eventBookings: {
          include: {
            guestProfile: {
              include: { user: { select: { email: true } } },
            },
            eventSchedule: true,
            tickets: {
              include: { ticketType: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { eventBookings: true, reviews: true } },
      },
    });
    if (!e) return null;
    const isPast = e.status !== 'CANCELLED' && new Date(e.eventDate) < new Date();
    const availability = deriveEventAvailability(e.ticketTypes);
    return isPast
      ? { ...e, status: 'COMPLETED' as const, isPast: true, availability }
      : { ...e, availability };
  }

  static async create(data: Prisma.EventCreateInput) {
    return prisma.event.create({ data });
  }

  static async update(id: string, data: Prisma.EventUpdateInput) {
    return prisma.event.update({ where: { id }, data });
  }

  static async findBySlugForWinery(wineryId: string, slug: string) {
    return prisma.event.findUnique({ where: { wineryId_slug: { wineryId, slug } } });
  }
}

export class EventScheduleRepository {
  static async create(data: Prisma.EventScheduleCreateInput) {
    return prisma.eventSchedule.create({ data });
  }
  static async update(id: string, data: Prisma.EventScheduleUpdateInput) {
    return prisma.eventSchedule.update({ where: { id }, data });
  }
  static async delete(id: string) {
    return prisma.eventSchedule.delete({ where: { id } });
  }
  static async findById(id: string) {
    return prisma.eventSchedule.findUnique({ where: { id } });
  }
  static async countBookingsForSchedule(scheduleId: string) {
    return prisma.eventBooking.count({ where: { eventScheduleId: scheduleId } });
  }
}

export class EventTicketTypeRepository {
  static async create(data: Prisma.EventTicketTypeCreateInput) {
    return prisma.eventTicketType.create({ data });
  }
  static async update(id: string, data: Prisma.EventTicketTypeUpdateInput) {
    return prisma.eventTicketType.update({ where: { id }, data });
  }
  static async delete(id: string) {
    return prisma.eventTicketType.delete({ where: { id } });
  }
  static async findById(id: string) {
    return prisma.eventTicketType.findUnique({ where: { id } });
  }
  static async countBookingTicketsForType(ticketTypeId: string) {
    return prisma.eventBookingTicket.count({ where: { eventTicketTypeId: ticketTypeId } });
  }
}

export class EventFAQRepository {
  static async create(data: Prisma.EventFAQCreateInput) {
    return prisma.eventFAQ.create({ data });
  }
  static async update(id: string, data: Prisma.EventFAQUpdateInput) {
    return prisma.eventFAQ.update({ where: { id }, data });
  }
  static async delete(id: string) {
    return prisma.eventFAQ.delete({ where: { id } });
  }
  static async findById(id: string) {
    return prisma.eventFAQ.findUnique({ where: { id } });
  }
}

export class AvailabilityRepository {
  static async getWineryClosures(wineryId: string, startDate: Date, endDate: Date) {
    return prisma.wineryClosure.findMany({
      where: {
        wineryId,
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
        ],
      },
    });
  }

  static async getExperienceClosures(experienceId: string, date: Date) {
    return prisma.experienceClosure.findMany({
      where: {
        experienceId,
        date,
      },
    });
  }

  static async getExperienceRules(wineryId: string, experienceId: string) {
    return prisma.availabilityRule.findMany({
      where: {
        wineryId,
        isActive: true,
        experienceId,
      },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  static async getTimeSlotOverrides(experienceId: string, date: Date) {
    return prisma.timeSlotOverride.findMany({
      where: { experienceId, date },
    });
  }

  static async getBookedGuestsForDate(experienceId: string, date: Date, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.booking.findMany({
      where: {
        items: { some: { experienceId } },
        date,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.PENDING] },
      },
      select: {
        time: true,
        totalGuests: true,
      },
    });
  }

  static async findAllRules(wineryId: string) {
    return prisma.availabilityRule.findMany({
      where: { wineryId },
      include: {
        experience: { select: { id: true, title: true, slug: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { time: 'asc' }],
    });
  }

  static async findAllOverrides(wineryId: string) {
    return prisma.timeSlotOverride.findMany({
      where: {
        experience: { wineryId },
      },
      include: {
        experience: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });
  }

  static async findAllClosures(wineryId: string) {
    return prisma.wineryClosure.findMany({
      where: { wineryId },
      orderBy: { startDate: 'desc' },
      take: 100,
    });
  }

  static async findAllExperienceClosures(wineryId: string) {
    return prisma.experienceClosure.findMany({
      where: {
        experience: { wineryId },
      },
      include: {
        experience: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });
  }

  static async getScheduleForDateRange(wineryId: string, startDate: Date, endDate: Date) {
    const experiences = await prisma.experience.findMany({
      where: { wineryId, isActive: true },
      select: { id: true, title: true, slug: true, capacity: true },
    });

    const bookings = await prisma.booking.findMany({
      where: {
        wineryId,
        date: { gte: startDate, lte: endDate },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.PENDING] },
      },
      select: {
        date: true,
        time: true,
        totalGuests: true,
        bookingNumber: true,
        status: true,
        guestProfile: { select: { name: true } },
        items: { select: { experienceId: true, title: true } },
      },
    });

    const closures = await prisma.wineryClosure.findMany({
      where: {
        wineryId,
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
        ],
      },
    });

    const expClosures = await prisma.experienceClosure.findMany({
      where: {
        experience: { wineryId },
        date: { gte: startDate, lte: endDate },
      },
    });

    const rules = await prisma.availabilityRule.findMany({
      where: { wineryId, isActive: true },
    });

    const overrides = await prisma.timeSlotOverride.findMany({
      where: {
        experience: { wineryId },
        date: { gte: startDate, lte: endDate },
      },
    });

    return { experiences, bookings, closures, expClosures, rules, overrides };
  }
}

export class BookingRepository {
  static async findByBookingNumber(bookingNumber: string) {
    return prisma.booking.findUnique({
      where: { bookingNumber },
      include: {
        guestProfile: {
          include: { user: true },
        },
        items: {
          include: { experience: true },
        },
        attendees: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  static async findMany(filters: {
    search?: string;
    status?: string;
    experienceId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.BookingWhereInput = {};

    if (filters.search) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { bookingNumber: { contains: searchTerm, mode: 'insensitive' } },
        { guestProfile: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { guestProfile: { user: { email: { contains: searchTerm, mode: 'insensitive' } } } },
      ];
    }

    if (filters.status) {
      where.status = filters.status as BookingStatus;
    }

    if (filters.experienceId) {
      where.items = { some: { experienceId: filters.experienceId } };
    }

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.date.lte = new Date(filters.dateTo);
      }
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          guestProfile: true,
          items: { include: { experience: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      bookings,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  static async findByGuestProfileId(
    guestProfileId: string,
    filters: { page?: number; pageSize?: number; filter?: GuestBookingTimelineFilter } = {}
  ) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.BookingWhereInput = {
      guestProfileId,
      ...(filters.filter ? experienceTimelineWhere(filters.filter) : {}),
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          items: {
            include: {
              experience: { select: { id: true, title: true, slug: true } },
            },
          },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      bookings,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  static async updateStatus(
    bookingId: string,
    toStatus: BookingStatus,
    changedBy: string,
    notes?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({
        where: { id: bookingId },
      });

      if (!existing) throw new Error('Booking not found');

      const fromStatus = existing.status;

      if (fromStatus === toStatus) {
        throw new Error(`Booking is already in ${toStatus} status`);
      }

      if (fromStatus === BookingStatus.CANCELLED) {
        throw new Error('Cannot update a cancelled booking');
      }

      if (fromStatus === BookingStatus.COMPLETED) {
        throw new Error('Cannot update a completed booking');
      }

      if (!VALID_BOOKING_TRANSITIONS[fromStatus].includes(toStatus)) {
        throw new Error(`Invalid booking status transition from ${fromStatus} to ${toStatus}`);
      }

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: toStatus },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus,
          toStatus,
          changedBy,
          notes: notes || `Status changed from ${fromStatus} to ${toStatus} by staff`,
        },
      });

      return updated;
    });
  }

  static async createBookingWithTransaction(data: {
    bookingNumber: string;
    wineryId: string;
    guestProfileId: string;
    date: Date;
    time: string;
    adults: number;
    children: number;
    totalGuests: number;
    subtotal: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    totalPrice: Prisma.Decimal;
    status?: BookingStatus;
    specialRequests?: string;
    dietaryRequirements?: string;
    itemTitle: string;
    itemUnitPrice: Prisma.Decimal;
    experienceId: string;
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
  }, maxAllowedCapacity: number) {
    return prisma.$transaction(async (tx) => {
      // 1. Acquire pessimistic row-level lock on the Experience record
      // to serialize concurrent booking operations for this experience.
      await tx.$queryRaw`SELECT id FROM "experiences" WHERE id = ${data.experienceId} FOR UPDATE`;

      // 2. Re-verify booked guest count inside the locked transaction
      const existingBookings = await tx.booking.findMany({
        where: {
          items: { some: { experienceId: data.experienceId } },
          date: data.date,
          time: data.time,
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.PENDING] },
        },
        select: { totalGuests: true },
      });

      const currentBookedGuests = existingBookings.reduce((sum, b) => sum + b.totalGuests, 0);
      const remainingCapacity = maxAllowedCapacity - currentBookedGuests;

      if (remainingCapacity < data.totalGuests) {
        throw new Error(
          `Insufficient capacity during concurrent reservation. Remaining: ${remainingCapacity}, Requested: ${data.totalGuests}`
        );
      }

      const initialStatus = data.status || BookingStatus.CONFIRMED;

      // 3. Atomically create booking, item, attendee, and history
      const booking = await tx.booking.create({
        data: {
          bookingNumber: data.bookingNumber,
          wineryId: data.wineryId,
          guestProfileId: data.guestProfileId,
          date: data.date,
          time: data.time,
          adults: data.adults,
          children: data.children,
          totalGuests: data.totalGuests,
          subtotal: data.subtotal,
          taxAmount: data.taxAmount,
          totalPrice: data.totalPrice,
          status: initialStatus,
          specialRequests: data.specialRequests,
          dietaryRequirements: data.dietaryRequirements,
          items: {
            create: [
              {
                experienceId: data.experienceId,
                itemType: 'EXPERIENCE',
                title: data.itemTitle,
                unitPrice: data.itemUnitPrice,
                quantity: data.totalGuests,
                totalPrice: data.subtotal,
              },
            ],
          },
          attendees: {
            create: [
              {
                guestProfileId: data.guestProfileId,
                fullName: data.guestName,
                email: data.guestEmail,
                phone: data.guestPhone,
                isPrimary: true,
                dietaryNotes: data.dietaryRequirements,
              },
            ],
          },
          statusHistory: {
            create: [
              {
                fromStatus: BookingStatus.PENDING,
                toStatus: initialStatus,
                changedBy: 'CUSTOMER_API',
                notes: initialStatus === BookingStatus.CONFIRMED
                  ? 'Reservation confirmed via API booking transaction'
                  : 'Reservation created, awaiting online payment',
              },
            ],
          },
        },
        include: {
          items: true,
          attendees: true,
          statusHistory: true,
        },
      });

      return booking;
    },
    { maxWait: 30000, timeout: 30000 }
    );
  }

  static async cancelBooking(bookingId: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({
        where: { id: bookingId },
      });

      if (!existing) throw new Error('Booking not found');
      if (existing.status === BookingStatus.CANCELLED) return existing;

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: existing.id,
          fromStatus: existing.status,
          toStatus: BookingStatus.CANCELLED,
          changedBy: 'CUSTOMER_API',
          notes: reason || 'Reservation cancelled by customer request',
        },
      });

      return updated;
    },
    { maxWait: 30000, timeout: 30000 }
    );
  }
}

export class FrontDeskRepository {
  static async getDefaultWinery() {
    return prisma.winery.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, timezone: true },
    });
  }

  static async findBookingsForDate(date: Date) {
    return prisma.booking.findMany({
      where: { date },
      include: {
        guestProfile: {
          include: {
            user: { select: { email: true } },
            winePreference: {
              include: {
                favoriteWine: { select: { name: true, slug: true, category: true } },
              },
            },
            _count: {
              select: {
                bookings: true,
                tastingSessions: true,
                tastingRecords: true,
                reviews: true,
              },
            },
          },
        },
        items: {
          include: {
            experience: { select: { id: true, title: true, slug: true } },
          },
        },
        attendees: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payments: {
          select: { amount: true, status: true, provider: true, createdAt: true, refundAmount: true },
          orderBy: { createdAt: 'desc' },
        },
        tastingSessions: {
          include: {
            records: {
              include: {
                wineVintage: {
                  include: {
                    wine: { select: { id: true, name: true, slug: true, category: true } },
                  },
                },
              },
              orderBy: { tastedAt: 'asc' },
            },
          },
          orderBy: { sessionDate: 'asc' },
        },
      },
      orderBy: [{ time: 'asc' }, { createdAt: 'asc' }],
    });
  }
}

export class GuestRepository {
  static async findAllAdmin(filters: {
    search?: string;
    hasBookings?: string;
    hasTastings?: string;
    hasReviews?: string;
    status?: GuestStatus | string;
    tagId?: string;
    wineryId?: string;
    sortBy?: 'createdAt' | 'netRevenue' | 'totalSpend';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
  }) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const conditions: Prisma.GuestProfileWhereInput[] = [];

    if (filters.search) {
      const searchTerm = filters.search.trim();
      conditions.push({
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { user: { email: { contains: searchTerm, mode: 'insensitive' } } },
          { phone: { contains: searchTerm, mode: 'insensitive' } },
        ],
      });
    }

    if (filters.wineryId) {
      const wId = filters.wineryId;
      conditions.push({
        OR: [
          { user: { wineryId: wId } },
          { bookings: { some: { wineryId: wId } } },
          { eventBookings: { some: { event: { wineryId: wId } } } },
          { reviews: { some: { wineryId: wId } } },
          { conversations: { some: { wineryId: wId } } },
        ],
      });
    }

    if (filters.hasBookings === 'yes') {
      conditions.push(filters.wineryId ? { bookings: { some: { wineryId: filters.wineryId } } } : { bookings: { some: {} } });
    } else if (filters.hasBookings === 'no') {
      conditions.push(filters.wineryId ? { bookings: { none: { wineryId: filters.wineryId } } } : { bookings: { none: {} } });
    }

    if (filters.hasTastings === 'yes') {
      conditions.push({ tastingRecords: { some: {} } });
    } else if (filters.hasTastings === 'no') {
      conditions.push({ tastingRecords: { none: {} } });
    }

    if (filters.hasReviews === 'yes') {
      conditions.push(filters.wineryId ? { reviews: { some: { wineryId: filters.wineryId } } } : { reviews: { some: {} } });
    } else if (filters.hasReviews === 'no') {
      conditions.push(filters.wineryId ? { reviews: { none: { wineryId: filters.wineryId } } } : { reviews: { none: {} } });
    }

    if (filters.status && Object.values(GuestStatus).includes(filters.status as GuestStatus)) {
      conditions.push({ status: filters.status as GuestStatus });
    }

    if (filters.tagId) {
      conditions.push({ tags: { some: { guestTagId: filters.tagId } } });
    }

    const where: Prisma.GuestProfileWhereInput = conditions.length > 0 ? { AND: conditions } : {};

    const isSpendSort = filters.sortBy === 'netRevenue' || filters.sortBy === 'totalSpend';

    const guestInclude = {
      user: { select: { email: true, role: true, wineryId: true } },
      tags: {
        include: {
          tag: { select: { id: true, name: true, color: true, wineryId: true } },
        },
      },
      bookings: {
        select: {
          id: true,
          date: true,
          totalPrice: true,
          status: true,
          wineryId: true,
          currency: true,
          payments: {
            where: { status: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] } },
            select: { amount: true, status: true, refundAmount: true },
          },
        },
      },
      eventBookings: {
        select: {
          id: true,
          totalPrice: true,
          status: true,
          event: { select: { wineryId: true, eventDate: true } },
          payments: {
            where: { status: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] } },
            select: { amount: true, status: true, refundAmount: true },
          },
        },
      },
      _count: {
        select: {
          bookings: filters.wineryId ? { where: { wineryId: filters.wineryId } } : true,
          tastingSessions: true,
          tastingRecords: true,
          reviews: filters.wineryId ? { where: { wineryId: filters.wineryId } } : true,
          eventBookings: filters.wineryId ? { where: { event: { wineryId: filters.wineryId } } } : true,
        },
      },
    };

    type AdminGuestItem = Prisma.GuestProfileGetPayload<{ include: typeof guestInclude }> & {
      metrics: ReturnType<typeof computeGuestFinancialMetrics>;
    };

    let guests: AdminGuestItem[];
    let total: number;

    if (isSpendSort) {
      // Fetch all matching records to compute metrics and sort across pagination
      const allMatchingGuests = await prisma.guestProfile.findMany({
        where,
        include: guestInclude,
      });
      total = allMatchingGuests.length;

      const guestsWithMetrics = allMatchingGuests.map((g) => {
        const metrics = computeGuestFinancialMetrics(g.bookings, g.eventBookings, filters.wineryId);
        return {
          ...g,
          metrics,
        };
      });

      const orderMultiplier = filters.sortOrder === 'asc' ? 1 : -1;
      guestsWithMetrics.sort((a, b) => {
        const valA = a.metrics.netRevenue;
        const valB = b.metrics.netRevenue;
        return (valA - valB) * orderMultiplier;
      });

      guests = guestsWithMetrics.slice(skip, skip + pageSize);
    } else {
      const [fetchedGuests, count] = await Promise.all([
        prisma.guestProfile.findMany({
          where,
          include: guestInclude,
          orderBy: { createdAt: filters.sortOrder === 'asc' ? 'asc' : 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.guestProfile.count({ where }),
      ]);
      total = count;
      guests = fetchedGuests.map((g) => ({
        ...g,
        metrics: computeGuestFinancialMetrics(g.bookings, g.eventBookings, filters.wineryId),
      }));
    }

    return {
      guests,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  static async findByIdAdmin(id: string, wineryId?: string) {
    const guest = await prisma.guestProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, role: true, wineryId: true, createdAt: true } },
        tags: {
          include: {
            tag: { select: { id: true, name: true, description: true, color: true, wineryId: true } },
          },
        },
        winePreference: {
          include: { favoriteWine: { select: { id: true, name: true, slug: true, category: true } } },
        },
        bookings: {
          include: {
            items: { include: { experience: { select: { id: true, title: true, slug: true } } } },
            payments: {
              select: {
                id: true,
                amount: true,
                currency: true,
                status: true,
                refundAmount: true,
                refundReason: true,
                paymentMethod: true,
                createdAt: true,
              },
            },
          },
          orderBy: { date: 'desc' },
        },
        tastingSessions: {
          include: {
            booking: { select: { id: true, bookingNumber: true, date: true, status: true } },
            records: {
              include: {
                wineVintage: { include: { wine: { select: { id: true, name: true, slug: true, category: true } } } },
              },
              orderBy: { tastedAt: 'desc' },
            },
          },
          orderBy: { sessionDate: 'desc' },
        },
        tastingRecords: {
          include: {
            wineVintage: { include: { wine: { select: { id: true, name: true, slug: true, category: true } } } },
            tastingSession: { select: { id: true, sessionDate: true } },
          },
          orderBy: { tastedAt: 'desc' },
        },
        reviews: {
          include: {
            experience: { select: { id: true, title: true, slug: true } },
            wine: { select: { id: true, name: true, slug: true } },
            event: { select: { id: true, title: true, slug: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        eventBookings: {
          include: {
            event: { select: { id: true, title: true, slug: true, eventDate: true, status: true, wineryId: true } },
            eventSchedule: { select: { id: true, timeSlot: true, activity: true } },
            tickets: {
              select: {
                quantity: true,
                unitPrice: true,
                ticketType: { select: { name: true, price: true } },
              },
            },
            payments: {
              select: {
                id: true,
                amount: true,
                currency: true,
                status: true,
                refundAmount: true,
                refundReason: true,
                paymentMethod: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        guestNotes: {
          include: {
            author: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        conversations: {
          include: {
            messages: {
              orderBy: { timestamp: 'asc' },
              take: 5,
            },
          },
          orderBy: { startedAt: 'desc' },
        },
        voiceCalls: {
          orderBy: { startTime: 'desc' },
        },
      },
    });

    if (!guest) return null;

    if (wineryId) {
      const isAssociated =
        guest.user?.wineryId === wineryId ||
        guest.bookings.some((b) => b.wineryId === wineryId) ||
        guest.eventBookings.some((eb) => eb.event?.wineryId === wineryId) ||
        guest.reviews.some((r) => r.wineryId === wineryId) ||
        guest.guestNotes.some((n) => n.wineryId === wineryId);

      if (!isAssociated) {
        const hasWineryBooking = await prisma.booking.findFirst({
          where: { guestProfileId: id, wineryId },
          select: { id: true },
        });
        const hasWineryEventBooking = !hasWineryBooking && await prisma.eventBooking.findFirst({
          where: { guestProfileId: id, event: { wineryId } },
          select: { id: true },
        });
        const hasWineryReview = !hasWineryBooking && !hasWineryEventBooking && await prisma.review.findFirst({
          where: { guestProfileId: id, wineryId },
          select: { id: true },
        });
        const hasWineryNote = !hasWineryBooking && !hasWineryEventBooking && !hasWineryReview && await prisma.guestNote.findFirst({
          where: { guestProfileId: id, wineryId },
          select: { id: true },
        });

        if (!hasWineryBooking && !hasWineryEventBooking && !hasWineryReview && !hasWineryNote) {
          return null;
        }
      }
    }

    const filteredGuestNotes = wineryId
      ? guest.guestNotes.filter((n) => n.wineryId === wineryId)
      : guest.guestNotes;

    const filteredConversations = wineryId
      ? guest.conversations.filter((c) => c.wineryId === wineryId)
      : guest.conversations;

    const metrics = computeGuestFinancialMetrics(guest.bookings, guest.eventBookings, wineryId);
    return {
      ...guest,
      guestNotes: filteredGuestNotes,
      conversations: filteredConversations,
      metrics,
    };
  }

  static async findByEmail(email: string) {
    return prisma.guestProfile.findFirst({
      where: {
        user: { email },
      },
      include: {
        winePreference: {
          include: { favoriteWine: true },
        },
        bookings: {
          include: { items: true },
          orderBy: { date: 'desc' },
        },
        tastingRecords: {
          include: { wineVintage: { include: { wine: true } } },
          orderBy: { tastedAt: 'desc' },
        },
        reviews: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  static async updateProfile(id: string, data: {
    name?: string;
    phone?: string | null;
    avatar?: string | null;
    status?: GuestStatus;
    tagIds?: string[];
    dateOfBirth?: Date | string | null;
    dietaryPreferences?: string | null;
    notes?: string | null;
    notifications?: { email?: boolean; sms?: boolean; whatsapp?: boolean };
    winePreferences?: {
      favoriteVarietals?: string[];
      preferredSweetness?: string | null;
      preferredBody?: string | null;
      preferredAcidity?: string | null;
      favoriteWineId?: string | null;
    };
  }, wineryId?: string) {
    return prisma.$transaction(async (tx) => {
      const updateData: Prisma.GuestProfileUpdateInput = {};
      if (data.name) updateData.name = data.name;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.avatar !== undefined) updateData.avatar = data.avatar;
      if (data.status) updateData.status = data.status;
      if (data.dateOfBirth !== undefined) {
        updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
      }
      if (data.dietaryPreferences !== undefined) updateData.dietaryPreferences = data.dietaryPreferences;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.notifications) {
        if (data.notifications.email !== undefined) updateData.emailNotifications = data.notifications.email;
        if (data.notifications.sms !== undefined) updateData.smsNotifications = data.notifications.sms;
        if (data.notifications.whatsapp !== undefined) updateData.whatsappNotifications = data.notifications.whatsapp;
      }

      const profile = await tx.guestProfile.update({
        where: { id },
        data: updateData,
      });

      if (data.winePreferences) {
        await tx.guestWinePreference.upsert({
          where: { guestProfileId: id },
          update: {
            favoriteVarietals: data.winePreferences.favoriteVarietals,
            preferredSweetness: data.winePreferences.preferredSweetness,
            preferredBody: data.winePreferences.preferredBody,
            preferredAcidity: data.winePreferences.preferredAcidity,
            favoriteWineId: data.winePreferences.favoriteWineId,
          },
          create: {
            guestProfileId: id,
            favoriteVarietals: data.winePreferences.favoriteVarietals || [],
            preferredSweetness: data.winePreferences.preferredSweetness,
            preferredBody: data.winePreferences.preferredBody,
            preferredAcidity: data.winePreferences.preferredAcidity,
            favoriteWineId: data.winePreferences.favoriteWineId,
          },
        });
      }

      if (data.tagIds !== undefined) {
        if (wineryId) {
          // Verify that all tags belong to this winery
          const validTags = await tx.guestTag.findMany({
            where: { id: { in: data.tagIds }, wineryId },
            select: { id: true },
          });
          // Remove existing assignments for this winery
          await tx.guestTagAssignment.deleteMany({
            where: {
              guestProfileId: id,
              tag: { wineryId },
            },
          });
          // Insert valid new assignments
          if (validTags.length > 0) {
            await tx.guestTagAssignment.createMany({
              data: validTags.map((t) => ({
                guestProfileId: id,
                guestTagId: t.id,
              })),
              skipDuplicates: true,
            });
          }
        } else {
          // SUPER_ADMIN (no specific wineryId provided)
          await tx.guestTagAssignment.deleteMany({
            where: { guestProfileId: id },
          });
          if (data.tagIds.length > 0) {
            await tx.guestTagAssignment.createMany({
              data: data.tagIds.map((tagId) => ({
                guestProfileId: id,
                guestTagId: tagId,
              })),
              skipDuplicates: true,
            });
          }
        }
      }

      return profile;
    });
  }

  static async addNote(input: {
    guestProfileId: string;
    wineryId: string;
    authorId: string;
    content: string;
  }) {
    return prisma.guestNote.create({
      data: {
        guestProfileId: input.guestProfileId,
        wineryId: input.wineryId,
        authorId: input.authorId,
        content: input.content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }
}

export class GuestWinePreferenceRepository {
  static async findByGuestProfileId(guestProfileId: string) {
    return prisma.guestWinePreference.findUnique({
      where: { guestProfileId },
      include: {
        favoriteWine: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            wineryId: true,
          },
        },
      },
    });
  }

  static async upsertPreferences(
    guestProfileId: string,
    data: {
      favoriteVarietals?: string[];
      preferredSweetness?: string | null;
      preferredBody?: string | null;
      preferredAcidity?: string | null;
      favoriteWineId?: string | null;
    }
  ) {
    return prisma.guestWinePreference.upsert({
      where: { guestProfileId },
      update: {
        ...(data.favoriteVarietals !== undefined ? { favoriteVarietals: data.favoriteVarietals } : {}),
        ...(data.preferredSweetness !== undefined ? { preferredSweetness: data.preferredSweetness } : {}),
        ...(data.preferredBody !== undefined ? { preferredBody: data.preferredBody } : {}),
        ...(data.preferredAcidity !== undefined ? { preferredAcidity: data.preferredAcidity } : {}),
        ...(data.favoriteWineId !== undefined ? { favoriteWineId: data.favoriteWineId } : {}),
      },
      create: {
        guestProfileId,
        favoriteVarietals: data.favoriteVarietals ?? [],
        preferredSweetness: data.preferredSweetness ?? null,
        preferredBody: data.preferredBody ?? null,
        preferredAcidity: data.preferredAcidity ?? null,
        favoriteWineId: data.favoriteWineId ?? null,
      },
      include: {
        favoriteWine: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            wineryId: true,
          },
        },
      },
    });
  }
}

export class TastingRepository {
  static async findByGuestEmail(email: string) {
    return prisma.tastingRecord.findMany({
      where: {
        guestProfile: { user: { email } },
      },
      include: {
        wineVintage: {
          include: { wine: true },
        },
        tastingSession: true,
      },
      orderBy: { tastedAt: 'desc' },
    });
  }

  static async findSessionById(id: string) {
    return prisma.tastingSession.findUnique({
      where: { id },
      include: {
        guestProfile: true,
        booking: true,
        records: {
          include: { wineVintage: { include: { wine: true } } },
        },
      },
    });
  }

  static async findAllSessionsAdmin(filters: {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    hasBooking?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.TastingSessionWhereInput = {};

    if (filters.search) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { guestProfile: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { guestProfile: { user: { email: { contains: searchTerm, mode: 'insensitive' } } } },
        { booking: { bookingNumber: { contains: searchTerm, mode: 'insensitive' } } },
        { location: { contains: searchTerm, mode: 'insensitive' } },
        { notes: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (filters.dateFrom || filters.dateTo) {
      where.sessionDate = {};
      if (filters.dateFrom) {
        where.sessionDate.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.sessionDate.lte = new Date(filters.dateTo);
      }
    }

    if (filters.hasBooking === 'yes') {
      where.bookingId = { not: null };
    } else if (filters.hasBooking === 'no') {
      where.bookingId = null;
    }

    const [sessions, total] = await Promise.all([
      prisma.tastingSession.findMany({
        where,
        include: {
          guestProfile: {
            include: { user: true },
          },
          booking: {
            select: { bookingNumber: true, date: true, status: true },
          },
          records: {
            include: {
              wineVintage: {
                include: { wine: true },
              },
            },
          },
        },
        orderBy: { sessionDate: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.tastingSession.count({ where }),
    ]);

    return {
      sessions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  static async findSessionByIdAdmin(id: string) {
    return prisma.tastingSession.findUnique({
      where: { id },
      include: {
        guestProfile: {
          include: { user: true },
        },
        booking: {
          include: {
            items: { include: { experience: true } },
          },
        },
        records: {
          include: {
            wineVintage: {
              include: { wine: true },
            },
          },
          orderBy: { tastedAt: 'asc' },
        },
      },
    });
  }

  static async findSessionByBookingId(bookingId: string) {
    return prisma.tastingSession.findFirst({
      where: { bookingId },
      include: {
        guestProfile: {
          include: { user: true },
        },
        booking: {
          include: {
            items: { include: { experience: true } },
          },
        },
        records: {
          include: {
            wineVintage: {
              include: { wine: true },
            },
          },
          orderBy: { tastedAt: 'asc' },
        },
      },
      orderBy: { sessionDate: 'asc' },
    });
  }

  static async createSessionForBooking(data: {
    bookingId: string;
    guestProfileId: string;
    location?: string;
    notes?: string;
  }) {
    return prisma.tastingSession.create({
      data: {
        bookingId: data.bookingId,
        guestProfileId: data.guestProfileId,
        location: data.location,
        notes: data.notes,
      },
      include: {
        guestProfile: {
          include: { user: true },
        },
        booking: {
          include: {
            items: { include: { experience: true } },
          },
        },
        records: {
          include: {
            wineVintage: {
              include: { wine: true },
            },
          },
          orderBy: { tastedAt: 'asc' },
        },
      },
    });
  }

  static async createRecord(data: {
    guestProfileId: string;
    wineVintageId: string;
    wineNameSnapshot: string;
    vintageYear: number;
    rating: Prisma.Decimal;
    notes: string;
    tasteCharacteristics: string[];
    wouldDrinkAgain: 'YES' | 'MAYBE' | 'NO';
    experienceName?: string;
    body: number;
    acidity: number;
    sweetness: number;
    tannin: number;
  }) {
    return prisma.tastingRecord.create({
      data: {
        guestProfileId: data.guestProfileId,
        wineVintageId: data.wineVintageId,
        wineNameSnapshot: data.wineNameSnapshot,
        vintageYear: data.vintageYear,
        rating: data.rating,
        notes: data.notes,
        tasteCharacteristics: data.tasteCharacteristics,
        wouldDrinkAgain: data.wouldDrinkAgain,
        experienceName: data.experienceName,
        body: data.body,
        acidity: data.acidity,
        sweetness: data.sweetness,
        tannin: data.tannin,
      },
    });
  }

  static async findJourneyForGuest(
    guestProfileId: string,
    filters: { page?: number; pageSize?: number; search?: string } = {}
  ) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.TastingRecordWhereInput = { guestProfileId };

    const search = filters.search?.trim();
    if (search) {
      where.OR = [
        { wineNameSnapshot: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { experienceName: { contains: search, mode: 'insensitive' } },
        { wineVintage: { wine: { name: { contains: search, mode: 'insensitive' } } } },
        { wineVintage: { wine: { slug: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.tastingRecord.findMany({
        where,
        select: {
          id: true,
          tastedAt: true,
          notes: true,
          rating: true,
          wouldDrinkAgain: true,
          experienceName: true,
          tasteCharacteristics: true,
          tastingSession: {
            select: {
              id: true,
              sessionDate: true,
              location: true,
              notes: true,
              booking: { select: { bookingNumber: true, date: true } },
            },
          },
          wineVintage: {
            select: {
              id: true,
              vintageYear: true,
              wine: { select: { id: true, name: true, slug: true, category: true } },
            },
          },
        },
        orderBy: [{ tastedAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.tastingRecord.count({ where }),
    ]);

    return {
      records,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }
}

export class ReviewRepository {
  static async findApproved(wineryId: string) {
    return prisma.review.findMany({
      where: { wineryId, status: ReviewStatus.APPROVED },
      include: {
        experience: true,
        wine: true,
        event: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createReview(data: {
    wineryId: string;
    authorName: string;
    guestProfileId?: string;
    rating: number;
    title: string;
    comment: string;
    category: 'WINE_TASTING' | 'VINEYARD_TOUR' | 'EVENTS' | 'FOOD';
    targetName: string;
    experienceId?: string;
    wineId?: string;
    eventId?: string;
    bookingId?: string;
  }) {
    return prisma.review.create({
      data: {
        wineryId: data.wineryId,
        authorName: data.authorName,
        guestProfileId: data.guestProfileId,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        category: data.category,
        targetName: data.targetName,
        experienceId: data.experienceId,
        wineId: data.wineId,
        eventId: data.eventId,
        bookingId: data.bookingId,
        status: ReviewStatus.PENDING, // Customer reviews require moderation
      },
    });
  }

  // Fields returned to the authenticated guest for their own reviews.
  // Deliberately excludes wineryId, guestProfileId, authorName, helpfulCount,
  // and any User/GuestProfile relation (no passwordHash / auth data).
  static readonly guestReviewSelect = {
    id: true,
    rating: true,
    title: true,
    comment: true,
    category: true,
    targetName: true,
    status: true,
    verified: true,
    createdAt: true,
    updatedAt: true,
    booking: {
      select: {
        bookingNumber: true,
        date: true,
        status: true,
      },
    },
    experience: {
      select: { id: true, title: true, slug: true },
    },
    wine: {
      select: { id: true, name: true, slug: true },
    },
    event: {
      select: { id: true, title: true, slug: true },
    },
  } satisfies Prisma.ReviewSelect;

  static async findPageForGuest(
    guestProfileId: string,
    filters: { page?: number; pageSize?: number; status?: ReviewStatus; search?: string } = {}
  ) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Ownership, status, search, and pagination are all applied database-side.
    const where: Prisma.ReviewWhereInput = { guestProfileId };
    if (filters.status) where.status = filters.status;

    const search = filters.search?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { comment: { contains: search, mode: 'insensitive' } },
        { targetName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        select: ReviewRepository.guestReviewSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.review.count({ where }),
    ]);

    return {
      reviews,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  static async findByIdForGuest(id: string, guestProfileId: string) {
    return prisma.review.findFirst({
      where: { id, guestProfileId },
      select: ReviewRepository.guestReviewSelect,
    });
  }

  static async findGuestReviewForBooking(guestProfileId: string, bookingId: string) {
    return prisma.review.findFirst({
      where: { guestProfileId, bookingId },
      select: { id: true, status: true },
    });
  }

  // Completed visits owned by the guest, with this guest's existing review
  // attached so the caller can derive "already reviewed" without N+1 queries.
  static async findEligibleBookingsForGuest(
    guestProfileId: string,
    filters: { page?: number; pageSize?: number } = {}
  ) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.BookingWhereInput = {
      guestProfileId,
      status: BookingStatus.COMPLETED,
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        select: {
          id: true,
          bookingNumber: true,
          date: true,
          time: true,
          status: true,
          items: {
            select: {
              itemType: true,
              title: true,
              experienceId: true,
              experience: { select: { id: true, title: true, slug: true } },
            },
          },
          reviews: {
            where: { guestProfileId },
            select: { id: true, status: true },
          },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      bookings,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // Transactional duplicate check: one review per (guest, booking).
  // The schema's only unique key is (wineryId, authorName, title), which cannot
  // express per-visit uniqueness (title is guest-controlled), so this server-side
  // check guards duplicates without a schema migration.
  // LIMITATION (documented, intentionally not fixed here): the check-then-insert
  // inside the transaction is not backed by a unique constraint on
  // (guestProfileId, bookingId), so two truly simultaneous submits can still race.
  // Closing that gap requires a schema migration and is out of scope for 6.7 follow-up.
  static async createGuestReview(data: {
    wineryId: string;
    guestProfileId: string;
    bookingId: string;
    authorName: string;
    rating: number;
    title: string;
    comment: string;
    category: 'WINE_TASTING' | 'VINEYARD_TOUR' | 'EVENTS' | 'FOOD';
    targetName: string;
    experienceId?: string;
    wineId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.review.findFirst({
        where: { guestProfileId: data.guestProfileId, bookingId: data.bookingId },
        select: { id: true },
      });
      if (existing) {
        const err = new Error('You have already reviewed this visit') as Error & { statusCode?: number };
        err.statusCode = 409;
        throw err;
      }

      return tx.review.create({
        data: {
          wineryId: data.wineryId,
          authorName: data.authorName,
          guestProfileId: data.guestProfileId,
          bookingId: data.bookingId,
          rating: data.rating,
          title: data.title,
          comment: data.comment,
          category: data.category,
          targetName: data.targetName,
          experienceId: data.experienceId,
          wineId: data.wineId,
          status: ReviewStatus.PENDING, // Customer reviews require moderation
        },
        select: ReviewRepository.guestReviewSelect,
      });
    });
  }

  // Wines the guest actually encountered on a completed visit:
  //   1. wines included in the booked experience(s) (ExperienceWine), and
  //   2. wines in tasting records attached to the visit's tasting sessions.
  // This set is the ONLY source of truth for an optional Review.wineId target —
  // the client may choose among these, never name an arbitrary Wine ID.
  static async findAllowedWineIdsForVisit(bookingId: string, experienceIds: string[]) {
    const ids = [...new Set(experienceIds.filter(Boolean))];
    const [experienceWines, tastingRecords] = await Promise.all([
      ids.length
        ? prisma.experienceWine.findMany({
            where: { experienceId: { in: ids } },
            select: { wineId: true },
          })
        : Promise.resolve([]),
      prisma.tastingRecord.findMany({
        where: { tastingSession: { bookingId } },
        select: { wineVintage: { select: { wineId: true } } },
      }),
    ]);

    const allowed = new Set<string>();
    for (const row of experienceWines) allowed.add(row.wineId);
    for (const row of tastingRecords) allowed.add(row.wineVintage.wineId);
    return allowed;
  }

  // Batch variant used by the eligible-visits list (avoids N+1).
  static async findAllowedWineIdsForVisits(bookings: Array<{ id: string; experienceIds: string[] }>) {
    const allExperienceIds = [
      ...new Set(bookings.flatMap((b) => b.experienceIds.filter(Boolean))),
    ];
    const bookingIds = bookings.map((b) => b.id);

    const [experienceWines, tastingRecords] = await Promise.all([
      allExperienceIds.length
        ? prisma.experienceWine.findMany({
            where: { experienceId: { in: allExperienceIds } },
            select: { experienceId: true, wineId: true },
          })
        : Promise.resolve([]),
      bookingIds.length
        ? prisma.tastingRecord.findMany({
            where: { tastingSession: { bookingId: { in: bookingIds } } },
            select: {
              tastingSession: { select: { bookingId: true } },
              wineVintage: { select: { wineId: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const wineIdsByExperience = new Map<string, Set<string>>();
    for (const row of experienceWines) {
      const set = wineIdsByExperience.get(row.experienceId) ?? new Set<string>();
      set.add(row.wineId);
      wineIdsByExperience.set(row.experienceId, set);
    }

    const wineIdsByBooking = new Map<string, Set<string>>();
    for (const booking of bookings) {
      const set = new Set<string>();
      for (const experienceId of booking.experienceIds) {
        for (const wineId of wineIdsByExperience.get(experienceId) ?? []) set.add(wineId);
      }
      wineIdsByBooking.set(booking.id, set);
    }
    for (const row of tastingRecords) {
      const bookingId = row.tastingSession?.bookingId;
      if (!bookingId) continue;
      const set = wineIdsByBooking.get(bookingId) ?? new Set<string>();
      set.add(row.wineVintage.wineId);
      wineIdsByBooking.set(bookingId, set);
    }

    return wineIdsByBooking;
  }

  // Concluded, non-cancelled event bookings owned by the guest, with any existing
  // review by this guest on that event attached (alreadyReviewed derivation).
  // Eligibility mirrors createGuestEventReview: booking must not be
  // PENDING/CANCELLED/NO_SHOW, the event must not be CANCELLED, and the event
  // must have concluded (isPast / COMPLETED / eventDate before today).
  static async findEligibleEventBookingsForGuest(
    guestProfileId: string,
    filters: { page?: number; pageSize?: number } = {}
  ) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const where: Prisma.EventBookingWhereInput = {
      guestProfileId,
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.COMPLETED] },
      event: {
        status: { not: 'CANCELLED' as import('@prisma/client').EventStatus },
        OR: [
          { isPast: true },
          { status: 'COMPLETED' as import('@prisma/client').EventStatus },
          { eventDate: { lt: startOfToday } },
        ],
      },
    };

    const [bookings, total] = await Promise.all([
      prisma.eventBooking.findMany({
        where,
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          event: {
            select: {
              id: true,
              slug: true,
              title: true,
              eventDate: true,
              timeRange: true,
              status: true,
              isPast: true,
              reviews: {
                where: { guestProfileId },
                select: { id: true, status: true },
              },
            },
          },
        },
        orderBy: [{ event: { eventDate: 'desc' } }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.eventBooking.count({ where }),
    ]);

    return {
      bookings,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // One review per (guest, event). Same non-unique check-then-insert limitation
  // as createGuestReview (documented; no migration in this follow-up).
  static async createGuestEventReview(data: {
    wineryId: string;
    guestProfileId: string;
    eventId: string;
    authorName: string;
    rating: number;
    title: string;
    comment: string;
    category: 'WINE_TASTING' | 'VINEYARD_TOUR' | 'EVENTS' | 'FOOD';
    targetName: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.review.findFirst({
        where: { guestProfileId: data.guestProfileId, eventId: data.eventId },
        select: { id: true },
      });
      if (existing) {
        const err = new Error('You have already reviewed this event') as Error & { statusCode?: number };
        err.statusCode = 409;
        throw err;
      }

      return tx.review.create({
        data: {
          wineryId: data.wineryId,
          authorName: data.authorName,
          guestProfileId: data.guestProfileId,
          eventId: data.eventId,
          rating: data.rating,
          title: data.title,
          comment: data.comment,
          category: data.category,
          targetName: data.targetName,
          status: ReviewStatus.PENDING, // Customer reviews require moderation
        },
        select: ReviewRepository.guestReviewSelect,
      });
    });
  }

  // Fields returned to authorized staff on /api/admin/reviews.
  // No passwordHash / session data; guest identity limited to profile name/email.
  static readonly adminReviewSelect = {
    id: true,
    wineryId: true,
    authorName: true,
    rating: true,
    title: true,
    comment: true,
    category: true,
    targetName: true,
    status: true,
    verified: true,
    createdAt: true,
    updatedAt: true,
    guestProfile: {
      select: {
        id: true,
        name: true,
        user: { select: { email: true } },
      },
    },
    booking: {
      select: { bookingNumber: true, date: true, status: true },
    },
    experience: {
      select: { id: true, title: true, slug: true },
    },
    wine: {
      select: { id: true, name: true, slug: true },
    },
    event: {
      select: { id: true, title: true, slug: true, eventDate: true },
    },
  } satisfies Prisma.ReviewSelect;

  static async findByIdForAdmin(id: string) {
    return prisma.review.findUnique({
      where: { id },
      select: ReviewRepository.adminReviewSelect,
    });
  }

  static async updateStatus(id: string, status: ReviewStatus) {
    return prisma.review.update({
      where: { id },
      data: { status },
      select: ReviewRepository.adminReviewSelect,
    });
  }

  static async findPageForAdmin(
    filters: {
      page?: number;
      pageSize?: number;
      status?: ReviewStatus;
      category?: string;
      search?: string;
      wineryId?: string;
    } = {}
  ) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ReviewWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category as import('@prisma/client').ReviewCategory;
    if (filters.wineryId) where.wineryId = filters.wineryId;

    const search = filters.search?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { comment: { contains: search, mode: 'insensitive' } },
        { targetName: { contains: search, mode: 'insensitive' } },
        { authorName: { contains: search, mode: 'insensitive' } },
        { booking: { bookingNumber: { contains: search, mode: 'insensitive' } } },
        { guestProfile: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        select: ReviewRepository.adminReviewSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.review.count({ where }),
    ]);

    return {
      reviews,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // Event reviews have no EventBooking FK on Review; derive the guest's event
  // booking reference for display via (guestProfileId, eventId). Prefer an
  // active (non-cancelled) booking when the guest has multiple rows.
  static async findEventBookingNumbersForReviews(
    refs: Array<{ guestProfileId: string | null; eventId: string | null }>
  ) {
    const keys = refs.filter(
      (r): r is { guestProfileId: string; eventId: string } => Boolean(r.guestProfileId && r.eventId)
    );
    if (keys.length === 0) return new Map<string, string>();

    const rows = await prisma.eventBooking.findMany({
      where: { OR: keys.map((k) => ({ guestProfileId: k.guestProfileId, eventId: k.eventId })) },
      select: {
        bookingNumber: true,
        guestProfileId: true,
        eventId: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const map = new Map<string, { bookingNumber: string; active: boolean }>();
    for (const row of rows) {
      const key = `${row.guestProfileId}:${row.eventId}`;
      const active =
        row.status !== BookingStatus.CANCELLED && row.status !== BookingStatus.NO_SHOW;
      const existing = map.get(key);
      if (!existing || (!existing.active && active)) {
        map.set(key, { bookingNumber: row.bookingNumber, active });
      }
    }
    return new Map([...map.entries()].map(([key, value]) => [key, value.bookingNumber]));
  }
}
export class EventBookingRepository {
  static async findManyAdmin(filters: {
    search?: string;
    status?: string;
    eventId?: string;
    eventScheduleId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.EventBookingWhereInput = {};

    if (filters.search) {
      const term = filters.search.trim();
      where.OR = [
        { bookingNumber: { contains: term, mode: 'insensitive' } },
        { guestProfile: { name: { contains: term, mode: 'insensitive' } } },
        { guestProfile: { user: { email: { contains: term, mode: 'insensitive' } } } },
        { event: { title: { contains: term, mode: 'insensitive' } } },
        { event: { slug: { contains: term, mode: 'insensitive' } } },
      ];
    }

    if (filters.status) {
      where.status = filters.status as BookingStatus;
    }

    if (filters.eventId) {
      where.eventId = filters.eventId;
    }

    if (filters.eventScheduleId) {
      where.eventScheduleId = filters.eventScheduleId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const [bookings, total] = await Promise.all([
      prisma.eventBooking.findMany({
        where,
        include: {
          event: { select: { id: true, slug: true, title: true, eventDate: true, venue: true, timeRange: true, status: true } },
          eventSchedule: { select: { id: true, timeSlot: true, activity: true } },
          guestProfile: { select: { id: true, name: true, phone: true, user: { select: { email: true } } } },
          tickets: { include: { ticketType: true } },
          statusHistory: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.eventBooking.count({ where }),
    ]);

    return {
      bookings,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  static async findByBookingNumberAdmin(bookingNumber: string) {
    return prisma.eventBooking.findUnique({
      where: { bookingNumber },
      include: {
        event: {
          select: {
            id: true,
            wineryId: true,
            slug: true,
            title: true,
            eventDate: true,
            timeRange: true,
            venue: true,
            status: true,
            availability: true,
            isPast: true,
            featuredImage: true,
          },
        },
        eventSchedule: true,
        guestProfile: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
        tickets: {
          include: { ticketType: true },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  static async findByBookingNumber(bookingNumber: string) {
    return prisma.eventBooking.findUnique({
      where: { bookingNumber },
      include: {
        event: {
          select: {
            id: true,
            wineryId: true,
            slug: true,
            title: true,
            eventDate: true,
            timeRange: true,
            venue: true,
            status: true,
            availability: true,
            isPast: true,
          },
        },
        eventSchedule: true,
        guestProfile: {
          include: { user: { select: { id: true, email: true, passwordHash: true } } },
        },
        tickets: {
          include: { ticketType: true },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  static async findByGuestProfileId(
    guestProfileId: string,
    filters: { page?: number; pageSize?: number; filter?: GuestBookingTimelineFilter } = {}
  ) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.EventBookingWhereInput = {
      guestProfileId,
      ...(filters.filter ? eventTimelineWhere(filters.filter) : {}),
    };

    const [bookings, total] = await Promise.all([
      prisma.eventBooking.findMany({
        where,
        include: {
          event: {
            select: { id: true, slug: true, title: true, eventDate: true, timeRange: true, venue: true, status: true, isPast: true, currency: true },
          },
          eventSchedule: { select: { id: true, timeSlot: true, activity: true } },
          tickets: {
            include: {
              ticketType: { select: { id: true, name: true, price: true } },
            },
          },
        },
        orderBy: [{ event: { eventDate: 'desc' } }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.eventBooking.count({ where }),
    ]);

    return {
      bookings,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  static async createBookingWithTransaction(data: {
    bookingNumber: string;
    eventId: string;
    eventScheduleId: string;
    guestProfileId: string;
    totalPrice: Prisma.Decimal;
    status?: BookingStatus;
    tickets: Array<{ eventTicketTypeId: string; quantity: number; unitPrice: Prisma.Decimal }>;
  }) {
    return prisma.$transaction(
      async (tx) => {
      // 1. Lock the parent Event row to prevent concurrent overselling across different ticket types
      await tx.$queryRaw`SELECT id FROM "events" WHERE id = ${data.eventId} FOR UPDATE`;

      const currentEvent = await tx.event.findUnique({
        where: { id: data.eventId },
      });
      if (!currentEvent) {
        throw new Error(`Event ${data.eventId} not found`);
      }

      // Deterministic lock order for ticket types to reduce deadlock risk
      const sortedTickets = [...data.tickets].sort((a, b) =>
        a.eventTicketTypeId.localeCompare(b.eventTicketTypeId)
      );
      const ticketTypeIds = sortedTickets.map((t) => t.eventTicketTypeId);

      // Row-level lock on ticket types (PostgreSQL FOR UPDATE)
      if (ticketTypeIds.length > 0) {
        await tx.$queryRaw`SELECT id FROM "event_ticket_types" WHERE id IN (${Prisma.join(ticketTypeIds)}) ORDER BY id FOR UPDATE`;
      }

      // Re-fetch ALL ticket types for this event to calculate total sold tickets
      const allEventTicketTypes = await tx.eventTicketType.findMany({
        where: { eventId: data.eventId },
      });

      const totalSoldEventTickets = allEventTicketTypes.reduce((sum, tt) => sum + tt.soldCount, 0);
      const totalRequested = sortedTickets.reduce((sum, t) => sum + t.quantity, 0);
      const remainingEventCapacity = currentEvent.maxCapacity - totalSoldEventTickets;

      if (remainingEventCapacity < totalRequested) {
        throw new Error(
          `Insufficient capacity for event. Available: ${remainingEventCapacity}, Requested: ${totalRequested}`
        );
      }

      const typeMap = new Map(allEventTicketTypes.map((tt) => [tt.id, tt]));

      // Validate capacity inside locked transaction
      for (const t of sortedTickets) {
        const tt = typeMap.get(t.eventTicketTypeId);
        if (!tt) {
          throw new Error(`Ticket type ${t.eventTicketTypeId} not found`);
        }
        const available = tt.capacity - tt.soldCount;
        if (available < t.quantity) {
          throw new Error(
            `Insufficient capacity for ticket type '${tt.name}'. Available: ${available}, Requested: ${t.quantity}`
          );
        }
        if (tt.eventId !== data.eventId) {
          throw new Error(`Ticket type '${tt.name}' does not belong to this event`);
        }
      }

      const initialStatus = data.status || BookingStatus.CONFIRMED;

      // Create booking with tickets and status history atomically
      const booking = await tx.eventBooking.create({
        data: {
          bookingNumber: data.bookingNumber,
          eventId: data.eventId,
          eventScheduleId: data.eventScheduleId,
          guestProfileId: data.guestProfileId,
          totalPrice: data.totalPrice,
          status: initialStatus,
          tickets: {
            create: sortedTickets.map((t) => ({
              eventTicketTypeId: t.eventTicketTypeId,
              quantity: t.quantity,
              unitPrice: t.unitPrice,
            })),
          },
          statusHistory: {
            create: [
              {
                fromStatus: BookingStatus.PENDING,
                toStatus: initialStatus,
                changedBy: 'CUSTOMER_API',
                notes: initialStatus === BookingStatus.CONFIRMED
                  ? 'Event booking confirmed via API transaction'
                  : 'Event booking created, awaiting online payment',
              },
            ],
          },
        },
        include: {
          event: true,
          eventSchedule: true,
          tickets: { include: { ticketType: true } },
          statusHistory: true,
        },
      });

      // Atomically increment soldCount for each ticket type (locked rows ensure safety)
      for (const t of sortedTickets) {
        await tx.eventTicketType.update({
          where: { id: t.eventTicketTypeId },
          data: { soldCount: { increment: t.quantity } },
        });
        // Verify invariant immediately (single fetch per ticket instead of two)
        const after = await tx.eventTicketType.findUnique({ where: { id: t.eventTicketTypeId } });
        if (after && after.soldCount > after.capacity) {
          throw new Error(`Insufficient capacity for ticket type '${after.name}' after increment`);
        }
      }

      return booking;
      },
      { maxWait: 15000, timeout: 15000 }
    );
  }

  static async cancelBooking(bookingId: string, reason?: string) {
    return prisma.$transaction(
      async (tx) => {
      const existing = await tx.eventBooking.findUnique({
        where: { id: bookingId },
        include: { tickets: true },
      });

      if (!existing) throw new Error('Event booking not found');

      // Idempotent: if already cancelled, return without double-releasing
      if (existing.status === BookingStatus.CANCELLED) {
        return existing;
      }

      if (existing.status === BookingStatus.COMPLETED) {
        throw new Error('Cannot cancel a completed booking');
      }

      if (existing.status === BookingStatus.CHECKED_IN) {
        throw new Error('Cannot cancel a checked-in booking');
      }

      // Only CONFIRMED/PENDING are cancellable (NO_SHOW also not cancellable)
      if (existing.status !== BookingStatus.CONFIRMED && existing.status !== BookingStatus.PENDING) {
        throw new Error(`Booking cannot be cancelled from status ${existing.status}`);
      }

      const fromStatus = existing.status;

      // Lock ticket types in deterministic order before releasing capacity
      const ticketTypeIds = existing.tickets
        .filter((t) => t.eventTicketTypeId)
        .map((t) => t.eventTicketTypeId as string)
        .sort();

      if (ticketTypeIds.length > 0) {
        await tx.$queryRaw`SELECT id FROM "event_ticket_types" WHERE id IN (${Prisma.join(ticketTypeIds)}) ORDER BY id FOR UPDATE`;
      }

      const updated = await tx.eventBooking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
        include: { tickets: true, statusHistory: true },
      });

      await tx.eventBookingStatusHistory.create({
        data: {
          eventBookingId: existing.id,
          fromStatus,
          toStatus: BookingStatus.CANCELLED,
          changedBy: 'CUSTOMER_API',
          notes: reason || 'Event booking cancelled by customer request',
        },
      });

      // Release capacity for each ticket line (batch fetch to reduce round-trips)
      for (const t of existing.tickets) {
        if (!t.eventTicketTypeId) continue;
        // Use raw decrement with guard to avoid negative; simpler to fetch then update as before but fewer queries
        // Fetch current soldCount
        const tt = await tx.eventTicketType.findUnique({ where: { id: t.eventTicketTypeId } });
        if (!tt) continue;
        const newSoldCount = Math.max(0, tt.soldCount - t.quantity);
        await tx.eventTicketType.update({
          where: { id: t.eventTicketTypeId },
          data: { soldCount: newSoldCount },
        });
      }

      return updated;
      },
      { maxWait: 15000, timeout: 15000 }
    );
  }
}

export class UserRepository {
  static async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        winery: true,
        guestProfile: true,
      },
    });
  }

  static async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        winery: true,
        guestProfile: true,
      },
    });
  }

  static async upsertStaffUser(data: {
    email: string;
    passwordHash: string;
    role: import('@prisma/client').UserRole;
    wineryId: string;
  }) {
    return prisma.user.upsert({
      where: { email: data.email },
      update: {
        passwordHash: data.passwordHash,
        role: data.role,
        wineryId: data.wineryId,
      },
      create: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        wineryId: data.wineryId,
      },
    });
  }

  // --- Staff & Roles User Management (Phase 12A) ---
  // Explicit select: passwordHash is never part of a staff DTO.
  static readonly staffSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    wineryId: true,
    createdAt: true,
    updatedAt: true,
    winery: { select: { id: true, name: true, slug: true } },
  } satisfies Prisma.UserSelect;

  static async findStaffList(scope: { wineryId: string | null }) {
    return prisma.user.findMany({
      where: {
        role: { not: 'GUEST' },
        ...(scope.wineryId ? { wineryId: scope.wineryId } : {}),
      },
      select: UserRepository.staffSelect,
      orderBy: { createdAt: 'asc' },
    });
  }

  static async findStaffById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { ...UserRepository.staffSelect, guestProfile: { select: { id: true } } },
    });
  }

  static async findStaffByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
  }

  static async createStaff(data: {
    email: string;
    name: string;
    passwordHash: string;
    role: import('@prisma/client').UserRole;
    wineryId: string | null;
    isActive: boolean;
  }) {
    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        role: data.role,
        wineryId: data.wineryId,
        isActive: data.isActive,
      },
      select: UserRepository.staffSelect,
    });
  }

  static async updateStaff(
    id: string,
    data: {
      name?: string;
      email?: string;
      role?: import('@prisma/client').UserRole;
      wineryId?: string | null;
      isActive?: boolean;
    }
  ) {
    return prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.wineryId !== undefined ? { wineryId: data.wineryId } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      select: UserRepository.staffSelect,
    });
  }

  static async setStaffPassword(id: string, passwordHash: string) {
    return prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: { id: true },
    });
  }

  static async deleteStaff(id: string) {
    return prisma.user.delete({
      where: { id },
      select: { id: true },
    });
  }

  static async findExistingWineryIds(ids: string[]) {
    if (ids.length === 0) return [];
    const rows = await prisma.winery.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  static async listWineryOptions(scopeWineryId: string | null = null) {
    return prisma.winery.findMany({
      where: scopeWineryId ? { id: scopeWineryId } : {},
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  }
}


/**
 * Slices a large reference list into bounded chunks so a single statement never
 * exceeds the database parameter limit when a tenant scope holds many bookings.
 */
function chunkItems<T>(items: T[], size = 1000): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export class NotificationRepository {
  static async create(data: {
    recipient: string;
    channel?: NotificationChannel;
    type: NotificationType;
    title: string;
    content: string;
    isSent?: boolean;
    sentAt?: Date | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    return prisma.notification.create({
      data: {
        recipient: data.recipient.toLowerCase().trim(),
        channel: data.channel ?? NotificationChannel.PUSH,
        type: data.type,
        title: data.title,
        content: data.content,
        isSent: data.isSent ?? false,
        sentAt: data.sentAt ?? null,
        metadata: data.metadata ?? { read: false, readAt: null },
      },
    });
  }

  static async findManyByRecipient(params: {
    recipient: string;
    unreadOnly?: boolean;
    page: number;
    pageSize: number;
  }) {
    const { recipient, unreadOnly, page, pageSize } = params;
    const skip = (page - 1) * pageSize;
    const cleanRecipient = recipient.toLowerCase().trim();

    const where: Prisma.NotificationWhereInput = {
      recipient: cleanRecipient,
      ...(unreadOnly ? { metadata: { path: ['read'], equals: false } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  static async countUnreadByRecipient(recipient: string): Promise<number> {
    const cleanRecipient = recipient.toLowerCase().trim();
    return prisma.notification.count({
      where: {
        recipient: cleanRecipient,
        metadata: { path: ['read'], equals: false },
      },
    });
  }

  static async findByIdAndRecipient(id: string, recipient: string) {
    const cleanRecipient = recipient.toLowerCase().trim();
    return prisma.notification.findFirst({
      where: {
        id,
        recipient: cleanRecipient,
      },
    });
  }

  static async markAsRead(id: string, recipient: string) {
    const cleanRecipient = recipient.toLowerCase().trim();
    const existing = await prisma.notification.findFirst({
      where: {
        id,
        recipient: cleanRecipient,
      },
    });

    if (!existing) {
      return null;
    }

    const currentMeta = (existing.metadata as Record<string, unknown>) || {};
    if (currentMeta.read === true) {
      // Idempotent: already marked as read
      return existing;
    }

    const updatedMeta = {
      ...currentMeta,
      read: true,
      readAt: new Date().toISOString(),
    };

    return prisma.notification.update({
      where: { id: existing.id },
      data: { metadata: updatedMeta },
    });
  }

  static async markAllAsRead(recipient: string): Promise<number> {
    const cleanRecipient = recipient.toLowerCase().trim();
    const unreadItems = await prisma.notification.findMany({
      where: {
        recipient: cleanRecipient,
        metadata: { path: ['read'], equals: false },
      },
      select: { id: true, metadata: true },
    });

    if (unreadItems.length === 0) {
      return 0;
    }

    const nowIso = new Date().toISOString();
    await Promise.all(
      unreadItems.map((item) => {
        const currentMeta = (item.metadata as Record<string, unknown>) || {};
        return prisma.notification.update({
          where: { id: item.id },
          data: {
            metadata: {
              ...currentMeta,
              read: true,
              readAt: nowIso,
            },
          },
        });
      })
    );

    return unreadItems.length;
  }
}

export class PaymentRepository {
  static async create(data: Prisma.PaymentCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.payment.create({
      data,
      include: {
        booking: true,
        eventBooking: true,
      },
    });
  }

  static async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.payment.findUnique({
      where: { id },
      include: {
        booking: true,
        eventBooking: true,
      },
    });
  }

  static async findByProviderOrderId(providerOrderId: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.payment.findUnique({
      where: { providerOrderId },
      include: {
        booking: true,
        eventBooking: true,
      },
    });
  }

  static async findByProviderPaymentId(providerPaymentId: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.payment.findUnique({
      where: { providerPaymentId },
      include: {
        booking: true,
        eventBooking: true,
      },
    });
  }

  static async findByIdempotencyKey(idempotencyKey: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.payment.findUnique({
      where: { idempotencyKey },
      include: {
        booking: true,
        eventBooking: true,
      },
    });
  }

  static async findLatestByBookingId(bookingId: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.payment.findFirst({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
      include: { booking: true },
    });
  }

  static async findLatestByEventBookingId(eventBookingId: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.payment.findFirst({
      where: { eventBookingId },
      orderBy: { createdAt: 'desc' },
      include: { eventBooking: true },
    });
  }

  static async findManyByBookingId(bookingId: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.payment.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async findManyByEventBookingId(eventBookingId: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.payment.findMany({
      where: { eventBookingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async update(id: string, data: Prisma.PaymentUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.payment.update({
      where: { id },
      data,
      include: {
        booking: true,
        eventBooking: true,
      },
    });
  }

  // Fields returned to authorized staff on /api/admin/payments.
  // providerSignature, idempotencyKey and metadata are deliberately excluded so
  // gateway secrets can never reach an admin payload.
  static readonly adminPaymentSelect = {
    id: true,
    amount: true,
    currency: true,
    status: true,
    provider: true,
    providerOrderId: true,
    providerPaymentId: true,
    paymentMethod: true,
    refundId: true,
    refundAmount: true,
    refundReason: true,
    errorCode: true,
    errorMessage: true,
    createdAt: true,
    updatedAt: true,
    booking: {
      select: {
        bookingNumber: true,
        status: true,
        date: true,
        time: true,
        totalPrice: true,
        currency: true,
        winery: { select: { name: true, slug: true, timezone: true } },
        guestProfile: {
          select: { name: true, user: { select: { email: true } } },
        },
        items: { select: { title: true }, orderBy: { createdAt: 'asc' }, take: 1 },
      },
    },
    eventBooking: {
      select: {
        bookingNumber: true,
        status: true,
        totalPrice: true,
        guestProfile: {
          select: { name: true, user: { select: { email: true } } },
        },
        event: {
          select: {
            title: true,
            eventDate: true,
            winery: { select: { name: true, slug: true, timezone: true } },
          },
        },
      },
    },
  } satisfies Prisma.PaymentSelect;

  // A Payment row has no wineryId of its own; tenancy is reached through the
  // experience booking or through the event's winery.
  static adminTenantScope(wineryId?: string): Prisma.PaymentWhereInput[] {
    if (!wineryId) return [];
    return [
      {
        OR: [
          { booking: { wineryId } },
          { eventBooking: { event: { wineryId } } },
        ],
      },
    ];
  }

  static async findByIdForAdmin(id: string, wineryId?: string) {
    const conditions: Prisma.PaymentWhereInput[] = [{ id }, ...PaymentRepository.adminTenantScope(wineryId)];
    return prisma.payment.findFirst({
      where: { AND: conditions },
      select: PaymentRepository.adminPaymentSelect,
    });
  }

  static async findPageForAdmin(
    filters: {
      search?: string;
      status?: PaymentStatus;
      bookingType?: 'EXPERIENCE' | 'EVENT';
      dateFrom?: string;
      dateTo?: string;
      wineryId?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const conditions: Prisma.PaymentWhereInput[] = [
      ...PaymentRepository.adminTenantScope(filters.wineryId),
    ];

    const search = filters.search?.trim();
    if (search) {
      conditions.push({
        OR: [
          { providerOrderId: { contains: search, mode: 'insensitive' } },
          { providerPaymentId: { contains: search, mode: 'insensitive' } },
          { refundId: { contains: search, mode: 'insensitive' } },
          { paymentMethod: { contains: search, mode: 'insensitive' } },
          { booking: { bookingNumber: { contains: search, mode: 'insensitive' } } },
          { booking: { guestProfile: { name: { contains: search, mode: 'insensitive' } } } },
          { booking: { guestProfile: { user: { email: { contains: search, mode: 'insensitive' } } } } },
          { eventBooking: { bookingNumber: { contains: search, mode: 'insensitive' } } },
          { eventBooking: { guestProfile: { name: { contains: search, mode: 'insensitive' } } } },
          { eventBooking: { guestProfile: { user: { email: { contains: search, mode: 'insensitive' } } } } },
          { eventBooking: { event: { title: { contains: search, mode: 'insensitive' } } } },
        ],
      });
    }

    if (filters.status) {
      conditions.push({ status: filters.status });
    }

    if (filters.bookingType === 'EXPERIENCE') {
      conditions.push({ bookingId: { not: null } });
    } else if (filters.bookingType === 'EVENT') {
      conditions.push({ eventBookingId: { not: null } });
    }

    if (filters.dateFrom || filters.dateTo) {
      const range: Prisma.DateTimeFilter = {};
      if (filters.dateFrom) range.gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const endOfDay = new Date(filters.dateTo);
        if (!Number.isNaN(endOfDay.getTime())) {
          endOfDay.setHours(23, 59, 59, 999);
          range.lte = endOfDay;
        }
      }
      conditions.push({ createdAt: range });
    }

    const where: Prisma.PaymentWhereInput = conditions.length > 0 ? { AND: conditions } : {};

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        select: PaymentRepository.adminPaymentSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  static async markPaymentPaidWithTransaction(params: {
    paymentId: string;
    providerPaymentId: string;
    providerSignature?: string | null;
    paymentMethod?: string;
    metadata?: Prisma.InputJsonValue;
    notes?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.payment.findUnique({
        where: { id: params.paymentId },
        include: {
          booking: {
            include: { items: true },
          },
          eventBooking: {
            include: { event: true },
          },
        },
      });

      if (!existing) {
        throw new Error(`Payment ${params.paymentId} not found`);
      }

      if (existing.status === PaymentStatus.PAID) {
        return existing;
      }


      if (existing.booking && existing.booking.status !== BookingStatus.PENDING) {
        throw new Error(`Cannot mark payment paid: booking is in ${existing.booking.status} status`);
      }
      if (existing.eventBooking && existing.eventBooking.status !== BookingStatus.PENDING) {
        throw new Error(`Cannot mark payment paid: event booking is in ${existing.eventBooking.status} status`);
      }

      const updatedPayment = await tx.payment.update({
        where: { id: params.paymentId },
        data: {
          status: PaymentStatus.PAID,
          providerPaymentId: params.providerPaymentId,
          providerSignature: params.providerSignature !== undefined ? params.providerSignature : existing.providerSignature,
          paymentMethod: params.paymentMethod || existing.paymentMethod,
          ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
        },
        include: {
          booking: {
            include: { items: true },
          },
          eventBooking: {
            include: { event: true },
          },
        },
      });

      if (existing.bookingId && existing.booking) {
        if (existing.booking.status === BookingStatus.PENDING) {
          await tx.booking.update({
            where: { id: existing.bookingId },
            data: { status: BookingStatus.CONFIRMED },
          });

          await tx.bookingStatusHistory.create({
            data: {
              bookingId: existing.bookingId,
              fromStatus: BookingStatus.PENDING,
              toStatus: BookingStatus.CONFIRMED,
              changedBy: 'PAYMENT_VERIFIED',
              notes: params.notes || `Payment verified successfully via Razorpay (${params.providerPaymentId})`,
            },
          });
        }
      } else if (existing.eventBookingId && existing.eventBooking) {
        if (existing.eventBooking.status === BookingStatus.PENDING) {
          await tx.eventBooking.update({
            where: { id: existing.eventBookingId },
            data: { status: BookingStatus.CONFIRMED },
          });

          await tx.eventBookingStatusHistory.create({
            data: {
              eventBookingId: existing.eventBookingId,
              fromStatus: BookingStatus.PENDING,
              toStatus: BookingStatus.CONFIRMED,
              changedBy: 'PAYMENT_VERIFIED',
              notes: params.notes || `Payment verified successfully via Razorpay (${params.providerPaymentId})`,
            },
          });
        }
      }

      return updatedPayment;
    });
  }

  static async markPaymentFailed(params: {
    paymentId: string;
    errorCode?: string;
    errorMessage?: string;
    metadata?: Prisma.InputJsonValue;
  }, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    const existing = await client.payment.findUnique({ where: { id: params.paymentId } });
    if (!existing) {
      throw new Error(`Payment ${params.paymentId} not found`);
    }

    if (existing.status === PaymentStatus.PAID) {
      return existing;
    }

    return client.payment.update({
      where: { id: params.paymentId },
      data: {
        status: PaymentStatus.FAILED,
        errorCode: params.errorCode || null,
        errorMessage: params.errorMessage || null,
        ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
      },
      include: {
        booking: true,
        eventBooking: true,
      },
    });
  }

  static async markPaymentRefundedWithTransaction(params: {
    paymentId: string;
    refundId: string;
    refundAmount: Prisma.Decimal;
    refundReason?: string | null;
    isPartial?: boolean;
    metadata?: Prisma.InputJsonValue;
    staffUserId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.payment.findUnique({
        where: { id: params.paymentId },
        include: {
          booking: true,
          eventBooking: {
            include: { tickets: true },
          },
        },
      });

      if (!existing) {
        throw new Error(`Payment ${params.paymentId} not found`);
      }

      if (existing.status === PaymentStatus.REFUNDED) {
        return existing;
      }

      const newStatus = params.isPartial ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.REFUNDED;

      const updatedPayment = await tx.payment.update({
        where: { id: params.paymentId },
        data: {
          status: newStatus,
          refundId: params.refundId,
          refundAmount: params.refundAmount,
          refundReason: params.refundReason || null,
          ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
        },
        include: {
          booking: true,
          eventBooking: true,
        },
      });

      const changedBy = params.staffUserId || 'STAFF_REFUND';

      // For full refunds, if the reservation is CONFIRMED, update to CANCELLED and release capacity if applicable
      if (!params.isPartial) {
        if (existing.bookingId && existing.booking) {
          if (existing.booking.status === BookingStatus.CONFIRMED || existing.booking.status === BookingStatus.PENDING) {
            await tx.booking.update({
              where: { id: existing.bookingId },
              data: { status: BookingStatus.CANCELLED },
            });

            await tx.bookingStatusHistory.create({
              data: {
                bookingId: existing.bookingId,
                fromStatus: existing.booking.status,
                toStatus: BookingStatus.CANCELLED,
                changedBy,
                notes: `Reservation cancelled due to full refund (${params.refundId})`,
              },
            });
          }
        } else if (existing.eventBookingId && existing.eventBooking) {
          if (existing.eventBooking.status === BookingStatus.CONFIRMED || existing.eventBooking.status === BookingStatus.PENDING) {
            const ticketTypeIds = existing.eventBooking.tickets
              .filter((t) => t.eventTicketTypeId)
              .map((t) => t.eventTicketTypeId as string)
              .sort();

            if (ticketTypeIds.length > 0) {
              await tx.$queryRaw`SELECT id FROM "event_ticket_types" WHERE id IN (${Prisma.join(ticketTypeIds)}) ORDER BY id FOR UPDATE`;
            }

            await tx.eventBooking.update({
              where: { id: existing.eventBookingId },
              data: { status: BookingStatus.CANCELLED },
            });

            await tx.eventBookingStatusHistory.create({
              data: {
                eventBookingId: existing.eventBookingId,
                fromStatus: existing.eventBooking.status,
                toStatus: BookingStatus.CANCELLED,
                changedBy,
                notes: `Event booking cancelled due to full refund (${params.refundId})`,
              },
            });

            // Release capacity for event tickets
            for (const t of existing.eventBooking.tickets) {
              if (!t.eventTicketTypeId) continue;
              const tt = await tx.eventTicketType.findUnique({ where: { id: t.eventTicketTypeId } });
              if (!tt) continue;
              const newSoldCount = Math.max(0, tt.soldCount - t.quantity);
              await tx.eventTicketType.update({
                where: { id: t.eventTicketTypeId },
                data: { soldCount: newSoldCount },
              });
            }
          }
        }
      }

      return updatedPayment;
    });
  }
}

export class WebhookRepository {
  static async create(data: Prisma.WebhookEventCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.webhookEvent.create({ data });
  }

  static async findByEventId(eventId: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.webhookEvent.findUnique({ where: { eventId } });
  }

  static async markProcessed(id: string, processed = true, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.webhookEvent.update({
      where: { id },
      data: { processed },
    });
  }
}

// ----------------------------------------------------
// Guest erasure (SUPER_ADMIN, `guest.delete`)
//
// The dependency tree below was derived from prisma/schema.prisma and is
// executed strictly leaf -> root so the two `Restrict` edges
// (Booking.guestProfile, EventBooking.guestProfile) are always satisfied
// inside a single transaction. Shared/global records (wines, vintages,
// experiences, events, schedules, ticket types, availability rules, winery
// configuration) are never touched.
// ----------------------------------------------------

export interface GuestDeletionTarget {
  guestProfileId: string;
  userId: string;
  /** Lower-cased account email: the natural key used by Notification.recipient and ContactInquiry.email. */
  email: string;
}

export interface GuestDeletionCounts {
  payments: number;
  conversationMessages: number;
  conversations: number;
  callLogs: number;
  voiceCalls: number;
  reviews: number;
  tastingRecords: number;
  tastingSessions: number;
  winePreferences: number;
  bookingItems: number;
  bookingStatusHistories: number;
  bookingGuests: number;
  eventBookingTickets: number;
  eventBookingStatusHistories: number;
  eventBookings: number;
  bookings: number;
  notifications: number;
  contactInquiries: number;
  guestNotes: number;
  guestProfile: number;
  passwordResetTokens: number;
  account: number;
}

export interface GuestDeletionPaymentRecord {
  id: string;
  amount: string;
  currency: string;
  status: string;
  provider: string | null;
  paymentMethod: string | null;
  reference: string | null;
  createdAt: Date;
}

export interface GuestDeletionImpact {
  guest: {
    id: string;
    name: string;
    phone: string | null;
    email: string;
    userId: string;
    accountRole: string;
  };
  counts: GuestDeletionCounts;
  payments: GuestDeletionPaymentRecord[];
  /** Every winery this guest has touched - used for the tenant boundary check. */
  wineryIds: string[];
}

export class GuestDeletionRepository {
  static async findTarget(
    db: Prisma.TransactionClient,
    guestProfileId: string
  ): Promise<
    | {
        id: string;
        name: string;
        phone: string | null;
        userId: string;
        user: { id: string; email: string; role: string; wineryId: string | null; isActive: boolean };
      }
    | null
  > {
    return db.guestProfile.findUnique({
      where: { id: guestProfileId },
      select: {
        id: true,
        name: true,
        phone: true,
        userId: true,
        user: { select: { id: true, email: true, role: true, wineryId: true, isActive: true } },
      },
    });
  }

  private static emailFilter(email: string): Prisma.StringFilter {
    return { equals: email, mode: 'insensitive' };
  }

  /**
   * All wineries the guest has data in. Never derived from the request body -
   * a client-supplied wineryId is not an authority for this operation.
   */
  static async collectWineryIds(db: Prisma.TransactionClient, target: GuestDeletionTarget): Promise<string[]> {
    const { guestProfileId, userId, email } = target;
    const where = this.emailFilter(email);

    const [account, bookings, eventBookings, reviews, conversations, inquiries] = await Promise.all([
      db.user.findUnique({ where: { id: userId }, select: { wineryId: true } }),
      db.booking.findMany({
        where: { guestProfileId },
        distinct: ['wineryId'],
        select: { wineryId: true },
      }),
      db.eventBooking.findMany({
        where: { guestProfileId },
        distinct: ['eventId'],
        select: { event: { select: { wineryId: true } } },
      }),
      db.review.findMany({
        where: { guestProfileId },
        distinct: ['wineryId'],
        select: { wineryId: true },
      }),
      db.conversation.findMany({
        where: { guestProfileId },
        distinct: ['wineryId'],
        select: { wineryId: true },
      }),
      db.contactInquiry.findMany({
        where: { email: where },
        distinct: ['wineryId'],
        select: { wineryId: true },
      }),
    ]);

    const ids = new Set<string>();
    if (account?.wineryId) ids.add(account.wineryId);
    for (const row of bookings) ids.add(row.wineryId);
    for (const row of eventBookings) if (row.event) ids.add(row.event.wineryId);
    for (const row of reviews) ids.add(row.wineryId);
    for (const row of conversations) ids.add(row.wineryId);
    for (const row of inquiries) ids.add(row.wineryId);
    return [...ids];
  }

  /** Exact pre-deletion inventory, including every payment record linked to the guest. */
  static async collectImpact(
    db: Prisma.TransactionClient,
    target: GuestDeletionTarget
  ): Promise<GuestDeletionImpact> {
    const { guestProfileId, userId, email } = target;
    const where = this.emailFilter(email);

    const [
      profile,
      payments,
      conversationMessages,
      conversations,
      callLogs,
      voiceCalls,
      reviews,
      tastingRecords,
      tastingSessions,
      winePreferences,
      bookingItems,
      bookingStatusHistories,
      bookingGuests,
      eventBookingTickets,
      eventBookingStatusHistories,
      eventBookings,
      bookings,
      notifications,
      contactInquiries,
      guestNotes,
      passwordResetTokens,
      account,
      wineryIds,
    ] = await Promise.all([
      db.guestProfile.findUnique({
        where: { id: guestProfileId },
        select: { id: true, name: true, phone: true },
      }),
      db.payment.findMany({
        where: {
          OR: [{ booking: { guestProfileId } }, { eventBooking: { guestProfileId } }],
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          provider: true,
          paymentMethod: true,
          createdAt: true,
          booking: { select: { bookingNumber: true } },
          eventBooking: { select: { bookingNumber: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      db.conversationMessage.count({ where: { conversation: { guestProfileId } } }),
      db.conversation.count({ where: { guestProfileId } }),
      db.callLog.count({ where: { voiceCall: { guestProfileId } } }),
      db.voiceCall.count({ where: { guestProfileId } }),
      db.review.count({ where: { guestProfileId } }),
      db.tastingRecord.count({ where: { guestProfileId } }),
      db.tastingSession.count({ where: { guestProfileId } }),
      db.guestWinePreference.count({ where: { guestProfileId } }),
      db.bookingItem.count({ where: { booking: { guestProfileId } } }),
      db.bookingStatusHistory.count({ where: { booking: { guestProfileId } } }),
      db.bookingGuest.count({ where: { guestProfileId } }),
      db.eventBookingTicket.count({ where: { eventBooking: { guestProfileId } } }),
      db.eventBookingStatusHistory.count({ where: { eventBooking: { guestProfileId } } }),
      db.eventBooking.count({ where: { guestProfileId } }),
      db.booking.count({ where: { guestProfileId } }),
      db.notification.count({ where: { recipient: where } }),
      db.contactInquiry.count({ where: { email: where } }),
      db.guestNote.count({ where: { guestProfileId } }),
      db.passwordResetToken.count({ where: { userId } }),
      db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } }),
      this.collectWineryIds(db, target),
    ]);

    if (!profile || !account) {
      throw new Error(`Guest with id '${guestProfileId}' not found`);
    }

    const paymentRecords: GuestDeletionPaymentRecord[] = payments.map((p) => ({
      id: p.id,
      amount: p.amount.toString(),
      currency: p.currency,
      status: p.status,
      provider: p.provider,
      paymentMethod: p.paymentMethod,
      reference: p.booking?.bookingNumber ?? p.eventBooking?.bookingNumber ?? null,
      createdAt: p.createdAt,
    }));

    return {
      guest: {
        id: profile.id,
        name: profile.name,
        phone: profile.phone,
        email: account.email,
        userId,
        accountRole: account.role,
      },
      counts: {
        payments: paymentRecords.length,
        conversationMessages,
        conversations,
        callLogs,
        voiceCalls,
        reviews,
        tastingRecords,
        tastingSessions,
        winePreferences,
        bookingItems,
        bookingStatusHistories,
        bookingGuests,
        eventBookingTickets,
        eventBookingStatusHistories,
        eventBookings,
        bookings,
        notifications,
        contactInquiries,
        guestNotes,
        guestProfile: 1,
        passwordResetTokens,
        account: 1,
      },
      payments: paymentRecords,
      wineryIds,
    };
  }

  /**
   * Ordered, leaf -> root deletion. MUST only ever be called inside a
   * `prisma.$transaction` callback: any thrown error rolls the whole set back.
   *
   * Order (children first, because of Restrict):
   *   payment -> conversationMessage -> conversation -> callLog -> voiceCall
   *   -> review -> tastingRecord -> tastingSession -> guestWinePreference
   *   -> bookingItem -> bookingStatusHistory -> bookingGuest
   *   -> eventBookingTicket -> eventBookingStatusHistory -> eventBooking -> booking
   *   -> notification -> contactInquiry -> guestNote -> guestProfile -> passwordResetToken -> user
   */
  static async executeDeletion(
    db: Prisma.TransactionClient,
    target: GuestDeletionTarget
  ): Promise<GuestDeletionCounts> {
    const { guestProfileId, userId, email } = target;
    const where = this.emailFilter(email);

    const payments = await db.payment.deleteMany({
      where: { OR: [{ booking: { guestProfileId } }, { eventBooking: { guestProfileId } }] },
    });
    const conversationMessages = await db.conversationMessage.deleteMany({
      where: { conversation: { guestProfileId } },
    });
    const conversations = await db.conversation.deleteMany({ where: { guestProfileId } });
    const callLogs = await db.callLog.deleteMany({ where: { voiceCall: { guestProfileId } } });
    const voiceCalls = await db.voiceCall.deleteMany({ where: { guestProfileId } });
    const reviews = await db.review.deleteMany({ where: { guestProfileId } });
    const tastingRecords = await db.tastingRecord.deleteMany({ where: { guestProfileId } });
    const tastingSessions = await db.tastingSession.deleteMany({ where: { guestProfileId } });
    await db.guestTagAssignment.deleteMany({ where: { guestProfileId } });
    const winePreferences = await db.guestWinePreference.deleteMany({ where: { guestProfileId } });

    const bookingItems = await db.bookingItem.deleteMany({ where: { booking: { guestProfileId } } });
    const bookingStatusHistories = await db.bookingStatusHistory.deleteMany({
      where: { booking: { guestProfileId } },
    });
    const bookingGuests = await db.bookingGuest.deleteMany({ where: { guestProfileId } });

    const eventBookingTickets = await db.eventBookingTicket.deleteMany({
      where: { eventBooking: { guestProfileId } },
    });
    const eventBookingStatusHistories = await db.eventBookingStatusHistory.deleteMany({
      where: { eventBooking: { guestProfileId } },
    });
    const eventBookings = await db.eventBooking.deleteMany({ where: { guestProfileId } });
    const bookings = await db.booking.deleteMany({ where: { guestProfileId } });

    const notifications = await db.notification.deleteMany({ where: { recipient: where } });
    const contactInquiries = await db.contactInquiry.deleteMany({ where: { email: where } });
    const guestNotes = await db.guestNote.deleteMany({ where: { guestProfileId } });

    const guestProfile = await db.guestProfile.deleteMany({ where: { id: guestProfileId } });
    if (guestProfile.count !== 1) {
      throw new Error(`Guest profile '${guestProfileId}' was not deleted`);
    }

    const passwordResetTokens = await db.passwordResetToken.deleteMany({ where: { userId } });
    // Guard: never remove a staff account, and never silently leave the login behind.
    const account = await db.user.deleteMany({ where: { id: userId, role: 'GUEST' } });
    if (account.count !== 1) {
      throw new Error(`Guest account '${userId}' was not deleted`);
    }

    return {
      payments: payments.count,
      conversationMessages: conversationMessages.count,
      conversations: conversations.count,
      callLogs: callLogs.count,
      voiceCalls: voiceCalls.count,
      reviews: reviews.count,
      tastingRecords: tastingRecords.count,
      tastingSessions: tastingSessions.count,
      winePreferences: winePreferences.count,
      bookingItems: bookingItems.count,
      bookingStatusHistories: bookingStatusHistories.count,
      bookingGuests: bookingGuests.count,
      eventBookingTickets: eventBookingTickets.count,
      eventBookingStatusHistories: eventBookingStatusHistories.count,
      eventBookings: eventBookings.count,
      bookings: bookings.count,
      notifications: notifications.count,
      contactInquiries: contactInquiries.count,
      guestNotes: guestNotes.count,
      guestProfile: guestProfile.count,
      passwordResetTokens: passwordResetTokens.count,
      account: account.count,
    };
  }
}



export class WebsiteImageRepository {
  static async findDefaultWineryId(): Promise<string | null> {
    const winery = await prisma.winery.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return winery ? winery.id : null;
  }

  static async findAllByWinery(wineryId: string) {
    return prisma.websiteImage.findMany({
      where: { wineryId },
      include: {
        updatedBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async findByKey(wineryId: string, key: string) {
    return prisma.websiteImage.findUnique({
      where: { wineryId_key: { wineryId, key } },
      include: {
        updatedBy: { select: { name: true, email: true } },
      },
    });
  }

  static async upsertByKey(input: {
    wineryId: string;
    key: string;
    pageGroup: string;
    defaultUrl: string;
    data: {
      url: string | null;
      altText: string | null;
      source: string;
      isCustomized: boolean;
      width: number | null;
      height: number | null;
      mime: string | null;
      uploadedFilename: string | null;
      originalUrl?: string | null;
      cropData?: string | null;
      updatedById: string | null;
    };
  }) {
    return prisma.websiteImage.upsert({
      where: { wineryId_key: { wineryId: input.wineryId, key: input.key } },
      create: {
        wineryId: input.wineryId,
        key: input.key,
        pageGroup: input.pageGroup,
        defaultUrl: input.defaultUrl,
        ...input.data,
      },
      update: {
        pageGroup: input.pageGroup,
        defaultUrl: input.defaultUrl,
        ...input.data,
      },
      include: {
        updatedBy: { select: { name: true, email: true } },
      },
    });
  }

  static async countReferencesToUrl(wineryId: string, url: string, excludeKey: string) {
    return prisma.websiteImage.count({
      where: {
        wineryId,
        OR: [{ url }, { originalUrl: url }],
        key: { not: excludeKey },
      },
    });
  }
}
export class GuestTagRepository {
  static async findByWineryId(wineryId: string) {
    return prisma.guestTag.findMany({
      where: { wineryId },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async findById(id: string, wineryId?: string) {
    return prisma.guestTag.findFirst({
      where: wineryId ? { id, wineryId } : { id },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });
  }

  static async create(data: {
    wineryId: string;
    name: string;
    description?: string | null;
    color?: string;
  }) {
    return prisma.guestTag.create({
      data: {
        wineryId: data.wineryId,
        name: data.name,
        description: data.description,
        color: data.color || '#6c2432',
      },
    });
  }

  static async update(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      color?: string;
    },
    wineryId?: string
  ) {
    const where: Prisma.GuestTagWhereUniqueInput = wineryId ? { id, wineryId } : { id };
    return prisma.guestTag.update({
      where,
      data,
    });
  }

  static async delete(id: string, wineryId?: string) {
    const where: Prisma.GuestTagWhereUniqueInput = wineryId ? { id, wineryId } : { id };
    return prisma.guestTag.delete({
      where,
    });
  }
}
