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
import { hotels } from './hotels';
import { guides } from './guides';
import { neighborhoods, neighborhoodName } from './neighborhoods';
import { musicVenues } from '../music-venues';

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
  ...restaurants.map<SearchDoc>((restaurant) => ({
    slug: restaurant.slug,
    href: `/restaurants/${restaurant.slug}/`,
    title: restaurant.title,
    summary: restaurant.summary,
    type: 'Restaurant',
    neighborhood: neighborhoodName(restaurant.neighborhood),
    keywords: [
      restaurant.cuisine,
      restaurant.priceRange,
      ...restaurant.bestFor,
      'restaurant',
      'eat',
      'dinner',
    ],
  })),
  ...hotels.map<SearchDoc>((hotel) => ({
    slug: hotel.slug,
    href: `/hotels/${hotel.slug}/`,
    title: hotel.title,
    summary: hotel.summary,
    type: 'Hotel',
    neighborhood: neighborhoodName(hotel.neighborhood),
    keywords: [
      hotel.priceCategory,
      ...hotel.bestFor,
      ...hotel.amenities,
      'hotel',
      'stay',
      'where to stay',
    ],
  })),
  ...musicVenues.map<SearchDoc>((venue) => ({
    slug: venue.slug,
    href: `/music/${venue.slug}/`,
    title: venue.name,
    summary: venue.summary,
    type: 'Venue',
    neighborhood: venue.area,
    keywords: [
      ...venue.genres,
      venue.format,
      ...venue.ticketmasterAliases,
      'live music',
      'venue',
      'show',
      'concert',
    ],
  })),
  ...attractions.map<SearchDoc>((attraction) => ({
    slug: attraction.slug,
    href: `/things-to-do/${attraction.slug}/`,
    title: attraction.title,
    summary: attraction.summary,
    type: 'Attraction',
    neighborhood: neighborhoodName(attraction.neighborhood),
    keywords: [
      attraction.category,
      ...attraction.bestFor,
      'things to do',
      'attraction',
      'activity',
    ],
  })),
  ...guides.map<SearchDoc>((guide) => ({
    slug: guide.slug,
    href: `/guides/${guide.slug}/`,
    title: guide.title,
    summary: guide.summary,
    type: 'Guide',
    keywords: [guide.cluster, 'guide', 'best', 'itinerary'],
  })),
  ...neighborhoods.map<SearchDoc>((neighborhood) => ({
    slug: neighborhood.slug,
    href: `/neighborhoods/${neighborhood.slug}/`,
    title: neighborhood.name,
    summary: neighborhood.summary,
    type: 'Neighborhood',
    neighborhood: neighborhood.name,
    keywords: [
      ...neighborhood.knownFor,
      ...neighborhood.bestFor,
      'neighborhood',
      'area',
      'district',
    ],
  })),
];

/** Simple scored substring match. Ranked: title > neighborhood > summary > keywords. */
export function searchDocs(query: string, extraDocs: SearchDoc[] = []): SearchDoc[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 2) return [];
  const terms = normalizedQuery.split(/\s+/);

  return [...searchIndex, ...extraDocs]
    .map((doc) => {
      let score = 0;
      const title = doc.title.toLowerCase();
      const summary = doc.summary.toLowerCase();
      const neighborhood = (doc.neighborhood || '').toLowerCase();
      const keywords = doc.keywords.join(' ').toLowerCase();

      for (const term of terms) {
        if (title.includes(term)) score += title.startsWith(term) ? 12 : 8;
        if (neighborhood.includes(term)) score += 5;
        if (summary.includes(term)) score += 3;
        if (keywords.includes(term)) score += 2;
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
