/**
 * Viator Partner API v2 adapter (server-only).
 *
 * Auth: `VIATOR_API_KEY` via `exp-api-key` header — never expose to the browser.
 * Destination: Nashville = "799" (not legacy d22104 deep links).
 *
 * Cache policy (Viator terms): search/product responses may be cached ≤ 1 hour
 * for real-time use. Do not use /products/search for bulk ingestion.
 *
 * Compliance: never render review text / unique protected content in HTML or JS.
 * Ratings + review counts from product summaries are fine for marketplace cards.
 */

export const VIATOR_NASHVILLE_DESTINATION_ID = '799';
export const VIATOR_API_BASE = 'https://api.viator.com/partner';
/** Max cache for search/product per Viator real-time guidance. */
export const VIATOR_REVALIDATE_SECONDS = 3600;

export type ViatorAccessTier =
  | 'unknown'
  | 'basic_affiliate'
  | 'full_access'
  | 'full_access_booking'
  | 'merchant'
  | 'unconfigured'
  | 'error';

export interface ViatorMoney {
  amount: number;
  currency: string;
  formatted: string;
}

export interface ViatorProductSummary {
  productCode: string;
  title: string;
  description?: string;
  productUrl: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  fromPrice?: ViatorMoney;
  durationLabel?: string;
  freeCancellation: boolean;
  flags: string[];
  provider: 'viator';
}

export interface ViatorProductDetail extends ViatorProductSummary {
  confirmationType?: string;
  languages?: string[];
  inclusions?: string[];
  exclusions?: string[];
  additionalInfo?: string[];
  /** Short itinerary overview only — never review bodies. */
  itineraryOverview?: string;
}

export interface ViatorSearchResult {
  configured: boolean;
  live: boolean;
  products: ViatorProductSummary[];
  totalCount?: number;
  fetchedAt: string;
  error?: string;
  httpStatus?: number;
}

export interface ViatorProbeResult {
  endpoint: string;
  method: 'GET' | 'POST';
  httpStatus: number | null;
  ok: boolean;
  clue?: string;
}

function apiKey(): string | undefined {
  const key = process.env.VIATOR_API_KEY?.trim();
  return key || undefined;
}

export function isViatorConfigured(): boolean {
  return Boolean(apiKey());
}

function headers(): HeadersInit {
  const key = apiKey();
  if (!key) throw new Error('VIATOR_API_KEY is not configured');
  return {
    'exp-api-key': key,
    Accept: 'application/json;version=2.0',
    'Accept-Language': 'en-US',
    'Content-Type': 'application/json',
  };
}

async function viatorFetch(
  path: string,
  init: RequestInit & { revalidate?: number } = {},
): Promise<Response> {
  const { revalidate = VIATOR_REVALIDATE_SECONDS, ...rest } = init;
  return fetch(`${VIATOR_API_BASE}${path}`, {
    ...rest,
    headers: { ...headers(), ...(rest.headers || {}) },
    next: { revalidate },
  });
}

function formatMoney(amount: number | undefined, currency = 'USD'): ViatorMoney | undefined {
  if (amount == null || Number.isNaN(amount)) return undefined;
  return {
    amount,
    currency,
    formatted: new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount),
  };
}

function pickImageUrl(images: unknown): string | undefined {
  if (!Array.isArray(images) || !images.length) return undefined;
  type Variant = { height?: number; width?: number; url?: string };
  type Img = { isCover?: boolean; variants?: Variant[] };
  const list = images as Img[];
  const cover = list.find((i) => i.isCover) || list[0];
  const variants = cover?.variants || [];
  if (!variants.length) return undefined;
  const ranked = [...variants]
    .filter((v) => v.url)
    .sort((a, b) => Math.abs((a.width || 0) - 720) - Math.abs((b.width || 0) - 720));
  return ranked[0]?.url;
}

function durationLabel(duration: unknown): string | undefined {
  if (!duration || typeof duration !== 'object') return undefined;
  const d = duration as {
    fixedDurationInMinutes?: number;
    variableDurationFromMinutes?: number;
    variableDurationToMinutes?: number;
  };
  if (d.fixedDurationInMinutes) {
    const h = Math.floor(d.fixedDurationInMinutes / 60);
    const m = d.fixedDurationInMinutes % 60;
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h} hour${h === 1 ? '' : 's'}`;
    return `${m} minutes`;
  }
  if (d.variableDurationFromMinutes != null && d.variableDurationToMinutes != null) {
    const fromH = Math.round(d.variableDurationFromMinutes / 60);
    const toH = Math.round(d.variableDurationToMinutes / 60);
    if (fromH === toH) return `About ${fromH} hour${fromH === 1 ? '' : 's'}`;
    return `${fromH}–${toH} hours`;
  }
  return undefined;
}

function fromPriceOf(product: Record<string, unknown>): ViatorMoney | undefined {
  const pricing = product.pricing as
    | {
        summary?: { fromPrice?: number | string; fromPriceBeforeDiscount?: number | string };
        currency?: string;
      }
    | undefined;
  const rawAmount =
    pricing?.summary?.fromPrice ??
    (product.pricingInfo as { fromPrice?: number } | undefined)?.fromPrice ??
    (typeof product.fromPrice === 'number' || typeof product.fromPrice === 'string'
      ? product.fromPrice
      : undefined);
  const amount = typeof rawAmount === 'string' ? Number(rawAmount) : rawAmount;
  const currency =
    pricing?.currency ||
    (typeof product.currency === 'string' ? product.currency : 'USD');
  return formatMoney(typeof amount === 'number' ? amount : undefined, currency);
}

function reviewsOf(product: Record<string, unknown>): { rating?: number; reviewCount?: number } {
  const reviews = product.reviews as
    | { combinedAverageRating?: number; totalReviews?: number }
    | undefined;
  return {
    rating: reviews?.combinedAverageRating,
    reviewCount: reviews?.totalReviews,
  };
}

function normaliseSummary(raw: unknown): ViatorProductSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const productCode = typeof p.productCode === 'string' ? p.productCode : '';
  const title = typeof p.title === 'string' ? p.title : '';
  const productUrl = typeof p.productUrl === 'string' ? p.productUrl : '';
  if (!productCode || !title || !productUrl) return null;
  if (p.status && p.status !== 'ACTIVE') return null;

  const flags = Array.isArray(p.flags) ? (p.flags as string[]) : [];
  const { rating, reviewCount } = reviewsOf(p);

  return {
    productCode,
    title,
    description: typeof p.description === 'string' ? p.description : undefined,
    productUrl,
    imageUrl: pickImageUrl(p.images),
    rating,
    reviewCount,
    fromPrice: fromPriceOf(p),
    durationLabel: durationLabel(p.duration) || durationLabel((p.itinerary as { duration?: unknown })?.duration),
    freeCancellation: flags.includes('FREE_CANCELLATION'),
    flags,
    provider: 'viator',
  };
}

export interface ViatorSearchParams {
  /** Free-text style filtering via start/end date only on search; query uses freetext or tag-less destination search. */
  query?: string;
  startDate?: string;
  endDate?: string;
  start?: number;
  count?: number;
  currency?: string;
  sort?: 'DEFAULT' | 'PRICE' | 'TRAVELER_RATING' | 'ITINERARY_DURATION' | 'DATE_ADDED';
  order?: 'ASCENDING' | 'DESCENDING';
  flags?: string[];
}

/** Nashville product search via POST /products/search. */
export async function searchNashvilleProducts(params: ViatorSearchParams = {}): Promise<ViatorSearchResult> {
  const fetchedAt = new Date().toISOString();
  if (!isViatorConfigured()) {
    return { configured: false, live: false, products: [], fetchedAt, error: 'VIATOR_API_KEY missing' };
  }

  const start = params.start ?? 1;
  const count = Math.min(params.count ?? 24, 50);
  const body: Record<string, unknown> = {
    filtering: {
      destination: VIATOR_NASHVILLE_DESTINATION_ID,
      ...(params.startDate ? { startDate: params.startDate } : {}),
      ...(params.endDate ? { endDate: params.endDate } : {}),
      ...(params.flags?.length ? { flags: params.flags } : {}),
    },
    sorting: {
      sort: params.sort ?? 'TRAVELER_RATING',
      order: params.order ?? 'DESCENDING',
    },
    pagination: { start, count },
    currency: params.currency ?? 'USD',
  };

  try {
    // Prefer /products/search for destination inventory. If a query is present,
    // also try /search/freetext PRODUCTS scoped to Nashville when available.
    let res: Response;
    let data: Record<string, unknown>;

    if (params.query?.trim()) {
      res = await viatorFetch('/search/freetext', {
        method: 'POST',
        body: JSON.stringify({
          searchTerm: params.query.trim(),
          productFiltering: {
            destination: VIATOR_NASHVILLE_DESTINATION_ID,
            ...(params.startDate || params.endDate
              ? {
                  dateRange: {
                    ...(params.startDate ? { from: params.startDate } : {}),
                    ...(params.endDate ? { to: params.endDate } : {}),
                  },
                }
              : {}),
          },
          searchTypes: [
            {
              searchType: 'PRODUCTS',
              pagination: { start, count },
            },
          ],
          currency: params.currency ?? 'USD',
        }),
      });
      if (!res.ok) {
        // Fall back to destination search when freetext is unavailable for this tier.
        res = await viatorFetch('/products/search', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
    } else {
      res = await viatorFetch('/products/search', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }

    data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      return {
        configured: true,
        live: false,
        products: [],
        fetchedAt,
        httpStatus: res.status,
        error: typeof data.message === 'string' ? data.message : `Viator search HTTP ${res.status}`,
      };
    }

    let list: unknown[] = [];
    if (Array.isArray(data.products)) {
      list = data.products;
    } else if (data.products && typeof data.products === 'object') {
      const nested = data.products as { results?: unknown[] };
      if (Array.isArray(nested.results)) list = nested.results;
    } else if (Array.isArray(data.results)) {
      list = data.results;
    }

    const products = list.map(normaliseSummary).filter((p): p is ViatorProductSummary => Boolean(p));

    // Optional client-side text filter when freetext fell back to destination search
    const filtered =
      params.query?.trim() && products.length
        ? products.filter((p) => {
            const q = params.query!.trim().toLowerCase();
            return p.title.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
          })
        : products;

    return {
      configured: true,
      live: true,
      products: filtered.length ? filtered : products,
      totalCount: typeof data.totalCount === 'number' ? data.totalCount : undefined,
      fetchedAt,
      httpStatus: res.status,
    };
  } catch (err) {
    return {
      configured: true,
      live: false,
      products: [],
      fetchedAt,
      error: err instanceof Error ? err.message : 'Viator search failed',
    };
  }
}

/** Individual product details via GET /products/{product-code}. */
export async function getViatorProduct(productCode: string): Promise<{
  configured: boolean;
  live: boolean;
  product?: ViatorProductDetail;
  httpStatus?: number;
  error?: string;
}> {
  if (!isViatorConfigured()) {
    return { configured: false, live: false, error: 'VIATOR_API_KEY missing' };
  }
  const code = encodeURIComponent(productCode.trim());
  if (!code) return { configured: true, live: false, error: 'Missing product code' };

  try {
    const res = await viatorFetch(`/products/${code}`, { method: 'GET' });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        configured: true,
        live: false,
        httpStatus: res.status,
        error: typeof data.message === 'string' ? data.message : `HTTP ${res.status}`,
      };
    }
    const summary = normaliseSummary(data);
    if (!summary) {
      return { configured: true, live: false, httpStatus: res.status, error: 'Unusable product payload' };
    }

    const itinerary = data.itinerary as { description?: string } | undefined;
    const product: ViatorProductDetail = {
      ...summary,
      confirmationType: typeof data.confirmationType === 'string' ? data.confirmationType : undefined,
      inclusions: Array.isArray(data.inclusions) ? (data.inclusions as string[]) : undefined,
      exclusions: Array.isArray(data.exclusions) ? (data.exclusions as string[]) : undefined,
      additionalInfo: Array.isArray(data.additionalInfo)
        ? (data.additionalInfo as { description?: string }[]).map((x) => x.description || '').filter(Boolean)
        : undefined,
      itineraryOverview: itinerary?.description,
      // Explicitly omit any review text bodies even if present on the payload.
    };
    return { configured: true, live: true, product, httpStatus: res.status };
  } catch (err) {
    return {
      configured: true,
      live: false,
      error: err instanceof Error ? err.message : 'Product fetch failed',
    };
  }
}

/** Availability/schedules when the account tier permits. */
export async function getViatorAvailabilitySchedules(productCode: string): Promise<{
  configured: boolean;
  live: boolean;
  httpStatus?: number;
  schedules?: unknown;
  error?: string;
}> {
  if (!isViatorConfigured()) {
    return { configured: false, live: false, error: 'VIATOR_API_KEY missing' };
  }
  const code = encodeURIComponent(productCode.trim());
  try {
    const res = await viatorFetch(`/availability/schedules/${code}`, {
      method: 'GET',
      revalidate: 300,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        configured: true,
        live: false,
        httpStatus: res.status,
        error: typeof (data as { message?: string }).message === 'string'
          ? (data as { message: string }).message
          : `HTTP ${res.status}`,
      };
    }
    return { configured: true, live: true, httpStatus: res.status, schedules: data };
  } catch (err) {
    return {
      configured: true,
      live: false,
      error: err instanceof Error ? err.message : 'Availability fetch failed',
    };
  }
}

/** Probe endpoints to infer access tier without leaking the key. */
export async function probeViatorAccess(): Promise<{
  configured: boolean;
  inferredTier: ViatorAccessTier;
  probes: ViatorProbeResult[];
  sampleProductCode?: string;
  fetchedAt: string;
}> {
  const fetchedAt = new Date().toISOString();
  if (!isViatorConfigured()) {
    return { configured: false, inferredTier: 'unconfigured', probes: [], fetchedAt };
  }

  const probes: ViatorProbeResult[] = [];

  async function probe(
    endpoint: string,
    method: 'GET' | 'POST',
    body?: unknown,
  ): Promise<ViatorProbeResult> {
    try {
      const res = await viatorFetch(endpoint, {
        method,
        body: body != null ? JSON.stringify(body) : undefined,
        revalidate: 0,
        cache: 'no-store',
      });
      const clue =
        res.status === 403
          ? 'Forbidden for this account tier'
          : res.status === 401
            ? 'Unauthorized — check key'
            : res.status === 200
              ? 'OK'
              : `HTTP ${res.status}`;
      const result: ViatorProbeResult = {
        endpoint,
        method,
        httpStatus: res.status,
        ok: res.ok,
        clue,
      };
      probes.push(result);
      return result;
    } catch (err) {
      const result: ViatorProbeResult = {
        endpoint,
        method,
        httpStatus: null,
        ok: false,
        clue: err instanceof Error ? err.message : 'network error',
      };
      probes.push(result);
      return result;
    }
  }

  const search = await probe('/products/search', 'POST', {
    filtering: { destination: VIATOR_NASHVILLE_DESTINATION_ID },
    pagination: { start: 1, count: 1 },
    currency: 'USD',
  });

  let sampleProductCode: string | undefined;
  if (search.ok) {
    try {
      const res = await viatorFetch('/products/search', {
        method: 'POST',
        body: JSON.stringify({
          filtering: { destination: VIATOR_NASHVILLE_DESTINATION_ID },
          pagination: { start: 1, count: 1 },
          currency: 'USD',
        }),
        revalidate: 0,
        cache: 'no-store',
      });
      const data = (await res.json()) as { products?: { productCode?: string }[] };
      sampleProductCode = data.products?.[0]?.productCode;
    } catch {
      /* ignore */
    }
  }

  if (sampleProductCode) {
    await probe(`/products/${encodeURIComponent(sampleProductCode)}`, 'GET');
    await probe(`/availability/schedules/${encodeURIComponent(sampleProductCode)}`, 'GET');
    await probe('/availability/check', 'POST', {
      productCode: sampleProductCode,
      travelDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      currency: 'USD',
      paxMix: [{ ageBand: 'ADULT', numberOfTravelers: 2 }],
    });
    await probe('/reviews/product', 'POST', {
      productCode: sampleProductCode,
      provider: 'ALL',
      count: 1,
      start: 1,
    });
    await probe('/bookings/cart/hold', 'POST', { currency: 'USD' });
  } else {
    await probe('/products/tags', 'GET');
  }

  await probe('/products/modified-since', 'GET');

  const by = (path: string) => probes.find((p) => p.endpoint.startsWith(path) || p.endpoint === path);

  const searchOk = by('/products/search')?.ok;
  const modifiedOk = by('/products/modified-since')?.ok;
  const availabilityCheckOk = by('/availability/check')?.ok;
  const reviewsOk = by('/reviews/product')?.ok;
  const cartHold = by('/bookings/cart/hold');
  const bookHoldMerchant = probes.find((p) => p.endpoint.includes('/bookings/hold'));

  let inferredTier: ViatorAccessTier = 'unknown';
  if (!searchOk && by('/products/search')?.httpStatus === 403) inferredTier = 'error';
  else if (cartHold?.ok || bookHoldMerchant?.ok) inferredTier = 'merchant';
  else if (cartHold?.httpStatus === 403 && (availabilityCheckOk || reviewsOk || modifiedOk)) {
    // Full-access + booking would allow cart hold; if cart is 403 but modified-since works → full access
    inferredTier = modifiedOk ? 'full_access' : 'basic_affiliate';
  } else if (modifiedOk || reviewsOk || availabilityCheckOk) inferredTier = 'full_access';
  else if (searchOk) inferredTier = 'basic_affiliate';

  // Refine: Full Access + Booking allows /bookings/cart/* ; Merchant allows /bookings/hold
  if (cartHold && cartHold.httpStatus !== 403 && cartHold.httpStatus !== 401 && cartHold.ok === false) {
    /* leave */
  }
  if (cartHold?.ok) inferredTier = 'full_access_booking';

  return { configured: true, inferredTier, probes, sampleProductCode, fetchedAt };
}
