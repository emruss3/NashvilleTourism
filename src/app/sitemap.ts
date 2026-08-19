import type { MetadataRoute } from 'next';
import { restaurants, hotels, events, venues, attractions, guides, neighborhoods, authors } from '@/lib/content';
import { allowIndexing, canonical, isIndexableRecord } from '@/lib/seo';

/**
 * Only pages with a genuine reason to exist are listed. Search results and
 * other thin routes are excluded and carry noindex.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!allowIndexing) return [];

  const now = new Date().toISOString();

  const staticPaths: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '/', priority: 1.0, freq: 'daily' },
    // Intent hubs. These are the primary organic landing pages.
    { path: '/where-to-stay/', priority: 1.0, freq: 'weekly' },
    { path: '/live-music-tonight/', priority: 1.0, freq: 'daily' },
    { path: '/tours/', priority: 0.9, freq: 'weekly' },
    { path: '/honky-tonk-highway/', priority: 0.9, freq: 'monthly' },
    { path: '/weekend/', priority: 0.9, freq: 'monthly' },
    { path: '/restaurants/', priority: 0.9, freq: 'weekly' },
    { path: '/hotels/', priority: 0.9, freq: 'weekly' },
    { path: '/events/', priority: 0.9, freq: 'daily' },
    { path: '/events/this-weekend/', priority: 0.8, freq: 'daily' },
    { path: '/things-to-do/', priority: 0.9, freq: 'weekly' },
    { path: '/music/', priority: 0.8, freq: 'weekly' },
    { path: '/neighborhoods/', priority: 0.8, freq: 'monthly' },
    { path: '/guides/', priority: 0.9, freq: 'weekly' },
    { path: '/plan/', priority: 0.9, freq: 'monthly' },
    { path: '/how-we-choose/', priority: 0.6, freq: 'yearly' },
    { path: '/editorial-standards/', priority: 0.5, freq: 'yearly' },
    { path: '/corrections/', priority: 0.3, freq: 'yearly' },
    { path: '/about/', priority: 0.4, freq: 'yearly' },
    { path: '/contact/', priority: 0.4, freq: 'yearly' },
    { path: '/advertising/', priority: 0.4, freq: 'yearly' },
    { path: '/privacy/', priority: 0.2, freq: 'yearly' },
    { path: '/terms/', priority: 0.2, freq: 'yearly' },
    { path: '/photo-credits/', priority: 0.2, freq: 'yearly' },
  ];

  const entries: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: canonical(p.path),
    lastModified: now,
    changeFrequency: p.freq,
    priority: p.priority,
  }));

  const push = (prefix: string, items: { slug: string; dateUpdated?: string; dateChecked?: string }[], priority: number) => {
    for (const item of items) {
      entries.push({
        url: canonical(`${prefix}${item.slug}/`),
        lastModified: item.dateUpdated || item.dateChecked || now,
        changeFrequency: 'monthly',
        priority,
      });
    }
  };

  // Where-to-stay sub-hubs. Kept in sync with generateStaticParams there.
  for (const slug of [
    'boutique-hotels-downtown',
    'group-rentals-bachelor-bachelorette',
    'luxury-resorts-opryland',
    'walkable-to-broadway',
    'hotels-with-pools',
    'value-stays-midtown',
  ]) {
    entries.push({
      url: canonical(`/where-to-stay/${slug}/`),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    });
  }

  push('/guides/', guides, 0.8);
  push('/restaurants/', restaurants.filter(isIndexableRecord), 0.7);
  push('/hotels/', hotels.filter(isIndexableRecord), 0.7);
  push('/events/', events.filter(isIndexableRecord), 0.7);
  push('/things-to-do/', attractions.filter(isIndexableRecord), 0.7);
  push('/music/', venues.filter(isIndexableRecord), 0.6);
  push('/neighborhoods/', neighborhoods, 0.7);
  push('/authors/', authors.filter((author) => !author.name.startsWith('[')), 0.3);

  return entries;
}
