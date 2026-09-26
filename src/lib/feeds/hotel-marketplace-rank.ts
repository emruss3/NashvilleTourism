import type { LiveHotelRate } from '@/lib/feeds/hotels-live';
// Relative so node:test can load this module without the tsconfig path alias.
import { distanceKm, inDavidsonCounty, type LatLng } from '../geo.ts';

/**
 * Marketplace ranking. Ours, not the provider's, and deterministic.
 *
 * 1. Editorial hotels first, in editorial order, badged "Our pick".
 * 2. Then a weighted score of distance to the active center, guest rating
 *    weighted by review volume, stars, and fit against the neighborhood's
 *    typical price band.
 * 3. Margin and suggested selling price are never inputs: `ssp` is ignored
 *    here and the net rate never leaves the edge function.
 */
export const RANK_WEIGHTS = {
  /** Full marks at the center, zero at `distanceFloorKm`. */
  distance: 0.4,
  distanceFloorKm: 4,
  /** rating/5 scaled by log(reviewCount) so ten reviews do not outrank a thousand. */
  rating: 0.3,
  ratingReviewSaturation: 400,
  /** stars/5. Unrated properties get 0.4 so they are not buried below one-stars. */
  stars: 0.15,
  /** 1 inside the band, decays to 0 at twice the ceiling or half the floor. */
  priceFit: 0.15,
} as const;

export interface MarketFilters {
  minStars?: number;
  maxNightly?: number;
  refundableOnly?: boolean;
  /** Lower-case facility words; a hotel matches when any facility name contains the word. */
  facilities?: string[];
  type?: 'hotel' | 'rental';
  /** Minimum room occupancy reported by the rate. */
  minOccupancy?: number;
  maxChainSize?: number;
}

export interface RankOptions {
  center?: LatLng;
  /** `[low, high]` nightly USD band, from the neighborhood's typical price. */
  priceBand?: [number, number];
  /** LiteAPI ids of editorial hotels, in editorial order. */
  pinnedIds?: string[];
  /** Hotels already shown elsewhere on the page. */
  excludeIds?: string[];
  filters?: MarketFilters;
  sort?: 'score' | 'distance' | 'price';
  limit?: number;
}

export interface RankedHotel {
  rate: LiveHotelRate;
  pinned: boolean;
  distanceKm?: number;
  score: number;
}

/**
 * LiteAPI hotel-type ids, from /data/hotelTypes on 2026-09-26 (stored in
 * lookup_liteapi_hotel_types). Davidson County counts in brackets.
 *   Rentals: 201 Apartments [463], 220 Holiday homes [441], 230 Cottages
 *   [192], 250 Private vacation home [186], 229 Condos [63], 213 Villas [9].
 *   Hotels: 204 Hotels [326], 219 Aparthotels [21], 205 Motels [18],
 *   218 Inns [13], 216 Guest houses [5], 206 Resorts.
 * Ids decide the type filter; the lookup names are a display nicety and the
 * fallback for ids we have not classified.
 */
export const RENTAL_TYPE_IDS = new Set([201, 213, 220, 229, 230, 250]);
export const HOTEL_TYPE_IDS = new Set([204, 205, 206, 216, 218, 219]);

/**
 * Facility words map to real amenities, not to anything containing the word:
 * "pool" must not match "Pool umbrellas" or "Billiards or pool table".
 */
const FACILITY_MATCHERS: Record<string, { any: RegExp[]; none: RegExp }> = {
  pool: {
    any: [/swimming pool/i, /\b(outdoor|indoor|rooftop|heated|infinity|plunge|private|seasonal|natural|indoor\/outdoor)\s+pool\b/i, /^pool$/i, /\bpool\s*\((?!table)/i],
    none: /billiard|table|umbrella|lounger|cabana|nearby|towel|pool bar|poolside/i,
  },
  gym: { any: [/\b(gym|fitness)\b/i], none: /nearby/i },
  parking: { any: [/\bparking\b/i], none: /nearby|street/i },
  breakfast: { any: [/\bbreakfast\b/i], none: /nearby|surcharge/i },
};

export function hasFacility(names: string[], word: string): boolean {
  const key = word.toLowerCase();
  const matcher = FACILITY_MATCHERS[key];
  if (!matcher) return names.some((n) => n.toLowerCase().includes(key));
  return names.some((n) => matcher.any.some((re) => re.test(n)) && !matcher.none.test(n));
}
const RENTAL_TYPE = /apartment|aparthotel|rental|villa|house|home|condo|cottage|cabin|residence|hostel|holiday/i;
const HOTEL_TYPE = /hotel|resort|inn|motel|lodge|boutique|suite|bed and breakfast|b&b|guest/i;

/** Map a `typicalHotelPrice` band such as "$$$–$$$$" to nightly USD. */
export function priceBandFromCategory(band: string): [number, number] | undefined {
  const levels: Record<string, [number, number]> = { $: [60, 140], $$: [120, 220], $$$: [200, 380], $$$$: [340, 900] };
  const found = band.match(/\${1,4}/g);
  if (!found?.length) return undefined;
  const lows = found.map((f) => levels[f]?.[0]).filter((n): n is number => typeof n === 'number');
  const highs = found.map((f) => levels[f]?.[1]).filter((n): n is number => typeof n === 'number');
  if (!lows.length) return undefined;
  return [Math.min(...lows), Math.max(...highs)];
}

export function isRental(rate: LiveHotelRate): boolean {
  if (rate.hotelTypeId !== undefined && RENTAL_TYPE_IDS.has(rate.hotelTypeId)) return true;
  if (rate.hotelTypeId !== undefined && HOTEL_TYPE_IDS.has(rate.hotelTypeId)) return false;
  const name = rate.hotelTypeName ?? '';
  if (RENTAL_TYPE.test(name)) return true;
  if (HOTEL_TYPE.test(name)) return false;
  return /\b(apartment|apartments|condo|house|home|homes|loft|lofts|residence|residences|rental)\b/i.test(rate.name);
}

export function passesFilters(rate: LiveHotelRate, f: MarketFilters = {}): boolean {
  if (f.minStars && (rate.stars ?? 0) < f.minStars) return false;
  if (f.maxNightly && rate.nightly.amount > f.maxNightly) return false;
  if (f.refundableOnly && rate.refundable !== 'RFN') return false;
  if (f.type === 'rental' && !isRental(rate)) return false;
  if (f.type === 'hotel' && isRental(rate)) return false;
  if (f.minOccupancy && rate.maxOccupancy !== undefined && rate.maxOccupancy < f.minOccupancy) return false;
  if (f.maxChainSize && (rate.chainSize ?? 0) > f.maxChainSize) return false;
  if (f.facilities?.length && !f.facilities.every((word) => hasFacility(rate.facilities, word))) return false;
  return true;
}

function priceFit(nightly: number, band?: [number, number]): number {
  if (!band) return 0.5;
  const [low, high] = band;
  if (nightly >= low && nightly <= high) return 1;
  if (nightly > high) return Math.max(0, 1 - (nightly - high) / high);
  return Math.max(0, 1 - (low - nightly) / (low / 2));
}

export function scoreRate(rate: LiveHotelRate, opts: { center?: LatLng; priceBand?: [number, number] } = {}): { score: number; distanceKm?: number } {
  const w = RANK_WEIGHTS;
  const distance = opts.center ? distanceKm(opts.center, rate) : undefined;
  const distanceScore = distance === undefined ? 0.5 : Math.max(0, 1 - distance / w.distanceFloorKm);
  const reviews = rate.reviewCount ?? 0;
  const volume = Math.log1p(Math.min(reviews, w.ratingReviewSaturation)) / Math.log1p(w.ratingReviewSaturation);
  const ratingScore = rate.rating !== undefined && reviews > 0 ? (Math.min(rate.rating, 10) / (rate.rating > 5 ? 10 : 5)) * volume : 0;
  const starsScore = rate.stars ? Math.min(rate.stars, 5) / 5 : 0.4;
  const score = w.distance * distanceScore + w.rating * ratingScore + w.stars * starsScore + w.priceFit * priceFit(rate.nightly.amount, opts.priceBand);
  return { score: Math.round(score * 10_000) / 10_000, distanceKm: distance };
}

export function rankMarketplace(rates: LiveHotelRate[], opts: RankOptions = {}): RankedHotel[] {
  const exclude = new Set(opts.excludeIds ?? []);
  const pinnedOrder = new Map((opts.pinnedIds ?? []).map((id, i) => [id, i]));
  const seen = new Set<string>();
  const candidates = rates.filter((rate) => {
    if (seen.has(rate.hotelId) || exclude.has(rate.hotelId)) return false;
    seen.add(rate.hotelId);
    return inDavidsonCounty(rate) && passesFilters(rate, opts.filters);
  });

  const ranked: RankedHotel[] = candidates.map((rate) => {
    const scored = scoreRate(rate, { center: opts.center, priceBand: opts.priceBand });
    return { rate, pinned: pinnedOrder.has(rate.hotelId), ...scored };
  });

  const sort = opts.sort ?? 'score';
  ranked.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.pinned && b.pinned) return (pinnedOrder.get(a.rate.hotelId) ?? 0) - (pinnedOrder.get(b.rate.hotelId) ?? 0);
    if (sort === 'distance') return (a.distanceKm ?? 99) - (b.distanceKm ?? 99) || b.score - a.score;
    if (sort === 'price') return a.rate.nightly.amount - b.rate.nightly.amount || b.score - a.score;
    return b.score - a.score || a.rate.nightly.amount - b.rate.nightly.amount || a.rate.hotelId.localeCompare(b.rate.hotelId);
  });

  return typeof opts.limit === 'number' ? ranked.slice(0, Math.max(0, opts.limit)) : ranked;
}
