/**
 * Room options for one hotel and one stay, grouped for display the way
 * KindredTrips does it: one card per (room name, board), the cheapest rate
 * on the card and the rest as variants, photos matched to the hotel's room
 * catalog by normalized name. Pure functions and types only, so the
 * `hotel-rooms` test can load this file without the Next.js alias; the
 * fetch lives in `src/lib/feeds/hotel-rooms.ts`.
 */

export interface LiveMoney {
  amount: number;
  currency: string;
}

export interface RoomRate {
  offerId?: string;
  rateId?: string;
  roomTypeId?: string;
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
  perks: string[];
  remarks?: string;
  paymentTypes: string[];
}

export interface CatalogRoom {
  id?: string | number;
  name: string;
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
  /** From the catalog room when matched. */
  bedTypes: string[];
  size?: string;
  amenities: string[];
  photos: { url: string; caption?: string }[];
  photosSource: 'matched' | 'hotel' | 'none';
  cheapest: RoomRate;
  variants: RoomRate[];
  refundableAvailable: boolean;
}

const STOP = new Set(['room', 'rooms', 'with', 'the', 'and', 'a', 'an', 'of', 'in', 'or', 'to', 'for', 'non', 'smoking', 'nonsmoking']);

/** Lowercase tokens with noise words removed, so "Deluxe King Room, Non Smoking" and "Deluxe King" match. */
export function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t && !STOP.has(t));
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

/** Exact normalized match first, then the best token overlap at 0.5 or above. */
export function matchCatalogRoom(name: string, rooms: CatalogRoom[]): CatalogRoom | undefined {
  const norm = normalizedName(name);
  const exact = rooms.find((r) => normalizedName(r.name) === norm);
  if (exact) return exact;
  const tokens = nameTokens(name);
  let best: { room: CatalogRoom; score: number } | undefined;
  for (const room of rooms) {
    const score = jaccard(tokens, nameTokens(room.name));
    if (score >= 0.5 && (!best || score > best.score)) best = { room, score };
  }
  return best?.room;
}

function boardKey(rate: RoomRate): string {
  return (rate.boardType ?? rate.boardName ?? 'RO').toLowerCase();
}

/**
 * One card per (room name, board). Groups are ordered by their cheapest
 * total; variants inside a group by total. Photos come from the matched
 * catalog room; when several groups share one catalog room the photo order
 * rotates so the first image differs; with no match the hotel gallery
 * stands in.
 */
export function groupRooms(rates: RoomRate[], detail?: Pick<HotelDetail, 'rooms' | 'images'>): RoomGroup[] {
  const byKey = new Map<string, RoomRate[]>();
  for (const rate of rates) {
    if (!rate.roomName) continue;
    const key = `${normalizedName(rate.roomName)}|${boardKey(rate)}`;
    byKey.set(key, [...(byKey.get(key) ?? []), rate]);
  }
  const matchedUse = new Map<CatalogRoom, number>();
  const groups: RoomGroup[] = [];
  for (const [key, list] of byKey) {
    const variants = list.slice().sort((a, b) => a.total.amount - b.total.amount);
    const cheapest = variants[0];
    const room = detail ? matchCatalogRoom(cheapest.roomName, detail.rooms) : undefined;
    let photos: RoomGroup['photos'] = [];
    let photosSource: RoomGroup['photosSource'] = 'none';
    if (room && room.photos.length) {
      const offset = matchedUse.get(room) ?? 0;
      matchedUse.set(room, offset + 1);
      photos = [...room.photos.slice(offset % room.photos.length), ...room.photos.slice(0, offset % room.photos.length)];
      photosSource = 'matched';
    } else if (detail?.images.length) {
      photos = detail.images.slice(0, 3).map((i) => ({ url: i.url, caption: i.caption }));
      photosSource = 'hotel';
    }
    groups.push({
      key,
      name: cheapest.roomName,
      boardName: cheapest.boardName,
      boardType: cheapest.boardType,
      maxOccupancy: cheapest.maxOccupancy ?? room?.maxOccupancy,
      bedTypes: room?.bedTypes ?? [],
      size: room?.size ? `${Math.round(room.size)} ${room.sizeUnit === 'm2' || room.sizeUnit === 'sqm' ? 'm²' : room.sizeUnit ?? 'sq ft'}` : undefined,
      amenities: room?.amenities ?? [],
      photos,
      photosSource,
      cheapest,
      variants,
      refundableAvailable: variants.some((v) => v.refundable === 'RFN'),
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
