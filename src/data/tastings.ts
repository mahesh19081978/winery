import { TastingRecord, GuestProfile } from '@/types';

export const mockTastingRecords: TastingRecord[] = [
  {
    id: 'taste-1',
    wineId: 'wine-1',
    wineName: 'Domaine Élysée Cabernet Sauvignon',
    vintage: 2024,
    dateTasted: 'August 20, 2026',
    experienceName: 'Vineyard Gourmet Picnic Experience',
    rating: 5,
    tasteCharacteristics: ['Full-bodied', 'Dry', 'Fruity', 'Smooth', 'Woody'],
    notes: 'Full-bodied with an astonishingly long finish of cassis, cedar box, and dark cocoa nibs. Tannins are supple and rounded. Fantastic pairing with aged cheeses.',
    wouldDrinkAgain: 'Yes',
    sensoryProfile: {
      body: 8,
      acidity: 6,
      sweetness: 2,
      tannin: 8
    }
  },
  {
    id: 'taste-2',
    wineId: 'wine-2',
    wineName: 'Val de Rêve Grand Cru Syrah',
    vintage: 2023,
    dateTasted: 'July 12, 2026',
    experienceName: 'Subterranean Cellar Tour & Barrel Tasting',
    rating: 5,
    tasteCharacteristics: ['Full-bodied', 'Spicy', 'Woody', 'Dry'],
    notes: 'Cracked black peppercorns, smoked game, and wild blackberries. Meaty and savory with a graphite mineral spine. Exceptional barrel integration.',
    wouldDrinkAgain: 'Yes',
    sensoryProfile: {
      body: 8,
      acidity: 6,
      sweetness: 2,
      tannin: 7
    }
  },
  {
    id: 'taste-3',
    wineId: 'wine-3',
    wineName: 'Domaine Élysée Blanc de Blancs Millésimé',
    vintage: 2021,
    dateTasted: 'July 12, 2026',
    experienceName: 'Subterranean Cellar Tour & Barrel Tasting',
    rating: 4.8,
    tasteCharacteristics: ['Dry', 'Fruity', 'Light', 'Smooth'],
    notes: 'Pristine bead of micro-bubbles. Brioche, toasted hazelnut, and salted lemon zest. Laser-sharp acidity with supreme chalky tension on the finish.',
    wouldDrinkAgain: 'Yes',
    sensoryProfile: {
      body: 4,
      acidity: 9,
      sweetness: 2,
      tannin: 1
    }
  },
  {
    id: 'taste-4',
    wineId: 'wine-5',
    wineName: 'Domaine Élysée Vieilles Vignes Chardonnay',
    vintage: 2024,
    dateTasted: 'June 5, 2026',
    experienceName: 'Signature Estate Wine Tasting',
    rating: 4.7,
    tasteCharacteristics: ['Medium-bodied', 'Dry', 'Fruity', 'Woody'],
    notes: 'Crisp green apple, white peach, crushed oyster shell, and subtle spiced vanilla bean. Great energy and mouthwatering salivating length.',
    wouldDrinkAgain: 'Yes',
    sensoryProfile: {
      body: 6,
      acidity: 7,
      sweetness: 2,
      tannin: 2
    }
  }
];

export const mockGuestProfile: GuestProfile = {
  name: 'Eleanor Vance',
  email: 'eleanor.vance@example.com',
  phone: '+1 (555) 234-5678',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  visitsCount: 4,
  winesTastedCount: 19,
  eventsAttendedCount: 3,
  favoriteWineId: 'wine-1',
  preferences: {
    favoriteVarietals: ['Cabernet Sauvignon', 'Syrah', 'Chardonnay', 'Sparkling'],
    preferredSweetness: 'Dry (1–3)',
    preferredBody: 'Full & Opulent (7–9)',
    preferredAcidity: 'Vibrant & Crisp (6–8)'
  },
  notifications: {
    email: true,
    sms: true,
    whatsapp: false
  }
};
