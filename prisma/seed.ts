import {
  PrismaClient,
  WineCategory,
  ExperienceCategory,
  EventStatus,
  EventAvailability,
  ReviewCategory,
  ReviewStatus,
  BookingStatus,
  DrinkAgainOption,
  UserRole,
} from '@prisma/client';
import { mockWines } from '../src/data/wines';
import { mockExperiences } from '../src/data/experiences';
import { mockEvents } from '../src/data/events';
import { mockGalleryItems } from '../src/data/gallery';
import { mockReviews } from '../src/data/reviews';
import { mockGuestProfile, mockTastingRecords } from '../src/data/tastings';
import { initialMockBookings } from '../src/data/bookings';

const prisma = new PrismaClient();

const mapWineCategory = (category: string): WineCategory => {
  switch (category) {
    case 'Red':
      return WineCategory.RED;
    case 'White':
      return WineCategory.WHITE;
    case 'RosÃ©':
      return WineCategory.ROSE;
    case 'Sparkling':
      return WineCategory.SPARKLING;
    case 'Reserve':
      return WineCategory.RESERVE;
    default:
      return WineCategory.RED;
  }
};

const mapExperienceCategory = (category: string): ExperienceCategory => {
  switch (category) {
    case 'Tasting':
      return ExperienceCategory.TASTING;
    case 'Tour':
      return ExperienceCategory.TOUR;
    case 'Culinary':
      return ExperienceCategory.CULINARY;
    case 'Private':
      return ExperienceCategory.PRIVATE;
    default:
      return ExperienceCategory.TASTING;
  }
};

const mapEventAvailability = (availability: string): EventAvailability => {
  switch (availability) {
    case 'Available':
      return EventAvailability.AVAILABLE;
    case 'Few Seats Left':
      return EventAvailability.FEW_SEATS_LEFT;
    case 'Sold Out':
      return EventAvailability.SOLD_OUT;
    default:
      return EventAvailability.AVAILABLE;
  }
};

const mapReviewCategory = (category: string): ReviewCategory => {
  switch (category) {
    case 'Wine Tasting':
      return ReviewCategory.WINE_TASTING;
    case 'Vineyard Tour':
      return ReviewCategory.VINEYARD_TOUR;
    case 'Events':
      return ReviewCategory.EVENTS;
    case 'Food':
      return ReviewCategory.FOOD;
    default:
      return ReviewCategory.WINE_TASTING;
  }
};

const mapBookingStatus = (status: string): BookingStatus => {
  switch (status) {
    case 'Confirmed':
      return BookingStatus.CONFIRMED;
    case 'Completed':
      return BookingStatus.COMPLETED;
    case 'Cancelled':
      return BookingStatus.CANCELLED;
    default:
      return BookingStatus.CONFIRMED;
  }
};

const mapDrinkAgain = (val: string): DrinkAgainOption => {
  switch (val) {
    case 'Yes':
      return DrinkAgainOption.YES;
    case 'Maybe':
      return DrinkAgainOption.MAYBE;
    case 'No':
      return DrinkAgainOption.NO;
    default:
      return DrinkAgainOption.YES;
  }
};

// Deterministic exact mapping table for experience includedWines strings
// Maps each experience ID and included wine string to a canonical wine slug, or null if intentionally uncatalogued
const EXACT_EXPERIENCE_WINE_MAPPINGS: Record<string, Record<string, string | null>> = {
  "exp-signature-tasting": {
    "Domaine Ã‰lysÃ©e Blanc de Blancs MillÃ©simÃ© 2021": "blanc-de-blancs-millesime-2021",
    "Domaine Ã‰lysÃ©e Vieilles Vignes Chardonnay 2024": "vieilles-vignes-chardonnay-2024",
    "Domaine Ã‰lysÃ©e CuvÃ©e RosÃ© ImpÃ©riale 2024": "cuvee-rose-imperiale-2024",
    "Domaine Ã‰lysÃ©e Cabernet Sauvignon 2024": "cabernet-sauvignon-2024",
    "Val de RÃªve Grand Cru Syrah 2023": "grand-cru-syrah-2023",
  },
  "exp-barrel-cellar-tour": {
    "2025 Cabernet Sauvignon Barrel Sample (Allier Oak)": null, // Intentionally uncatalogued: unreleased barrel sample
    "2025 Syrah Barrel Sample (TronÃ§ais Oak)": null,             // Intentionally uncatalogued: unreleased barrel sample
    "Domaine Ã‰lysÃ©e Cabernet Sauvignon 2024": "cabernet-sauvignon-2024",
    "Val de RÃªve Grand Cru Syrah 2023": "grand-cru-syrah-2023",
    "Ã‰lysÃ©e Reserve Heritage Red Blend 2022": "reserve-heritage-red-blend-2022",
    "Rare Library Vintage 2018 Cabernet": null,                 // Intentionally uncatalogued: library museum vintage
  },
  "exp-sunset-dinner": {
    "Domaine Ã‰lysÃ©e Blanc de Blancs MillÃ©simÃ© 2021": "blanc-de-blancs-millesime-2021",
    "Domaine Ã‰lysÃ©e Vieilles Vignes Chardonnay 2024": "vieilles-vignes-chardonnay-2024",
    "Domaine Ã‰lysÃ©e CuvÃ©e RosÃ© ImpÃ©riale 2024": "cuvee-rose-imperiale-2024",
    "Ã‰lysÃ©e Reserve Heritage Red Blend 2022": "reserve-heritage-red-blend-2022",
    "Domaine Ã‰lysÃ©e Late Harvest Golden Semillon": null,        // Intentionally uncatalogued: dessert wine
  },
  "exp-vineyard-picnic": {
    "Domaine Ã‰lysÃ©e CuvÃ©e RosÃ© ImpÃ©riale 2024 (or choice of Blanc / Red)": "cuvee-rose-imperiale-2024",
  },
  "exp-private-sommelier-masterclass": {
    "Domaine Ã‰lysÃ©e Blanc de Blancs 2021": "blanc-de-blancs-millesime-2021",
    "Domaine Ã‰lysÃ©e Vieilles Vignes Chardonnay 2020 (Library)": "vieilles-vignes-chardonnay-2024", // Library pour of Chardonnay
    "Domaine Ã‰lysÃ©e Cabernet Sauvignon 2024": "cabernet-sauvignon-2024",
    "Domaine Ã‰lysÃ©e Cabernet Sauvignon 2015 (Museum Reserve)": "cabernet-sauvignon-2024", // Museum pour of Cabernet (duplicate wine product)
    "Ã‰lysÃ©e Reserve Heritage Red Blend 2022": "reserve-heritage-red-blend-2022",
    "Mystery Blind Flight Vintage": null,                       // Intentionally uncatalogued: blind mystery pour
  },
  "exp-harvest-morning-walk": {
    "Domaine Ã‰lysÃ©e Blanc de Blancs MillÃ©simÃ© 2021": "blanc-de-blancs-millesime-2021",
    "Domaine Ã‰lysÃ©e CuvÃ©e RosÃ© ImpÃ©riale 2024": "cuvee-rose-imperiale-2024",
    "Domaine Ã‰lysÃ©e Cabernet Sauvignon 2024": "cabernet-sauvignon-2024",
  }
};

async function main() {
  console.log('--- Starting Domaine Ã‰lysÃ©e / Val de RÃªve Seed (Deterministic Exact Mapping) ---');

  // 1. Winery Multi-Tenant Root
  const winery = await prisma.winery.upsert({
    where: { slug: 'domaine-elysee' },
    update: {},
    create: {
      name: 'Domaine Ã‰lysÃ©e & Val de RÃªve Estate',
      slug: 'domaine-elysee',
      description:
        'A sanctuary of fine wine, sustainable terroir, and timeless hospitality nestled in the sun-drenched hills of Napa Valley.',
      story:
        'Founded in 1984 by Henri de RÃªve, Domaine Ã‰lysÃ©e harmonizes Old World restraint with rich Californian soils across 180 biodynamic acres.',
      address: '1784 Domaine Boulevard',
      city: 'Rutherford',
      state: 'CA',
      country: 'United States',
      postalCode: '94573',
      latitude: 38.4847,
      longitude: -122.4286,
      phone: '+1 (707) 963-8822',
      email: 'concierge@domaine-elysee.com',
      website: 'https://domaine-elysee.com',
      openingHours: 'Wednesday to Sunday: 10:00 AM â€“ 6:00 PM',
      timezone: 'America/Los_Angeles',
      currency: 'USD',
      status: 'ACTIVE',
    },
  });
  console.log('Winery verified: ' + winery.name + ' (' + winery.id + ')');

  // 2. Wines & Vintages
  const wineIdMap = new Map<string, string>(); // frontend id ('wine-1') -> db uuid
  const wineBySlugMap = new Map<string, string>(); // slug -> db uuid
  const wineByNameMap = new Map<string, string>(); // wine name -> db uuid
  const vintageIdMap = new Map<string, string>(); // frontend id ('wine-1') -> vintage db uuid

  for (const w of mockWines) {
    const wine = await prisma.wine.upsert({
      where: {
        wineryId_slug: {
          wineryId: winery.id,
          slug: w.slug,
        },
      },
      update: {},
      create: {
        wineryId: winery.id,
        slug: w.slug,
        name: w.name,
        category: mapWineCategory(w.category),
        description: w.description,
        shortDescription: w.shortDescription,
        story: w.story,
        vineyardParcel: w.vineyardParcel,
        servingTemp: w.servingTemp,
        cellarPotential: w.cellarPotential,
        featured: w.featured ?? false,
        rating: w.rating,
        reviewCount: w.reviewCount,
        characteristics: w.characteristics,
        images: {
          create: [{ url: w.image, isPrimary: true, sortOrder: 0 }],
        },
        foodPairings: {
          create: w.foodPairings.map((dish) => ({ dishName: dish })),
        },
        vintages: {
          create: {
            vintageYear: w.vintage,
            price: w.price,
            currency: 'USD',
            alcohol: w.tasteProfile.alcohol,
            oakAging: w.tasteProfile.oakAging,
            tastingNotes: w.tastingNotes,
            aromaTags: w.aroma,
            body: w.tasteProfile.body,
            acidity: w.tasteProfile.acidity,
            sweetness: w.tasteProfile.sweetness,
            tannin: w.tasteProfile.tannin,
            isAvailable: true,
            inventoryCount: 150,
          },
        },
      },
      include: { vintages: true },
    });

    wineIdMap.set(w.id, wine.id);
    wineBySlugMap.set(w.slug, wine.id);
    wineByNameMap.set(w.name.toLowerCase().trim(), wine.id);
    if (wine.vintages.length > 0) {
      vintageIdMap.set(w.id, wine.vintages[0].id);
    }
  }
  console.log('Seeded/verified ' + mockWines.length + ' wines & vintages');

  // 3. User & Guest Profile (with relational favoriteWineId)
  const mappedFavoriteWineId = wineIdMap.get(mockGuestProfile.favoriteWineId) || null;

  const user = await prisma.user.upsert({
    where: { email: mockGuestProfile.email },
    update: {},
    create: {
      wineryId: winery.id,
      email: mockGuestProfile.email,
      role: UserRole.GUEST,
      guestProfile: {
        create: {
          name: mockGuestProfile.name,
          phone: mockGuestProfile.phone,
          avatar: mockGuestProfile.avatar,
          visitsCount: mockGuestProfile.visitsCount,
          emailNotifications: mockGuestProfile.notifications.email,
          smsNotifications: mockGuestProfile.notifications.sms,
          whatsappNotifications: mockGuestProfile.notifications.whatsapp,
          winePreference: {
            create: {
              favoriteVarietals: mockGuestProfile.preferences.favoriteVarietals,
              preferredSweetness: mockGuestProfile.preferences.preferredSweetness,
              preferredBody: mockGuestProfile.preferences.preferredBody,
              preferredAcidity: mockGuestProfile.preferences.preferredAcidity,
              favoriteWineId: mappedFavoriteWineId,
            },
          },
        },
      },
    },
    include: { guestProfile: true },
  });
  const guestProfile = user.guestProfile!;
  console.log('Guest verified: ' + guestProfile.name + ' (' + guestProfile.id + ')');

  // 4. Experiences & ExperienceWine associations using exact mapping
  const experienceIdMap = new Map<string, string>(); // frontend exp id -> db uuid
  const experienceByTitleMap = new Map<string, string>(); // title -> db uuid

  for (const exp of mockExperiences) {
    const durationMatch = exp.duration.match(/\d+/);
    const durationMinutes = durationMatch ? parseInt(durationMatch[0], 10) : 60;

    const experience = await prisma.experience.upsert({
      where: {
        wineryId_slug: {
          wineryId: winery.id,
          slug: exp.slug,
        },
      },
      update: {},
      create: {
        wineryId: winery.id,
        slug: exp.slug,
        title: exp.title,
        category: mapExperienceCategory(exp.category),
        durationMinutes,
        durationText: exp.duration,
        price: exp.price,
        currency: 'USD',
        shortDescription: exp.shortDescription,
        description: exp.description,
        rating: exp.rating,
        reviewCount: exp.reviewCount,
        capacity: 12,
        minGuests: 1,
        maxGuests: 12,
        foodPairing: exp.foodPairing,
        highlights: exp.highlights,
        includedItems: exp.included,
        guestExpectations: exp.guestExpectations,
        importantInfo: exp.importantInfo,
        featured: exp.featured ?? false,
        badge: exp.badge,
        isActive: true,
        images: {
          create: [{ url: exp.image, isPrimary: true, sortOrder: 0 }],
        },
        faqs: {
          create: exp.faqs.map((f, idx) => ({
            question: f.question,
            answer: f.answer,
            sortOrder: idx,
          })),
        },
        timelines: {
          create: exp.timeline.map((t, idx) => ({
            timeRange: t.time,
            title: t.title,
            description: t.description,
            sortOrder: idx,
          })),
        },
      },
    });

    experienceIdMap.set(exp.id, experience.id);
    experienceByTitleMap.set(exp.title.toLowerCase().trim(), experience.id);

    // Exact deterministic ExperienceWine seeding from EXACT_EXPERIENCE_WINE_MAPPINGS
    const mappingForExp = EXACT_EXPERIENCE_WINE_MAPPINGS[exp.id];
    if (mappingForExp && exp.includedWines) {
      for (let wIdx = 0; wIdx < exp.includedWines.length; wIdx++) {
        const rawString = exp.includedWines[wIdx];
        const targetSlug = mappingForExp[rawString];

        if (targetSlug) {
          const targetWineId = wineBySlugMap.get(targetSlug);
          if (targetWineId) {
            await prisma.experienceWine.upsert({
              where: {
                experienceId_wineId: {
                  experienceId: experience.id,
                  wineId: targetWineId,
                },
              },
              update: {},
              create: {
                experienceId: experience.id,
                wineId: targetWineId,
                sortOrder: wIdx,
                notes: rawString,
              },
            });
          }
        }
      }
    }
  }
  console.log('Seeded/verified ' + mockExperiences.length + ' experiences & exact ExperienceWine relationships');

  // 5. Events (Using actual availableTickets as maxCapacity, no invented formulas)
  const eventIdMap = new Map<string, string>(); // frontend evt id -> db uuid
  const eventByTitleMap = new Map<string, string>(); // title -> db uuid

  for (const evt of mockEvents) {
    const event = await prisma.event.upsert({
      where: {
        wineryId_slug: {
          wineryId: winery.id,
          slug: evt.slug,
        },
      },
      update: {},
      create: {
        wineryId: winery.id,
        slug: evt.slug,
        title: evt.title,
        eventDate: new Date(evt.isoDate),
        timeRange: evt.time,
        venue: evt.venue,
        price: evt.price,
        currency: 'USD',
        description: evt.description,
        shortDescription: evt.shortDescription,
        availability: mapEventAvailability(evt.availability),
        availableTickets: evt.availableTickets,
        maxCapacity: evt.availableTickets, // Authentic source capacity without fabrication
        entertainment: evt.entertainment,
        featuredImage: evt.image,
        winesServed: evt.winesServed,
        culinaryMenu: evt.culinaryMenu,
        galleryImages: evt.gallery,
        isPast: evt.isPast ?? false,
        status: evt.isPast ? EventStatus.COMPLETED : EventStatus.UPCOMING,
        schedules: {
          create: evt.schedule.map((s, idx) => ({
            timeSlot: s.time,
            activity: s.activity,
            sortOrder: idx,
          })),
        },
        faqs: {
          create: evt.faqs.map((f, idx) => ({
            question: f.question,
            answer: f.answer,
            sortOrder: idx,
          })),
        },
        ticketTypes: {
          create: [
            {
              name: 'General Admission',
              price: evt.price,
              capacity: evt.availableTickets,
              soldCount: 0,
            },
          ],
        },
      },
    });

    eventIdMap.set(evt.id, event.id);
    eventByTitleMap.set(evt.title.toLowerCase().trim(), event.id);
  }
  console.log('Seeded/verified ' + mockEvents.length + ' events');

  // 6. Gallery Items (Idempotent upsert by wineryId and title)
  for (let idx = 0; idx < mockGalleryItems.length; idx++) {
    const g = mockGalleryItems[idx];
    await prisma.galleryImage.upsert({
      where: {
        wineryId_title: {
          wineryId: winery.id,
          title: g.title,
        },
      },
      update: {},
      create: {
        wineryId: winery.id,
        title: g.title,
        category: g.category,
        imageUrl: g.imageUrl,
        caption: g.caption,
        sortOrder: idx,
        isActive: true,
      },
    });
  }
  console.log('Seeded/verified ' + mockGalleryItems.length + ' gallery images');

  // 7. Bookings, BookingItems, BookingGuests, and BookingStatusHistory
  const bookingIdMap = new Map<string, string>(); // bookingNumber -> db uuid
  const bookingByExpTitleMap = new Map<string, string>(); // expTitle -> db uuid

  for (const b of initialMockBookings) {
    const expDbId = experienceIdMap.get(b.experienceId);
    const expObj = mockExperiences.find((e) => e.id === b.experienceId);
    // Use actual experience catalog price as unitPrice (or 0 if unavailable)
    const unitPrice = expObj ? expObj.price : (b.adults > 0 ? b.basePrice / b.adults : b.basePrice);

    const booking = await prisma.booking.upsert({
      where: { bookingNumber: b.id },
      update: {},
      create: {
        bookingNumber: b.id,
        wineryId: winery.id,
        guestProfileId: guestProfile.id,
        date: new Date(b.date),
        time: b.time,
        adults: b.adults,
        children: b.children,
        totalGuests: b.totalGuests,
        subtotal: b.basePrice,
        taxAmount: b.taxAmount,
        totalPrice: b.totalPrice,
        currency: 'USD',
        status: mapBookingStatus(b.status),
        specialRequests: b.specialRequests,
        createdAt: new Date(b.createdAt),
        items: {
          create: [
            {
              experienceId: expDbId,
              itemType: 'EXPERIENCE',
              title: b.experienceTitle,
              unitPrice: unitPrice,
              quantity: b.totalGuests,
              totalPrice: b.basePrice,
            },
          ],
        },
        attendees: {
          create: [
            {
              guestProfileId: guestProfile.id,
              fullName: b.guestName,
              email: b.guestEmail,
              phone: b.guestPhone,
              isPrimary: true,
            },
          ],
        },
        statusHistory: {
          create: [
            {
              fromStatus: BookingStatus.PENDING,
              toStatus: mapBookingStatus(b.status),
              changedBy: 'SYSTEM',
              notes: 'Initial reservation creation from guest checkout',
              createdAt: new Date(b.createdAt),
            },
          ],
        },
      },
    });

    bookingIdMap.set(b.id, booking.id);
    bookingByExpTitleMap.set(b.experienceTitle.toLowerCase().trim(), booking.id);
  }
  console.log('Seeded/verified ' + initialMockBookings.length + ' bookings with status histories');

  // 8. TastingSessions & TastingRecords
  // Group tasting records into logical sessions by date and experienceName
  const sessionGroups = new Map<string, typeof mockTastingRecords>();
  for (const t of mockTastingRecords) {
    const key = t.dateTasted + '::' + t.experienceName;
    const existing = sessionGroups.get(key) || [];
    existing.push(t);
    sessionGroups.set(key, existing);
  }

  for (const [key, records] of sessionGroups.entries()) {
    const [dateStr, expName] = key.split('::');
    const matchedBookingId = bookingByExpTitleMap.get(expName.toLowerCase().trim()) || null;

    // Check if session already exists for this guest on this date with this notes
    const sessionNote = 'Tasting session during ' + expName;
    let session = await prisma.tastingSession.findFirst({
      where: {
        guestProfileId: guestProfile.id,
        notes: sessionNote,
      },
    });

    if (!session) {
      session = await prisma.tastingSession.create({
        data: {
          guestProfileId: guestProfile.id,
          bookingId: matchedBookingId,
          sessionDate: new Date(dateStr),
          location: 'Tasting Salon & Terroir Terrace',
          notes: sessionNote,
        },
      });
    }

    for (const t of records) {
      const vintageDbId = vintageIdMap.get(t.wineId);
      if (!vintageDbId) continue;

      const existingRecord = await prisma.tastingRecord.findFirst({
        where: {
          guestProfileId: guestProfile.id,
          wineVintageId: vintageDbId,
          experienceName: t.experienceName,
        },
      });

      if (!existingRecord) {
        await prisma.tastingRecord.create({
          data: {
            tastingSessionId: session.id,
            guestProfileId: guestProfile.id,
            wineVintageId: vintageDbId,
            wineNameSnapshot: t.wineName,
            vintageYear: t.vintage,
            experienceName: t.experienceName,
            rating: t.rating,
            tasteCharacteristics: t.tasteCharacteristics,
            notes: t.notes,
            wouldDrinkAgain: mapDrinkAgain(t.wouldDrinkAgain),
            body: t.sensoryProfile.body,
            acidity: t.sensoryProfile.acidity,
            sweetness: t.sensoryProfile.sweetness,
            tannin: t.sensoryProfile.tannin,
            tastedAt: new Date(t.dateTasted),
          },
        });
      }
    }
  }
  console.log('Seeded/verified tasting sessions & records associated with guest and bookings');

  // 9. Reviews with Relational Target Links
  for (const r of mockReviews) {
    const targetKey = r.targetName.toLowerCase().trim();
    const matchedExpId = experienceByTitleMap.get(targetKey) || null;
    const matchedWineId = wineByNameMap.get(targetKey) || null;
    const matchedEventId = eventByTitleMap.get(targetKey) || null;
    const matchedBookingId = matchedExpId ? bookingByExpTitleMap.get(targetKey) || null : null;

    await prisma.review.upsert({
      where: {
        wineryId_authorName_title: {
          wineryId: winery.id,
          authorName: r.author,
          title: r.title,
        },
      },
      update: {
        experienceId: matchedExpId,
        wineId: matchedWineId,
        eventId: matchedEventId,
        bookingId: matchedBookingId,
      },
      create: {
        wineryId: winery.id,
        guestProfileId: guestProfile.id,
        authorName: r.author,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        category: mapReviewCategory(r.category),
        targetName: r.targetName,
        verified: r.verified,
        helpfulCount: r.helpfulCount,
        status: ReviewStatus.APPROVED,
        experienceId: matchedExpId,
        wineId: matchedWineId,
        eventId: matchedEventId,
        bookingId: matchedBookingId,
        createdAt: new Date(r.date),
      },
    });
  }
  console.log('Seeded/verified ' + mockReviews.length + ' guest reviews with relational FK links');

    // 10. Optional Idempotent Initial Admin User Provisioning from Environment
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        wineryId: winery.id,
      },
      create: {
        email: adminEmail,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        wineryId: winery.id,
      },
    });
    console.log('Seeded/verified initial admin user: ' + adminUser.email + ' (' + adminUser.role + ')');
  }
  console.log('--- Phase 4 Database Seed Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });