import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import {
  ImportEntityType,
  CsvHeaderValidation,
  ValidatedRowPreview,
  DataImportPreviewResponse,
  DataImportExecuteResult,
  RowValidationError,
} from './types';
import { parseCsv } from './csv-parser';
import {
  WINE_CSV_HEADERS,
  WINE_REQUIRED_HEADERS,
  WineImportRowSchema,
  WineImportRow,
  EXPERIENCE_CSV_HEADERS,
  EXPERIENCE_REQUIRED_HEADERS,
  ExperienceImportRowSchema,
  ExperienceImportRow,
  EVENT_CSV_HEADERS,
  EVENT_REQUIRED_HEADERS,
  EventImportRowSchema,
  EventImportRow,
  parsePipedArray,
  parseBoolean,
  parseNumber,
} from './entity-schemas';

export const MAX_IMPORT_ROWS = 500;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export class DataImportService {
  /**
   * Helper to resolve default estate Winery ID.
   */
  private static async resolveWineryId(): Promise<string> {
    const winery = await prisma.winery.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!winery) {
      throw new Error('Default winery not found. Database must contain at least one winery.');
    }
    return winery.id;
  }

  /**
   * Get expected headers and required headers for an entity type.
   */
  public static getEntityHeaders(entityType: ImportEntityType): {
    expected: readonly string[];
    required: readonly string[];
  } {
    switch (entityType) {
      case 'wines':
        return {
          expected: WINE_CSV_HEADERS,
          required: WINE_REQUIRED_HEADERS,
        };
      case 'experiences':
        return {
          expected: EXPERIENCE_CSV_HEADERS,
          required: EXPERIENCE_REQUIRED_HEADERS,
        };
      case 'events':
        return {
          expected: EVENT_CSV_HEADERS,
          required: EVENT_REQUIRED_HEADERS,
        };
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  /**
   * Validates CSV headers strictly without discarding unknown columns.
   */
  public static validateHeaders(
    entityType: ImportEntityType,
    csvHeaders: string[]
  ): CsvHeaderValidation {
    const spec = this.getEntityHeaders(entityType);
    const expectedSet = new Set(spec.expected as readonly string[]);
    const requiredSet = new Set(spec.required as readonly string[]);
    const presentSet = new Set(csvHeaders);

    const missingRequiredHeaders = Array.from(requiredSet).filter((h) => !presentSet.has(h));
    const unknownHeaders = csvHeaders.filter((h) => !expectedSet.has(h));

    const isValid = missingRequiredHeaders.length === 0 && unknownHeaders.length === 0;

    return {
      isValid,
      expectedHeaders: Array.from(spec.expected),
      presentHeaders: csvHeaders,
      missingRequiredHeaders,
      unknownHeaders,
    };
  }

  /**
   * Transform raw record into Wine payload.
   */
  private static transformWineRow(raw: Record<string, string>): unknown {
    return {
      slug: raw.slug || '',
      name: raw.name || '',
      category: raw.category ? raw.category.toUpperCase().trim() : undefined,
      shortDescription: raw.shortDescription || '',
      description: raw.description || '',
      story: raw.story || null,
      vineyardParcel: raw.vineyardParcel || null,
      servingTemp: raw.servingTemp || null,
      cellarPotential: raw.cellarPotential || null,
      featured: parseBoolean(raw.featured, false),
      characteristics: parsePipedArray(raw.characteristics),
      vintageYear: parseNumber(raw.vintageYear),
      price: parseNumber(raw.price),
      alcohol: raw.alcohol || null,
      oakAging: raw.oakAging || null,
      tastingNotes: raw.tastingNotes || null,
      aromaTags: parsePipedArray(raw.aromaTags),
      body: parseNumber(raw.body),
      acidity: parseNumber(raw.acidity),
      sweetness: parseNumber(raw.sweetness),
      tannin: parseNumber(raw.tannin),
      imageUrl: raw.imageUrl || null,
      foodPairings: parsePipedArray(raw.foodPairings),
    };
  }

  /**
   * Transform raw record into Experience payload.
   */
  private static transformExperienceRow(raw: Record<string, string>): unknown {
    const durationMinutes = parseNumber(raw.durationMinutes, 60)!;
    return {
      slug: raw.slug || '',
      title: raw.title || '',
      category: raw.category ? raw.category.toUpperCase().trim() : undefined,
      durationMinutes,
      durationText: raw.durationText || `${durationMinutes} Minutes`,
      price: parseNumber(raw.price, 0)!,
      currency: raw.currency || 'USD',
      shortDescription: raw.shortDescription || '',
      description: raw.description || '',
      capacity: parseNumber(raw.capacity, 12)!,
      minGuests: parseNumber(raw.minGuests, 1)!,
      maxGuests: parseNumber(raw.maxGuests, 12)!,
      foodPairing: raw.foodPairing || null,
      highlights: parsePipedArray(raw.highlights),
      includedItems: parsePipedArray(raw.includedItems),
      guestExpectations: parsePipedArray(raw.guestExpectations),
      importantInfo: parsePipedArray(raw.importantInfo),
      featured: parseBoolean(raw.featured, false),
      badge: raw.badge || null,
      isActive: parseBoolean(raw.isActive, true),
      imageUrl: raw.imageUrl || null,
    };
  }

  /**
   * Transform raw record into Event payload.
   */
  private static transformEventRow(raw: Record<string, string>): unknown {
    return {
      slug: raw.slug || '',
      title: raw.title || '',
      eventDate: raw.eventDate || '',
      timeRange: raw.timeRange || '',
      venue: raw.venue || '',
      price: parseNumber(raw.price, 0)!,
      currency: raw.currency || 'USD',
      shortDescription: raw.shortDescription || '',
      description: raw.description || '',
      availableTickets: parseNumber(raw.availableTickets, 0)!,
      maxCapacity: parseNumber(raw.maxCapacity, 0)!,
      availability: raw.availability ? raw.availability.toUpperCase().trim() : 'AVAILABLE',
      status: raw.status ? raw.status.toUpperCase().trim() : 'UPCOMING',
      featuredImage: raw.featuredImage || '',
      entertainment: raw.entertainment || null,
      winesServed: parsePipedArray(raw.winesServed),
      culinaryMenu: parsePipedArray(raw.culinaryMenu),
    };
  }

  /**
   * Validate and preview CSV rows against database state.
   */
  public static async previewImport(
    entityType: ImportEntityType,
    csvContent: string
  ): Promise<DataImportPreviewResponse> {
    const wineryId = await this.resolveWineryId();
    const parseResult = parseCsv(csvContent);

    if (parseResult.parseErrors.length > 0) {
      throw new Error(`CSV Parsing failed: ${parseResult.parseErrors.join(' ')}`);
    }

    if (parseResult.rows.length === 0) {
      throw new Error('CSV file contains no data rows.');
    }

    if (parseResult.rows.length > MAX_IMPORT_ROWS) {
      throw new Error(`Row limit exceeded: Maximum ${MAX_IMPORT_ROWS} rows permitted per import.`);
    }

    const headerValidation = this.validateHeaders(entityType, parseResult.headers);

    // Extract all candidate slugs to check existing entities in DB
    const candidateSlugs = parseResult.rows
      .map((r) => r.raw.slug?.trim())
      .filter((s): s is string => Boolean(s));

    const existingSlugSet = new Set<string>();

    if (candidateSlugs.length > 0) {
      if (entityType === 'wines') {
        const found = await prisma.wine.findMany({
          where: { wineryId, slug: { in: candidateSlugs } },
          select: { slug: true },
        });
        found.forEach((f) => existingSlugSet.add(f.slug));
      } else if (entityType === 'experiences') {
        const found = await prisma.experience.findMany({
          where: { wineryId, slug: { in: candidateSlugs } },
          select: { slug: true },
        });
        found.forEach((f) => existingSlugSet.add(f.slug));
      } else if (entityType === 'events') {
        const found = await prisma.event.findMany({
          where: { wineryId, slug: { in: candidateSlugs } },
          select: { slug: true },
        });
        found.forEach((f) => existingSlugSet.add(f.slug));
      }
    }

    let newCount = 0;
    let existingCount = 0;
    let errorCount = 0;
    const validatedRows: ValidatedRowPreview[] = [];

    // Track duplicate slugs within the CSV itself
    const seenCsvSlugs = new Map<string, number>();

    for (const r of parseResult.rows) {
      const raw = r.raw;
      const slug = raw.slug?.trim() || '';
      const titleOrName = raw.name || raw.title || '(Unnamed)';
      const rowErrors: RowValidationError[] = [];

      // Check header validation errors first
      if (!headerValidation.isValid) {
        if (headerValidation.missingRequiredHeaders.length > 0) {
          rowErrors.push({
            message: `Missing required column(s): ${headerValidation.missingRequiredHeaders.join(', ')}`,
          });
        }
        if (headerValidation.unknownHeaders.length > 0) {
          rowErrors.push({
            message: `Unknown column(s) detected: ${headerValidation.unknownHeaders.join(', ')}`,
          });
        }
      }

      // Check duplicate slugs inside the CSV batch
      if (slug) {
        if (seenCsvSlugs.has(slug)) {
          rowErrors.push({
            field: 'slug',
            message: `Duplicate slug '${slug}' found in CSV (also on row ${seenCsvSlugs.get(slug)})`,
          });
        } else {
          seenCsvSlugs.set(slug, r.rowIndex);
        }
      } else {
        rowErrors.push({
          field: 'slug',
          message: 'Slug is required',
        });
      }

      let parsedData: unknown = null;

      if (entityType === 'wines') {
        const transformed = this.transformWineRow(raw);
        const result = WineImportRowSchema.safeParse(transformed);
        if (!result.success) {
          result.error.issues.forEach((issue) => {
            rowErrors.push({
              field: issue.path.join('.'),
              message: issue.message,
            });
          });
        } else {
          parsedData = result.data;
        }
      } else if (entityType === 'experiences') {
        const transformed = this.transformExperienceRow(raw);
        const result = ExperienceImportRowSchema.safeParse(transformed);
        if (!result.success) {
          result.error.issues.forEach((issue) => {
            rowErrors.push({
              field: issue.path.join('.'),
              message: issue.message,
            });
          });
        } else {
          parsedData = result.data;
        }
      } else if (entityType === 'events') {
        const transformed = this.transformEventRow(raw);
        const result = EventImportRowSchema.safeParse(transformed);
        if (!result.success) {
          result.error.issues.forEach((issue) => {
            rowErrors.push({
              field: issue.path.join('.'),
              message: issue.message,
            });
          });
        } else {
          parsedData = result.data;
        }
      }

      const isValid = rowErrors.length === 0;
      const isExisting = slug ? existingSlugSet.has(slug) : false;

      if (!isValid) {
        errorCount++;
      } else if (isExisting) {
        existingCount++;
      } else {
        newCount++;
      }

      validatedRows.push({
        rowIndex: r.rowIndex,
        uniqueKey: slug || `row-${r.rowIndex}`,
        titleOrName,
        isExisting,
        isValid,
        errors: rowErrors,
        data: parsedData as Record<string, unknown> | null,
        rawData: raw,
      });
    }

    const canImport = errorCount === 0 && headerValidation.isValid;

    return {
      entityType,
      totalRows: parseResult.rows.length,
      newCount,
      existingCount,
      errorCount,
      canImport,
      headerValidation,
      rows: validatedRows,
    };
  }

  /**
   * Execute transactional import.
   * If any record fails validation, aborts without writing anything.
   */
  public static async executeImport(
    entityType: ImportEntityType,
    csvContent: string
  ): Promise<DataImportExecuteResult> {
    const preview = await this.previewImport(entityType, csvContent);

    if (!preview.canImport) {
      throw new Error(
        `Import cannot proceed because there are ${preview.errorCount} row error(s) or header mismatches.`
      );
    }

    const wineryId = await this.resolveWineryId();

    let createdCount = 0;
    let updatedCount = 0;
    const skippedCount = 0;
    const failedCount = 0;

    // Execute in a single atomic transaction
    await prisma.$transaction(
      async (tx) => {
        for (const row of preview.rows) {
          if (entityType === 'wines') {
            const data = row.data as WineImportRow;
            const existing = await tx.wine.findUnique({
              where: { wineryId_slug: { wineryId, slug: data.slug } },
              include: { vintages: true, images: true, foodPairings: true },
            });

            if (existing) {
              // Update scalar wine fields
              await tx.wine.update({
                where: { id: existing.id },
                data: {
                  name: data.name,
                  category: data.category,
                  description: data.description,
                  shortDescription: data.shortDescription,
                  story: data.story || null,
                  vineyardParcel: data.vineyardParcel || null,
                  servingTemp: data.servingTemp || null,
                  cellarPotential: data.cellarPotential || null,
                  featured: data.featured,
                  characteristics: data.characteristics,
                },
              });

              // Upsert/update vintage if provided
              if (data.vintageYear !== undefined && data.vintageYear !== null) {
                const existingVintage = existing.vintages.find(
                  (v) => v.vintageYear === data.vintageYear
                );
                if (existingVintage) {
                  await tx.wineVintage.update({
                    where: { id: existingVintage.id },
                    data: {
                      price:
                        data.price !== undefined && data.price !== null
                          ? new Prisma.Decimal(data.price.toFixed(2))
                          : existingVintage.price,
                      alcohol: data.alcohol ?? existingVintage.alcohol,
                      oakAging: data.oakAging ?? existingVintage.oakAging,
                      tastingNotes: data.tastingNotes ?? existingVintage.tastingNotes,
                      aromaTags: data.aromaTags.length > 0 ? data.aromaTags : existingVintage.aromaTags,
                      body: data.body ?? existingVintage.body,
                      acidity: data.acidity ?? existingVintage.acidity,
                      sweetness: data.sweetness ?? existingVintage.sweetness,
                      tannin: data.tannin ?? existingVintage.tannin,
                    },
                  });
                } else {
                  await tx.wineVintage.create({
                    data: {
                      wineId: existing.id,
                      vintageYear: data.vintageYear,
                      price: new Prisma.Decimal((data.price ?? 0).toFixed(2)),
                      currency: 'USD',
                      alcohol: data.alcohol || '13.5%',
                      oakAging: data.oakAging || null,
                      tastingNotes: data.tastingNotes || null,
                      aromaTags: data.aromaTags,
                      body: data.body ?? 5,
                      acidity: data.acidity ?? 5,
                      sweetness: data.sweetness ?? 2,
                      tannin: data.tannin ?? 5,
                      isAvailable: true,
                      inventoryCount: 100,
                    },
                  });
                }
              }

              // Update primary image if provided
              if (data.imageUrl) {
                if (existing.images.length > 0) {
                  await tx.wineImage.update({
                    where: { id: existing.images[0].id },
                    data: { url: data.imageUrl },
                  });
                } else {
                  await tx.wineImage.create({
                    data: {
                      wineId: existing.id,
                      url: data.imageUrl,
                      isPrimary: true,
                      sortOrder: 0,
                    },
                  });
                }
              }

              // Replace or sync food pairings if provided
              if (data.foodPairings.length > 0) {
                await tx.wineFoodPairing.deleteMany({ where: { wineId: existing.id } });
                await tx.wineFoodPairing.createMany({
                  data: data.foodPairings.map((dishName) => ({
                    wineId: existing.id,
                    dishName,
                  })),
                });
              }

              updatedCount++;
            } else {
              // Create new Wine
              const wine = await tx.wine.create({
                data: {
                  wineryId,
                  slug: data.slug,
                  name: data.name,
                  category: data.category,
                  description: data.description,
                  shortDescription: data.shortDescription,
                  story: data.story || null,
                  vineyardParcel: data.vineyardParcel || null,
                  servingTemp: data.servingTemp || null,
                  cellarPotential: data.cellarPotential || null,
                  featured: data.featured,
                  rating: new Prisma.Decimal(0),
                  reviewCount: 0,
                  characteristics: data.characteristics,
                },
              });

              if (data.vintageYear !== undefined && data.vintageYear !== null) {
                await tx.wineVintage.create({
                  data: {
                    wineId: wine.id,
                    vintageYear: data.vintageYear,
                    price: new Prisma.Decimal((data.price ?? 0).toFixed(2)),
                    currency: 'USD',
                    alcohol: data.alcohol || '13.5%',
                    oakAging: data.oakAging || null,
                    tastingNotes: data.tastingNotes || null,
                    aromaTags: data.aromaTags,
                    body: data.body ?? 5,
                    acidity: data.acidity ?? 5,
                    sweetness: data.sweetness ?? 2,
                    tannin: data.tannin ?? 5,
                    isAvailable: true,
                    inventoryCount: 100,
                  },
                });
              }

              if (data.imageUrl) {
                await tx.wineImage.create({
                  data: {
                    wineId: wine.id,
                    url: data.imageUrl,
                    isPrimary: true,
                    sortOrder: 0,
                  },
                });
              }

              if (data.foodPairings.length > 0) {
                await tx.wineFoodPairing.createMany({
                  data: data.foodPairings.map((dishName) => ({
                    wineId: wine.id,
                    dishName,
                  })),
                });
              }

              createdCount++;
            }
          } else if (entityType === 'experiences') {
            const data = row.data as ExperienceImportRow;
            const existing = await tx.experience.findUnique({
              where: { wineryId_slug: { wineryId, slug: data.slug } },
              include: { images: true },
            });

            if (existing) {
              await tx.experience.update({
                where: { id: existing.id },
                data: {
                  title: data.title,
                  category: data.category,
                  durationMinutes: data.durationMinutes,
                  durationText: data.durationText,
                  price: new Prisma.Decimal(data.price.toFixed(2)),
                  currency: data.currency,
                  shortDescription: data.shortDescription,
                  description: data.description,
                  capacity: data.capacity,
                  minGuests: data.minGuests,
                  maxGuests: data.maxGuests,
                  foodPairing: data.foodPairing || null,
                  highlights: data.highlights,
                  includedItems: data.includedItems,
                  guestExpectations: data.guestExpectations,
                  importantInfo: data.importantInfo,
                  featured: data.featured,
                  badge: data.badge || null,
                  isActive: data.isActive,
                },
              });

              if (data.imageUrl) {
                if (existing.images.length > 0) {
                  await tx.experienceImage.update({
                    where: { id: existing.images[0].id },
                    data: { url: data.imageUrl },
                  });
                } else {
                  await tx.experienceImage.create({
                    data: {
                      experienceId: existing.id,
                      url: data.imageUrl,
                      isPrimary: true,
                      sortOrder: 0,
                    },
                  });
                }
              }

              updatedCount++;
            } else {
              const exp = await tx.experience.create({
                data: {
                  wineryId,
                  slug: data.slug,
                  title: data.title,
                  category: data.category,
                  durationMinutes: data.durationMinutes,
                  durationText: data.durationText,
                  price: new Prisma.Decimal(data.price.toFixed(2)),
                  currency: data.currency,
                  shortDescription: data.shortDescription,
                  description: data.description,
                  rating: new Prisma.Decimal(0),
                  reviewCount: 0,
                  capacity: data.capacity,
                  minGuests: data.minGuests,
                  maxGuests: data.maxGuests,
                  foodPairing: data.foodPairing || null,
                  highlights: data.highlights,
                  includedItems: data.includedItems,
                  guestExpectations: data.guestExpectations,
                  importantInfo: data.importantInfo,
                  featured: data.featured,
                  badge: data.badge || null,
                  isActive: data.isActive,
                },
              });

              if (data.imageUrl) {
                await tx.experienceImage.create({
                  data: {
                    experienceId: exp.id,
                    url: data.imageUrl,
                    isPrimary: true,
                    sortOrder: 0,
                  },
                });
              }

              createdCount++;
            }
          } else if (entityType === 'events') {
            const data = row.data as EventImportRow;
            const eventDate = new Date(data.eventDate);
            const existing = await tx.event.findUnique({
              where: { wineryId_slug: { wineryId, slug: data.slug } },
              include: { ticketTypes: true },
            });

            if (existing) {
              await tx.event.update({
                where: { id: existing.id },
                data: {
                  title: data.title,
                  eventDate,
                  timeRange: data.timeRange,
                  venue: data.venue,
                  price: new Prisma.Decimal(data.price.toFixed(2)),
                  currency: data.currency,
                  description: data.description,
                  shortDescription: data.shortDescription,
                  availability: data.availability,
                  availableTickets: data.availableTickets,
                  maxCapacity: data.maxCapacity,
                  entertainment: data.entertainment || null,
                  featuredImage: data.featuredImage,
                  winesServed: data.winesServed,
                  culinaryMenu: data.culinaryMenu,
                  status: data.status,
                },
              });

              // Ensure General Admission ticket type reflects capacity and price
              if (existing.ticketTypes.length > 0) {
                await tx.eventTicketType.update({
                  where: { id: existing.ticketTypes[0].id },
                  data: {
                    price: new Prisma.Decimal(data.price.toFixed(2)),
                    capacity: data.maxCapacity,
                  },
                });
              }

              updatedCount++;
            } else {
              await tx.event.create({
                data: {
                  wineryId,
                  slug: data.slug,
                  title: data.title,
                  eventDate,
                  timeRange: data.timeRange,
                  venue: data.venue,
                  price: new Prisma.Decimal(data.price.toFixed(2)),
                  currency: data.currency,
                  description: data.description,
                  shortDescription: data.shortDescription,
                  availability: data.availability,
                  availableTickets: data.availableTickets,
                  maxCapacity: data.maxCapacity,
                  entertainment: data.entertainment || null,
                  featuredImage: data.featuredImage,
                  winesServed: data.winesServed,
                  culinaryMenu: data.culinaryMenu,
                  status: data.status,
                  ticketTypes: {
                    create: [
                      {
                        name: 'General Admission',
                        price: new Prisma.Decimal(data.price.toFixed(2)),
                        capacity: data.maxCapacity,
                        soldCount: 0,
                      },
                    ],
                  },
                },
              });

              createdCount++;
            }
          }
        }
      },
      {
        timeout: 30000, // 30 seconds for batch import
      }
    );

    return {
      entityType,
      totalProcessed: preview.totalRows,
      createdCount,
      updatedCount,
      skippedCount,
      failedCount,
      errors: [],
    };
  }
}
