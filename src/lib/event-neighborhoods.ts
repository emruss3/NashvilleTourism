import type { NeighborhoodSlug } from '@/lib/types';

/**
 * Live events arrive with a venue name and no neighborhood. This maps the
 * ticketed venues that show up in the Nashville feed to the neighborhood we
 * cover, so the Explore neighborhood filter applies to events as well as to
 * places. Matching is a normalized substring test, so "Ryman Auditorium",
 * "The Ryman" and "Ryman Auditorium - Nashville" all resolve. More specific
 * names come first ("basement east" before "basement"); patterns are written
 * in normalized form, so never include "the".
 *
 * Content venues (src/lib/content) are consulted first by the caller; this
 * list covers the arenas, theatres and clubs we have no listing for yet.
 */
export const VENUE_NEIGHBORHOODS: ReadonlyArray<readonly [pattern: string, slug: NeighborhoodSlug]> = [
  // Downtown, SoBro and Lower Broadway
  ['ryman', 'downtown-broadway'],
  ['bridgestone', 'downtown-broadway'],
  ['ascend amphitheater', 'downtown-broadway'],
  ['pinnacle', 'downtown-broadway'],
  ['3rd lindsley', 'downtown-broadway'],
  ['listening room', 'downtown-broadway'],
  ['schermerhorn', 'downtown-broadway'],
  ['tennessee performing arts', 'downtown-broadway'],
  ['tpac', 'downtown-broadway'],
  ['polk theater', 'downtown-broadway'],
  ['jackson hall', 'downtown-broadway'],
  ['andrew johnson theater', 'downtown-broadway'],
  ['municipal auditorium', 'downtown-broadway'],
  ['nissan stadium', 'downtown-broadway'],
  ['country music hall of fame', 'downtown-broadway'],
  ['cma theater', 'downtown-broadway'],
  ['city winery', 'downtown-broadway'],
  ['frist art museum', 'downtown-broadway'],
  ['wildhorse', 'downtown-broadway'],
  ['category 10', 'downtown-broadway'],
  ['acme feed', 'downtown-broadway'],
  ['skydeck', 'downtown-broadway'],
  ['assembly food hall', 'downtown-broadway'],
  ['music city center', 'downtown-broadway'],
  ['nashville symphony', 'downtown-broadway'],
  // Music Valley and Opryland
  ['grand ole opry', 'music-valley-opryland'],
  ['opry house', 'music-valley-opryland'],
  ['opryland', 'music-valley-opryland'],
  ['general jackson', 'music-valley-opryland'],
  ['nashville palace', 'music-valley-opryland'],
  // The Gulch and Cannery Row
  ['station inn', 'the-gulch'],
  ['cannery', 'the-gulch'],
  ['mercy lounge', 'the-gulch'],
  ['high watt', 'the-gulch'],
  // East Nashville
  ['basement east', 'east-nashville'],
  ['5 spot', 'east-nashville'],
  ['east room', 'east-nashville'],
  ['dees country cocktail', 'east-nashville'],
  ['drkmttr', 'east-nashville'],
  // Germantown and Marathon Village
  ['marathon music works', 'germantown'],
  ['brooklyn bowl', 'germantown'],
  ['first horizon park', 'germantown'],
  // Wedgewood-Houston and Eighth Avenue South
  ['geodis park', 'wedgewood-houston'],
  ['truth', 'wedgewood-houston'],
  ['zanies', 'wedgewood-houston'],
  ['basement', 'wedgewood-houston'],
  ['diskin cider', 'wedgewood-houston'],
  // Midtown, Elliston Place and West End
  ['exit in', 'midtown'],
  ['exitin', 'midtown'],
  ['analog', 'midtown'],
  ['centennial park', 'midtown'],
  ['parthenon', 'midtown'],
  ['musicians corner', 'midtown'],
  ['vanderbilt', 'midtown'],
  // Hillsboro Village and Green Hills
  ['belcourt', 'hillsboro-village'],
  ['bluebird', 'green-hills'],
];

export function normalizeVenueName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bthe\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Neighborhood for a live event's venue name, or undefined when we cannot place it. */
export function venueNeighborhood(venueName: string): NeighborhoodSlug | undefined {
  const key = normalizeVenueName(venueName);
  if (!key) return undefined;
  for (const [pattern, slug] of VENUE_NEIGHBORHOODS) {
    if (key.includes(pattern)) return slug;
  }
  return undefined;
}
