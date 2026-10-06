import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/auth/permissions';
import { generateCsv } from '@/lib/data-import/csv-parser';
import {
  WINE_CSV_HEADERS,
  EXPERIENCE_CSV_HEADERS,
  EVENT_CSV_HEADERS,
} from '@/lib/data-import/entity-schemas';
import { ImportEntityType } from '@/lib/data-import/types';

// Sample row data reflecting authentic current database records
const SAMPLE_ROWS: Record<ImportEntityType, Record<string, string>[]> = {
  wines: [
    {
      slug: 'elysee-reserve-cabernet-2024',
      name: 'Domaine Élysée Reserve Cabernet Sauvignon',
      category: 'RED',
      shortDescription: 'Dark cassis, pencil cedar, and toasted tobacco leaf with velvet tannins.',
      description: 'Hand-harvested from our historic south-facing Parcel 7 on alluvial limestone soils. Fermented naturally with native yeasts and matured for 22 months in French barriques.',
      story: 'Parcel 7 was planted in 1984 by founder Henri de Rêve.',
      vineyardParcel: 'Parcel 7 — Terrasses Sud',
      servingTemp: '16–18°C (60–64°F)',
      cellarPotential: 'Drink now through 2042',
      featured: 'true',
      characteristics: 'Estate Grown | Old Vine Parcel | Biodynamic Certified',
      vintageYear: '2024',
      price: '95.00',
      alcohol: '14.5%',
      oakAging: '22 months in 60% new French Allier oak',
      tastingNotes: 'Intense ruby core with purple rim. Pristine structure unfolding layers of ripe black fruits and graphite.',
      aromaTags: 'Crushed Blackcurrant | Pencil Shavings | Damson Plum | Cacao Nib',
      body: '8',
      acidity: '6',
      sweetness: '2',
      tannin: '8',
      imageUrl: '/images/wines/cabernet.webp',
      foodPairings: 'Prime Dry-Aged Ribeye | Braised Venison | Aged Comté 24 Months',
    },
  ],
  experiences: [
    {
      slug: 'private-estate-sommelier-tour',
      title: 'Private Estate Sommelier Tour & Tasting',
      category: 'TASTING',
      durationMinutes: '90',
      durationText: '90 Minutes',
      price: '120.00',
      currency: 'USD',
      shortDescription: 'An intimate guided walk through historic cellars followed by an exclusive flight of library vintages.',
      description: 'Stroll our terraced hillside plots and underground barrel caves with an estate sommelier before a sit-down tasting of rare vintages paired with artisanal cheeses.',
      capacity: '8',
      minGuests: '1',
      maxGuests: '8',
      foodPairing: 'Artisanal local cheeses and house-cured charcuterie platter',
      highlights: 'Underground barrel cave access | Library vintage tasting | Sommelier guided',
      includedItems: '5 premium wine pours | Cheese & charcuterie pairing | Souvenir Riedel glass',
      guestExpectations: 'Walking on historic cellar stone floors. Comfortable walking shoes recommended.',
      importantInfo: 'Guests must be 21+ years of age. Please arrive 15 minutes before scheduled start.',
      featured: 'true',
      badge: 'Sommelier Choice',
      isActive: 'true',
      imageUrl: '/images/experiences/private-sommelier.webp',
    },
  ],
  events: [
    {
      slug: 'annual-harvest-gala-2026',
      title: 'Annual Harvest Celebration Gala 2026',
      eventDate: '2026-10-24',
      timeRange: '6:00 PM – 10:00 PM',
      venue: 'Grand Courtyard & Barrel Salon',
      price: '175.00',
      currency: 'USD',
      shortDescription: 'Celebrate the culmination of our grape harvest with a lantern-lit multi-course vineyard feast.',
      description: 'Join our estate winemakers for an unforgettable evening celebrating this year’s vintage. Enjoy live jazz, four courses crafted by guest chefs, and exclusive cellar reserve pours.',
      availableTickets: '75',
      maxCapacity: '75',
      availability: 'AVAILABLE',
      status: 'UPCOMING',
      featuredImage: '/images/events/harvest-gala.webp',
      entertainment: 'Live acoustic jazz quartet under the estate pergola',
      winesServed: 'Domaine Élysée Blanc de Blancs | Reserve Cabernet Sauvignon | Grand Cru Syrah',
      culinaryMenu: 'Heirloom Beet Tartare | Wood-Grilled Wagyu Ribcap | Valrhona Dark Chocolate Ganache',
    },
  ],
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity') as ImportEntityType | null;

    if (!entity || !['wines', 'experiences', 'events'].includes(entity)) {
      return NextResponse.json(
        { success: false, error: 'Invalid entity parameter. Must be "wines", "experiences", or "events".' },
        { status: 400 }
      );
    }

    // Role verification: check specific entity permission
    let requiredPermission: 'wines.manage' | 'experiences.manage' | 'events.manage' = 'wines.manage';
    if (entity === 'experiences') requiredPermission = 'experiences.manage';
    if (entity === 'events') requiredPermission = 'events.manage';

    const guard = await requireApiPermission(requiredPermission);
    if (!guard.ok) return guard.response;

    let headers: readonly string[] = [];
    if (entity === 'wines') headers = WINE_CSV_HEADERS;
    else if (entity === 'experiences') headers = EXPERIENCE_CSV_HEADERS;
    else if (entity === 'events') headers = EVENT_CSV_HEADERS;

    const sampleData = SAMPLE_ROWS[entity] || [];
    const csvContent = generateCsv(Array.from(headers), sampleData);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="vinora-${entity}-template.csv"`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to generate template';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
