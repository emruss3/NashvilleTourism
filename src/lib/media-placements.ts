import type { Guide } from '@/lib/types';
import type { ImageKey } from '@/lib/media';

/**
 * Cleared production image keys for UI placements.
 * Every guide has its own canonical cover key (no cluster fallbacks).
 */

export const GUIDE_IMAGES: Record<string, ImageKey> = {
  'best-restaurants-nashville': 'guide/best-restaurants',
  'best-bars-rooftops-nashville': 'guide/bars-rooftops',
  'best-live-music-venues-nashville': 'guide/live-music-venues',
  'where-to-stay-nashville': 'guide/where-to-stay',
  'best-things-to-do-nashville': 'guide/best-things-to-do',
  'nashville-neighborhood-guide': 'guide/neighborhood-guide',
  'nashville-first-time-visitors': 'guide/first-time-visitors',
  'nashville-weekend-itinerary': 'guide/weekend-itinerary',
  'nashville-bachelorette-guide': 'guide/bachelorette',
  'nashville-with-kids': 'guide/with-kids',
};

export function guideImageKey(item: Guide): ImageKey {
  const key = GUIDE_IMAGES[item.slug];
  if (!key) {
    throw new Error(`Guide "${item.slug}" is missing from GUIDE_IMAGES — every guide needs its own cover key.`);
  }
  return key;
}

/** Canonical neighborhood photography (Commons restored or cleared BPH WeHo). */
export function neighborhoodImageKey(slug: string): ImageKey {
  const bySlug: Record<string, ImageKey> = {
    'downtown-broadway': 'neighborhood/downtown-broadway',
    'the-gulch': 'neighborhood/the-gulch',
    'east-nashville': 'neighborhood/east-nashville',
    germantown: 'neighborhood/germantown',
    midtown: 'neighborhood/midtown',
    '12-south': 'neighborhood/12-south',
    'hillsboro-village': 'neighborhood/hillsboro-village',
    'music-row': 'editorial/music-row-studio-b',
    'green-hills': 'neighborhood/green-hills',
    // BPH-owned exact WeHo photograph — rights audit cleared (ASSET-RIGHTS weho-skyline).
    'wedgewood-houston': 'editorial/weho-skyline',
    'sylvan-park': 'neighborhood/sylvan-park',
    'west-end': 'editorial/parthenon-west-end',
  };
  return bySlug[slug] ?? 'hub/neighborhoods-index';
}

/** Where-to-stay category hub leads. */
export function stayHubImageKey(slug: string): ImageKey | undefined {
  const bySlug: Record<string, ImageKey> = {
    'boutique-hotels-downtown': 'stay/boutique-hotels-downtown',
    'group-rentals-bachelor-bachelorette': 'stay/group-rentals',
    'luxury-resorts-opryland': 'stay/luxury-resorts-opryland',
    'walkable-to-broadway': 'stay/walkable-to-broadway',
    'hotels-with-pools': 'stay/hotels-with-pools',
    'value-stays-midtown': 'stay/value-stays-midtown',
  };
  return bySlug[slug];
}
