import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';
import { restaurants, hotels, events, venues, attractions, guides, neighborhoods, authors } from '@/lib/content';

/**
 * Only pages with a genuine reason to exist are listed. Search results and
 * other thin routes are excluded and carry noindex.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url;
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
    { path: '/authors/', priority: 0.4, freq: 'monthly' },
    { path: '/about/', priority: 0.5, freq: 'yearly' },
    { path: '/how-we-choose/', priority: 0.6, freq: 'yearly' },
    { path: '/editorial-standards/', priority: 0.5, freq: 'yearly' },
    { path: '/advertising/', priority: 0.4, freq: 'yearly' },
    { path: '/corrections/', priority: 0.3, freq: 'yearly' },
    { path: '/contact/', priority: 0.4, freq: 'yearly' },
    { path: '/newsletter/', priority: 0.5, freq: 'monthly' },
    { path: '/privacy/', priority: 0.2, freq: 'yearly' },
    { path: '/terms/', priority: 0.2, freq: 'yearly' },
    { path: '/style-guide/', priority: 0.1, freq: 'yearly' },
  ];

  const entries: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${base}${p.path}`,
    lastModified: now,
    changeFrequency: p.freq,
    priority: p.priority,
  }));

  const push = (prefix: string, items: { slug: string; dateUpdated?: string; dateChecked?: string }[], priority: number) => {
    for (const item of items) {
      entries.push({
        url: `${base}${prefix}${item.slug}/`,
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
      url: `${base}/where-to-stay/${slug}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    });
  }

  push('/guides/', guides, 0.8);
  push('/restaurants/', restaurants, 0.7);
  push('/hotels/', hotels, 0.7);
  push('/events/', events, 0.7);
  push('/things-to-do/', attractions, 0.7);
  push('/music/', venues, 0.6);
  push('/neighborhoods/', neighborhoods, 0.7);
  push('/authors/', authors, 0.3);

  return entries;
}
