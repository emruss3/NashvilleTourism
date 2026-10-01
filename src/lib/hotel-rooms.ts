/**
 * Room options for one hotel and one stay, grouped for display the way
 * KindredTrips does it, then further: one card per room type (every supplier
 * spelling bucketed by the catalog room it matches), the cheapest rate on the
 * card and one option line per board and cancellation kind, photos matched to
 * the hotel's room catalog by normalized name. Pure functions and types only, so the
 * `hotel-rooms` test can load this file without the Next.js alias; the
 * fetch lives in `src/lib/feeds/hotel-rooms.ts`.
 */

export interface LiveMoney {
  amount: number;
  currency: string;
}

export interface TaxOrFee {
  included: boolean;
  description?: string;
  amount: number;
  currency: string;
}

export interface RoomRate {
  offerId?: string;
  rateId?: string;
  roomTypeId?: string;
  /** The catalog room id when the provider maps the rate to one. */
  mappedRoomId?: string;
  roomName: string;
  boardType?: string;
  boardName?: string;
  maxOccupancy?: number;
  adultCount?: number;
  childCount?: number;
  refundable?: 'RFN' | 'NRFN';
  /** ISO time until which the cheapest cancellation policy allows a free cancel. */
  cancelBy?: string;
  total: LiveMoney;
  nightly: LiveMoney;
  nights: number;
  ssp?: { amount: number };
  /** Taxes and fees the total includes, and any the property charges on site. */
  taxesAndFees: TaxOrFee[];
  priceType?: string;
  perks: string[];
  remarks?: string;
  paymentTypes: string[];
}

export interface CatalogRoom {
  id?: string | number;
  name: string;
  description?: string;
  childAllowed?: boolean;
  maxAdults?: number;
  maxChildren?: number;
  maxOccupancy?: number;
  size?: number;
  sizeUnit?: string;
  bedTypes: string[];
  amenities: string[];
  photos: { url: string; caption?: string }[];
}

export interface HotelDetail {
  hotelId: string;
  name: string;
  description?: string;
  images: { url: string; caption?: string; isDefault?: boolean }[];
  rooms: CatalogRoom[];
  facilities: string[];
  stars?: number;
  rating?: number;
  reviewCount?: number;
  address?: string;
  lat?: number;
  lng?: number;
  checkinTime?: string;
  checkoutTime?: string;
}

export interface RoomGroup {
  key: string;
  name: string;
  boardName?: string;
  boardType?: string;
  maxOccupancy?: number;
  maxAdults?: number;
  maxChildren?: number;
  /** From the catalog room when matched. */
  description?: string;
  bedTypes: string[];
  size?: string;
  amenities: string[];
  photos: { url: string; caption?: string }[];
  /** matched: the catalog room; similar: a catalog room of the same bed or kind; hotel: the hotel gallery. */
  photosSource: 'matched' | 'similar' | 'hotel' | 'none';
  cheapest: RoomRate;
  /** Cheapest rate per (board, refundable) kind, cheapest first; the card's option lines. */
  variants: RoomRate[];
  /** How many raw rates fell into this card. */
  rateCount: number;
  refundableAvailable: boolean;
}

/**
 * Words that carry no room identity. Suppliers spell the same room a dozen
 * ways ("Classic Room, 1 King Bed, Non Smoking", "CLASSIC, KING BED",
 * "Classic King, Guest room, 1 King"); once these go, all three are
 * {classic, king}.
 */
const STOP = new Set(['room', 'rooms', 'guest', 'guestroom', 'bed', 'beds', 'with', 'the', 'and', 'a', 'an', 'of', 'in', 'or', 'to', 'for', 'non', 'smoking', 'nonsmoking', '1', 'one', 'size', 'sized', 'type']);
const SYNONYM: Record<string, string> = { two: '2', queens: 'queen', kings: 'king', doubles: 'double', twins: 'twin', views: 'view', accessibility: 'accessible', ada: 'accessible' };
/** Bed and room-kind words: a room that shares one of these with a catalog room is at least similar. */
const KIND = new Set(['king', 'queen', 'double', 'twin', 'suite', 'studio', 'penthouse', 'loft', 'apartment', 'villa']);
/** Tokens that make a different room; a match must agree on every one of these. */
const DISTINCT = new Set(['accessible', 'suite', 'corner', 'view', 'skyline', 'terrace', 'balcony', 'penthouse', 'studio', 'connecting', 'apartment', 'villa', 'loft']);

/** Lowercase identity tokens, sorted and unique, with noise words and supplier filler removed. */
export function nameTokens(name: string): string[] {
  const seen = new Set<string>();
  for (const raw of name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ')) {
    const t = SYNONYM[raw] ?? raw;
    if (t && !STOP.has(t)) seen.add(t);
  }
  return [...seen].sort();
}

export function normalizedName(name: string): string {
  return nameTokens(name).join(' ');
}

export function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter += 1;
  return inter / (sa.size + sb.size - inter);
}

function distinctAgree(a: string[], b: string[]): boolean {
  const da = a.filter((t) => DISTINCT.has(t)).join(' ');
  const db = b.filter((t) => DISTINCT.has(t)).join(' ');
  return da === db;
}

/**
 * Exact normalized match first, then the best token overlap at 0.5 or above
 * among catalog rooms that agree on the distinguishing words (a corner room
 * never matches a plain one, an accessible room never matches a standard
 * one). Ties go to the catalog room with fewer extra words.
 */
export function matchCatalogRoom(name: string, rooms: CatalogRoom[]): CatalogRoom | undefined {
  const tokens = nameTokens(name);
  if (!tokens.length) return undefined;
  const norm = tokens.join(' ');
  const exact = rooms.find((r) => normalizedName(r.name) === norm);
  if (exact) return exact;
  let best: { room: CatalogRoom; score: number; extra: number } | undefined;
  for (const room of rooms) {
    const rt = nameTokens(room.name);
    if (!distinctAgree(tokens, rt)) continue;
    const score = jaccard(tokens, rt);
    const extra = rt.length - tokens.length;
    if (score >= 0.5 && (!best || score > best.score || (score === best.score && extra < best.extra))) best = { room, score, extra };
  }
  return best?.room;
}

/**
 * When no catalog room matches, the nearest room of the same bed or kind
 * (king, queen, suite…) that agrees on the distinguishing words and has
 * photos, fewest extra words first. Its photos are shown as "similar room",
 * never as the room itself.
 */
export function similarCatalogRoom(name: string, rooms: CatalogRoom[]): CatalogRoom | undefined {
  const tokens = nameTokens(name);
  const kinds = tokens.filter((t) => KIND.has(t));
  if (!kinds.length) return undefined;
  let best: { room: CatalogRoom; shared: number; extra: number } | undefined;
  for (const room of rooms) {
    if (!room.photos.length) continue;
    const rt = nameTokens(room.name);
    if (!distinctAgree(tokens, rt)) continue;
    const shared = kinds.filter((k) => rt.includes(k)).length;
    if (!shared) continue;
    const extra = rt.filter((t) => !tokens.includes(t)).length;
    if (!best || shared > best.shared || (shared === best.shared && extra < best.extra)) best = { room, shared, extra };
  }
  return best?.room;
}

function boardKey(rate: RoomRate): string {
  return (rate.boardType ?? rate.boardName ?? 'RO').toLowerCase();
}

/** Supplier names arrive in every case; show them as titles. */
export function displayRoomName(name: string): string {
  const cleaned = name.replace(/\s*\(\s*/g, ' (').replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').trim();
  if (cleaned === cleaned.toUpperCase() || cleaned === cleaned.toLowerCase()) {
    return cleaned.toLowerCase().replace(/(^|[\s(,/-])([a-z])/g, (m, pre, ch) => `${pre}${ch.toUpperCase()}`);
  }
  return cleaned;
}

/**
 * One card per room type. Rates are bucketed by the catalog room they match
 * (so every supplier spelling of "Classic King" lands together) or, with no
 * match, by their identity tokens. Each card shows its cheapest rate, plus
 * one variant per (board, refundable) combination: the cheapest of that kind,
 * so a card never lists forty near-identical lines. Cards are ordered by
 * their cheapest total. Photos come from the matched catalog room; when
 * several cards share one catalog room the photo order rotates; with no
 * match the hotel gallery stands in.
 */
export function groupRooms(rates: RoomRate[], detail?: Pick<HotelDetail, 'rooms' | 'images'>): RoomGroup[] {
  const buckets = new Map<string, { rates: RoomRate[]; room?: CatalogRoom }>();
  const matchMemo = new Map<string, CatalogRoom | undefined>();
  const byId = new Map<string, CatalogRoom>();
  for (const room of detail?.rooms ?? []) if (room.id !== undefined) byId.set(String(room.id), room);
  for (const rate of rates) {
    if (!rate.roomName) continue;
    const norm = normalizedName(rate.roomName);
    if (!norm) continue;
    // The provider's own mapping wins; the name match covers rates without one.
    let room = rate.mappedRoomId ? byId.get(String(rate.mappedRoomId)) : undefined;
    if (!room) {
      room = matchMemo.get(norm);
      if (!matchMemo.has(norm)) {
        room = detail ? matchCatalogRoom(rate.roomName, detail.rooms) : undefined;
        matchMemo.set(norm, room);
      }
    }
    const key = room ? `catalog:${normalizedName(room.name)}` : `name:${norm}`;
    const bucket = buckets.get(key) ?? { rates: [], room };
    bucket.rates.push(rate);
    buckets.set(key, bucket);
  }
  const matchedUse = new Map<CatalogRoom, number>();
  const groups: RoomGroup[] = [];
  for (const [key, { rates: list, room }] of buckets) {
    const sorted = list.slice().sort((a, b) => a.total.amount - b.total.amount);
    const cheapest = sorted[0];
    const perKind = new Map<string, RoomRate>();
    for (const rate of sorted) {
      const kind = `${boardKey(rate)}|${rate.refundable ?? 'unknown'}`;
      if (!perKind.has(kind)) perKind.set(kind, rate);
    }
    const variants = [...perKind.values()].sort((a, b) => a.total.amount - b.total.amount);
    let photos: RoomGroup['photos'] = [];
    let photosSource: RoomGroup['photosSource'] = 'none';
    const similar = !room?.photos.length && detail ? similarCatalogRoom(cheapest.roomName, detail.rooms) : undefined;
    const source = room?.photos.length ? room : similar;
    if (source && source.photos.length) {
      const offset = matchedUse.get(source) ?? 0;
      matchedUse.set(source, offset + 1);
      photos = [...source.photos.slice(offset % source.photos.length), ...source.photos.slice(0, offset % source.photos.length)];
      photosSource = room?.photos.length ? 'matched' : 'similar';
    } else if (detail?.images.length) {
      photos = detail.images.slice(0, 3).map((i) => ({ url: i.url, caption: i.caption }));
      photosSource = 'hotel';
    }
    groups.push({
      key,
      name: room ? displayRoomName(room.name) : displayRoomName(cheapest.roomName),
      boardName: cheapest.boardName,
      boardType: cheapest.boardType,
      maxOccupancy: room?.maxOccupancy ?? cheapest.maxOccupancy,
      maxAdults: room?.maxAdults,
      maxChildren: room?.maxChildren,
      description: room?.description,
      bedTypes: room?.bedTypes ?? [],
      size: room?.size ? `${Math.round(room.size)} ${room.sizeUnit === 'm2' || room.sizeUnit === 'sqm' ? 'm²' : room.sizeUnit ?? 'sq ft'}` : undefined,
      amenities: room?.amenities ?? [],
      photos,
      photosSource,
      cheapest,
      variants,
      rateCount: list.length,
      refundableAvailable: list.some((v) => v.refundable === 'RFN'),
    });
  }
  groups.sort((a, b) => a.cheapest.total.amount - b.cheapest.total.amount || a.name.localeCompare(b.name));
  return groups;
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v ? v : undefined;
}
function money(v: unknown): LiveMoney | undefined {
  const m = v as { amount?: unknown; currency?: unknown } | null;
  return m && typeof m.amount === 'number' ? { amount: m.amount, currency: typeof m.currency === 'string' ? m.currency : 'USD' } : undefined;
}

export function mapRoomRate(raw: Record<string, unknown>): RoomRate | undefined {
  const total = money(raw.total);
  const nightly = money(raw.nightly);
  const roomName = str(raw.roomName);
  if (!total || !nightly || !roomName) return undefined;
  const ssp = raw.ssp as { amount?: unknown } | null | undefined;
  return {
    offerId: str(raw.offerId),
    rateId: str(raw.rateId),
    roomTypeId: str(raw.roomTypeId),
    mappedRoomId: typeof raw.mappedRoomId === 'number' ? String(raw.mappedRoomId) : str(raw.mappedRoomId),
    roomName,
    boardType: str(raw.boardType),
    boardName: str(raw.boardName),
    maxOccupancy: num(raw.maxOccupancy),
    adultCount: num(raw.adultCount),
    childCount: num(raw.childCount),
    refundable: raw.refundable === 'RFN' || raw.refundable === 'NRFN' ? raw.refundable : undefined,
    cancelBy: str(raw.cancelBy),
    total,
    nightly,
    nights: num(raw.nights) ?? 1,
    ssp: ssp && typeof ssp.amount === 'number' ? { amount: ssp.amount } : undefined,
    taxesAndFees: (Array.isArray(raw.taxesAndFees) ? raw.taxesAndFees : [])
      .map((t) => t as Record<string, unknown>)
      .filter((t) => typeof t.amount === 'number')
      .map((t) => ({ included: Boolean(t.included), description: str(t.description), amount: t.amount as number, currency: str(t.currency) ?? total.currency })),
    priceType: str(raw.priceType),
    perks: Array.isArray(raw.perks) ? raw.perks.map(String) : [],
    remarks: str(raw.remarks),
    paymentTypes: Array.isArray(raw.paymentTypes) ? raw.paymentTypes.map(String) : [],
  };
}

export function mapDetail(raw: Record<string, unknown> | null | undefined): HotelDetail | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const hotelId = str(raw.hotelId);
  if (!hotelId) return undefined;
  const images = (Array.isArray(raw.images) ? raw.images : []).map((i) => i as Record<string, unknown>).filter((i) => str(i.url)).map((i) => ({ url: String(i.url), caption: str(i.caption), isDefault: Boolean(i.isDefault) }));
  const rooms: CatalogRoom[] = (Array.isArray(raw.rooms) ? raw.rooms : [])
    .map((r) => r as Record<string, unknown>)
    .filter((r) => str(r.name))
    .map((r) => ({
      id: typeof r.id === 'number' || typeof r.id === 'string' ? r.id : undefined,
      name: String(r.name),
      description: str(r.description),
      childAllowed: typeof r.childAllowed === 'boolean' ? r.childAllowed : undefined,
      maxAdults: num(r.maxAdults),
      maxChildren: num(r.maxChildren),
      maxOccupancy: num(r.maxOccupancy),
      size: num(r.size),
      sizeUnit: str(r.sizeUnit),
      bedTypes: Array.isArray(r.bedTypes) ? r.bedTypes.map(String) : [],
      amenities: Array.isArray(r.amenities) ? r.amenities.map(String) : [],
      photos: (Array.isArray(r.photos) ? r.photos : []).map((p) => p as Record<string, unknown>).filter((p) => str(p.url)).map((p) => ({ url: String(p.url), caption: str(p.caption) })),
    }));
  return {
    hotelId,
    name: str(raw.name) ?? hotelId,
    description: str(raw.description),
    images,
    rooms,
    facilities: Array.isArray(raw.facilities) ? raw.facilities.map(String) : [],
    stars: num(raw.stars),
    rating: num(raw.rating),
    reviewCount: num(raw.reviewCount),
    address: str(raw.address),
    lat: num(raw.lat),
    lng: num(raw.lng),
    checkinTime: str(raw.checkinTime),
    checkoutTime: str(raw.checkoutTime),
  };
}
