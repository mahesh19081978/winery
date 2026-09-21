import { WineryEvent } from '@/types';

export const mockEvents: WineryEvent[] = [
  {
    id: 'event-wine-jazz-evening',
    slug: 'wine-jazz-evening',
    title: 'Wine & Jazz Evening on the Lawn',
    date: 'Friday, October 16, 2026',
    isoDate: '2026-10-16',
    time: '6:30 PM – 10:00 PM',
    venue: 'The Grand Lawn & Amphitheatre',
    price: 85,
    description: 'An unforgettable autumn twilight serenaded by the Marcus Trio while sipping chilled estate wines under string lanterns. Savor passing small plates from our wood-fired hearth and artisanal cheese stations while enjoying improvisational French jazz and swing classics.',
    shortDescription: 'Live jazz quartet, estate wines by the glass, wood-fired seasonal bites, and starlight over the vines.',
    availability: 'Available',
    availableTickets: 24,
    schedule: [
      { time: '6:30 PM', activity: 'Welcome Blanc de Blancs glass & canapé reception' },
      { time: '7:15 PM', activity: 'First Jazz Set: The Marcus Trio performs Parisian jazz classics' },
      { time: '8:15 PM', activity: 'Intermission: Wood-fired tasting stations open' },
      { time: '8:45 PM', activity: 'Second Jazz Set & Sunset Finale under fairy lights' }
    ],
    winesServed: [
      'Blanc de Blancs Millésimé 2021',
      'Vieilles Vignes Chardonnay 2024',
      'Cuvée Rosé Impériale 2024',
      'Val de Rêve Grand Cru Syrah 2023'
    ],
    culinaryMenu: [
      'Tartine of smoked duck breast with spiced fig jam',
      'Wood-roasted wild mushroom arancini with black truffle aioli',
      'Artisanal farmstead cheese table with house honeycomb',
      'Meyer lemon tartlets with torched Italian meringue'
    ],
    entertainment: 'Live performance by The Marcus Trio (Contrabass, Gypsy guitar, Saxophone & Vocals)',
    gallery: [
      'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&q=85'
    ],
    faqs: [
      {
        question: 'What is the dress code for the evening?',
        answer: 'Smart casual / wine country chic. We recommend flat shoes or wedges suitable for the grass lawn, and light evening layers.'
      },
      {
        question: 'Are children permitted?',
        answer: 'This evening is strictly reserved for guests aged 21 and above.'
      },
      {
        question: 'Is seating guaranteed?',
        answer: 'Yes, ticket holders receive reserved bistro table seating facing the stage with unobstructed vineyard views.'
      }
    ],
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=85',
    isPast: false
  },
  {
    id: 'event-harvest-grape-stomp',
    slug: 'annual-harvest-festival-grape-stomp',
    title: 'Annual Harvest Festival & Grape Stomp',
    date: 'Saturday, September 26, 2026',
    isoDate: '2026-09-26',
    time: '11:00 AM – 4:00 PM',
    venue: 'Historic Crush Pad & Fermentation Barn',
    price: 120,
    description: 'Celebrate the culmination of the 2026 vintage with our beloved annual tradition. Roll up your sleeves (and trousers) for our joyous barefoot grape stomp in traditional oak vats, followed by barrel sampling, live acoustic folk, and a family-style harvest feast.',
    shortDescription: 'Traditional barefoot grape stomping, barrel tastings with winemakers, and an abundant vineyard feast.',
    availability: 'Few Seats Left',
    availableTickets: 6,
    schedule: [
      { time: '11:00 AM', activity: 'Arrival & Sparkling Wine Welcome with fresh gougères' },
      { time: '11:45 AM', activity: 'Vineyard Walk with Chief Viticulturist Claire de Rêve' },
      { time: '12:30 PM', activity: 'The Great Barrel Vat Grape Stomp Competition' },
      { time: '1:45 PM', activity: 'Three-Course Harvest Long-Table Lunch in the Olive Grove' },
      { time: '3:15 PM', activity: 'Tasting of fermenting must and 2025 barrel samples' }
    ],
    winesServed: [
      'Blanc de Blancs Millésimé 2021',
      'Domaine Élysée Cabernet Sauvignon 2024',
      'Élysée Reserve Heritage Red Blend 2022',
      'Exclusive 2025 Cask Sample (Sneak preview)'
    ],
    culinaryMenu: [
      'Heirloom tomato and burrata salad with estate basil pesto',
      'Slow-braised suckling pig with crisp crackling and salsa verde',
      'Grilled summer squash, baby carrots, and rosemary roasted fingerlings',
      'Plum and blackberry galette with crème fraîche'
    ],
    entertainment: 'Acoustic Bluegrass & Folk by The Napa Ramblers',
    gallery: [
      'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=85'
    ],
    faqs: [
      {
        question: 'Do I really get to stomp grapes barefoot?',
        answer: 'Yes! We provide vintage oak vats, fresh warm water basins, plush towels, and commemorative t-shirts.'
      },
      {
        question: 'What happens if it rains?',
        answer: 'The event moves smoothly into our historic stone fermentation hall and barrel chai.'
      }
    ],
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&q=85',
    isPast: false
  },
  {
    id: 'event-sommelier-masterclass-cabernet',
    slug: 'masterclass-art-of-cabernet',
    title: 'Winemaker Masterclass: The Architecture of Cabernet',
    date: 'Saturday, November 7, 2026',
    isoDate: '2026-11-07',
    time: '2:00 PM – 4:30 PM',
    venue: 'Private Library Cellar Vault',
    price: 150,
    description: 'An academic and sensory deep-dive into Cabernet Sauvignon terroir, clonal selections, and barrel aging with Head Winemaker Julien Martel. Taste five single-block barrel trials alongside museum library vintages spanning three decades.',
    shortDescription: 'Intimate technical tasting of clonal trials, barrel woods, and 20-year library vintages with Julien Martel.',
    availability: 'Few Seats Left',
    availableTickets: 4,
    schedule: [
      { time: '2:00 PM', activity: 'Welcome pour & presentation of soil profiles and weather graphs' },
      { time: '2:40 PM', activity: 'Comparative flight of 3 French oak coopers (Allier vs. Tronçais vs. Vosges)' },
      { time: '3:30 PM', activity: 'Vertical museum retrospective: 2004, 2012, 2018, and 2024 Vintages' },
      { time: '4:15 PM', activity: 'Q&A and personal allocation signing' }
    ],
    winesServed: [
      '2025 Allier Oak Barrel Trial',
      '2025 Tronçais Oak Barrel Trial',
      'Domaine Élysée Cabernet Sauvignon 2024',
      'Domaine Élysée Cabernet Sauvignon 2018 (Library)',
      'Domaine Élysée Cabernet Sauvignon 2012 (Library)',
      'Domaine Élysée Cabernet Sauvignon 2004 (Museum Vault)'
    ],
    culinaryMenu: [
      'Sommelier charcuterie selection',
      'Aged Parmigiano Reggiano 36-month and dried mission figs',
      'Artisanal sourdough and dark chocolate medallions'
    ],
    entertainment: 'Educational symposium led by Master of Wine candidate Julien Martel',
    gallery: [
      'https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?auto=format&fit=crop&w=1200&q=85'
    ],
    faqs: [
      {
        question: 'Who is this masterclass for?',
        answer: 'Wine collectors, trade students, and dedicated enthusiasts who appreciate technical vinification and aging potential.'
      },
      {
        question: 'Are library bottles available for purchase?',
        answer: 'Attendees have priority reservation rights to purchase from the estate museum cellar.'
      }
    ],
    image: 'https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?auto=format&fit=crop&w=1200&q=85',
    isPast: false
  },
  {
    id: 'event-midsummer-white-dinner',
    slug: 'midsummer-white-attire-soiree',
    title: 'Midsummer White Attire Soirée (Past Event)',
    date: 'Saturday, July 18, 2026',
    isoDate: '2026-07-18',
    time: '7:00 PM – 11:00 PM',
    venue: 'Terrace & Pool Pavilion',
    price: 110,
    description: 'Our annual celebration of crisp whites, sparkling vintages, and Mediterranean small plates dressed exclusively in white linen.',
    shortDescription: 'Chilled Blanc de Blancs, fresh oysters, and live lounge music dressed in white linen.',
    availability: 'Sold Out',
    availableTickets: 0,
    schedule: [
      { time: '7:00 PM', activity: 'Raw Oyster Bar & Chilled Sparkling Wine' },
      { time: '8:30 PM', activity: 'Sunset Paella Feast' },
      { time: '10:00 PM', activity: 'Starlight Dessert & Sparkling Finale' }
    ],
    winesServed: [
      'Blanc de Blancs Millésimé 2021',
      'Vieilles Vignes Chardonnay 2024'
    ],
    culinaryMenu: [
      'Freshly shucked Kumamoto oysters with champagne mignonette',
      'Saffron seafood paella cooked in giant open pans'
    ],
    entertainment: 'DJ set with live saxophonist',
    gallery: [
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=85'
    ],
    faqs: [],
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=85',
    isPast: true
  }
];

export const events = mockEvents;
