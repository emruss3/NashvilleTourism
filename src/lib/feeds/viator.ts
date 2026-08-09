/**
 * NashRoam server-side client for the Supabase Viator integration.
 *
 * Architecture:
 *   Next.js (this module) → Supabase Edge Function `viator-sync` → Viator sandbox
 *
 * - DO NOT call api.viator.com from Next.js.
 * - DO NOT require VIATOR_API_KEY in Vercel — the key lives in Supabase secrets.
 * - Default Viator environment is sandbox (Basic Access Affiliate).
 * - Destination: Nashville = 799.
 */

import { invokeEdgeFunction, isSupabaseConfigured } from '@/lib/supabase/server';

export const VIATOR_NASHVILLE_DESTINATION_ID = '799';
export const VIATOR_NASHVILLE_LOOKUP_ID = '8.77.295.799';
/** Max cache for search/product per Viator real-time guidance. */
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
  // Configured when Supabase service role can reach the Edge Function.
  // VIATOR_API_KEY is intentionally NOT read here.
  return isSupabaseConfigured();
}

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
    const result = await invokeEdgeFunction<EdgeEnvelope>('viator-sync', {
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
        error: data?.error || `viator-sync search failed (${result.status})`,
        httpStatus: result.status,
        environment: data?.environment,
        rateLimitRemaining: data?.rateLimitRemaining,
      };
    }

    const products = (data.products ?? [])
      .map((p) => mapNormalized(p))
      .filter(Boolean) as ViatorProductSummary[];

    // Optional free-text filter client-side (Viator search is structured filters)
    const q = params.query?.trim().toLowerCase();
    const filtered = q
      ? products.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            (p.description?.toLowerCase().includes(q) ?? false),
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

export async function getViatorProduct(productCode: string): Promise<{
  configured: boolean;
  live: boolean;
  product?: ViatorProductDetail;
  error?: string;
  httpStatus?: number;
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

  const result = await invokeEdgeFunction<EdgeEnvelope>('viator-sync', {
    mode: 'get_product',
    productCode: code,
    campaign: 'tours-detail',
  });

  const data = result.data;
  if (!result.ok || !data?.ok) {
    return {
      configured: true,
      live: false,
      error: data?.error || `viator-sync get_product failed (${result.status})`,
      httpStatus: result.status,
    };
  }

  const normalized = data.normalized
    ? mapNormalized(data.normalized)
    : data.product
      ? mapNormalized({
          productCode: data.product.productCode,
          title: data.product.title,
          description: data.product.description,
          productUrl: data.product.productUrl,
          imageUrl: undefined,
          rating: (data.product.reviews as { combinedAverageRating?: number } | undefined)
            ?.combinedAverageRating,
          reviewCount: (data.product.reviews as { totalReviews?: number } | undefined)?.totalReviews,
          fromPrice: (data.product.pricing as { summary?: { fromPrice?: number } } | undefined)
            ?.summary?.fromPrice,
          currency: (data.product.pricing as { currency?: string } | undefined)?.currency,
          flags: data.product.flags,
          freeCancellation: Array.isArray(data.product.flags)
            ? (data.product.flags as string[]).includes('FREE_CANCELLATION')
            : false,
        })
      : null;

  if (!normalized) {
    return { configured: true, live: false, error: 'Product missing affiliate productUrl', httpStatus: 502 };
  }

  return {
    configured: true,
    live: true,
    httpStatus: 200,
    product: {
      ...normalized,
      confirmationType:
        typeof data.product?.confirmationType === 'string'
          ? data.product.confirmationType
          : undefined,
    },
  };
}

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
  }>('viator-sync', {
    mode: 'sync_nashville_catalog',
    maxPages: opts.maxPages ?? 3,
    limit: opts.limit ?? 180,
    startDate: opts.startDate,
    endDate: opts.endDate,
    campaign: 'catalog-sync',
  }, { timeoutMs: 120_000 });

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

/** Health via Edge Function — Basic Access only (no Full Access probes). */
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

  const health = await invokeEdgeFunction<EdgeEnvelope>('viator-sync', { mode: 'health' });
  const probes: ViatorProbeResult[] = [
    {
      endpoint: 'edge:viator-sync/health→GET /destinations',
      method: 'GET',
      httpStatus: health.status,
      ok: Boolean(health.ok && health.data?.ok),
      clue: health.data?.error ||
        (health.data?.ok ? `OK (${health.data.environment || 'sandbox'})` : `HTTP ${health.status}`),
    },
  ];

  let sampleProductCode: string | undefined;
  if (health.ok && health.data?.ok) {
    const search = await searchNashvilleProducts({ count: 1, sort: 'TRAVELER_RATING' });
    probes.push({
      endpoint: 'edge:viator-sync/search_products→POST /products/search',
      method: 'POST',
      httpStatus: search.httpStatus ?? null,
      ok: search.live,
      clue: search.error ||
        (search.live ? `OK · dest ${VIATOR_NASHVILLE_DESTINATION_ID}` : 'No products'),
    });
    sampleProductCode = search.products[0]?.productCode;

    if (sampleProductCode) {
      const detail = await getViatorProduct(sampleProductCode);
      probes.push({
        endpoint: `edge:viator-sync/get_product→GET /products/${sampleProductCode}`,
        method: 'GET',
        httpStatus: detail.httpStatus ?? null,
        ok: Boolean(detail.live),
        clue: detail.error || 'OK',
      });
    }
  }

  const inferredTier: ViatorAccessTier =
    !health.ok
      ? 'error'
      : health.data?.ok
        ? 'basic_affiliate'
        : 'error';

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
