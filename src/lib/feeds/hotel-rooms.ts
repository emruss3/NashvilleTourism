import { invokeEdgeFunction, isSupabaseConfigured } from '@/lib/supabase/server';
import { groupRooms, mapDetail, mapRoomRate, type HotelDetail, type RoomGroup, type RoomRate } from '@/lib/hotel-rooms';
import { mapReviews, type HotelReviews } from '@/lib/hotel-reviews';

/**
 * Server-side fetch of room options for one hotel and one stay.
 *
 *   Next.js -> Supabase Edge Function `liteapi-live` (mode hotel_rooms) -> LiteAPI
 *
 * The edge function returns every rate of every room type flat plus the
 * hotel detail (room catalog and photos), cached an hour per hotel, dates
 * and party; grouping happens here with `src/lib/hotel-rooms.ts`. Nothing
 * runs in the browser and no provider key reaches this process.
 */

export interface HotelRoomsResult {
  configured: boolean;
  live: boolean;
  cached: boolean;
  hotelId: string;
  detail?: HotelDetail;
  groups: RoomGroup[];
  rateCount: number;
  fetchedAt: string;
  expiresAt?: string;
  attribution?: string;
  canDisplayRating: boolean;
  environment?: string;
  error?: string;
  httpStatus?: number;
}

export interface HotelRoomsParams {
  hotelId: string;
  checkin: string;
  checkout: string;
  adults?: number;
  children?: number[];
  rooms?: number;
  campaign?: string;
}

type Envelope = { ok?: boolean; cached?: boolean; environment?: string; fetchedAt?: string; expiresAt?: string; attribution?: string | null; canDisplayRating?: boolean; rates?: Array<Record<string, unknown>>; detail?: Record<string, unknown> | null; error?: string };

const inFlight = new Map<string, Promise<HotelRoomsResult>>();

/** Every room option for one hotel and stay, grouped for display. */
export async function getHotelRooms(params: HotelRoomsParams): Promise<HotelRoomsResult> {
  const fetchedAt = new Date().toISOString();
  const base = { configured: isSupabaseConfigured(), live: false, cached: false, hotelId: params.hotelId, groups: [] as RoomGroup[], rateCount: 0, fetchedAt, canDisplayRating: false };
  if (!isSupabaseConfigured()) return { ...base, error: 'Supabase service role not configured', httpStatus: 503 };
  const body = { mode: 'hotel_rooms', hotelId: params.hotelId, checkin: params.checkin, checkout: params.checkout, adults: params.adults, children: params.children, rooms: params.rooms, campaign: params.campaign ?? 'hotels-rooms' };
  const key = JSON.stringify(body);
  const existing = inFlight.get(key);
  if (existing) return existing;
  const promise = (async (): Promise<HotelRoomsResult> => {
    const result = await invokeEdgeFunction<Envelope>('liteapi-live', body, { timeoutMs: 45_000 });
    const data = result.data;
    if (!result.ok || !data?.ok) {
      return { ...base, environment: data?.environment, error: typeof data?.error === 'string' ? data.error : `liteapi-live hotel_rooms failed (${result.status})`, httpStatus: result.status };
    }
    const rates = (data.rates ?? []).map(mapRoomRate).filter((r): r is RoomRate => Boolean(r));
    const detail = mapDetail(data.detail);
    return {
      ...base,
      live: true,
      cached: Boolean(data.cached),
      detail,
      groups: groupRooms(rates, detail),
      rateCount: rates.length,
      fetchedAt: data.fetchedAt ?? fetchedAt,
      expiresAt: data.expiresAt,
      attribution: data.attribution ?? undefined,
      canDisplayRating: Boolean(data.canDisplayRating),
      environment: data.environment,
      httpStatus: 200,
    };
  })();
  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

/** Hotel detail alone (name, photos, facilities, room catalog); a week in cache. */
export async function getHotelDetail(hotelId: string): Promise<{ detail?: HotelDetail; environment?: string; attribution?: string; error?: string }> {
  if (!isSupabaseConfigured()) return { error: 'Supabase service role not configured' };
  const result = await invokeEdgeFunction<Envelope>('liteapi-live', { mode: 'hotel_detail', hotelId }, { timeoutMs: 30_000 });
  const data = result.data;
  if (!result.ok || !data?.ok) return { environment: data?.environment, error: typeof data?.error === 'string' ? data.error : `liteapi-live hotel_detail failed (${result.status})` };
  return { detail: mapDetail(data.detail), environment: data.environment, attribution: data.attribution ?? undefined };
}

type ReviewsEnvelope = { ok?: boolean; cached?: boolean; environment?: string; fetchedAt?: string; attribution?: string | null; canDisplayRating?: boolean; error?: string } & Record<string, unknown>;

/** Guest reviews and the provider's sentiment summary; a week in cache. Display gated by `canDisplayRating`. */
export async function getHotelReviews(hotelId: string): Promise<{ reviews?: HotelReviews; canDisplayRating: boolean; environment?: string; attribution?: string; error?: string }> {
  if (!isSupabaseConfigured()) return { canDisplayRating: false, error: 'Supabase service role not configured' };
  const result = await invokeEdgeFunction<ReviewsEnvelope>('liteapi-live', { mode: 'hotel_reviews', hotelId }, { timeoutMs: 30_000 });
  const data = result.data;
  if (!result.ok || !data?.ok) return { canDisplayRating: false, environment: data?.environment, error: typeof data?.error === 'string' ? data.error : `liteapi-live hotel_reviews failed (${result.status})` };
  return { reviews: mapReviews(data), canDisplayRating: Boolean(data.canDisplayRating), environment: data.environment, attribution: data.attribution ?? undefined };
}
