export const WEBSITE_IMAGE_GROUPS = [
  'Home',
  'Wines',
  'Experiences',
  'Events',
  'Our Story',
  'Visit',
  'Reviews',
  'Gallery',
  'Contact',
] as const;

export type WebsiteImageGroup = (typeof WEBSITE_IMAGE_GROUPS)[number];

export const WEBSITE_IMAGE_KEYS = [
  'HOME_HERO',
  'HOME_STORY',
  'HOME_CELLAR',
  'HOME_VISIT',
  'HOME_CTA',
  'WINES_HERO',
  'EXPERIENCES_HERO',
  'EVENTS_HERO',
  'OUR_STORY_HERO',
  'OUR_STORY_TERROIR',
  'OUR_STORY_WINEMAKING',
  'VISIT_HERO',
  'VISIT_ESTATE',
  'REVIEWS_HERO',
  'GALLERY_HERO',
  'CONTACT_HERO',
] as const;

export type WebsiteImageKey = (typeof WEBSITE_IMAGE_KEYS)[number];

export interface CropMetadata {
  cropX: number; // percentage (0 - 100) or pixel
  cropY: number; // percentage (0 - 100) or pixel
  cropWidth: number; // percentage or pixel
  cropHeight: number; // percentage or pixel
  zoom: number; // 1.0 = fit, >1.0 = zoomed in
  targetAspectRatio: number; // e.g. 16/9, 4/3
  unit?: 'pixel' | 'percent';
}

export interface WebsiteImageDefinition {
  key: WebsiteImageKey;
  group: WebsiteImageGroup;
  label: string;
  defaultUrl: string;
  defaultAlt: string;
  routes: string[];
  targetAspectRatio: number; // width / height, e.g. 16/9 = 1.7777...
  aspectRatioLabel: string; // e.g. '16:9' or '4:3'
  outputDimensions: { width: number; height: number };
}

export interface CropRecommendation {
  recommendedRatioLabel: string;
  recommendedRatio: number;
  originalWidth: number;
  originalHeight: number;
  originalRatio: number;
  matchesRecommended: boolean;
  message: string;
  orientation: 'landscape' | 'portrait' | 'square';
}

export function getCropRecommendation(
  key: WebsiteImageKey,
  originalWidth: number,
  originalHeight: number
): CropRecommendation {
  const def = WEBSITE_IMAGES[key];
  const targetRatio = def ? def.targetAspectRatio : 16 / 9;
  const targetRatioLabel = def ? def.aspectRatioLabel : '16:9';
  const originalRatio = originalWidth / originalHeight;

  let orientation: 'landscape' | 'portrait' | 'square' = 'landscape';
  if (Math.abs(originalRatio - 1.0) < 0.05) {
    orientation = 'square';
  } else if (originalRatio < 0.95) {
    orientation = 'portrait';
  } else {
    orientation = 'landscape';
  }

  // Within 5% difference is considered a close match
  const ratioDifference = Math.abs(originalRatio - targetRatio) / targetRatio;
  const matchesRecommended = ratioDifference <= 0.05;

  let message: string;
  if (matchesRecommended) {
    message = 'This image already matches the recommended aspect ratio.';
  } else if (orientation === 'portrait') {
    message = `Recommended crop: ${targetRatioLabel}. Your image is portrait-oriented. Adjust the crop to select the most important area.`;
  } else if (orientation === 'square') {
    message = `Recommended crop: ${targetRatioLabel}. Your image is square. Adjust the crop frame to focus on the key subject.`;
  } else {
    message = `Recommended crop: ${targetRatioLabel}. Your image aspect ratio (${originalRatio.toFixed(2)}:1) differs from slot target (${targetRatioLabel}). Fine-tune the visible region.`;
  }

  return {
    recommendedRatioLabel: targetRatioLabel,
    recommendedRatio: targetRatio,
    originalWidth,
    originalHeight,
    originalRatio,
    matchesRecommended,
    message,
    orientation,
  };
}

export const WEBSITE_IMAGES: Record<WebsiteImageKey, WebsiteImageDefinition> = {
  HOME_HERO: {
    key: 'HOME_HERO',
    group: 'Home',
    label: 'Hero',
    defaultUrl: '/images/lifestyle/home-hero.webp',
    defaultAlt: 'Elegant guest enjoying fine wine on the sunlit terrace of VINORA',
    routes: ['/'],
    targetAspectRatio: 16 / 9,
    aspectRatioLabel: '16:9',
    outputDimensions: { width: 1920, height: 1080 },
  },
  HOME_STORY: {
    key: 'HOME_STORY',
    group: 'Home',
    label: 'Story Section',
    defaultUrl: '/images/lifestyle/home-story.webp',
    defaultAlt: 'Guest savoring estate vintage on the sunlit tasting terrace',
    routes: ['/'],
    targetAspectRatio: 4 / 3,
    aspectRatioLabel: '4:3',
    outputDimensions: { width: 1200, height: 900 },
  },
  HOME_CELLAR: {
    key: 'HOME_CELLAR',
    group: 'Home',
    label: 'Cellar Panorama',
    defaultUrl: '/images/lifestyle/home-cellar.webp',
    defaultAlt: 'Historic vaulted oak barrel cellar at VINORA',
    routes: ['/'],
    targetAspectRatio: 16 / 9,
    aspectRatioLabel: '16:9',
    outputDimensions: { width: 1920, height: 1080 },
  },
  HOME_VISIT: {
    key: 'HOME_VISIT',
    group: 'Home',
    label: 'Visit / Map Panel',
    defaultUrl: '/images/lifestyle/home-visit.webp',
    defaultAlt: 'Winery estate grounds and vineyard landscape',
    routes: ['/'],
    targetAspectRatio: 4 / 3,
    aspectRatioLabel: '4:3',
    outputDimensions: { width: 1200, height: 900 },
  },
  HOME_CTA: {
    key: 'HOME_CTA',
    group: 'Home',
    label: 'Call To Action Banner',
    defaultUrl: '/images/lifestyle/home-cta.webp',
    defaultAlt: 'Friends toasting wine overlooking the vineyard estate',
    routes: ['/'],
    targetAspectRatio: 16 / 9,
    aspectRatioLabel: '16:9',
    outputDimensions: { width: 1920, height: 1080 },
  },
  WINES_HERO: {
    key: 'WINES_HERO',
    group: 'Wines',
    label: 'Page Hero',
    defaultUrl: '/images/wines/wines-hero.webp',
    defaultAlt: 'Guest appreciating vintage wine notes during tasting',
    routes: ['/wines'],
    targetAspectRatio: 16 / 9,
    aspectRatioLabel: '16:9',
    outputDimensions: { width: 1920, height: 1080 },
  },
  EXPERIENCES_HERO: {
    key: 'EXPERIENCES_HERO',
    group: 'Experiences',
    label: 'Page Hero',
    defaultUrl: '/images/experiences/experiences-hero.webp',
    defaultAlt: 'Women friends tasting estate wines together at tasting table',
    routes: ['/experiences'],
    targetAspectRatio: 16 / 9,
    aspectRatioLabel: '16:9',
    outputDimensions: { width: 1920, height: 1080 },
  },
  EVENTS_HERO: {
    key: 'EVENTS_HERO',
    group: 'Events',
    label: 'Page Hero',
    defaultUrl: '/images/events/events-hero.webp',
    defaultAlt: 'Joyful women and friends toasting wine glasses at celebratory estate dinner',
    routes: ['/events'],
    targetAspectRatio: 16 / 9,
    aspectRatioLabel: '16:9',
    outputDimensions: { width: 1920, height: 1080 },
  },
  OUR_STORY_HERO: {
    key: 'OUR_STORY_HERO',
    group: 'Our Story',
    label: 'Editorial Hero',
    defaultUrl: '/images/lifestyle/story-hero.webp',
    defaultAlt: 'Elegant woman walking through the golden vineyards of VINORA',
    routes: ['/our-story'],
    targetAspectRatio: 16 / 9,
    aspectRatioLabel: '16:9',
    outputDimensions: { width: 1920, height: 1080 },
  },
  OUR_STORY_TERROIR: {
    key: 'OUR_STORY_TERROIR',
    group: 'Our Story',
    label: 'Chapter I · Terroir & Geology',
    defaultUrl: '/images/lifestyle/story-terroir.webp',
    defaultAlt: 'Ancient vine roots in mineral-rich limestone',
    routes: ['/our-story'],
    targetAspectRatio: 4 / 3,
    aspectRatioLabel: '4:3',
    outputDimensions: { width: 1200, height: 900 },
  },
  OUR_STORY_WINEMAKING: {
    key: 'OUR_STORY_WINEMAKING',
    group: 'Our Story',
    label: 'Chapter II · Winemaking Philosophy',
    defaultUrl: '/images/lifestyle/story-craft.webp',
    defaultAlt: 'Winemaking craft and candlelight cellar dining',
    routes: ['/our-story'],
    targetAspectRatio: 4 / 3,
    aspectRatioLabel: '4:3',
    outputDimensions: { width: 1200, height: 900 },
  },
  VISIT_HERO: {
    key: 'VISIT_HERO',
    group: 'Visit',
    label: 'Page Hero',
    defaultUrl: '/images/lifestyle/visit-hero.webp',
    defaultAlt: 'Scenic terrace celebration and guests arriving at VINORA',
    routes: ['/visit'],
    targetAspectRatio: 16 / 9,
    aspectRatioLabel: '16:9',
    outputDimensions: { width: 1920, height: 1080 },
  },
  VISIT_ESTATE: {
    key: 'VISIT_ESTATE',
    group: 'Visit',
    label: 'Estate Map Panel',
    defaultUrl: '/images/lifestyle/home-visit.webp',
    defaultAlt: 'Vineyard overhead terrain',
    routes: ['/visit'],
    targetAspectRatio: 4 / 3,
    aspectRatioLabel: '4:3',
    outputDimensions: { width: 1200, height: 900 },
  },
  REVIEWS_HERO: {
    key: 'REVIEWS_HERO',
    group: 'Reviews',
    label: 'Page Hero',
    defaultUrl: '/images/lifestyle/reviews-hero.webp',
    defaultAlt: 'Elegant guests enjoying convivial wine dining table',
    routes: ['/reviews'],
    targetAspectRatio: 16 / 9,
    aspectRatioLabel: '16:9',
    outputDimensions: { width: 1920, height: 1080 },
  },
  GALLERY_HERO: {
    key: 'GALLERY_HERO',
    group: 'Gallery',
    label: 'Page Hero',
    defaultUrl: '/images/lifestyle/gallery-hero.webp',
    defaultAlt: 'Guests enjoying wine moments and twilight toasts at VINORA',
    routes: ['/gallery'],
    targetAspectRatio: 16 / 9,
    aspectRatioLabel: '16:9',
    outputDimensions: { width: 1920, height: 1080 },
  },
  CONTACT_HERO: {
    key: 'CONTACT_HERO',
    group: 'Contact',
    label: 'Page Hero',
    defaultUrl: '/images/lifestyle/contact-hero.webp',
    defaultAlt: 'Warm hospitality at VINORA estate concierge desk',
    routes: ['/contact'],
    targetAspectRatio: 16 / 9,
    aspectRatioLabel: '16:9',
    outputDimensions: { width: 1920, height: 1080 },
  },
};

export function isWebsiteImageKey(value: string): value is WebsiteImageKey {
  return (WEBSITE_IMAGE_KEYS as readonly string[]).includes(value);
}

export function getWebsiteImageDefinitions(): WebsiteImageDefinition[] {
  return WEBSITE_IMAGE_KEYS.map((key) => WEBSITE_IMAGES[key]);
}

export function getWebsiteImageDefinitionsByGroup(): {
  group: WebsiteImageGroup;
  items: WebsiteImageDefinition[];
}[] {
  return WEBSITE_IMAGE_GROUPS.map((group) => ({
    group,
    items: getWebsiteImageDefinitions().filter((def) => def.group === group),
  })).filter((section) => section.items.length > 0);
}

export function getWebsiteImageRoutes(key: WebsiteImageKey): string[] {
  return WEBSITE_IMAGES[key].routes;
}

export interface WebsiteImageAdminRecord {
  key: WebsiteImageKey;
  group: string;
  label: string;
  defaultUrl: string;
  defaultAlt: string;
  routes: string[];
  targetAspectRatio: number;
  aspectRatioLabel: string;
  outputDimensions: { width: number; height: number };
  url: string | null;
  altText: string | null;
  resolvedUrl: string;
  resolvedAlt: string;
  isCustomized: boolean;
  source: string;
  width: number | null;
  height: number | null;
  mime: string | null;
  uploadedFilename: string | null;
  originalUrl: string | null;
  cropData: CropMetadata | null;
  updatedByName: string | null;
  updatedAt: string | null;
}
