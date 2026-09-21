import { prisma } from '@/lib/db';
import { BookingStatus, ReviewStatus, Prisma } from '@prisma/client';

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

export class GuestRepository {
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
