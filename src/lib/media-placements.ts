import type { Guide } from '@/lib/types';
import { hasMedia, type ImageKey } from '@/lib/media';

/**
 * Cleared production image keys for UI placements.
 * Every guide has its own canonical cover key (no cluster fallbacks).
 */

export const GUIDE_IMAGES: Record<string, ImageKey> = {
  'best-restaurants-nashville': 'guide/best-restaurants',
  'best-bars-rooftops-nashville': 'guide/bars-rooftops',
  'best-live-music-venues-nashville': 'guide/live-music-venues',
  'where-to-stay-nashville': 'hub/hotels',
  'best-things-to-do-nashville': 'editorial/parthenon-west-end',
  'nashville-neighborhood-guide': 'guide/neighborhood-guide',
  'nashville-first-time-visitors': 'guide/first-time-visitors',
  'nashville-weekend-itinerary': 'hub/weekend',
  'nashville-bachelorette-guide': 'hub/bachelorette',
  'nashville-with-kids': 'editorial/pedestrian-bridge',
};

/**
 * Cleared photograph of the area a music venue sits in, for venues whose own
 * photography is not yet cleared. Always the district, never another business.
 */
export function areaImageKey(area: string): ImageKey {
  const byArea: Record<string, ImageKey> = {
    Downtown: 'neighborhood/downtown-broadway',
    SoBro: 'downtown/sobro',
    Riverfront: 'editorial/pedestrian-bridge',
    'Nashville Yards': 'downtown/nashville-yards',
    'The Gulch': 'neighborhood/the-gulch',
    'East Nashville': 'neighborhood/east-nashville',
    'Elliston Place': 'neighborhood/midtown',
    Midtown: 'neighborhood/midtown',
    'Green Hills': 'neighborhood/green-hills',
    'Music Valley': 'editorial/skyline',
    'Wedgewood-Houston': 'editorial/weho-skyline',
    Germantown: 'neighborhood/germantown',
    '12 South': 'neighborhood/12-south',
  };
  const hit = Object.entries(byArea).find(([name]) => area.toLowerCase().includes(name.toLowerCase()));
  return hit ? hit[1] : 'editorial/skyline';
}

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

/**
 * Cleared photograph of a listing's neighborhood, for listings whose own
 * photography is not cleared. Several candidates per area so adjacent cards
 * do not repeat one frame; the seed (usually the listing title) picks one.
 * Only district and skyline frames, never another business.
 */
const AREA_FALLBACKS: Record<string, ImageKey[]> = {
  'downtown-broadway': ['hero/lower-broadway', 'editorial/broadway-rooftop-day', 'downtown/sobro', 'editorial/broadway-nightlife', 'editorial/printers-alley', 'downtown/nashville-yards'],
  midtown: ['editorial/parthenon-west-end', 'editorial/skyline', 'hero/nashroam-skyline'],
  'the-gulch': ['neighborhood/the-gulch', 'editorial/skyline'],
  'east-nashville': ['neighborhood/east-nashville', 'editorial/pedestrian-bridge'],
  germantown: ['neighborhood/germantown', 'editorial/skyline'],
  '12-south': ['neighborhood/12-south'],
  'hillsboro-village': ['neighborhood/hillsboro-village'],
  'sylvan-park': ['neighborhood/sylvan-park'],
  'green-hills': ['neighborhood/green-hills'],
  'wedgewood-houston': ['editorial/weho-skyline', 'editorial/weho-lounge'],
  'music-row': ['editorial/music-row-studio-b'],
  'west-end': ['editorial/parthenon-west-end'],
};

export function listingFallbackKey(neighborhood: string, seed = ''): ImageKey | undefined {
  const candidates = [...(AREA_FALLBACKS[neighborhood] ?? []), 'editorial/skyline' as ImageKey, 'hero/nashroam-skyline' as ImageKey].filter((k) => hasMedia(k));
  if (candidates.length === 0) return undefined;
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return candidates[h % candidates.length];
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
