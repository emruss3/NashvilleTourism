import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * NSVL -> LiteAPI (Nuitée) boundary for the hotel marketplace.
 *
 * Allowed provider calls from this function:
 * - POST /hotels/rates            live rates for an area (lat/lng/radius) or a
 *                                 list of hotel ids; includeHotelData, one
 *                                 rate per hotel
 * - GET  /data/hotel?hotelId=     display-only detail (images, facilities)
 * - GET  /data/hotels             weekly catalog by coordinates (cron only)
 * - GET  /data/facilities, /data/hoteltypes   lookups (cron only)
 *
 * Explicitly NOT used: /rates/prebook, /rates/book, anything under
 * /bookings, /data/places (billable), cityName searches. Checkout belongs to
 * the white-label booking site.
 *
 * Every provider response is cached in Postgres (hotel_rate_cache /
 * hotel_catalog_cache) and every outbound call is logged to ingestion_runs.
 * Cache hits are not logged, so "zero outbound calls inside the TTL" can be
 * asserted from that table.
 *
 * Auth: the Supabase service key (apikey header) unlocks everything. The
 * cron token (NASHROAM_CRON_TOKEN, mirrored in Vault as nashroam_cron_token
 * and only readable by database admins) is equivalent, so pg_cron and SQL
 * smoke tests work without the service key. The probe token unlocks health
 * only.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://aeomrsutkhwmnscvvfur.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const LITEAPI_BASE = "https://api.liteapi.travel/v3.0";
const LITEAPI_ENV = (Deno.env.get("LITEAPI_ENV") ?? "production").toLowerCase() === "sandbox" ? "sandbox" : "production";
const LITEAPI_KEY = LITEAPI_ENV === "sandbox"
  ? Deno.env.get("LITEAPI_SANDBOX_KEY") ?? ""
  : Deno.env.get("LITEAPI_PRODUCTION_API_KEY") ?? Deno.env.get("LITEAPI_SANDBOX_KEY") ?? "";
const PROBE_TOKEN = Deno.env.get("LITEAPI_PROBE_TOKEN") ?? "";
const CRON_TOKEN = Deno.env.get("NASHROAM_CRON_TOKEN") ?? "";

const API_TIMEOUT_MS = 120_000;
const PROVIDER_TIMEOUT_SECONDS = 18;
const DEFAULT_TTL_MINUTES = 180;
const DETAIL_TTL_MINUTES = 7 * 24 * 60;
const CATALOG_TTL_MINUTES = 8 * 24 * 60;
const MAX_RATE_ROWS = 400;

/** Davidson County, TN. Anything outside is dropped before it reaches a page. */
const DAVIDSON = { minLat: 35.97, maxLat: 36.41, minLng: -87.06, maxLng: -86.52 };
const NASHVILLE_CENTER = { lat: 36.1627, lng: -86.7816 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hasServiceAccess(req: Request): Promise<boolean> {
  const apiKey = req.headers.get("apikey")?.trim() ?? "";
  if (!apiKey) return false;
  const headers = new Headers({ apikey: apiKey, Accept: "application/json" });
  if (apiKey.startsWith("eyJ")) headers.set("Authorization", `Bearer ${apiKey}`);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/data_sources?select=id&limit=1`, { method: "GET", headers, cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

function hasProbeAccess(req: Request): boolean {
  return timingSafeEqual(req.headers.get("x-probe-token")?.trim() ?? "", PROBE_TOKEN);
}

function hasCronAccess(req: Request): boolean {
  return timingSafeEqual(req.headers.get("x-nashroam-cron-token")?.trim() ?? "", CRON_TOKEN);
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function isoDay(value: unknown): string | null {
  return typeof value === "string" && ISO_DAY.test(value) ? value : null;
}

function nightsBetween(checkin: string, checkout: string): number {
  return Math.round((Date.parse(`${checkout}T00:00:00Z`) - Date.parse(`${checkin}T00:00:00Z`)) / 86_400_000);
}

function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function inDavidson(lat: number, lng: number): boolean {
  return lat >= DAVIDSON.minLat && lat <= DAVIDSON.maxLat && lng >= DAVIDSON.minLng && lng <= DAVIDSON.maxLng;
}

function hashKey(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

type Occupancy = { adults: number; children: number[] };

function normalizeOccupancies(body: Record<string, unknown>): Occupancy[] {
  if (Array.isArray(body.occupancies) && body.occupancies.length) {
    const rooms = body.occupancies
      .map((room: any) => ({
        adults: Math.min(Math.max(Math.trunc(num(room?.adults) ?? 2), 1), 20),
        children: Array.isArray(room?.children) ? room.children.map((age: unknown) => Math.trunc(num(age) ?? 0)).filter((age: number) => age >= 0 && age <= 17) : [],
      }))
      .slice(0, 8);
    if (rooms.length) return rooms;
  }
  const adults = Math.min(Math.max(Math.trunc(num(body.adults) ?? 2), 1), 20);
  const children = Array.isArray(body.children) ? body.children.map((age: unknown) => Math.trunc(num(age) ?? 0)).filter((age: number) => age >= 0 && age <= 17) : [];
  const wanted = num(body.rooms) ? Math.trunc(num(body.rooms)!) : adults <= 4 ? 1 : Math.ceil(adults / 2);
  const rooms = Math.min(Math.max(wanted, 1), adults);
  const base = Math.floor(adults / rooms);
  const extra = adults % rooms;
  return Array.from({ length: rooms }, (_, i) => ({ adults: base + (i < extra ? 1 : 0), children: i === 0 ? children : [] }));
}

function occupancyKey(occupancies: Occupancy[]): string {
  return occupancies.map((room) => `${room.adults}${room.children.length ? `+${room.children.join(".")}` : ""}`).join("|");
}

// ---------------------------------------------------------------------------
// Supabase REST (service role)
// ---------------------------------------------------------------------------

function restHeaders(extra: Record<string, string> = {}): Headers {
  const headers = new Headers({ apikey: SERVICE_KEY, Accept: "application/json", "Content-Type": "application/json", ...extra });
  if (SERVICE_KEY.startsWith("eyJ")) headers.set("Authorization", `Bearer ${SERVICE_KEY}`);
  return headers;
}

async function restSelect<T = any>(path: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: restHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`rest select ${path} -> ${res.status}`);
  return (await res.json()) as T[];
}

async function restUpsert(table: string, rows: unknown[], onConflict: string): Promise<void> {
  if (!rows.length) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: restHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`rest upsert ${table} -> ${res.status} ${(await res.text()).slice(0, 200)}`);
}

async function restInsert(table: string, row: unknown): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: restHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`rest insert ${table} -> ${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

async function restPatch(table: string, filter: string, patch: unknown): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: restHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`rest patch ${table} -> ${res.status}`);
}

type Source = { id: string; default_ttl_minutes: number | null; attribution_text: string | null; can_display_rating: boolean | null; active: boolean };

let sourceCache: Source | null = null;
async function liteapiSource(): Promise<Source> {
  if (sourceCache) return sourceCache;
  const rows = await restSelect<Source>("data_sources?select=id,default_ttl_minutes,attribution_text,can_display_rating,active&provider_key=eq.liteapi&limit=1");
  if (!rows.length) throw new Error("data_sources row for liteapi is missing; apply the marketplace migration");
  sourceCache = rows[0];
  return sourceCache;
}

async function logRun(source: Source, jobType: string, meta: Record<string, unknown>): Promise<string | null> {
  try {
    const row = await restInsert("ingestion_runs", {
      source_id: source.id,
      job_type: jobType,
      started_at: new Date().toISOString(),
      status: "running",
      metadata: { environment: LITEAPI_ENV, ...meta },
    });
    return row?.id ?? null;
  } catch {
    return null;
  }
}

// ingestion_runs.status is constrained to running | succeeded | partial | failed.
async function finishRun(id: string | null, status: "succeeded" | "failed", patch: Record<string, unknown>): Promise<void> {
  if (!id) return;
  try {
    await restPatch("ingestion_runs", `id=eq.${id}`, { completed_at: new Date().toISOString(), status, ...patch });
  } catch {
    // Logging must never fail the request.
  }
}

// ---------------------------------------------------------------------------
// LiteAPI transport: serialized, spaced, retried
// ---------------------------------------------------------------------------

type ProviderResponse = { ok: boolean; status: number; data: any; requestId: string | null; retryAfter: string | null; ms: number };

const MAX_CONCURRENT = 3;
const SPACING_MS = LITEAPI_ENV === "sandbox" ? 400 : 150;
let active = 0;
let lastStart = 0;
const waiters: Array<() => void> = [];

async function acquire(): Promise<void> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiters.push(resolve));
  active += 1;
  const wait = lastStart + SPACING_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastStart = Date.now();
}

function release(): void {
  active -= 1;
  waiters.shift()?.();
}

async function liteapiFetch(path: string, init: RequestInit = {}): Promise<ProviderResponse> {
  if (!LITEAPI_KEY) {
    return { ok: false, status: 503, data: { error: `LiteAPI ${LITEAPI_ENV} key is not configured in Supabase` }, requestId: null, retryAfter: null, ms: 0 };
  }
  let last: ProviderResponse | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await acquire();
    const started = Date.now();
    try {
      const headers = new Headers(init.headers);
      headers.set("X-API-Key", LITEAPI_KEY);
      headers.set("Accept", "application/json");
      if (init.body) headers.set("Content-Type", "application/json");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(`${LITEAPI_BASE}${path}`, { ...init, headers, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text.slice(0, 500) };
      }
      last = { ok: res.ok, status: res.status, data, requestId: res.headers.get("x-request-id"), retryAfter: res.headers.get("retry-after"), ms: Date.now() - started };
    } catch (error) {
      last = { ok: false, status: 0, data: { error: String(error) }, requestId: null, retryAfter: null, ms: Date.now() - started };
    } finally {
      release();
    }
    if (last.ok || ![0, 429, 500, 502, 503, 504].includes(last.status)) return last;
    const retrySeconds = Number(last.retryAfter);
    await sleep(Number.isFinite(retrySeconds) && retrySeconds > 0 ? Math.min(retrySeconds * 1000, 5000) : 700 * (attempt + 1));
  }
  return last!;
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

type Money = { amount: number; currency: string };

type NormalizedRate = {
  hotelId: string;
  name: string;
  lat: number | null;
  lng: number | null;
  stars: number | null;
  rating: number | null;
  reviewCount: number | null;
  hotelTypeId: number | null;
  hotelTypeName: string | null;
  chainId: number | null;
  chainSize: number | null;
  facilities: string[];
  thumbnail: string | null;
  address: string | null;
  nightly: Money;
  total: Money;
  nights: number;
  ssp: { amount: number } | null;
  refundable: "RFN" | "NRFN" | null;
  boardName: string | null;
  roomName: string | null;
  maxOccupancy: number | null;
  offerId: string | null;
  fetchedAt: string;
  expiresAt: string;
  provider: "liteapi";
};

type CatalogRow = { lite_id: string; name: string; lat: number; lng: number; stars: number | null; rating: number | null; review_count: number | null; hotel_type_id: number | null; chain_id: number | null; facility_ids: number[]; thumbnail: string | null; address: string | null };

type Lookups = { facilities: Map<number, string>; hotelTypes: Map<number, string>; chainSizes: Map<number, number>; catalog: Map<string, CatalogRow> };

let lookupsCache: { at: number; value: Lookups } | null = null;

async function loadLookups(): Promise<Lookups> {
  if (lookupsCache && Date.now() - lookupsCache.at < 10 * 60_000) return lookupsCache.value;
  const [facilities, hotelTypes, catalog] = await Promise.all([
    restSelect<{ id: number; name: string }>("lookup_liteapi_facilities?select=id,name"),
    restSelect<{ id: number; name: string }>("lookup_liteapi_hotel_types?select=id,name"),
    restSelect<CatalogRow>("hotel_catalog_cache?select=lite_id,name,lat,lng,stars,rating,review_count,hotel_type_id,chain_id,facility_ids,thumbnail,address&deleted_at=is.null&limit=5000"),
  ]);
  const chainSizes = new Map<number, number>();
  for (const row of catalog) if (row.chain_id != null) chainSizes.set(row.chain_id, (chainSizes.get(row.chain_id) ?? 0) + 1);
  const value: Lookups = {
    facilities: new Map(facilities.map((f) => [f.id, f.name])),
    hotelTypes: new Map(hotelTypes.map((t) => [t.id, t.name])),
    chainSizes,
    catalog: new Map(catalog.map((row) => [row.lite_id, row])),
  };
  lookupsCache = { at: Date.now(), value };
  return value;
}

function money(entry: any, fallbackCurrency = "USD"): Money | null {
  const first = Array.isArray(entry) ? entry[0] : entry;
  const amount = num(first?.amount);
  if (amount == null) return null;
  return { amount: Math.round(amount * 100) / 100, currency: typeof first?.currency === "string" ? first.currency : fallbackCurrency };
}

function cheapestRate(hotel: any): { rate: any; roomType: any } | null {
  let best: { rate: any; roomType: any; amount: number } | null = null;
  for (const roomType of Array.isArray(hotel?.roomTypes) ? hotel.roomTypes : []) {
    for (const rate of Array.isArray(roomType?.rates) ? roomType.rates : []) {
      const total = money(rate?.retailRate?.total);
      if (!total) continue;
      if (!best || total.amount < best.amount) best = { rate, roomType, amount: total.amount };
    }
  }
  return best ? { rate: best.rate, roomType: best.roomType } : null;
}

function normalizeRates(data: any, checkin: string, checkout: string, lookups: Lookups, fetchedAt: string, expiresAt: string): NormalizedRate[] {
  const nights = Math.max(nightsBetween(checkin, checkout), 1);
  const hotelData = new Map<string, any>();
  for (const hotel of Array.isArray(data?.hotels) ? data.hotels : []) {
    const id = typeof hotel?.id === "string" ? hotel.id : typeof hotel?.hotelId === "string" ? hotel.hotelId : null;
    if (id) hotelData.set(id, hotel);
  }
  const rows: NormalizedRate[] = [];
  for (const entry of Array.isArray(data?.data) ? data.data : []) {
    const hotelId = typeof entry?.hotelId === "string" ? entry.hotelId : null;
    if (!hotelId) continue;
    const best = cheapestRate(entry);
    if (!best) continue;
    const total = money(best.rate?.retailRate?.total)!;
    const info = hotelData.get(hotelId) ?? {};
    const catalog = lookups.catalog.get(hotelId);
    const lat = num(info.latitude) ?? catalog?.lat ?? null;
    const lng = num(info.longitude) ?? catalog?.lng ?? null;
    if (lat == null || lng == null || !inDavidson(lat, lng)) continue;
    const hotelTypeId = num(info.hotelTypeId) ?? catalog?.hotel_type_id ?? null;
    const chainId = num(info.chainId) ?? catalog?.chain_id ?? null;
    const facilityIds: number[] = Array.isArray(info.facilityIds) ? info.facilityIds.map(Number) : catalog?.facility_ids ?? [];
    const refundableTag = best.rate?.cancellationPolicies?.refundableTag;
    const ssp = money(best.rate?.retailRate?.suggestedSellingPrice);
    rows.push({
      hotelId,
      name: typeof info.name === "string" && info.name ? info.name : catalog?.name ?? hotelId,
      lat,
      lng,
      stars: num(info.stars) ?? num(info.starRating) ?? catalog?.stars ?? null,
      rating: num(info.rating) ?? catalog?.rating ?? null,
      reviewCount: num(info.reviewCount) ?? catalog?.review_count ?? null,
      hotelTypeId,
      hotelTypeName: hotelTypeId != null ? lookups.hotelTypes.get(hotelTypeId) ?? null : null,
      chainId,
      chainSize: chainId != null ? lookups.chainSizes.get(chainId) ?? null : null,
      facilities: facilityIds.map((id) => lookups.facilities.get(id)).filter((name): name is string => Boolean(name)),
      thumbnail: typeof info.thumbnail === "string" ? info.thumbnail : typeof info.main_photo === "string" ? info.main_photo : catalog?.thumbnail ?? null,
      address: typeof info.address === "string" ? info.address : catalog?.address ?? null,
      nightly: { amount: Math.round((total.amount / nights) * 100) / 100, currency: total.currency },
      total,
      nights,
      ssp: ssp ? { amount: ssp.amount } : null,
      refundable: refundableTag === "RFN" || refundableTag === "NRFN" ? refundableTag : null,
      boardName: typeof best.rate?.boardName === "string" ? best.rate.boardName : null,
      roomName: typeof best.rate?.name === "string" ? best.rate.name : null,
      maxOccupancy: num(best.rate?.maxOccupancy),
      offerId: typeof best.roomType?.offerId === "string" ? best.roomType.offerId : typeof best.rate?.offerId === "string" ? best.rate.offerId : null,
      fetchedAt,
      expiresAt,
      provider: "liteapi",
    });
    if (rows.length >= MAX_RATE_ROWS) break;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

type RatesRequest = {
  areaKey: string;
  checkin: string;
  checkout: string;
  occupancies: Occupancy[];
  providerBody: Record<string, unknown>;
  jobType: string;
};

async function serveRates(req: RatesRequest, campaign: string): Promise<Response> {
  const source = await liteapiSource();
  const ttlMinutes = source.default_ttl_minutes ?? DEFAULT_TTL_MINUTES;
  const occKey = occupancyKey(req.occupancies);
  const cached = await restSelect<{ payload: any; fetched_at: string; expires_at: string }>(
    `hotel_rate_cache?select=payload,fetched_at,expires_at&area_key=eq.${encodeURIComponent(req.areaKey)}&checkin=eq.${req.checkin}&checkout=eq.${req.checkout}&occupancy_key=eq.${encodeURIComponent(occKey)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&limit=1`,
  );
  if (cached.length) {
    return json({ ok: true, cached: true, environment: LITEAPI_ENV, areaKey: req.areaKey, fetchedAt: cached[0].fetched_at, expiresAt: cached[0].expires_at, attribution: source.attribution_text, canDisplayRating: source.can_display_rating ?? false, rates: cached[0].payload });
  }

  const runId = await logRun(source, req.jobType, { areaKey: req.areaKey, checkin: req.checkin, checkout: req.checkout, occupancyKey: occKey, campaign });
  const res = await liteapiFetch("/hotels/rates", {
    method: "POST",
    body: JSON.stringify({
      ...req.providerBody,
      checkin: req.checkin,
      checkout: req.checkout,
      occupancies: req.occupancies,
      currency: "USD",
      guestNationality: "US",
      includeHotelData: true,
      maxRatesPerHotel: 1,
      timeout: PROVIDER_TIMEOUT_SECONDS,
    }),
  });
  if (!res.ok) {
    await finishRun(runId, "failed", { error_message: `HTTP ${res.status}`, metadata: { environment: LITEAPI_ENV, status: res.status, ms: res.ms, requestId: res.requestId, providerError: res.data?.error ?? null } });
    return json({ ok: false, environment: LITEAPI_ENV, error: typeof res.data?.error?.description === "string" ? res.data.error.description : typeof res.data?.error === "string" ? res.data.error : `LiteAPI /hotels/rates failed (${res.status})`, status: res.status }, res.status === 0 ? 502 : res.status === 429 ? 429 : 502);
  }

  const fetchedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  const lookups = await loadLookups();
  const rates = normalizeRates(res.data, req.checkin, req.checkout, lookups, fetchedAt, expiresAt);
  try {
    await restUpsert("hotel_rate_cache", [{ area_key: req.areaKey, checkin: req.checkin, checkout: req.checkout, occupancy_key: occKey, payload: rates, fetched_at: fetchedAt, expires_at: expiresAt, source_id: source.id }], "area_key,checkin,checkout,occupancy_key");
  } catch (error) {
    await finishRun(runId, "failed", { records_fetched: rates.length, error_message: `cache write failed: ${String(error).slice(0, 200)}` });
    return json({ ok: true, cached: false, environment: LITEAPI_ENV, areaKey: req.areaKey, fetchedAt, expiresAt, attribution: source.attribution_text, canDisplayRating: source.can_display_rating ?? false, rates, warning: "cache write failed" });
  }
  await finishRun(runId, "succeeded", { records_fetched: Array.isArray(res.data?.data) ? res.data.data.length : rates.length, records_upserted: rates.length, metadata: { environment: LITEAPI_ENV, status: res.status, ms: res.ms, requestId: res.requestId, areaKey: req.areaKey, campaign } });
  return json({ ok: true, cached: false, environment: LITEAPI_ENV, areaKey: req.areaKey, fetchedAt, expiresAt, attribution: source.attribution_text, canDisplayRating: source.can_display_rating ?? false, rates });
}

async function modeAreaRates(body: Record<string, unknown>): Promise<Response> {
  const lat = num(body.lat);
  const lng = num(body.lng);
  // LiteAPI rejects a radius under 1000 m ("radius should be above 1000m").
  const radiusKm = Math.min(Math.max(num(body.radiusKm) ?? 2, 1), 30);
  const checkin = isoDay(body.checkin);
  const checkout = isoDay(body.checkout);
  if (lat == null || lng == null || !inDavidson(lat, lng)) return json({ ok: false, error: "lat/lng inside Davidson County required" }, 400);
  if (!checkin || !checkout || checkout <= checkin) return json({ ok: false, error: "checkin/checkout (YYYY-MM-DD, checkout after checkin) required" }, 400);
  const occupancies = normalizeOccupancies(body);
  const areaKey = typeof body.areaKey === "string" && /^[a-z0-9-]{2,40}$/.test(body.areaKey)
    ? body.areaKey
    : `geo:${lat.toFixed(4)}:${lng.toFixed(4)}:${radiusKm}`;
  return serveRates(
    { areaKey, checkin, checkout, occupancies, providerBody: { latitude: lat, longitude: lng, radius: Math.round(radiusKm * 1000) }, jobType: "liteapi_area_rates" },
    typeof body.campaign === "string" ? body.campaign : "hotels-marketplace",
  );
}

async function modeHotelRates(body: Record<string, unknown>): Promise<Response> {
  const ids = Array.isArray(body.hotelIds) ? [...new Set(body.hotelIds.map(String).filter((id) => /^lp[a-z0-9]{3,16}$/.test(id)))].sort() : [];
  const checkin = isoDay(body.checkin);
  const checkout = isoDay(body.checkout);
  if (!ids.length || ids.length > 50) return json({ ok: false, error: "hotelIds (1-50 LiteAPI ids) required" }, 400);
  if (!checkin || !checkout || checkout <= checkin) return json({ ok: false, error: "checkin/checkout (YYYY-MM-DD, checkout after checkin) required" }, 400);
  const occupancies = normalizeOccupancies(body);
  return serveRates(
    { areaKey: `ids:${hashKey(ids.join(","))}`, checkin, checkout, occupancies, providerBody: { hotelIds: ids }, jobType: "liteapi_hotel_rates" },
    typeof body.campaign === "string" ? body.campaign : "hotels-editorial",
  );
}

async function modeHotelDetail(body: Record<string, unknown>): Promise<Response> {
  const hotelId = typeof body.hotelId === "string" && /^lp[a-z0-9]{3,16}$/.test(body.hotelId) ? body.hotelId : null;
  if (!hotelId) return json({ ok: false, error: "hotelId required" }, 400);
  const source = await liteapiSource();
  const areaKey = `detail:${hotelId}`;
  const cached = await restSelect<{ payload: any; fetched_at: string; expires_at: string }>(
    `hotel_rate_cache?select=payload,fetched_at,expires_at&area_key=eq.${areaKey}&checkin=eq.2000-01-01&checkout=eq.2000-01-02&occupancy_key=eq.detail&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&limit=1`,
  );
  if (cached.length) return json({ ok: true, cached: true, environment: LITEAPI_ENV, fetchedAt: cached[0].fetched_at, attribution: source.attribution_text, detail: cached[0].payload });

  const runId = await logRun(source, "liteapi_hotel_detail", { hotelId });
  const res = await liteapiFetch(`/data/hotel?hotelId=${encodeURIComponent(hotelId)}`);
  if (!res.ok) {
    await finishRun(runId, "failed", { error_message: `HTTP ${res.status}` });
    return json({ ok: false, environment: LITEAPI_ENV, error: `LiteAPI /data/hotel failed (${res.status})` }, 502);
  }
  const d = res.data?.data ?? {};
  const images = (Array.isArray(d.hotelImages) ? d.hotelImages : [])
    .map((image: any) => ({ url: typeof image?.urlHd === "string" ? image.urlHd : typeof image?.url === "string" ? image.url : null, caption: typeof image?.caption === "string" ? image.caption : null, isDefault: Boolean(image?.defaultImage) }))
    .filter((image: any) => image.url)
    .slice(0, 12);
  const detail = {
    hotelId,
    name: typeof d.name === "string" ? d.name : hotelId,
    description: typeof d.hotelDescription === "string" ? d.hotelDescription.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1200) : null,
    images,
    facilities: (Array.isArray(d.hotelFacilities) ? d.hotelFacilities : Array.isArray(d.facilities) ? d.facilities.map((f: any) => f?.name) : []).filter((f: unknown) => typeof f === "string").slice(0, 40),
    stars: num(d.starRating) ?? num(d.stars),
    rating: num(d.rating),
    reviewCount: num(d.reviewCount),
    address: typeof d.address === "string" ? d.address : null,
    lat: num(d.latitude),
    lng: num(d.longitude),
    checkinTime: typeof d.checkinCheckoutTimes?.checkin === "string" ? d.checkinCheckoutTimes.checkin : null,
    checkoutTime: typeof d.checkinCheckoutTimes?.checkout === "string" ? d.checkinCheckoutTimes.checkout : null,
  };
  const fetchedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + DETAIL_TTL_MINUTES * 60_000).toISOString();
  try {
    await restUpsert("hotel_rate_cache", [{ area_key: areaKey, checkin: "2000-01-01", checkout: "2000-01-02", occupancy_key: "detail", payload: detail, fetched_at: fetchedAt, expires_at: expiresAt, source_id: source.id }], "area_key,checkin,checkout,occupancy_key");
  } catch {
    // Serve uncached.
  }
  await finishRun(runId, "succeeded", { records_fetched: 1, records_upserted: 1, metadata: { environment: LITEAPI_ENV, ms: res.ms, hotelId } });
  return json({ ok: true, cached: false, environment: LITEAPI_ENV, fetchedAt, attribution: source.attribution_text, detail });
}

/**
 * LiteAPI's lookup endpoints have not kept one field naming: facilities use
 * `facility_id`/`facility`, hotel types have shipped as `hotel_type_id`/
 * `hotel_type`, `hotelTypeId`/`hotelType`, `id`/`name`, and as an object map.
 * Pick the first integer-like field as the id and the first string field
 * that is not the id as the name, so a rename upstream degrades to "still
 * works" instead of "zero rows".
 */
function parseLookupRows(payload: any, fetchedAt: string): Array<{ id: number; name: string; fetched_at: string }> {
  const root = payload?.data ?? payload;
  const rows: Array<{ id: number; name: string; fetched_at: string }> = [];
  const push = (id: unknown, name: unknown) => {
    const n = num(id);
    if (n == null || typeof name !== "string" || !name.trim()) return;
    rows.push({ id: Math.trunc(n), name: name.trim(), fetched_at: fetchedAt });
  };
  if (Array.isArray(root)) {
    for (const item of root) {
      if (!item || typeof item !== "object") continue;
      const entries = Object.entries(item);
      const idEntry = entries.find(([k, v]) => /(^|_)(id)$/i.test(k) && num(v) != null) ?? entries.find(([, v]) => num(v) != null && typeof v !== "string");
      const nameEntry = entries.find(([k, v]) => k !== idEntry?.[0] && typeof v === "string" && v.trim() && !/(^|_)id$/i.test(k) && !/^(sort|order|code)$/i.test(k));
      if (idEntry && nameEntry) push(idEntry[1], nameEntry[1]);
    }
  } else if (root && typeof root === "object") {
    for (const [k, v] of Object.entries(root)) {
      if (typeof v === "string") push(k, v);
      else if (v && typeof v === "object") push((v as any).id ?? k, (v as any).name ?? (v as any).hotel_type ?? (v as any).facility);
    }
  }
  return rows;
}

async function refreshLookups(source: Source): Promise<{ facilities: number; hotelTypes: number; hotelTypesSample?: string }> {
  // 2026-09-26: /data/hoteltypes answered with a truncated body ("unexpected
  // end of file") on every attempt while /data/facilities was fine, so try the
  // documented camel-case path first and keep the lower-case one as a fallback.
  const facilities = await liteapiFetch("/data/facilities");
  let types = await liteapiFetch("/data/hotelTypes");
  if (!types.ok || !parseLookupRows(types.data, "").length) types = await liteapiFetch("/data/hoteltypes");
  const fetchedAt = new Date().toISOString();
  const facilityRows = parseLookupRows(facilities.data, fetchedAt);
  const typeRows = parseLookupRows(types.data, fetchedAt);
  await restUpsert("lookup_liteapi_facilities", facilityRows, "id");
  await restUpsert("lookup_liteapi_hotel_types", typeRows, "id");
  void source;
  return {
    facilities: facilityRows.length,
    hotelTypes: typeRows.length,
    // When a parse comes back empty, keep the first bytes of the raw body in
    // the run log so the next fix does not need a provider call to see it.
    hotelTypesSample: typeRows.length ? undefined : JSON.stringify(types.data).slice(0, 600),
  };
}

async function modeLookupsRefresh(): Promise<Response> {
  const source = await liteapiSource();
  const runId = await logRun(source, "liteapi_lookups_refresh", {});
  try {
    const lookups = await refreshLookups(source);
    lookupsCache = null;
    await finishRun(runId, "succeeded", { records_fetched: lookups.facilities + lookups.hotelTypes, records_upserted: lookups.facilities + lookups.hotelTypes, metadata: { environment: LITEAPI_ENV, ...lookups } });
    return json({ ok: true, environment: LITEAPI_ENV, ...lookups });
  } catch (error) {
    await finishRun(runId, "failed", { error_message: String(error).slice(0, 300) });
    return json({ ok: false, environment: LITEAPI_ENV, error: String(error).slice(0, 300) }, 502);
  }
}

async function modeCatalogRefresh(body: Record<string, unknown>): Promise<Response> {
  const source = await liteapiSource();
  const runId = await logRun(source, "liteapi_catalog_refresh", { center: NASHVILLE_CENTER });
  const pageSize = 200;
  const maxPages = Math.min(Math.max(Math.trunc(num(body.maxPages) ?? 20), 1), 40);
  const radiusMeters = Math.round(Math.min(Math.max(num(body.radiusKm) ?? 28, 5), 40) * 1000);
  const fetchedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + CATALOG_TTL_MINUTES * 60_000).toISOString();
  let fetched = 0;
  let kept = 0;
  const seen = new Set<string>();
  try {
    const lookups = await refreshLookups(source);
    for (let page = 0; page < maxPages; page += 1) {
      const res = await liteapiFetch(`/data/hotels?countryCode=US&latitude=${NASHVILLE_CENTER.lat}&longitude=${NASHVILLE_CENTER.lng}&radius=${radiusMeters}&limit=${pageSize}&offset=${page * pageSize}`);
      if (!res.ok) throw new Error(`LiteAPI /data/hotels page ${page} -> ${res.status}`);
      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      fetched += items.length;
      const rows = items
        .map((h: any) => {
          const id = typeof h?.id === "string" ? h.id : null;
          const lat = num(h?.latitude);
          const lng = num(h?.longitude);
          if (!id || lat == null || lng == null || !inDavidson(lat, lng) || seen.has(id)) return null;
          seen.add(id);
          return {
            lite_id: id,
            name: typeof h?.name === "string" ? h.name : id,
            lat,
            lng,
            stars: num(h?.stars),
            rating: num(h?.rating),
            review_count: num(h?.reviewCount),
            hotel_type_id: num(h?.hotelTypeId),
            chain_id: num(h?.chainId),
            facility_ids: Array.isArray(h?.facilityIds) ? h.facilityIds.map(Number).filter(Number.isFinite) : [],
            thumbnail: typeof h?.thumbnail === "string" ? h.thumbnail : typeof h?.main_photo === "string" ? h.main_photo : null,
            address: typeof h?.address === "string" ? h.address : null,
            city: typeof h?.city === "string" ? h.city : null,
            zip: typeof h?.zip === "string" ? h.zip : null,
            fetched_at: fetchedAt,
            expires_at: expiresAt,
            deleted_at: null,
          };
        })
        .filter(Boolean);
      await restUpsert("hotel_catalog_cache", rows, "lite_id");
      kept += rows.length;
      if (items.length < pageSize) break;
    }
    // Anything not seen in this sweep is soft-deleted, never removed.
    if (kept > 50) {
      await restPatch("hotel_catalog_cache", `fetched_at=lt.${encodeURIComponent(fetchedAt)}&deleted_at=is.null`, { deleted_at: fetchedAt });
    }
    lookupsCache = null;
    await finishRun(runId, "succeeded", { records_fetched: fetched, records_upserted: kept, metadata: { environment: LITEAPI_ENV, radiusMeters, lookups } });
    return json({ ok: true, environment: LITEAPI_ENV, fetched, kept, lookups });
  } catch (error) {
    await finishRun(runId, "failed", { records_fetched: fetched, records_upserted: kept, error_message: String(error).slice(0, 300) });
    return json({ ok: false, environment: LITEAPI_ENV, error: String(error).slice(0, 300), fetched, kept }, 502);
  }
}

async function modeHealth(): Promise<Response> {
  let cacheRows: number | null = null;
  let catalogRows: number | null = null;
  let lastCatalogRefresh: string | null = null;
  let sourceOk = false;
  try {
    await liteapiSource();
    sourceOk = true;
    const [rates, catalog, runs] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/hotel_rate_cache?select=id&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`, { headers: restHeaders({ Prefer: "count=exact", "Range-Unit": "items", Range: "0-0" }) }),
      fetch(`${SUPABASE_URL}/rest/v1/hotel_catalog_cache?select=lite_id&deleted_at=is.null`, { headers: restHeaders({ Prefer: "count=exact", "Range-Unit": "items", Range: "0-0" }) }),
      restSelect<{ completed_at: string }>("ingestion_runs?select=completed_at&job_type=eq.liteapi_catalog_refresh&status=eq.succeeded&order=completed_at.desc&limit=1"),
    ]);
    cacheRows = Number(rates.headers.get("content-range")?.split("/")[1] ?? NaN) || 0;
    catalogRows = Number(catalog.headers.get("content-range")?.split("/")[1] ?? NaN) || 0;
    lastCatalogRefresh = runs[0]?.completed_at ?? null;
  } catch {
    // Reported through sourceOk.
  }
  return json({
    ok: sourceOk,
    configured: Boolean(LITEAPI_KEY),
    env: LITEAPI_ENV,
    baseUrl: LITEAPI_BASE,
    sourceRow: sourceOk,
    cacheRows,
    catalogRows,
    lastCatalogRefresh,
    probeTokenSet: Boolean(PROBE_TOKEN),
    cronTokenSet: Boolean(CRON_TOKEN),
  }, sourceOk ? 200 : 503);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, error: "POST JSON { mode, ... }" }, 405);
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }
  const mode = typeof body.mode === "string" ? body.mode : "";

  const cron = hasCronAccess(req);
  const service = cron || (await hasServiceAccess(req));
  const probe = hasProbeAccess(req);

  if (mode === "health") {
    if (!service && !probe) return json({ ok: false, error: "Unauthorized" }, 401);
    return modeHealth();
  }
  if (!service) return json({ ok: false, error: "Unauthorized" }, 401);

  try {
    switch (mode) {
      case "catalog_refresh":
        return await modeCatalogRefresh(body);
      case "lookups_refresh":
        return await modeLookupsRefresh();
      case "area_rates":
        return await modeAreaRates(body);
      case "hotel_rates":
        return await modeHotelRates(body);
      case "hotel_detail":
        return await modeHotelDetail(body);
      default:
        return json({ ok: false, error: "Unknown mode. Use area_rates, hotel_rates, hotel_detail, catalog_refresh, lookups_refresh or health." }, 400);
    }
  } catch (error) {
    return json({ ok: false, environment: LITEAPI_ENV, error: String(error).slice(0, 300) }, 500);
  }
});
