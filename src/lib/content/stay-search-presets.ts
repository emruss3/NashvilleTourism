import type { LatLng } from '@/lib/geo';

/**
 * Marketplace presets for the where-to-stay situation hubs. Editable content:
 * a hub's "More options for your dates" rail is one LiteAPI area search with
 * these filters applied by our ranking, never by the provider. Centers and
 * radii are planning values, like the neighborhood centroids.
 */
export interface StaySearchPreset {
  hub: string;
  /** Search center and radius for the single area_rates call. */
  center: LatLng;
  radiusKm: number;
  /** Sent to the provider as one room so whole-home listings answer. */
  adults?: number;
  singleRoom?: boolean;
  /** Ranking filters. */
  type?: 'hotel' | 'rental';
  minStars?: number;
  maxNightly?: number;
  refundableOnly?: boolean;
  facilities?: string[];
  /** Drop hotels whose chain has more than this many Davidson County properties. */
  maxChainSize?: number;
  sort?: 'score' | 'distance';
  /** URL the hub's CTA opens on /hotels/ with the same intent. */
  marketplace: { neighborhood?: string; type?: 'hotel' | 'rental'; stars?: number; max?: number; adults?: number };
  /** Heading for the rail. */
  title: string;
}

export const STAY_SEARCH_PRESETS: StaySearchPreset[] = [
  {
    hub: 'boutique-hotels-downtown',
    // Between Lower Broadway, the Gulch and Germantown.
    center: { lat: 36.1625, lng: -86.784 },
    radiusKm: 2.2,
    type: 'hotel',
    maxChainSize: 3,
    sort: 'score',
    marketplace: { neighborhood: 'downtown-broadway', type: 'hotel' },
    title: 'More small hotels for your dates',
  },
  {
    hub: 'group-rentals-bachelor-bachelorette',
    // East Nashville, Germantown and downtown.
    center: { lat: 36.173, lng: -86.771 },
    radiusKm: 3.5,
    adults: 8,
    singleRoom: true,
    type: 'rental',
    sort: 'score',
    marketplace: { neighborhood: 'east-nashville', type: 'rental', adults: 8 },
    title: 'Whole homes and apartments for your dates',
  },
  {
    hub: 'luxury-resorts-opryland',
    center: { lat: 36.211, lng: -86.693 },
    radiusKm: 4,
    minStars: 4,
    sort: 'score',
    marketplace: { neighborhood: 'music-valley-opryland', stars: 4 },
    title: 'Resorts and hotels near Opryland for your dates',
  },
  {
    hub: 'walkable-to-broadway',
    center: { lat: 36.1612, lng: -86.7775 },
    radiusKm: 1.2,
    sort: 'distance',
    marketplace: { neighborhood: 'downtown-broadway' },
    title: 'Closest hotels to Lower Broadway for your dates',
  },
  {
    hub: 'hotels-with-pools',
    center: { lat: 36.1627, lng: -86.7816 },
    radiusKm: 8,
    facilities: ['pool'],
    sort: 'score',
    marketplace: {},
    title: 'Hotels with a pool for your dates',
  },
  {
    hub: 'value-stays-midtown',
    center: { lat: 36.15, lng: -86.801 },
    radiusKm: 1.6,
    maxNightly: 260,
    sort: 'score',
    marketplace: { neighborhood: 'midtown', max: 260 },
    title: 'Midtown rooms under the downtown rate for your dates',
  },
];

export function getStaySearchPreset(hub: string): StaySearchPreset | undefined {
  return STAY_SEARCH_PRESETS.find((p) => p.hub === hub);
}
