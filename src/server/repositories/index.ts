import { prisma } from '@/lib/db';
import { BookingStatus, ReviewStatus, Prisma } from '@prisma/client';

const VALID_BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
  [BookingStatus.CONFIRMED]: [BookingStatus.CHECKED_IN, BookingStatus.NO_SHOW, BookingStatus.CANCELLED],
  [BookingStatus.CHECKED_IN]: [BookingStatus.COMPLETED],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.NO_SHOW]: [],
};

export class WineRepository {
  static async findAll() {
    return prisma.wine.findMany({
      include: {
        vintages: true,
        images: true,
        foodPairings: true,
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
}

export class ExperienceRepository {
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

    const [experiences, total] = await Promise.all([
      prisma.experience.findMany({
        where,
        include: {
          images: true,
          _count: { select: { bookingItems: true, reviews: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.experience.count({ where }),
    ]);

    return {
      experiences,
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
}

export class EventRepository {
  static async findAll() {
    return prisma.event.findMany({
      include: {
        schedules: { orderBy: { sortOrder: 'asc' } },
        faqs: { orderBy: { sortOrder: 'asc' } },
        ticketTypes: true,
      },
      orderBy: { eventDate: 'asc' },
    });
  }

  static async findBySlug(slug: string) {
    return prisma.event.findFirst({
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

  static async getExperienceRules(wineryId: string, experienceId: string) {
    return prisma.availabilityRule.findMany({
      where: {
        wineryId,
        isActive: true,
        OR: [{ experienceId }, { experienceId: null }],
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
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
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

    return { experiences, bookings, closures };
  }
}

export class BookingRepository {
  static async findByBookingNumber(bookingNumber: string) {
    return prisma.booking.findUnique({
      where: { bookingNumber },
      include: {
        guestProfile: true,
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
          status: BookingStatus.CONFIRMED,
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
                toStatus: BookingStatus.CONFIRMED,
                changedBy: 'CUSTOMER_API',
                notes: 'Reservation confirmed via API booking transaction',
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
    });
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
    });
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
    page?: number;
    pageSize?: number;
  }) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.GuestProfileWhereInput = {};

    if (filters.search) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { user: { email: { contains: searchTerm, mode: 'insensitive' } } },
        { phone: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (filters.hasBookings === 'yes') {
      where.bookings = { some: {} };
    } else if (filters.hasBookings === 'no') {
      where.bookings = { none: {} };
    }

    if (filters.hasTastings === 'yes') {
      where.tastingRecords = { some: {} };
    } else if (filters.hasTastings === 'no') {
      where.tastingRecords = { none: {} };
    }

    if (filters.hasReviews === 'yes') {
      where.reviews = { some: {} };
    } else if (filters.hasReviews === 'no') {
      where.reviews = { none: {} };
    }

    const [guests, total] = await Promise.all([
      prisma.guestProfile.findMany({
        where,
        include: {
          user: { select: { email: true, role: true } },
          _count: {
            select: {
              bookings: true,
              tastingSessions: true,
              tastingRecords: true,
              reviews: true,
              eventBookings: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.guestProfile.count({ where }),
    ]);

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

  static async findByIdAdmin(id: string) {
    return prisma.guestProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, role: true, createdAt: true } },
        winePreference: {
          include: { favoriteWine: { select: { id: true, name: true, slug: true, category: true } } },
        },
        bookings: {
          include: {
            items: { include: { experience: { select: { id: true, title: true, slug: true } } } },
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
            event: { select: { id: true, title: true, slug: true, eventDate: true, status: true } },
            ticketType: { select: { name: true, price: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
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
    phone?: string;
    avatar?: string;
    dietaryPreferences?: string;
    notes?: string;
    notifications?: { email?: boolean; sms?: boolean; whatsapp?: boolean };
    winePreferences?: {
      favoriteVarietals?: string[];
      preferredSweetness?: string;
      preferredBody?: string;
      preferredAcidity?: string;
      favoriteWineId?: string;
    };
  }) {
    return prisma.$transaction(async (tx) => {
      const updateData: Prisma.GuestProfileUpdateInput = {};
      if (data.name) updateData.name = data.name;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.avatar) updateData.avatar = data.avatar;
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

      return profile;
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
}
