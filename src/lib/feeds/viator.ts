/**
 * NashRoam server-side client for Viator.
 *
 * Public marketplace path:
 *   Next.js -> Supabase Edge Function `viator-live` -> Viator production
 *
 * Ingestion / curation path:
 *   Supabase cron -> Edge Function `viator-sync` -> Viator sandbox/catalog store
 *
 * Security:
 * - Never call Viator directly from browser code.
 * - Never put a Viator key in Vercel or NEXT_PUBLIC_*.
 * - VIATOR_PRODUCTION_API_KEY lives in Supabase project secrets and is used by
 *   `viator-live`; the existing VIATOR_API_KEY can remain the sandbox key used
 *   by the ingestion pipeline.
 * - Nashville destination id is 799.
 */

import { invokeEdgeFunction, isSupabaseConfigured } from '@/lib/supabase/server';

export const VIATOR_NASHVILLE_DESTINATION_ID = '799';
export const VIATOR_NASHVILLE_LOOKUP_ID = '8.77.295.799';
export const VIATOR_REVALIDATE_SECONDS = 3600;

export type ViatorAccessTier =
  | 'unknown'
  | 'basic_affiliate'
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
  /** Exact Viator affiliate productUrl — never reconstruct. */
  productUrl: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  fromPrice?: ViatorMoney;
  durationLabel?: string;
  freeCancellation: boolean;
  flags: string[];
  categories?: string[];
  provider: 'viator';
}

export interface ViatorImage {
  url: string;
  caption?: string;
  isCover?: boolean;
}

export interface ViatorItineraryStop {
  name?: string;
  description?: string;
  durationLabel?: string;
  passByWithoutStopping?: boolean;
  admissionIncluded?: string;
  dayLabel?: string;
}

export interface ViatorLogisticsPoint {
  name?: string;
  description?: string;
  address?: string;
}

export interface ViatorProductOption {
  code: string;
  title: string;
  description?: string;
}

export interface ViatorCancellationPolicy {
  type?: string;
  description: string;
  cancelIfBadWeather?: boolean;
  cancelIfInsufficientTravelers?: boolean;
}

export interface ViatorProductDetail extends ViatorProductSummary {
  confirmationType?: string;
  languages?: string[];
  languageGuideLabels?: string[];
  inclusions?: string[];
  exclusions?: string[];
  additionalInfo?: string[];
  itineraryOverview?: string;
  itineraryType?: string;
  skipTheLine?: boolean;
  privateTour?: boolean;
  maxTravelersInSharedTour?: number;
  itineraryStops?: ViatorItineraryStop[];
  ticketTypeDescription?: string;
  supplierName?: string;
  cancellationPolicy?: ViatorCancellationPolicy;
  meetingPoints?: ViatorLogisticsPoint[];
  endPoints?: ViatorLogisticsPoint[];
  pickupLabel?: string;
  productOptions?: ViatorProductOption[];
  images?: ViatorImage[];
}

export interface ViatorSearchParams {
  query?: string;
  startDate?: string;
  endDate?: string;
  start?: number;
  count?: number;
  sort?: string;
  order?: string;
  currency?: string;
  flags?: string[];
  tags?: number[];
  campaign?: string;
}

export interface ViatorSearchResult {
  configured: boolean;
  live: boolean;
  products: ViatorProductSummary[];
  totalCount?: number;
  fetchedAt: string;
  error?: string;
  httpStatus?: number;
  environment?: string;
  rateLimitRemaining?: string | null;
}

export interface ViatorProbeResult {
  endpoint: string;
  method: 'GET' | 'POST';
  httpStatus: number | null;
  ok: boolean;
  clue?: string;
}

type EdgeEnvelope = {
  ok?: boolean;
  error?: string;
  environment?: string;
  baseUrl?: string;
  products?: Array<Record<string, unknown>>;
  totalCount?: number;
  product?: Record<string, unknown>;
  normalized?: Record<string, unknown>;
  rateLimitRemaining?: string | null;
  retryAfter?: string | null;
  nashvilleDestinationId?: string;
  authenticated?: boolean;
  details?: unknown;
};

const inFlight = new Map<string, Promise<ViatorSearchResult>>();

function formatMoney(amount: number | undefined, currency = 'USD'): ViatorMoney | undefined {
  if (amount == null || Number.isNaN(amount)) return undefined;
  return {
    amount,
    currency,
    formatted: new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount),
  };
}

function mapNormalized(raw: Record<string, unknown>): ViatorProductSummary | null {
  const productCode = String(raw.productCode ?? '').trim();
  const title = String(raw.title ?? '').trim();
  const productUrl = typeof raw.productUrl === 'string' ? raw.productUrl : '';
  if (!productCode || !title || !productUrl) return null;

  return {
    productCode,
    title,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    productUrl,
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : undefined,
    rating: typeof raw.rating === 'number' ? raw.rating : undefined,
    reviewCount: typeof raw.reviewCount === 'number' ? raw.reviewCount : undefined,
    fromPrice: formatMoney(
      typeof raw.fromPrice === 'number' ? raw.fromPrice : undefined,
      typeof raw.currency === 'string' ? raw.currency : 'USD',
    ),
    durationLabel: typeof raw.durationLabel === 'string' ? raw.durationLabel : undefined,
    freeCancellation: Boolean(raw.freeCancellation),
    flags: Array.isArray(raw.flags) ? raw.flags.map(String) : [],
    categories: Array.isArray(raw.categories) ? raw.categories.map(String) : undefined,
    provider: 'viator',
  };
}

export function isViatorConfigured(): boolean {
  return isSupabaseConfigured();
}

/** Live, production Viator inventory for the public marketplace. */
export async function searchNashvilleProducts(
  params: ViatorSearchParams = {},
): Promise<ViatorSearchResult> {
  const fetchedAt = new Date().toISOString();
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      live: false,
      products: [],
      fetchedAt,
      error: 'Supabase service role not configured — Viator calls go through Edge Functions only',
      httpStatus: 503,
    };
  }

  const key = JSON.stringify({
    mode: 'search_products',
    start: params.start ?? 1,
    count: params.count ?? 24,
    sort: params.sort ?? 'TRAVELER_RATING',
    startDate: params.startDate ?? null,
    endDate: params.endDate ?? null,
    campaign: params.campaign ?? 'tours-marketplace',
    flags: params.flags ?? null,
    tags: params.tags ?? null,
  });

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<ViatorSearchResult> => {
    const result = await invokeEdgeFunction<EdgeEnvelope>('viator-live', {
      mode: 'search_products',
      start: params.start ?? 1,
      count: Math.min(params.count ?? 24, 50),
      sort: params.sort ?? 'TRAVELER_RATING',
      order: params.order ?? 'DESCENDING',
      startDate: params.startDate,
      endDate: params.endDate,
      currency: params.currency ?? 'USD',
      flags: params.flags,
      tags: params.tags,
      campaign: params.campaign ?? 'tours-marketplace',
    });

    const data = result.data;
    if (!result.ok || !data?.ok) {
      return {
        configured: true,
        live: false,
        products: [],
        fetchedAt,
        error:
          typeof data?.error === 'string'
            ? data.error
            : `viator-live search failed (${result.status})`,
        httpStatus: result.status,
        environment: data?.environment,
        rateLimitRemaining: data?.rateLimitRemaining,
      };
    }

    const products = (data.products ?? [])
      .map((product) => mapNormalized(product))
      .filter(Boolean) as ViatorProductSummary[];

    const q = params.query?.trim().toLowerCase();
    const filtered = q
      ? products.filter(
          (product) =>
            product.title.toLowerCase().includes(q) ||
            (product.description?.toLowerCase().includes(q) ?? false),
        )
      : products;

    return {
      configured: true,
      live: filtered.length > 0,
      products: filtered,
      totalCount: data.totalCount,
      fetchedAt,
      httpStatus: 200,
      environment: data.environment,
      rateLimitRemaining: data.rateLimitRemaining,
    };
  })();

  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

/** Live product detail from Viator production for marketplace pages. */
export async function getViatorProduct(productCode: string): Promise<{
  configured: boolean;
  live: boolean;
  product?: ViatorProductDetail;
  error?: string;
  httpStatus?: number;
  environment?: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      live: false,
      error: 'Supabase service role not configured',
      httpStatus: 503,
    };
  }

  const code = productCode.trim();
  if (!code) {
    return { configured: true, live: false, error: 'productCode required', httpStatus: 400 };
  }

  const result = await invokeEdgeFunction<EdgeEnvelope>('viator-live', {
    mode: 'get_product',
    productCode: code,
    campaign: 'tours-detail',
  });

  const data = result.data;
  if (!result.ok || !data?.ok) {
    return {
      configured: true,
      live: false,
      error:
        typeof data?.error === 'string'
          ? data.error
          : `viator-live get_product failed (${result.status})`,
      httpStatus: result.status,
      environment: data?.environment,
    };
  }

  const normalized = data.normalized ? mapNormalized(data.normalized) : null;
  if (!normalized) {
    return {
      configured: true,
      live: false,
      error: 'Product missing affiliate productUrl',
      httpStatus: 502,
      environment: data.environment,
    };
  }

  const raw = data.normalized ?? {};
  return {
    configured: true,
    live: true,
    httpStatus: 200,
    environment: data.environment,
    product: mapProductDetail(normalized, raw),
  };
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.map(String).filter(Boolean);
  return items.length ? items : undefined;
}

function mapLogisticsPoints(value: unknown): ViatorLogisticsPoint[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const points = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const point: ViatorLogisticsPoint = {
        name: typeof row.name === 'string' ? row.name : undefined,
        description: typeof row.description === 'string' ? row.description : undefined,
        address: typeof row.address === 'string' ? row.address : undefined,
      };
      return point.name || point.description || point.address ? point : null;
    })
    .filter((item): item is ViatorLogisticsPoint => Boolean(item));
  return points.length ? points : undefined;
}

function mapProductDetail(
  summary: ViatorProductSummary,
  raw: Record<string, unknown>,
): ViatorProductDetail {
  const cancellation =
    raw.cancellationPolicy && typeof raw.cancellationPolicy === 'object'
      ? (raw.cancellationPolicy as Record<string, unknown>)
      : null;

  const images: ViatorImage[] = [];
  if (Array.isArray(raw.images)) {
    for (const item of raw.images) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      if (typeof row.url !== 'string' || !row.url) continue;
      images.push({
        url: row.url,
        caption: typeof row.caption === 'string' ? row.caption : undefined,
        isCover: Boolean(row.isCover),
      });
    }
  }

  const itineraryStops: ViatorItineraryStop[] = [];
  if (Array.isArray(raw.itineraryStops)) {
    for (const item of raw.itineraryStops) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const stop: ViatorItineraryStop = {
        name: typeof row.name === 'string' ? row.name : undefined,
        description: typeof row.description === 'string' ? row.description : undefined,
        durationLabel: typeof row.durationLabel === 'string' ? row.durationLabel : undefined,
        passByWithoutStopping: Boolean(row.passByWithoutStopping),
        admissionIncluded: typeof row.admissionIncluded === 'string' ? row.admissionIncluded : undefined,
        dayLabel: typeof row.dayLabel === 'string' ? row.dayLabel : undefined,
      };
      if (stop.name || stop.description) itineraryStops.push(stop);
    }
  }

  const productOptions: ViatorProductOption[] = [];
  if (Array.isArray(raw.productOptions)) {
    for (const item of raw.productOptions) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const title = typeof row.title === 'string' ? row.title : '';
      if (!title) continue;
      productOptions.push({
        code: typeof row.code === 'string' ? row.code : '',
        title,
        description: typeof row.description === 'string' ? row.description : undefined,
      });
    }
  }

  return {
    ...summary,
    confirmationType: typeof raw.confirmationType === 'string' ? raw.confirmationType : undefined,
    languages: stringList(raw.languages),
    languageGuideLabels: stringList(raw.languageGuideLabels),
    inclusions: stringList(raw.inclusions),
    exclusions: stringList(raw.exclusions),
    additionalInfo: stringList(raw.additionalInfo),
    itineraryOverview: typeof raw.itineraryOverview === 'string' ? raw.itineraryOverview : undefined,
    itineraryType: typeof raw.itineraryType === 'string' ? raw.itineraryType : undefined,
    skipTheLine: typeof raw.skipTheLine === 'boolean' ? raw.skipTheLine : undefined,
    privateTour: typeof raw.privateTour === 'boolean' ? raw.privateTour : undefined,
    maxTravelersInSharedTour:
      typeof raw.maxTravelersInSharedTour === 'number' ? raw.maxTravelersInSharedTour : undefined,
    itineraryStops: itineraryStops.length ? itineraryStops : undefined,
    ticketTypeDescription:
      typeof raw.ticketTypeDescription === 'string' ? raw.ticketTypeDescription : undefined,
    supplierName: typeof raw.supplierName === 'string' ? raw.supplierName : undefined,
    cancellationPolicy:
      cancellation && typeof cancellation.description === 'string'
        ? {
            type: typeof cancellation.type === 'string' ? cancellation.type : undefined,
            description: cancellation.description,
            cancelIfBadWeather: Boolean(cancellation.cancelIfBadWeather),
            cancelIfInsufficientTravelers: Boolean(cancellation.cancelIfInsufficientTravelers),
          }
        : undefined,
    meetingPoints: mapLogisticsPoints(raw.meetingPoints),
    endPoints: mapLogisticsPoints(raw.endPoints),
    pickupLabel: typeof raw.pickupLabel === 'string' ? raw.pickupLabel : undefined,
    productOptions: productOptions.length ? productOptions : undefined,
    images: images.length ? images : undefined,
  };
}

/**
 * Catalog ingestion remains a separate curation operation. It uses viator-sync
 * and never automatically publishes experiences into NashRoam editorial/plans.
 */
export async function syncNashvilleCatalog(opts: {
  maxPages?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
} = {}): Promise<{
  ok: boolean;
  upserted?: number;
  published?: number;
  sample?: Array<{ productCode: string; title: string; productUrl: string }>;
  error?: string;
  httpStatus?: number;
  environment?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase service role not configured', httpStatus: 503 };
  }

  const result = await invokeEdgeFunction<{
    ok?: boolean;
    error?: string;
    upserted?: number;
    published?: number;
    sample?: Array<{ productCode: string; title: string; productUrl: string }>;
    environment?: string;
  }>(
    'viator-sync',
    {
      mode: 'sync_nashville_catalog',
      maxPages: opts.maxPages ?? 3,
      limit: opts.limit ?? 180,
      startDate: opts.startDate,
      endDate: opts.endDate,
      campaign: 'catalog-sync',
    },
    { timeoutMs: 120_000 },
  );

  return {
    ok: Boolean(result.ok && result.data?.ok),
    upserted: result.data?.upserted,
    published: result.data?.published,
    sample: result.data?.sample,
    error: result.data?.error,
    httpStatus: result.status,
    environment: result.data?.environment,
  };
}

/** Health check for the production Basic Access Affiliate path. */
export async function probeViatorAccess(): Promise<{
  configured: boolean;
  inferredTier: ViatorAccessTier;
  probes: ViatorProbeResult[];
  sampleProductCode?: string;
  fetchedAt: string;
  environment?: string;
  baseUrl?: string;
  rateLimitRemaining?: string | null;
}> {
  const fetchedAt = new Date().toISOString();
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      inferredTier: 'unconfigured',
      probes: [],
      fetchedAt,
    };
  }

  const health = await invokeEdgeFunction<EdgeEnvelope>('viator-live', { mode: 'health' });
  const probes: ViatorProbeResult[] = [
    {
      endpoint: 'edge:viator-live/health→GET production /destinations',
      method: 'GET',
      httpStatus: health.status,
      ok: Boolean(health.ok && health.data?.ok),
      clue:
        typeof health.data?.error === 'string'
          ? health.data.error
          : health.data?.ok
            ? `OK (${health.data.environment || 'production'})`
            : `HTTP ${health.status}`,
    },
  ];

  let sampleProductCode: string | undefined;
  if (health.ok && health.data?.ok) {
    const search = await searchNashvilleProducts({ count: 1, sort: 'TRAVELER_RATING' });
    probes.push({
      endpoint: 'edge:viator-live/search_products→POST production /products/search',
      method: 'POST',
      httpStatus: search.httpStatus ?? null,
      ok: search.live,
      clue:
        search.error ||
        (search.live ? `OK · dest ${VIATOR_NASHVILLE_DESTINATION_ID}` : 'No products'),
    });
    sampleProductCode = search.products[0]?.productCode;

    if (sampleProductCode) {
      const detail = await getViatorProduct(sampleProductCode);
      probes.push({
        endpoint: `edge:viator-live/get_product→GET production /products/${sampleProductCode}`,
        method: 'GET',
        httpStatus: detail.httpStatus ?? null,
        ok: Boolean(detail.live),
        clue: detail.error || 'OK',
      });
    }
  }

  const inferredTier: ViatorAccessTier =
    health.ok && health.data?.ok ? 'basic_affiliate' : 'error';

  return {
    configured: true,
    inferredTier,
    probes,
    sampleProductCode,
    fetchedAt,
    environment: health.data?.environment,
    baseUrl: health.data?.baseUrl,
    rateLimitRemaining: health.data?.rateLimitRemaining,
  };
}
