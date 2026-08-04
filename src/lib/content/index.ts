import type { SearchDoc } from '../types';
import { restaurants, hotels, events, venues, attractions } from './listings';
import { guides } from './guides';
import { neighborhoods, neighborhoodName } from './neighborhoods';

export * from './listings';
export * from './guides';
export * from './neighborhoods';
export * from './authors';

/**
 * Flat search index built at module load. Small enough (well under 100 records)
 * to ship to the client for instant filtering without a search service.
 */
export const searchIndex: SearchDoc[] = [
  ...restaurants.map<SearchDoc>((r) => ({
    slug: r.slug,
    href: `/restaurants/${r.slug}/`,
    title: r.title,
    summary: r.summary,
    type: 'Restaurant',
    neighborhood: neighborhoodName(r.neighborhood),
    keywords: [r.cuisine, r.priceRange, ...r.bestFor, 'restaurant', 'eat', 'dinner'],
  })),
  ...hotels.map<SearchDoc>((h) => ({
    slug: h.slug,
    href: `/hotels/${h.slug}/`,
    title: h.title,
    summary: h.summary,
    type: 'Hotel',
    neighborhood: neighborhoodName(h.neighborhood),
    keywords: [h.priceCategory, ...h.bestFor, ...h.amenities, 'hotel', 'stay', 'where to stay'],
  })),
  ...events.map<SearchDoc>((e) => ({
    slug: e.slug,
    href: `/events/${e.slug}/`,
    title: e.title,
    summary: e.summary,
    type: 'Event',
    neighborhood: neighborhoodName(e.neighborhood),
    keywords: [e.category, e.venue, 'event', 'tickets', 'this weekend'],
  })),
  ...venues.map<SearchDoc>((v) => ({
    slug: v.slug,
    href: `/music/${v.slug}/`,
    title: v.title,
    summary: v.summary,
    type: 'Venue',
    neighborhood: neighborhoodName(v.neighborhood),
    keywords: [...v.genres, 'live music', 'venue', 'show', 'concert'],
  })),
  ...attractions.map<SearchDoc>((a) => ({
    slug: a.slug,
    href: `/things-to-do/${a.slug}/`,
    title: a.title,
    summary: a.summary,
    type: 'Attraction',
    neighborhood: neighborhoodName(a.neighborhood),
    keywords: [a.category, ...a.bestFor, 'things to do', 'attraction', 'activity'],
  })),
  ...guides.map<SearchDoc>((g) => ({
    slug: g.slug,
    href: `/guides/${g.slug}/`,
    title: g.title,
    summary: g.summary,
    type: 'Guide',
    keywords: [g.cluster, 'guide', 'best', 'itinerary'],
  })),
  ...neighborhoods.map<SearchDoc>((n) => ({
    slug: n.slug,
    href: `/neighborhoods/${n.slug}/`,
    title: n.name,
    summary: n.summary,
    type: 'Neighborhood',
    neighborhood: n.name,
    keywords: [...n.knownFor, ...n.bestFor, 'neighborhood', 'area', 'district'],
  })),
];

/** Simple scored substring match. Ranked: title > neighborhood > summary > keywords. */
export function searchDocs(query: string): SearchDoc[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const terms = q.split(/\s+/);

  return searchIndex
    .map((doc) => {
      let score = 0;
      const title = doc.title.toLowerCase();
      const summary = doc.summary.toLowerCase();
      const hood = (doc.neighborhood || '').toLowerCase();
      const kw = doc.keywords.join(' ').toLowerCase();

      for (const t of terms) {
        if (title.includes(t)) score += title.startsWith(t) ? 12 : 8;
        if (hood.includes(t)) score += 5;
        if (summary.includes(t)) score += 3;
        if (kw.includes(t)) score += 2;
        if (doc.type.toLowerCase().includes(t)) score += 4;
      }
      return { doc, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map((r) => r.doc);
}

/** Events sorted soonest-first, optionally limited. */
export function upcomingEvents(limit?: number) {
  const sorted = [...events].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
}
