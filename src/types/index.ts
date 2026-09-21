export type WineCategory = 'Red' | 'White' | 'Rosé' | 'Sparkling' | 'Reserve';

export interface WineTasteProfile {
  body: number; // 1 to 10
  acidity: number; // 1 to 10
  sweetness: number; // 1 to 10
  tannin: number; // 1 to 10
  alcohol: string; // e.g. 14.5%
  oakAging: string; // e.g. 18 months in French oak
}

export interface Wine {
  id: string;
  slug: string;
  name: string;
  vintage: number;
  category: WineCategory;
  price: number;
  shortDescription: string;
  description: string;
  story: string;
  vineyardParcel: string;
  aroma: string[];
  tasteProfile: WineTasteProfile;
  tastingNotes: string;
  foodPairings: string[];
  servingTemp: string;
  cellarPotential: string;
  image: string;
  featured?: boolean;
  rating: number;
  reviewCount: number;
  characteristics: string[];
}

export interface ExperienceTimelineItem {
  time: string;
  title: string;
  description: string;
}

export interface Experience {
  id: string;
  slug: string;
  title: string;
  category: 'Tasting' | 'Tour' | 'Culinary' | 'Private';
  duration: string;
  price: number;
  shortDescription: string;
  description: string;
  rating: number;
  reviewCount: number;
  winesCount: number;
  highlights: string[];
  included: string[];
  includedWines: string[];
  timeline: ExperienceTimelineItem[];
  foodPairing: string;
  guestExpectations: string[];
  importantInfo: string[];
  faqs: { question: string; answer: string }[];
  image: string;
  featured?: boolean;
  badge?: string;
}

export interface EventScheduleItem {
  time: string;
  activity: string;
}

export interface WineryEvent {
  id: string;
  slug: string;
  title: string;
  date: string;
  isoDate: string;
  time: string;
  venue: string;
  price: number;
  description: string;
  shortDescription: string;
  availability: 'Available' | 'Few Seats Left' | 'Sold Out';
  availableTickets: number;
  schedule: EventScheduleItem[];
  winesServed: string[];
  culinaryMenu: string[];
  entertainment: string;
  gallery: string[];
  faqs: { question: string; answer: string }[];
  image: string;
  isPast?: boolean;
}

export interface Review {
  id: string;
  author: string;
  date: string;
  rating: number;
  title: string;
  comment: string;
  category: 'Wine Tasting' | 'Vineyard Tour' | 'Events' | 'Food';
  targetName: string;
  verified: boolean;
  helpfulCount: number;
}

export interface Booking {
  id: string;
  experienceId: string;
  experienceTitle: string;
  date: string;
  time: string;
  adults: number;
  children: number;
  totalGuests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  specialRequests?: string;
  basePrice: number;
  taxAmount: number;
  totalPrice: number;
  status: 'Confirmed' | 'Completed' | 'Cancelled';
  createdAt: string;
  qrCodeUrl?: string;
}

export interface TastingRecord {
  id: string;
  wineId: string;
  wineName: string;
  vintage: number;
  dateTasted: string;
  experienceName: string;
  rating: number;
  tasteCharacteristics: string[];
  notes: string;
  wouldDrinkAgain: 'Yes' | 'Maybe' | 'No';
  sensoryProfile: {
    body: number;
    acidity: number;
    sweetness: number;
    tannin: number;
  };
}

export interface GuestProfile {
  name: string;
  email: string;
  phone: string;
  avatar: string;
  visitsCount: number;
  winesTastedCount: number;
  eventsAttendedCount: number;
  favoriteWineId: string;
  preferences: {
    favoriteVarietals: string[];
    preferredSweetness: string;
    preferredBody: string;
    preferredAcidity: string;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
}

export interface GalleryItem {
  id: string;
  title: string;
  category: 'Vineyard' | 'Cellar' | 'Wine' | 'Food' | 'Events' | 'Sunset';
  imageUrl: string;
  caption: string;
}
