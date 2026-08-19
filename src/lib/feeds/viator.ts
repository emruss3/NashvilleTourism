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
 * - Viator credentials live in Supabase project secrets.
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

export interface ViatorProductDetail extends ViatorProductSummary {
  confirmationType?: string;
  languages?: string[];
  inclusions?: string[];
  exclusions?: string[];
  additionalInfo?: string[];
  itineraryOverview?: string;
  pricingType?: 'PER_PERSON' | 'UNIT' | string;
  unitType?: string;
  minTravelers?: number;
  maxTravelers?: number;
  privateTour?: boolean;
  itineraryType?: string;
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
  /** True when the live provider request succeeded, even when it returned zero matches. */
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

/**
 * Viator product search is taxonomy-first. These aliases bias the six high-intent
 * NashRoam tour formats into a relevant Viator tag before we rank by the user's
 * words. The tags are sourced from the Viator tag taxonomy cached in Supabase.
 */
function tagsForQuery(query?: string): number[] | undefined {
  const q = query?.trim().toLowerCase();
  if (!q) return undefined;
  if (q.includes('party bus')) return [11930]; // Bus Tours
  if (q.includes('pedal') || q.includes('bike')) return [21702]; // Bike Tours
  if (q.includes('crawl') || q.includes('honky')) return [12046]; // Walking Tours
  if (q.includes('whiskey') || q.includes('distill')) return [21911]; // Food & Drink
  if (q.includes('sightseeing') || q.includes('city tour')) return [12075]; // City Tours
  if (q.includes('music')) return [21515]; // Music Tours
  return undefined;
}

function queryTokens(query: string): string[] {
  const stop = new Set(['nashville', 'tour', 'tours', 'the', 'and', 'with']);
  return query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stop.has(token));
}

function rankForQuery(products: ViatorProductSummary[], query: string): ViatorProductSummary[] {
  const q = query.trim().toLowerCase();
  const tokens = queryTokens(query);
  if (!q || !tokens.length) return products;

  return products
    .map((product) => {
      const title = product.title.toLowerCase();
      const description = product.description?.toLowerCase() ?? '';
      const categories = (product.categories ?? []).join(' ').toLowerCase();
      const haystack = `${title} ${categories} ${description}`;
      let score = title.includes(q) ? 20 : haystack.includes(q) ? 12 : 0;
      for (const token of tokens) {
        if (title.includes(token)) score += 5;
        else if (categories.includes(token)) score += 3;
        else if (description.includes(token)) score += 1;
      }
      return { product, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.product.rating ?? 0) - (a.product.rating ?? 0) ||
        (b.product.reviewCount ?? 0) - (a.product.reviewCount ?? 0),
    )
    .map(({ product }) => product);
}

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

  const requestedCount = Math.min(params.count ?? 24, 50);
  const queryTags = params.tags?.length ? params.tags : tagsForQuery(params.query);
  // When a user selected a tour format, retrieve a wider candidate set from the
  // relevant Viator taxonomy and rank it locally. This avoids the old bug where
  // NashRoam searched only the first 24 generic top-rated Nashville products.
  const providerCount = params.query ? 50 : requestedCount;

  const key = JSON.stringify({
    mode: 'search_products',
    query: params.query ?? null,
    start: params.start ?? 1,
    count: providerCount,
    sort: params.sort ?? 'TRAVELER_RATING',
    startDate: params.startDate ?? null,
    endDate: params.endDate ?? null,
    campaign: params.campaign ?? 'tours-marketplace',
    flags: params.flags ?? null,
    tags: queryTags ?? null,
  });

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<ViatorSearchResult> => {
    const result = await invokeEdgeFunction<EdgeEnvelope>('viator-live', {
      mode: 'search_products',
      start: params.start ?? 1,
      count: providerCount,
      sort: params.sort ?? 'TRAVELER_RATING',
      order: params.order ?? 'DESCENDING',
      startDate: params.startDate,
      endDate: params.endDate,
      currency: params.currency ?? 'USD',
      flags: params.flags,
      tags: queryTags,
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

    const ranked = params.query ? rankForQuery(products, params.query) : products;

    return {
      configured: true,
      // A successful provider request is live even if a narrow search has zero matches.
      live: true,
      products: ranked.slice(0, requestedCount),
      totalCount: params.query ? ranked.length : data.totalCount,
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
    product: {
      ...normalized,
      confirmationType:
        typeof raw.confirmationType === 'string' ? raw.confirmationType : undefined,
      languages: Array.isArray(raw.languages) ? raw.languages.map(String) : undefined,
      inclusions: Array.isArray(raw.inclusions) ? raw.inclusions.map(String) : undefined,
      exclusions: Array.isArray(raw.exclusions) ? raw.exclusions.map(String) : undefined,
      additionalInfo: Array.isArray(raw.additionalInfo) ? raw.additionalInfo.map(String) : undefined,
      itineraryOverview:
        typeof raw.itineraryOverview === 'string' ? raw.itineraryOverview : undefined,
      pricingType: typeof raw.pricingType === 'string' ? raw.pricingType : undefined,
      unitType: typeof raw.unitType === 'string' ? raw.unitType : undefined,
      minTravelers: typeof raw.minTravelers === 'number' ? raw.minTravelers : undefined,
      maxTravelers: typeof raw.maxTravelers === 'number' ? raw.maxTravelers : undefined,
      privateTour: typeof raw.privateTour === 'boolean' ? raw.privateTour : undefined,
      itineraryType: typeof raw.itineraryType === 'string' ? raw.itineraryType : undefined,
    },
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
      ok: search.live && search.products.length > 0,
      clue:
        search.error ||
        (search.products.length ? `OK · dest ${VIATOR_NASHVILLE_DESTINATION_ID}` : 'No products'),
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
