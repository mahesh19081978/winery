import { Review } from '@/types';

export const mockReviews: Review[] = [
  {
    id: 'rev-1',
    author: 'Eleanor Vance',
    date: 'September 14, 2026',
    rating: 5,
    title: 'The most authentic, ethereal winery experience in the valley',
    comment: 'We booked the Subterranean Cellar Tour and Barrel Tasting. Descending into the cool chalk caverns and tasting futures straight from French oak was transcendental. Julien and his team embody true hospitality. The 2024 Cabernet is already showing world-class depth.',
    category: 'Vineyard Tour',
    targetName: 'Subterranean Cellar Tour & Barrel Tasting',
    verified: true,
    helpfulCount: 38
  },
  {
    id: 'rev-2',
    author: 'Marcus Aurelius Stirling',
    date: 'September 2, 2026',
    rating: 5,
    title: 'Unrivaled sunset dining and rare library pours',
    comment: 'Celebrated our 15th wedding anniversary with the Sunset Terrace Five-Course Dinner. Watching the golden sun sink into the vine hills with a glass of 2018 Grand Cru Syrah poured from double magnum is a core memory now. Faultless pacing, brilliant culinary pairings.',
    category: 'Food',
    targetName: 'Sunset Terrace Five-Course Wine Dinner',
    verified: true,
    helpfulCount: 24
  },
  {
    id: 'rev-3',
    author: 'Genevieve Dupond',
    date: 'August 28, 2026',
    rating: 5,
    title: 'Bordeaux elegance reborn in Napa Valley soils',
    comment: 'Having grown up in Saint-Émilion, I am exceptionally particular about structure and restraint. Domaine Élysée produces wines of profound composure—not jammy fruit bombs, but pure terroir, graphite, and violet florals. The Blanc de Blancs rivals vintage Champagne.',
    category: 'Wine Tasting',
    targetName: 'Signature Estate Wine Tasting',
    verified: true,
    helpfulCount: 19
  },
  {
    id: 'rev-4',
    author: 'Julian Thorne',
    date: 'August 19, 2026',
    rating: 4,
    title: 'Delightful private picnic amidst old vines',
    comment: 'The picnic hamper was generous and beautifully arranged. The sourdough and triple-cream brie were standout highlights. Our shaded pavilion gave us complete privacy. Only giving 4 stars because our reservation started 10 minutes late due to a busy harvest morning check-in.',
    category: 'Food',
    targetName: 'Vineyard Gourmet Picnic Experience',
    verified: true,
    helpfulCount: 11
  },
  {
    id: 'rev-5',
    author: 'Lady Charlotte Hastings',
    date: 'August 5, 2026',
    rating: 5,
    title: 'Masterclass with Jean-Luc is a masterstroke',
    comment: 'The blind tasting with black crystal glasses completely recalibrated how I think about vintage aging and oak influence. Jean-Luc is an intellectual font of viticultural wisdom without an ounce of pretension. Truly worth every penny for any serious collector.',
    category: 'Wine Tasting',
    targetName: 'Private Sommelier Masterclass & Blind Tasting',
    verified: true,
    helpfulCount: 42
  }
];

export const reviews = mockReviews;
