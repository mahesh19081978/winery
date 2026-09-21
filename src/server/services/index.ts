import {
  WineRepository,
  ExperienceRepository,
  EventRepository,
  AvailabilityRepository,
  BookingRepository,
  GuestRepository,
  TastingRepository,
  ReviewRepository,
} from '../repositories';
import {
  BookingCreateInput,
  GuestProfileUpdateInput,
  TastingRecordCreateInput,
  ReviewCreateInput,
} from '../validators';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

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

  static async createBooking(input: BookingCreateInput) {
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

    // 2. Ensure or retrieve GuestProfile
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
      guestProfileId: guestProfile.id,
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

export class GuestService {
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
