/**
 * Deep links into the Nuitée white-label booking site (LiteAPI "Deeplinking
 * to Whitelabel"). Every link lands on https://{NEXT_PUBLIC_STAY_HOST}; the
 * white label owns hotel pages, room selection, checkout, confirmation and
 * support. Nothing here calls LiteAPI and nothing here touches payment.
 *
 * Host and Place ID come from public env (docs/HOTEL-BOOKING.md). With no
 * host configured every builder returns undefined and callers fall back to
 * the hotel's affiliate/search link.
 */

export interface StayDates {
  /** YYYY-MM-DD. Both or neither; when absent the white label prompts. */
  checkin?: string;
  checkout?: string;
}

export interface StayOccupancy {
  adults?: number;
  /** Child ages, one entry per child. */
  children?: number[];
  rooms?: number;
}

export interface StayLinkOptions extends StayDates, StayOccupancy {
  /** `nsh:{surface}:{slug}`; see clientReference(). */
  clientReference?: string;
  needFreeCancellation?: boolean;
  needBreakfast?: boolean;
}

export interface StayListingOptions extends StayLinkOptions {
  placeId?: string;
  stars?: number[];
  minPrice?: number;
  maxPrice?: number;
  freeCancellation?: boolean;
  facilities?: number[];
  sorting?: string;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// Read with the literal `process.env.NEXT_PUBLIC_*` form: Next.js inlines only
// literal references into client bundles, so a `process.env[key]` lookup is
// empty in the browser and every client-side booking link went missing.
// Read at call time (the tests set these while running), one literal per key.
function env(key: 'NEXT_PUBLIC_STAY_HOST' | 'NEXT_PUBLIC_NASHVILLE_PLACE_ID' | 'NEXT_PUBLIC_STAY_DIRECT_CHECKOUT'): string {
  const raw = key === 'NEXT_PUBLIC_STAY_HOST' ? process.env.NEXT_PUBLIC_STAY_HOST : key === 'NEXT_PUBLIC_NASHVILLE_PLACE_ID' ? process.env.NEXT_PUBLIC_NASHVILLE_PLACE_ID : process.env.NEXT_PUBLIC_STAY_DIRECT_CHECKOUT;
  return (raw || '').trim();
}

/** Host of the white-label site without scheme or trailing slash, or undefined when unset. */
export function stayHost(): string | undefined {
  const raw = env('NEXT_PUBLIC_STAY_HOST');
  if (!raw) return undefined;
  const host = raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
  return host || undefined;
}

export function nashvillePlaceId(): string | undefined {
  return env('NEXT_PUBLIC_NASHVILLE_PLACE_ID') || undefined;
}

export type DirectCheckoutMode = 'off' | 'test' | 'on';

/**
 * NEXT_PUBLIC_STAY_DIRECT_CHECKOUT: `off` (default) sends every link to the
 * hotel page on the white label; `test` sends only the room-level Select
 * buttons on hotel detail pages to the offer's checkout (`/booking?offerId=`)
 * and everything else to the hotel page; `on` also lets the booking box
 * deep-link the cheapest offer's checkout. The legacy `true` reads as `test`.
 * If the white label bounces a checkout URL back to its hotel page, nothing
 * here detects it; the flag is set by hand after a manual test.
 */
export function directCheckoutMode(): DirectCheckoutMode {
  const raw = env('NEXT_PUBLIC_STAY_DIRECT_CHECKOUT').toLowerCase();
  if (raw === 'on') return 'on';
  if (raw === 'test' || raw === 'true') return 'test';
  return 'off';
}

export function directCheckoutEnabled(): boolean {
  return directCheckoutMode() !== 'off';
}

/** Card statement descriptor, quoted in every disclosure. */
export const STAY_MERCHANT = 'Nuitée Travel Limited';
export const STAY_PARTNER = 'LiteAPI';

function encodeBase64(text: string): string {
  if (typeof btoa === 'function') return btoa(text);
  return Buffer.from(text, 'utf8').toString('base64');
}

/** Largest party the guest selectors offer (StaySearch, BookingWidget, planner). */
export const MAX_STAY_ADULTS = 20;

/**
 * Rooms for a party: up to 4 adults share one room; a bigger group is split
 * into rooms of two, so a 16-person bachelorette lands on the booking site
 * as eight doubles rather than one impossible room. Explicit `rooms` wins.
 */
export function splitOccupancy(occupancy: StayOccupancy = {}): { adults: number; children: number[] }[] {
  const adults = Math.min(Math.max(Math.trunc(occupancy.adults ?? 2), 1), MAX_STAY_ADULTS);
  const children = (occupancy.children ?? []).filter((age) => Number.isInteger(age) && age >= 0 && age <= 17);
  const wanted = occupancy.rooms ? Math.trunc(occupancy.rooms) : adults <= 4 ? 1 : Math.ceil(adults / 2);
  const rooms = Math.min(Math.max(wanted, 1), adults);
  const base = Math.floor(adults / rooms);
  const extra = adults % rooms;
  // Children ride with the first room; child ages per room is a Phase 3 refinement.
  return Array.from({ length: rooms }, (_, i) => ({ adults: base + (i < extra ? 1 : 0), children: i === 0 ? children : [] }));
}

/** `occupancies` = base64 of `[{ adults, children }]`, one object per room. */
export function occupanciesParam(occupancy: StayOccupancy = {}): string {
  return encodeBase64(JSON.stringify(splitOccupancy(occupancy)));
}

/** `nsh:{surface}:{slug}` — short, lower-case, no PII, no dates. */
export function clientReference(surface: string, slug = 'nashville'): string {
  const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'x';
  return `nsh:${clean(surface)}:${clean(slug)}`;
}

function datesValid(dates: StayDates): dates is Required<StayDates> {
  return Boolean(dates.checkin && dates.checkout && ISO_DAY.test(dates.checkin) && ISO_DAY.test(dates.checkout) && dates.checkout > dates.checkin);
}

function applyCommon(u: URL, opts: StayLinkOptions): void {
  if (datesValid(opts)) {
    u.searchParams.set('checkin', opts.checkin);
    u.searchParams.set('checkout', opts.checkout);
  }
  if (opts.adults !== undefined || opts.children?.length || opts.rooms) u.searchParams.set('occupancies', occupanciesParam(opts));
  if (opts.needFreeCancellation) u.searchParams.set('needFreeCancellation', '1');
  if (opts.needBreakfast) u.searchParams.set('needBreakfast', '1');
  u.searchParams.set('language', 'en');
  u.searchParams.set('currency', 'USD');
  if (opts.clientReference) u.searchParams.set('clientReference', opts.clientReference);
}

/** Hotel page on the white label. Undefined when the host is unset. */
export function stayHotelHref(liteApiHotelId: string, opts: StayLinkOptions = {}): string | undefined {
  const host = stayHost();
  if (!host || !liteApiHotelId) return undefined;
  const u = new URL(`https://${host}/hotels/${encodeURIComponent(liteApiHotelId)}`);
  applyCommon(u, opts);
  return u.toString();
}

/** Listing page on the white label. Fallback only, for when our own results are unavailable. */
export function stayListingHref(opts: StayListingOptions = {}): string | undefined {
  const host = stayHost();
  if (!host) return undefined;
  const u = new URL(`https://${host}/hotels`);
  const placeId = opts.placeId ?? nashvillePlaceId();
  if (placeId) u.searchParams.set('placeId', placeId);
  applyCommon(u, opts);
  if (opts.stars?.length) u.searchParams.set('stars', opts.stars.join(','));
  if (opts.minPrice !== undefined) u.searchParams.set('min_price', String(opts.minPrice));
  if (opts.maxPrice !== undefined) u.searchParams.set('max_price', String(opts.maxPrice));
  if (opts.freeCancellation) u.searchParams.set('freeCancellation', '2');
  if (opts.facilities?.length) u.searchParams.set('facilities', opts.facilities.join(','));
  if (opts.sorting) u.searchParams.set('sorting', opts.sorting);
  return u.toString();
}

/**
 * Direct checkout for an offer the white label will prebook itself
 * (Phase 1 brief §3.4). Carries the same dates, occupancies and
 * clientReference as the hotel-page link so the two paths are comparable.
 * `surface` says which caller is asking: room-level Select buttons are
 * allowed in `test` and `on`; anything else only in `on`. Otherwise
 * undefined, and the caller falls back to the hotel page.
 */
export function stayCheckoutHref(offerId: string, opts: StayLinkOptions & { surface?: 'room' | 'box' } = {}): string | undefined {
  const host = stayHost();
  const mode = directCheckoutMode();
  const allowed = mode === 'on' || (mode === 'test' && (opts.surface ?? 'room') === 'room');
  if (!host || !offerId || !allowed) return undefined;
  const u = new URL(`https://${host}/booking`);
  u.searchParams.set('offerId', offerId);
  applyCommon(u, opts);
  return u.toString();
}

/** True when a URL points at the white label, which opens in the same tab as part of one site. */
export function isStayHref(url: string | undefined): boolean {
  const host = stayHost();
  if (!url || !host) return false;
  try {
    return new URL(url).host.toLowerCase() === host;
  } catch {
    return false;
  }
}
