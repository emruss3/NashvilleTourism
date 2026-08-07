import type { Listing, SearchDoc } from '../types';
import {
  restaurants,
  events,
  venues,
  attractions,
  getRestaurant,
  getEvent,
  getVenue,
  getAttraction,
} from './listings';
import { hotels, getHotel } from './hotels';
import { guides } from './guides';
import { neighborhoods, neighborhoodName } from './neighborhoods';

export {
  restaurants,
  events,
  venues,
  attractions,
  getRestaurant,
  getEvent,
  getVenue,
  getAttraction,
};
export { hotels, getHotel } from './hotels';
export * from './guides';
export * from './neighborhoods';
export * from './neighborhood-guides';
export * from './authors';

/**
 * Canonical listing collection used by any site surface that needs all content.
 * Hotels intentionally come from ./hotels rather than the legacy demo fixtures
 * that still live in ./listings while the rest of that file is being migrated.
 */
export const allListings: Listing[] = [
  ...restaurants,
  ...hotels,
  ...events,
  ...venues,
  ...attractions,
];

/**
 * Flat search index for durable site content. Live events are intentionally not
 * built from the seeded event fixtures; the search page injects Ticketmaster
 * records from the shared live calendar instead.
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
export function searchDocs(query: string, extraDocs: SearchDoc[] = []): SearchDoc[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const terms = q.split(/\s+/);

  return [...searchIndex, ...extraDocs]
    .map((doc) => {
      let score = 0;
      const title = doc.title.toLowerCase();
      const summary = doc.summary.toLowerCase();
      const hood = (doc.neighborhood || '').toLowerCase();
      const kw = doc.keywords.join(' ').toLowerCase();

      for (const term of terms) {
        if (title.includes(term)) score += title.startsWith(term) ? 12 : 8;
        if (hood.includes(term)) score += 5;
        if (summary.includes(term)) score += 3;
        if (kw.includes(term)) score += 2;
        if (doc.type.toLowerCase().includes(term)) score += 4;
      }
      return { doc, score };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map((result) => result.doc);
}

/** Legacy helper retained only for explicitly seeded development surfaces. */
export function upcomingEvents(limit?: number) {
  const sorted = [...events].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
}
