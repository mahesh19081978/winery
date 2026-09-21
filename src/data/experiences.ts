import { Experience } from '@/types';

export const mockExperiences: Experience[] = [
  {
    id: 'exp-signature-tasting',
    slug: 'signature-wine-tasting',
    title: 'Signature Estate Wine Tasting',
    category: 'Tasting',
    duration: '75 Minutes',
    price: 65,
    shortDescription: 'An introductory tasting flight of five award-winning estate wines led by our resident sommelier in the historic salon.',
    description: 'Immerse your senses in the distinct terroir of Domaine Élysée. Guided by an estate sommelier, this guided seated flight features five of our most celebrated releases, spanning vibrant whites, delicate rosés, and age-worthy reds, paired with artisanal bread and local olive oils.',
    rating: 4.9,
    reviewCount: 320,
    winesCount: 5,
    highlights: [
      'Guided flight of 5 iconic estate wines',
      'Held in the panoramic salon overlooking the vineyards',
      'Freshly baked sourdough and estate-pressed olive oil',
      'Exclusive cellar allocation access'
    ],
    included: [
      'Tasting flight of 5 wines (75ml each)',
      'Personal sommelier guidance',
      'Artisanal bread and local olive oil service',
      'Tasting notes keepsake journal and crystal glassware'
    ],
    includedWines: [
      'Domaine Élysée Blanc de Blancs Millésimé 2021',
      'Domaine Élysée Vieilles Vignes Chardonnay 2024',
      'Domaine Élysée Cuvée Rosé Impériale 2024',
      'Domaine Élysée Cabernet Sauvignon 2024',
      'Val de Rêve Grand Cru Syrah 2023'
    ],
    timeline: [
      { time: '00–15 min', title: 'Welcome & Sparkling Aperitif', description: 'Arrival reception on the east veranda with a chilled glass of Blanc de Blancs Millésimé.' },
      { time: '15–45 min', title: 'Terroir Comparative Flight', description: 'Tasting of estate whites and single-vineyard Syrah exploring gravel and chalk soil expressions.' },
      { time: '45–75 min', title: 'Cabernet Deep Dive & Q&A', description: 'Evaluation of our benchmark Cabernet Sauvignon alongside house-pressed olive oils.' }
    ],
    foodPairing: 'Warm artisanal sourdough with cold-pressed estate olive oil and fleur de sel.',
    guestExpectations: [
      'Guests must be 21 years of age or older to taste wine',
      'Please arrive 10 minutes before your reserved time slot',
      'Smart casual attire recommended'
    ],
    importantInfo: [
      'Indoor and covered outdoor seating available upon weather condition',
      'Cancellations accepted up to 24 hours in advance for full refund'
    ],
    faqs: [
      {
        question: 'Can non-drinkers join the party?',
        answer: 'Yes, designated drivers and non-drinkers are welcome to join. Artisanal sparkling grape elixirs and teas will be provided.'
      },
      {
        question: 'Is transportation or parking available?',
        answer: 'Complimentary valet parking is provided at our main gates. Rideshare drop-off is directly in front of the reception salon.'
      }
    ],
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=85',
    featured: true,
    badge: 'Guest Favorite'
  },
  {
    id: 'exp-barrel-cellar-tour',
    slug: 'subterranean-cellar-barrel-tasting',
    title: 'Subterranean Cellar Tour & Barrel Tasting',
    category: 'Tour',
    duration: '105 Minutes',
    price: 95,
    shortDescription: 'Descend into century-old chalk caves for barrel samples, vintage history, and architectural exploration.',
    description: 'A subterranean journey into the cool, silent chambers of our 1884 limestone cellars. Witness the alchemy of oak and wine as you draw barrel samples directly with a glass wine thief alongside our cellar masters, followed by an intimate tasting in the candlelight crypt.',
    rating: 4.95,
    reviewCount: 215,
    winesCount: 6,
    highlights: [
      'Exclusive access to subterranean chalk cellars',
      'Taste future vintages directly from French oak barriques with a wine thief',
      'Candlelit tasting of private museum library reserves',
      'Charcuterie and aged cheeses crafted by local cheesemakers'
    ],
    included: [
      '6 wine tastings including 2 unreleased barrel samples',
      'Guided cellar walk by assistant winemaker or senior sommelier',
      'Paired charcuterie board with 24-month aged Comté and prosciutto',
      'Crystal Riedel tasting stem keepsake'
    ],
    includedWines: [
      '2025 Cabernet Sauvignon Barrel Sample (Allier Oak)',
      '2025 Syrah Barrel Sample (Tronçais Oak)',
      'Domaine Élysée Cabernet Sauvignon 2024',
      'Val de Rêve Grand Cru Syrah 2023',
      'Élysée Reserve Heritage Red Blend 2022',
      'Rare Library Vintage 2018 Cabernet'
    ],
    timeline: [
      { time: '00–20 min', title: 'Gravity-Flow Winery & Crush Pad', description: 'Walk through the fermentation room and historic press house.' },
      { time: '20–60 min', title: 'Chalk Caves & Barrel Sampling', description: 'Descending 40 feet underground into 12°C cellars; barrel thief tastings.' },
      { time: '60–105 min', title: 'Crypt Library Tasting & Pairing', description: 'Seated candlelight tasting of rare library vintages paired with charcuterie.' }
    ],
    foodPairing: 'Artisanal charcuterie board featuring 24-month Comté, duck rillettes, and fig compote.',
    guestExpectations: [
      'The underground cellars maintain a constant temperature of 12°C (54°F). A light jacket or sweater is recommended.',
      'Wear flat, comfortable walking shoes due to historic cobblestone floors.',
      'Must be 21 or older.'
    ],
    importantInfo: [
      'Wheelchair accessible route available via service lift upon advance notice',
      'Photography welcome; flash photography prohibited in mold-aged vaults'
    ],
    faqs: [
      {
        question: 'How cold is the subterranean cellar?',
        answer: 'Our caves are naturally chilled year-round at approximately 12°C (54°F) with 80% relative humidity. We advise warm layers.'
      }
    ],
    image: 'https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?auto=format&fit=crop&w=1200&q=85',
    featured: true,
    badge: 'Sommelier Recommended'
  },
  {
    id: 'exp-sunset-dinner',
    slug: 'sunset-terrace-wine-dinner',
    title: 'Sunset Terrace Five-Course Wine Dinner',
    category: 'Culinary',
    duration: '2.5 Hours',
    price: 185,
    shortDescription: 'An exquisite culinary pairing under the evening sky overlooking rolling vineyard rows at dusk.',
    description: 'As twilight falls across the valley, take your seat on our private south terrace. Executive Chef Laurent prepares five seasonal courses cooked over live wood fire, each masterfully harmonized with library and reserve bottlings from Domaine Élysée.',
    rating: 5.0,
    reviewCount: 142,
    winesCount: 5,
    highlights: [
      'Five-course gastronomic dinner by Executive Chef Laurent',
      'Poured alongside library reserves and double-magnums',
      'Unrivaled golden hour sunset panoramic views',
      'Live classical acoustic guitar accompaniment'
    ],
    included: [
      '5-course farm-to-table tasting menu',
      '5 full sommelier wine pairings (including Champagne and dessert wine)',
      'Table-side storytelling with the chef and sommelier team',
      'Complimentary estate gift bottle upon departure'
    ],
    includedWines: [
      'Domaine Élysée Blanc de Blancs Millésimé 2021',
      'Domaine Élysée Vieilles Vignes Chardonnay 2024',
      'Domaine Élysée Cuvée Rosé Impériale 2024',
      'Élysée Reserve Heritage Red Blend 2022',
      'Domaine Élysée Late Harvest Golden Semillon'
    ],
    timeline: [
      { time: '18:30–19:00', title: 'Sunset Reception & Canapés', description: 'Chilled Blanc de Blancs and fresh oysters overlooking the golden vineyard.' },
      { time: '19:00–20:30', title: 'First Three Courses & Wine Harmonization', description: 'Wood-fired vegetables, hand-made agnolotti, and roasted duck breast.' },
      { time: '20:30–21:00', title: 'Artisanal Cheese, Dessert & Starlight', description: 'Aged farmstead cheeses followed by roasted fig tart and dessert wine.' }
    ],
    foodPairing: 'Five curated courses including dry-aged beef fillet, roasted duck breast, and Meyer lemon tart.',
    guestExpectations: [
      'Guests must notify us of any dietary restrictions or allergies at least 48 hours prior',
      'Dress code: Elegant evening attire / jacket preferred'
    ],
    importantInfo: [
      'In case of rain, dinner moves seamlessly into the private glasshouse conservatory',
      'Strict 48-hour cancellation policy applies'
    ],
    faqs: [
      {
        question: 'Can dietary requirements be accommodated?',
        answer: 'Yes. With 48 hours advance notice, our culinary team can prepare vegetarian, gluten-free, or pescatarian alternatives.'
      }
    ],
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85',
    featured: true,
    badge: 'Exclusive Experience'
  },
  {
    id: 'exp-vineyard-picnic',
    slug: 'vineyard-gourmet-picnic',
    title: 'Vineyard Gourmet Picnic Experience',
    category: 'Culinary',
    duration: '2 Hours',
    price: 120,
    shortDescription: 'A private secluded wicker basket feast amidst the vines, paired with chilled estate bottles and panoramic valley views.',
    description: 'Escape into the gentle serenity of the vine rows. We prepare a bespoke hand-woven picnic basket filled with French delicacies, freshly baked baguettes, artisanal cheeses, and your choice of chilled estate bottle, set up on a shaded private pavilion.',
    rating: 4.88,
    reviewCount: 189,
    winesCount: 2,
    highlights: [
      'Private shaded pavilion or grassy vantage point amidst century-old vines',
      'Artisanal wicker picnic basket filled with gourmet house provisions',
      'Full bottle of your choice (Rosé, Chardonnay, or Red)',
      'Scenic relaxation at your own leisure'
    ],
    included: [
      'Full bottle of Domaine Élysée wine per couple',
      'Generous picnic hamper: cheeses, charcuterie, dips, fruits, and pastries',
      'Plush linen picnic blanket, cushions, and crystal stems',
      'Bottle of spring water'
    ],
    includedWines: [
      'Domaine Élysée Cuvée Rosé Impériale 2024 (or choice of Blanc / Red)'
    ],
    timeline: [
      { time: '00–15 min', title: 'Hamper Collection & Wine Selection', description: 'Check-in at the cellar garden to pick up your bespoke basket and chilled bottle.' },
      { time: '15–120 min', title: 'Private Vine Leisure', description: 'Stroll to your reserved pavilion and savor lunch at your relaxed rhythm.' }
    ],
    foodPairing: 'Duck liver parfait, triple cream brie, local heirloom cherries, marinated olives, and crusty baguette.',
    guestExpectations: [
      'Children and families are welcome on picnic reservations (under 21 ticket available)',
      'Comfortable outdoor walking shoes recommended'
    ],
    importantInfo: [
      'In the event of inclement weather, covered gazebos or veranda tables are provided'
    ],
    faqs: [
      {
        question: 'Are dogs permitted?',
        answer: 'Leashed, well-behaved dogs are warmly welcomed in outdoor vineyard picnic areas.'
      }
    ],
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&q=85',
    featured: false
  },
  {
    id: 'exp-private-sommelier-masterclass',
    slug: 'private-sommelier-masterclass',
    title: 'Private Sommelier Masterclass & Blind Tasting',
    category: 'Private',
    duration: '2 Hours',
    price: 220,
    shortDescription: 'A VIP educational tasting masterclass honing your sensory palate, deductive blind tasting skills, and vintage appraisal.',
    description: 'Designed for serious collectors and curious minds. Led by Head Sommelier Jean-Luc, learn the classic court deductive tasting method using black stemware, analyze terroir markers across our reserve library, and take part in a blind tasting challenge.',
    rating: 5.0,
    reviewCount: 94,
    winesCount: 6,
    highlights: [
      'Private salon reservation for your party only',
      'Guided by Master of Wine candidate Jean-Luc',
      'Black crystal glass blind tasting challenge',
      'Access to museum release vintages dating back to 2008'
    ],
    included: [
      '6 premium and library reserve wine tastings',
      'Sensory aroma calibration kit exercise (Le Nez du Vin)',
      'Sommelier deductive tasting workbook',
      'Gourmet savory pairing canapés'
    ],
    includedWines: [
      'Domaine Élysée Blanc de Blancs 2021',
      'Domaine Élysée Vieilles Vignes Chardonnay 2020 (Library)',
      'Domaine Élysée Cabernet Sauvignon 2024',
      'Domaine Élysée Cabernet Sauvignon 2015 (Museum Reserve)',
      'Élysée Reserve Heritage Red Blend 2022',
      'Mystery Blind Flight Vintage'
    ],
    timeline: [
      { time: '00–30 min', title: 'Aroma Calibration & Theory', description: 'Exercises in isolating primary fruit, secondary oak, and tertiary age aromas.' },
      { time: '30–75 min', title: 'Vertical Library Analysis', description: 'Tasting identical parcels across 10 years to understand vintage aging curves.' },
      { time: '75–120 min', title: 'The Blind Tasting Challenge', description: 'Putting deductive deductive methodology to the test with black crystal glassware.' }
    ],
    foodPairing: 'Tasting portions of artisan cheeses, roasted duck bites, and dark cacao truffles.',
    guestExpectations: [
      'Please refrain from wearing heavy perfumes or colognes to allow accurate sensory appraisal.',
      'Must be 21 or older.'
    ],
    importantInfo: [
      'Minimum booking size: 2 guests. Maximum booking size: 10 guests.'
    ],
    faqs: [
      {
        question: 'Do I need prior wine knowledge?',
        answer: 'No prior sommelier certification is required. The session is tailored precisely to your comfort and knowledge level.'
      }
    ],
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=85',
    featured: false
  },
  {
    id: 'exp-harvest-morning-walk',
    slug: 'harvest-morning-vineyard-walk',
    title: 'Harvest Morning Viticulture Walk',
    category: 'Tour',
    duration: '90 Minutes',
    price: 75,
    shortDescription: 'An invigorating early morning walk with our viticulturists, sampling grapes off the vine and learning biodynamic farming.',
    description: 'Experience the vineyards as they awaken. Walk side-by-side with our viticultural team as morning fog lifts off the hills. Taste ripe clusters of Cabernet and Chardonnay directly from the vines, measure brix sugar levels with a refractometer, and enjoy a cellar breakfast.',
    rating: 4.92,
    reviewCount: 167,
    winesCount: 3,
    highlights: [
      'Early morning walk through historic old-vine plots',
      'Measure sugar and acidity directly from grapes on the vine',
      'Learn organic and biodynamic dry-farming practices',
      'Al fresco vineyard breakfast with estate sparkling wine'
    ],
    included: [
      '3 wine tastings paired with seasonal al fresco breakfast',
      'Refractometer grape sugar field demonstration',
      'Farm-fresh pastries, artisanal yogurt, and fresh pressed juice',
      'Straw sun hat and sunscreen provided'
    ],
    includedWines: [
      'Domaine Élysée Blanc de Blancs Millésimé 2021',
      'Domaine Élysée Cuvée Rosé Impériale 2024',
      'Domaine Élysée Cabernet Sauvignon 2024'
    ],
    timeline: [
      { time: '08:30–09:15', title: 'Vineyard Parcel Exploration', description: 'Walk through Parcel 7 and limestone terrace slopes; taste grapes off the vine.' },
      { time: '09:15–10:00', title: 'Vineyard Breakfast & Bubbles', description: 'Seated shaded table in the olive grove with fresh croissants and sparkling wine.' }
    ],
    foodPairing: 'Warm almond croissants, artisanal sheep yogurt with vineyard honey, and fresh fruit.',
    guestExpectations: [
      'Requires moderate walking across gentle sloping terrain',
      'Sturdy closed-toe shoes strongly advised'
    ],
    importantInfo: [
      'Available seasonally during harvest and growing months (May through November)'
    ],
    faqs: [
      {
        question: 'What time does the walk begin?',
        answer: 'The morning walk departs promptly at 8:30 AM to capture the pleasant early morning light and temperature.'
      }
    ],
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&q=85',
    featured: false
  }
];

export const experiences = mockExperiences;
