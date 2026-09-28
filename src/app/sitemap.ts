import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Static core routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/wines`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/experiences`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/our-story`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/visit`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/reviews`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/book`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  try {
    const [wines, experiences, events] = await Promise.all([
      prisma.wine.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.experience.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.event.findMany({ select: { slug: true, updatedAt: true } }),
    ]);

    const wineRoutes: MetadataRoute.Sitemap = wines.map((wine) => ({
      url: `${baseUrl}/wines/${wine.slug}`,
      lastModified: wine.updatedAt || new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    const experienceRoutes: MetadataRoute.Sitemap = experiences.map((exp) => ({
      url: `${baseUrl}/experiences/${exp.slug}`,
      lastModified: exp.updatedAt || new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    const eventRoutes: MetadataRoute.Sitemap = events.map((event) => ({
      url: `${baseUrl}/events/${event.slug}`,
      lastModified: event.updatedAt || new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    return [...staticRoutes, ...wineRoutes, ...experienceRoutes, ...eventRoutes];
  } catch {
    return staticRoutes;
  }
}
