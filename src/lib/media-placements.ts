import type { Guide } from '@/lib/types';
import type { ImageKey } from '@/lib/media';

/**
 * Cleared production image keys for UI placements.
 * CVC neighborhood/guide/premium files were removed — do not point UI at those keys.
 */

export function guideImageKey(item: Guide): ImageKey {
  const bySlug: Partial<Record<string, ImageKey>> = {
    'nashville-first-time-visitors': 'editorial/broadway-nightlife',
    'where-to-stay-nashville': 'hub/hotels',
    'nashville-weekend-itinerary': 'hub/weekend',
  };
  const slugKey = bySlug[item.slug];
  if (slugKey) return slugKey;

  const byCluster: Record<Guide['cluster'], ImageKey> = {
    'Trip Planning': 'hub/weekend',
    Restaurants: 'hub/restaurants',
    Hotels: 'hub/hotels',
    'Things to Do': 'hub/tours',
    Music: 'hub/live-music',
    Events: 'hub/tickets',
  };
  return byCluster[item.cluster];
}

/** Cleared atmosphere stand-ins until neighborhood STOCK/COMMISSION photos ship. */
export function neighborhoodImageKey(slug: string): ImageKey {
  const bySlug: Record<string, ImageKey> = {
    'downtown-broadway': 'editorial/broadway-nightlife',
    'the-gulch': 'editorial/cocktail-service',
    'east-nashville': 'editorial/nashville-food',
    germantown: 'editorial/private-events',
    midtown: 'editorial/live-performance-overhead',
    '12-south': 'hub/outdoor-living',
    'hillsboro-village': 'editorial/parthenon-west-end',
    'music-row': 'editorial/music-row-studio-b',
    'green-hills': 'hub/wellness',
    'wedgewood-houston': 'venues/delux-weho-exterior',
    'sylvan-park': 'hub/pool',
    'west-end': 'editorial/opryland-atrium',
  };
  return bySlug[slug] ?? 'editorial/skyline';
}
