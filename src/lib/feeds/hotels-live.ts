/**
 * NSVL server-side client for live hotel rates.
 *
 *   Next.js -> Supabase Edge Function `liteapi-live` -> LiteAPI (Nuitée)
 *
 * The function caches every provider response in Postgres, so repeated page
 * renders inside the TTL make no outbound call. Nothing here runs in the
 * browser and no provider key ever reaches this process.
 */

import { invokeEdgeFunction, isSupabaseConfigured } from '@/lib/supabase/server';
import type { LatLng } from '@/lib/geo';
import { inDavidsonCounty } from '@/lib/geo';

export const HOTELS_LIVE_REVALIDATE_SECONDS = 3600;

export interface LiveMoney {
  amount: number;
  currency: string;
}

/** One hotel with its cheapest rate for the searched dates. */
export interface LiveHotelRate {
  hotelId: string;
  name: string;
  lat: number;
  lng: number;
  stars?: number;
  rating?: number;
  reviewCount?: number;
  hotelTypeId?: number;
  hotelTypeName?: string;
  chainId?: number;
  chainSize?: number;
  facilities: string[];
  thumbnail?: string;
  address?: string;
  nightly: LiveMoney;
  total: LiveMoney;
  nights: number;
  /** Hotel's suggested selling price. Display floor only; never a ranking input. */
  ssp?: { amount: number };
  refundable?: 'RFN' | 'NRFN';
  boardName?: string;
  roomName?: string;
  maxOccupancy?: number;
  offerId?: string;
  fetchedAt: string;
  expiresAt: string;
  provider: 'liteapi';
}

export interface LiveRatesResult {
  configured: boolean;
  /** True when the provider (or its cache) answered, even with zero rates. */
  live: boolean;
  cached: boolean;
  rates: LiveHotelRate[];
  fetchedAt: string;
  expiresAt?: string;
  attribution?: string;
  canDisplayRating: boolean;
  environment?: string;
  error?: string;
  httpStatus?: number;
}

export interface AreaRatesParams {
  center: LatLng;
  radiusKm: number;
  checkin: string;
  checkout: string;
  adults?: number;
  children?: number[];
  rooms?: number;
  /** Explicit rooms; overrides adults/rooms. Used for whole-home searches. */
  occupancies?: { adults: number; children: number[] }[];
  /** Stable cache key such as a neighborhood slug. */
  areaKey?: string;
  campaign?: string;
}

export interface HotelRatesParams {
  hotelIds: string[];
  checkin: string;
  checkout: string;
  adults?: number;
  children?: number[];
  rooms?: number;
  campaign?: string;
}

type Envelope = {
  ok?: boolean;
  cached?: boolean;
  environment?: string;
  fetchedAt?: string;
  expiresAt?: string;
  attribution?: string | null;
  canDisplayRating?: boolean;
  rates?: Array<Record<string, unknown>>;
  error?: string;
};

const inFlight = new Map<string, Promise<LiveRatesResult>>();

function numOpt(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function strOpt(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function mapRate(raw: Record<string, unknown>): LiveHotelRate | null {
  const hotelId = strOpt(raw.hotelId);
  const name = strOpt(raw.name);
  const lat = numOpt(raw.lat);
  const lng = numOpt(raw.lng);
  const nightly = raw.nightly as LiveMoney | undefined;
  const total = raw.total as LiveMoney | undefined;
  if (!hotelId || !name || lat === undefined || lng === undefined || !nightly || !total) return null;
  if (!inDavidsonCounty({ lat, lng })) return null;
  const ssp = raw.ssp as { amount?: unknown } | null | undefined;
  return {
    hotelId,
    name,
    lat,
    lng,
    stars: numOpt(raw.stars),
    rating: numOpt(raw.rating),
    reviewCount: numOpt(raw.reviewCount),
    hotelTypeId: numOpt(raw.hotelTypeId),
    hotelTypeName: strOpt(raw.hotelTypeName),
    chainId: numOpt(raw.chainId),
    chainSize: numOpt(raw.chainSize),
    facilities: Array.isArray(raw.facilities) ? raw.facilities.map(String) : [],
    thumbnail: strOpt(raw.thumbnail),
    address: strOpt(raw.address),
    nightly: { amount: Number(nightly.amount), currency: nightly.currency || 'USD' },
    total: { amount: Number(total.amount), currency: total.currency || 'USD' },
    nights: numOpt(raw.nights) ?? 1,
    ssp: ssp && typeof ssp.amount === 'number' ? { amount: ssp.amount } : undefined,
    refundable: raw.refundable === 'RFN' || raw.refundable === 'NRFN' ? raw.refundable : undefined,
    boardName: strOpt(raw.boardName),
    roomName: strOpt(raw.roomName),
    maxOccupancy: numOpt(raw.maxOccupancy),
    offerId: strOpt(raw.offerId),
    fetchedAt: strOpt(raw.fetchedAt) ?? new Date().toISOString(),
    expiresAt: strOpt(raw.expiresAt) ?? new Date().toISOString(),
    provider: 'liteapi',
  };
}

async function invokeRates(key: string, body: Record<string, unknown>): Promise<LiveRatesResult> {
  const fetchedAt = new Date().toISOString();
  if (!isSupabaseConfigured()) {
    return { configured: false, live: false, cached: false, rates: [], fetchedAt, canDisplayRating: false, error: 'Supabase service role not configured', httpStatus: 503 };
  }
  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<LiveRatesResult> => {
    const result = await invokeEdgeFunction<Envelope>('liteapi-live', body, { timeoutMs: 45_000 });
    const data = result.data;
    if (!result.ok || !data?.ok) {
      return {
        configured: true,
        live: false,
        cached: false,
        rates: [],
        fetchedAt,
        canDisplayRating: false,
        environment: data?.environment,
        error: typeof data?.error === 'string' ? data.error : `liteapi-live ${String(body.mode)} failed (${result.status})`,
        httpStatus: result.status,
      };
    }
    const rates = (data.rates ?? []).map(mapRate).filter((r): r is LiveHotelRate => Boolean(r));
    return {
      configured: true,
      live: true,
      cached: Boolean(data.cached),
      rates,
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

export function isHotelsLiveConfigured(): boolean {
  return isSupabaseConfigured();
}

/** Every hotel with a rate inside a circle, for one set of dates and occupancy. */
export async function getAreaRates(params: AreaRatesParams): Promise<LiveRatesResult> {
  const body = {
    mode: 'area_rates',
    lat: params.center.lat,
    lng: params.center.lng,
    // The provider's floor is 1 km; small neighborhoods still rank by their own center.
    radiusKm: Math.max(1, params.radiusKm),
    checkin: params.checkin,
    checkout: params.checkout,
    adults: params.adults,
    children: params.children,
    rooms: params.rooms,
    occupancies: params.occupancies,
    areaKey: params.areaKey,
    campaign: params.campaign ?? 'hotels-marketplace',
  };
  return invokeRates(JSON.stringify(body), body);
}

/** Rates for specific hotels, used for the editorial 14 and detail pages. */
export async function getHotelRates(params: HotelRatesParams): Promise<LiveRatesResult> {
  const hotelIds = [...new Set(params.hotelIds.filter(Boolean))].sort();
  if (!hotelIds.length) {
    return { configured: isSupabaseConfigured(), live: false, cached: false, rates: [], fetchedAt: new Date().toISOString(), canDisplayRating: false, error: 'no hotel ids' };
  }
  const body = {
    mode: 'hotel_rates',
    hotelIds,
    checkin: params.checkin,
    checkout: params.checkout,
    adults: params.adults,
    children: params.children,
    rooms: params.rooms,
    campaign: params.campaign ?? 'hotels-editorial',
  };
  return invokeRates(JSON.stringify(body), body);
}

export function formatNightly(money: LiveMoney): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: money.currency, maximumFractionDigits: 0 }).format(money.amount);
}
