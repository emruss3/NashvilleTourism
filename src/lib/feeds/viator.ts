/**
 * NashRoam server-side client for Viator.
 *
 * Public marketplace path:
 *   Next.js -> Supabase Edge Function `viator-live` -> Viator production
 *
 * Search strategy:
 * - unfiltered Nashville browse -> /products/search
 * - user-entered words -> /search/freetext with searchType PRODUCTS
 * - selected result -> /products/{product-code}
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
  /** Exact Viator affiliate productUrl — never reconstruct or modify. */
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
  /** True when the live provider request succeeded, even when there are zero matches. */
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
  normalized?: Record<string, unknown>;
  rateLimitRemaining?: string | null;
  retryAfter?: string | null;
  nashvilleDestinationId?: string;
  authenticated?: boolean;
  details?: unknown;
};

const inFlight = new Map<string, Promise<ViatorSearchResult>>();

function queryTokens(query: string): string[] {
  const stop = new Set(['nashville', 'tour', 'tours', 'the', 'and', 'with']);
  return query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stop.has(token));
}

function productSearchText(product: ViatorProductSummary): string {
  return [
    product.title,
    product.description ?? '',
    ...(product.categories ?? []),
  ]
    .join(' ')
    .toLowerCase();
}

type IntentConstraintResult = {
  products: ViatorProductSummary[];
  constrained: boolean;
};

/**
 * Viator freetext intentionally favors recall. For a handful of high-intent
 * Nashville marketplace phrases, that can create bad semantic collisions:
 * "pedal tavern" -> pedal kayak, or "party bus" -> party boat. These rules do
 * not invent inventory; they only remove provider results that clearly fail the
 * user's stated intent. For a known intent, zero accurate matches is preferable
 * to showing an unrelated experience.
 */
function constrainKnownIntent(
  products: ViatorProductSummary[],
  query: string,
): IntentConstraintResult {
  const q = query.trim().toLowerCase().replace(/[’']/g, "'");
  const keep = (predicate: (text: string) => boolean) => ({
    products: products.filter((product) => predicate(productSearchText(product))),
    constrained: true,
  });

  if (/\b(pedal tavern|pedal pub|party bike|pedal bar)\b/.test(q)) {
    return keep(
      (text) =>
        !/\b(kayak|canoe|paddleboard|paddle board)\b/.test(text) &&
        (/\b(pedal tavern|pedal pub|party bike|pedal bar)\b/.test(text) ||
          (/\bpedal\b/.test(text) && /\b(tavern|pub|bar|party bike)\b/.test(text))),
    );
  }

  if (/\bparty bus\b/.test(q)) {
    return keep(
      (text) =>
        !/\b(boat|pontoon|cruise|kayak)\b/.test(text) &&
        /\b(bus|vehicle|truck|on wheels)\b/.test(text) &&
        /\b(party|honky|drag|bar|nightlife)\b/.test(text),
    );
  }

  if (/\b(pub crawl|bar crawl|honky.?tonk.*crawl)\b/.test(q)) {
    return keep(
      (text) =>
        /\bcrawl\b/.test(text) &&
        /\b(pub|bar|honky|drink|drinks|whiskey|nightlife)\b/.test(text),
    );
  }

  if (/\b(whiskey|whisky|distill|bourbon|jack daniel)\b/.test(q)) {
    return keep((text) => /\b(whiskey|whisky|distill\w*|bourbon|barrel|jack daniel|lynchburg)\b/.test(text));
  }

  if (/\bboat tour\b/.test(q)) {
    return keep(
      (text) =>
        !/\b(bus|trolley)\b/.test(text) &&
        /\b(boat|pontoon|cruise|riverboat|river cruise)\b/.test(text),
    );
  }

  if (/\b(bike tour|bicycle tour|e-?bike tour|cycling tour)\b/.test(q)) {
    return keep(
      (text) =>
        !/\b(kayak|canoe|paddleboard|paddle board)\b/.test(text) &&
        /\b(bike|bicycle|e-bike|ebike|cycling)\b/.test(text),
    );
  }

  if (/\bfood tour\b/.test(q)) {
    return keep((text) => /\b(food|culinary|tasting|bbq|barbecue|restaurant|donut|chocolate|coffee)\b/.test(text));
  }

  if (/\bmusic history\b/.test(q)) {
    return keep((text) => /\b(music|songwriter|studio|music row|country music|ryman|opry)\b/.test(text));
  }

  if (/\bcity sightseeing\b/.test(q)) {
    return keep((text) => /\b(sightseeing|city tour|walking tour|trolley|landmark|mural|history tour)\b/.test(text));
  }

  return { products, constrained: false };
}

/**
 * Viator does the actual freetext retrieval. Local scoring is only a stable
 * presentation tie-breaker so a direct title phrase stays ahead of a product
 * that mentions the phrase once deep in its teaser.
 */
function rankForQuery(products: ViatorProductSummary[], query: string): ViatorProductSummary[] {
  const q = query.trim().toLowerCase();
  const tokens = queryTokens(query);
  if (!q || !tokens.length) return products;

  return products
    .map((product, index) => {
      const title = product.title.toLowerCase();
      const description = product.description?.toLowerCase() ?? '';
      const categories = (product.categories ?? []).join(' ').toLowerCase();
      const haystack = `${title} ${categories} ${description}`;
      let score = title.includes(q) ? 30 : haystack.includes(q) ? 15 : 0;
      for (const token of tokens) {
        if (title.includes(token)) score += 6;
        else if (categories.includes(token)) score += 3;
        else if (description.includes(token)) score += 1;
      }
      return { product, score, index };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.product.rating ?? 0) - (a.product.rating ?? 0) ||
        (b.product.reviewCount ?? 0) - (a.product.reviewCount ?? 0) ||
        a.index - b.index,
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

  const query = params.query?.trim();
  const requestedCount = Math.min(params.count ?? 24, 50);
  const providerCount = query ? 50 : requestedCount;
  const mode = query ? 'search_freetext' : 'search_products';

  const key = JSON.stringify({
    mode,
    query: query ?? null,
    start: params.start ?? 1,
    count: providerCount,
    sort: params.sort ?? 'TRAVELER_RATING',
    order: params.order ?? 'DESCENDING',
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
      mode,
      query,
      start: params.start ?? 1,
      count: providerCount,
      sort: params.sort ?? 'TRAVELER_RATING',
      order: params.order ?? 'DESCENDING',
      startDate: params.startDate,
      endDate: params.endDate,
      currency: params.currency ?? 'USD',
      flags: params.flags,
      tags: params.tags,
      campaign: params.campaign ?? (query ? 'tours-search' : 'tours-marketplace'),
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
            : `viator-live ${mode} failed (${result.status})`,
        httpStatus: result.status,
        environment: data?.environment,
        rateLimitRemaining: data?.rateLimitRemaining,
      };
    }

    const products = (data.products ?? [])
      .map((product) => mapNormalized(product))
      .filter(Boolean) as ViatorProductSummary[];
    const constrained = query
      ? constrainKnownIntent(products, query)
      : { products, constrained: false };
    const ranked = query ? rankForQuery(constrained.products, query) : products;

    return {
      configured: true,
      live: true,
      products: ranked.slice(0, requestedCount),
      totalCount: constrained.constrained ? ranked.length : data.totalCount ?? ranked.length,
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
