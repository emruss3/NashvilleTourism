import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Viator Partner API v2 integration boundary for Nashroam.
 *
 * Default environment: sandbox (https://api.sandbox.viator.com/partner).
 * Production Viator is NEVER used unless VIATOR_API_ENV=production is set
 * AND a production key is configured. Do not call production with a sandbox key.
 *
 * Basic Access Affiliate endpoints only in sync/search paths:
 * - POST /products/search
 * - GET /products/{product-code}
 * - GET /products/tags
 * - GET /availability/schedules/{product-code}
 * - GET /destinations
 *
 * Do NOT call /products/modified-since, /products/bulk, or /availability/check.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const API_KEY =
  Deno.env.get("VIATOR_API_KEY") ??
  Deno.env.get("VIATOR_PARTNER_API_KEY") ??
  Deno.env.get("VIATOR_API");
const VIATOR_ENV = (Deno.env.get("VIATOR_API_ENV") ?? "sandbox").toLowerCase();
const BASE_URL = VIATOR_ENV === "production"
  ? "https://api.viator.com/partner"
  : "https://api.sandbox.viator.com/partner";

/** Nashville destination — confirmed for this account. */
const NASHVILLE_DESTINATION_ID = "799";
const NASHVILLE_LOOKUP_ID = "8.77.295.799";
const NASHVILLE_PARENT_DESTINATION_ID = 295;

const jsonHeaders = { "content-type": "application/json" };
const SEARCH_CACHE_TTL_MS = 60 * 60 * 1000; // Viator real-time guidance ≤ 1 hour
const CATALOG_STATE_TTL_HOURS = 24;

type ViatorFetchResult = {
  data: unknown;
  status: number;
  requestId: string | null;
  rateLimitRemaining: string | null;
  rateLimitReset: string | null;
  retryAfter: string | null;
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function viatorFetch(
  path: string,
  init: RequestInit = {},
): Promise<ViatorFetchResult> {
  if (!API_KEY) {
    throw Object.assign(
      new Error(
        "Missing VIATOR_API_KEY (or VIATOR_PARTNER_API_KEY / VIATOR_API) Edge Function secret",
      ),
      { status: 500 },
    );
  }

  const headers = new Headers(init.headers);
  headers.set("exp-api-key", API_KEY);
  headers.set("Accept", "application/json;version=2.0");
  headers.set("Accept-Language", "en-US");
  if (init.body) headers.set("Content-Type", "application/json;version=2.0");

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 1000) };
  }

  const result: ViatorFetchResult = {
    data,
    status: res.status,
    requestId: res.headers.get("x-unique-id") ?? res.headers.get("X-Unique-ID"),
    rateLimitRemaining: res.headers.get("ratelimit-remaining") ??
      res.headers.get("RateLimit-Remaining"),
    rateLimitReset: res.headers.get("ratelimit-reset") ??
      res.headers.get("RateLimit-Reset"),
    retryAfter: res.headers.get("retry-after") ?? res.headers.get("Retry-After"),
  };

  if (!res.ok) {
    const err = new Error(`Viator ${res.status} ${res.statusText}`) as Error & {
      details?: unknown;
      status?: number;
      retryAfter?: string | null;
      rateLimitRemaining?: string | null;
    };
    err.details = data;
    err.status = res.status;
    err.retryAfter = result.retryAfter;
    err.rateLimitRemaining = result.rateLimitRemaining;
    throw err;
  }

  return result;
}

async function supabaseRest(
  path: string,
  init: RequestInit & { prefer?: string } = {},
) {
  const headers = new Headers(init.headers);
  headers.set("apikey", SERVICE_ROLE_KEY);
  headers.set("authorization", `Bearer ${SERVICE_ROLE_KEY}`);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (init.prefer) headers.set("prefer", init.prefer);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase ${path} failed: ${res.status} ${text}`);
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function upsert(table: string, rows: unknown[], onConflict?: string) {
  if (!rows.length) return;
  const params = new URLSearchParams();
  if (onConflict) params.set("on_conflict", onConflict);
  await supabaseRest(`${table}?${params}`, {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify(rows),
  });
}

async function getViatorSourceId(): Promise<string | null> {
  const rows = await supabaseRest(
    "data_sources?provider_key=eq.viator&select=id&limit=1",
  );
  return Array.isArray(rows) ? rows?.[0]?.id ?? null : null;
}

function destinationArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.destinations)) return payload.destinations;
  return [];
}

function mapDestination(d: any, fetchedAt: string) {
  const center = d?.center ?? {};
  const name = String(d?.name ?? "");
  const destinationId = Number(d.destinationId);
  return {
    destination_id: destinationId,
    name,
    destination_type: d?.type ?? null,
    parent_destination_id: d?.parentDestinationId ?? null,
    lookup_id: d?.lookupId ?? null,
    destination_url: d?.destinationUrl ?? null,
    default_currency_code: d?.defaultCurrencyCode ?? null,
    time_zone: d?.timeZone ?? null,
    iata_code: d?.iataCode ?? null,
    latitude: center?.latitude ?? null,
    longitude: center?.longitude ?? null,
    is_nashville: destinationId === 799 ||
      String(d?.lookupId ?? "") === NASHVILLE_LOOKUP_ID ||
      name.trim().toLowerCase() === "nashville",
    fetched_at: fetchedAt,
  };
}

/** Official ProductSearchSorting.sort values include TRAVELER_RATING (see Partner API docs). */
type SearchSort =
  | "DEFAULT"
  | "ITINERARY_DURATION"
  | "PRICE"
  | "REVIEW_AVG_RATING"
  | "DATE_ADDED"
  | "TRAVELER_RATING";

function buildSearchBody(input: {
  startDate?: string;
  endDate?: string;
  start?: number;
  count?: number;
  sort?: string;
  order?: string;
  currency?: string;
  flags?: string[];
  tags?: number[];
  lowestPrice?: number;
  highestPrice?: number;
}) {
  const count = Math.min(Math.max(Number(input.count) || 20, 1), 50);
  const start = Math.max(Number(input.start) || 1, 1);
  const sort = (input.sort || "TRAVELER_RATING") as SearchSort;
  const order = input.order === "ASCENDING" ? "ASCENDING" : "DESCENDING";
  const currency = input.currency || "USD";

  const filtering: Record<string, unknown> = {
    destination: NASHVILLE_DESTINATION_ID,
  };
  if (input.startDate) filtering.startDate = String(input.startDate);
  if (input.endDate) filtering.endDate = String(input.endDate);
  if (Array.isArray(input.flags) && input.flags.length) {
    filtering.flags = input.flags;
  }
  if (Array.isArray(input.tags) && input.tags.length) {
    filtering.tags = input.tags;
  }
  if (input.lowestPrice != null) filtering.lowestPrice = input.lowestPrice;
  if (input.highestPrice != null) filtering.highestPrice = input.highestPrice;

  return {
    filtering,
    sorting: { sort, order },
    pagination: { start, count },
    currency,
  };
}

function pickImageUrl(images: unknown): string | undefined {
  if (!Array.isArray(images) || !images.length) return undefined;
  type Variant = { height?: number; width?: number; url?: string };
  type Img = { isCover?: boolean; variants?: Variant[] };
  const cover = (images as Img[]).find((i) => i.isCover) ?? (images as Img[])[0];
  const variants = Array.isArray(cover?.variants) ? cover.variants : [];
  const ranked = [...variants]
    .filter((v) => v?.url)
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  const mid = ranked.find((v) => (v.width ?? 0) >= 400) ?? ranked[0];
  return mid?.url;
}

function durationMinutes(duration: any): {
  min?: number;
  max?: number;
  label?: string;
} {
  if (!duration || typeof duration !== "object") return {};
  if (typeof duration.fixedDurationInMinutes === "number") {
    const m = duration.fixedDurationInMinutes;
    return { min: m, max: m, label: formatDuration(m) };
  }
  const from = duration.variableDurationFromMinutes;
  const to = duration.variableDurationToMinutes;
  if (typeof from === "number" || typeof to === "number") {
    return {
      min: typeof from === "number" ? from : undefined,
      max: typeof to === "number" ? to : undefined,
      label: formatDurationRange(from, to),
    };
  }
  return {};
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatDurationRange(from?: number, to?: number): string | undefined {
  if (from != null && to != null) {
    return from === to
      ? formatDuration(from)
      : `${formatDuration(from)}–${formatDuration(to)}`;
  }
  if (from != null) return `From ${formatDuration(from)}`;
  if (to != null) return `Up to ${formatDuration(to)}`;
  return undefined;
}


function categorize(title: string, tags: number[]): string[] {
  const t = title.toLowerCase();
  const cats = new Set<string>();
  const rules: [RegExp, string][] = [
    [/food|culinary|dinner|lunch|taste|bbq|hot chicken/, "food"],
    [/walk|walking|ghost|history tour/, "walking"],
    [/brew|beer|whiskey|whisky|distill|bourbon|wine|tasting/, "brewery-distillery"],
    [/music|honky|songwriter|bluegrass|guitar|ryman/, "music"],
    [/museum|admission|ticket|hall of fame/, "museum-admission"],
    [/sight|city tour|hop.?on|bus tour|sightseeing/, "sightseeing"],
    [/kayak|bike|hike|outdoor|paddle|nature|park/, "outdoor"],
    [/party|bachel|pedal|bar crawl|nightlife/, "group"],
    [/family|kid|child/, "family"],
  ];
  for (const [re, cat] of rules) {
    if (re.test(t)) cats.add(cat);
  }
  if (!cats.size && tags?.length) cats.add("experience");
  if (!cats.size) cats.add("tour");
  return [...cats];
}

function preferredTravelerTypes(categories: string[]): string[] {
  const out = new Set<string>(["first-visit"]);
  if (categories.includes("food")) out.add("food");
  if (categories.includes("music")) out.add("music");
  if (categories.includes("family")) out.add("family");
  if (categories.includes("group")) {
    out.add("friends");
    out.add("bachelor");
    out.add("bachelorette");
  }
  if (categories.includes("outdoor")) out.add("couples");
  return [...out];
}

function qualityScore(p: NormalizedProduct): number {
  let score = 40;
  if (p.rating != null) score += Math.min(30, p.rating * 6);
  if (p.reviewCount != null) {
    score += Math.min(20, Math.log10(p.reviewCount + 1) * 8);
  }
  if (p.imageUrl) score += 5;
  if (p.freeCancellation) score += 3;
  if (p.productUrl) score += 2;
  const cats = p.categories;
  if (
    cats.some((c) =>
      ["food", "walking", "music", "sightseeing", "brewery-distillery", "outdoor"]
        .includes(c)
    )
  ) {
    score += 5;
  }
  return Math.min(100, Math.round(score * 10) / 10);
}

function meetsPublishThreshold(p: NormalizedProduct): boolean {
  return Boolean(
    p.productCode &&
      p.title &&
      p.productUrl &&
      p.imageUrl &&
      (p.rating ?? 0) >= 4.0 &&
      (p.reviewCount ?? 0) >= 15 &&
      qualityScore(p) >= 70,
  );
}

export type NormalizedProduct = {
  productCode: string;
  title: string;
  description?: string;
  /** Exact affiliate productUrl from Viator — never mutate. */
  productUrl: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  fromPrice?: number;
  currency?: string;
  durationMinMinutes?: number;
  durationMaxMinutes?: number;
  durationLabel?: string;
  freeCancellation: boolean;
  flags: string[];
  confirmationType?: string;
  tags: number[];
  categories: string[];
};

function normalizeProduct(raw: any): NormalizedProduct | null {
  const productCode = String(raw?.productCode ?? "").trim();
  const title = String(raw?.title ?? "").trim();
  // Preserve productUrl EXACTLY as returned (affiliate attribution).
  const productUrl = typeof raw?.productUrl === "string" ? raw.productUrl : "";
  if (!productCode || !title || !productUrl) return null;

  const reviews = raw?.reviews ?? {};
  const rating = typeof reviews.combinedAverageRating === "number"
    ? reviews.combinedAverageRating
    : undefined;
  const reviewCount = typeof reviews.totalReviews === "number"
    ? reviews.totalReviews
    : undefined;
  const pricing = raw?.pricing?.summary ?? {};
  const currency = raw?.pricing?.currency ?? "USD";
  const fromPrice = typeof pricing.fromPrice === "number"
    ? pricing.fromPrice
    : undefined;
  const flags = Array.isArray(raw?.flags) ? raw.flags.map(String) : [];
  const tags = Array.isArray(raw?.tags)
    ? raw.tags.map((t: unknown) => Number(t)).filter((n: number) => !Number.isNaN(n))
    : [];
  const dur = durationMinutes(raw?.duration);
  const categories = categorize(title, tags);

  return {
    productCode,
    title,
    description: typeof raw?.description === "string"
      ? raw.description.slice(0, 600)
      : undefined,
    productUrl,
    imageUrl: pickImageUrl(raw?.images),
    rating,
    reviewCount,
    fromPrice,
    currency,
    durationMinMinutes: dur.min,
    durationMaxMinutes: dur.max,
    durationLabel: dur.label,
    freeCancellation: flags.includes("FREE_CANCELLATION"),
    flags,
    confirmationType: raw?.confirmationType
      ? String(raw.confirmationType)
      : undefined,
    tags,
    categories,
  };
}

function dedupeByTitle(products: NormalizedProduct[]): NormalizedProduct[] {
  const best = new Map<string, NormalizedProduct>();
  for (const p of products) {
    const key = p.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const prev = best.get(key);
    if (!prev) {
      best.set(key, p);
      continue;
    }
    const prevScore = (prev.reviewCount ?? 0) + (prev.rating ?? 0) * 100;
    const nextScore = (p.reviewCount ?? 0) + (p.rating ?? 0) * 100;
    if (nextScore > prevScore) best.set(key, p);
  }
  return [...best.values()];
}

async function searchProductsPage(body: ReturnType<typeof buildSearchBody>, campaign?: string) {
  const qs = campaign
    ? `?campaign-value=${encodeURIComponent(campaign)}`
    : "";
  return viatorFetch(`/products/search${qs}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function upsertCatalogProducts(
  products: NormalizedProduct[],
  sourceId: string,
  campaign?: string,
) {
  const fetchedAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + CATALOG_STATE_TTL_HOURS * 3600 * 1000,
  ).toISOString();
  let upserted = 0;
  let published = 0;

  for (const p of products) {
    // Stable slug keyed by Viator productCode (matches stabilize_viator_experience_slugs).
    const slug = `viator-${p.productCode.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
    const publish = meetsPublishThreshold(p);
    const q = qualityScore(p);

    // Find existing by source external_id
    const existingLinks = await supabaseRest(
      `experience_source_ids?source_id=eq.${sourceId}&external_id=eq.${
        encodeURIComponent(p.productCode)
      }&select=experience_id&limit=1`,
    );
    let experienceId: string | null = Array.isArray(existingLinks)
      ? existingLinks[0]?.experience_id ?? null
      : null;

    if (!experienceId) {
      const inserted = await supabaseRest("experiences?select=id", {
        method: "POST",
        prefer: "return=representation",
        body: JSON.stringify([{
          slug,
          title: p.title,
          experience_type: p.categories[0] ?? "tour",
          categories: p.categories,
          summary: null, // Nashroam editorial copy — never auto-fill from supplier prose
          duration_min_minutes: p.durationMinMinutes ?? null,
          duration_max_minutes: p.durationMaxMinutes ?? null,
          status: publish ? "active" : "unverified",
          is_published: publish,
        }]),
      });
      experienceId = Array.isArray(inserted) ? inserted[0]?.id ?? null : null;
    } else {
      const patch: Record<string, unknown> = {
        slug,
        title: p.title,
        experience_type: p.categories[0] ?? "tour",
        categories: p.categories,
        duration_min_minutes: p.durationMinMinutes ?? null,
        duration_max_minutes: p.durationMaxMinutes ?? null,
      };
      // Promote when quality threshold met; never auto-unpublish curated rows.
      if (publish) {
        patch.status = "active";
        patch.is_published = true;
      }
      await supabaseRest(`experiences?id=eq.${experienceId}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: JSON.stringify(patch),
      });
    }

    if (!experienceId) continue;

    await upsert(
      "experience_source_ids",
      [{
        experience_id: experienceId,
        source_id: sourceId,
        external_id: p.productCode,
        external_url: p.productUrl, // exact
        is_primary: true,
        last_matched_at: fetchedAt,
        metadata: {
          campaign: campaign ?? null,
          flags: p.flags,
          tags: p.tags,
        },
      }],
      "experience_id,source_id",
    );

    await upsert(
      "experience_source_state",
      [{
        experience_id: experienceId,
        source_id: sourceId,
        external_status: "active",
        rating_value: p.rating ?? null,
        rating_scale: 5,
        review_count: p.reviewCount ?? null,
        from_price: p.fromPrice ?? null,
        currency: p.currency ?? "USD",
        duration_min_minutes: p.durationMinMinutes ?? null,
        duration_max_minutes: p.durationMaxMinutes ?? null,
        booking_url: p.productUrl, // exact affiliate URL
        confirmation_type: p.confirmationType ?? null,
        fetched_at: fetchedAt,
        expires_at: expiresAt,
        display_allowed: true,
        attribution: "Viator",
        metadata: {
          imageUrl: p.imageUrl ?? null,
          freeCancellation: p.freeCancellation,
          flags: p.flags,
          durationLabel: p.durationLabel ?? null,
          environment: VIATOR_ENV,
          qualityScore: q,
        },
      }],
      "experience_id,source_id",
    );

    await upsert(
      "experience_editorial",
      [{
        experience_id: experienceId,
        nashroam_score: q,
        planner_priority: publish ? Math.min(90, Math.round(q)) : 40,
        best_for: p.categories,
        traveler_types: preferredTravelerTypes(p.categories),
        local_note: null, // first-party only — leave empty until curated
      }],
      "experience_id",
    );

    upserted += 1;
    if (publish) published += 1;
  }

  return { upserted, published };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return response({ error: "POST required" }, 405);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const mode = body?.mode ?? "health";

  try {
    if (mode === "health") {
      const result = await viatorFetch("/destinations");
      const destinations = destinationArray(result.data);
      const nashville = destinations.filter((d: any) => {
        const id = Number(d?.destinationId);
        return id === 799 ||
          String(d?.lookupId ?? "") === NASHVILLE_LOOKUP_ID ||
          String(d?.name ?? "").toLowerCase().includes("nashville");
      });

      return response({
        ok: true,
        environment: VIATOR_ENV,
        baseUrl: BASE_URL,
        authenticated: true,
        nashvilleDestinationId: NASHVILLE_DESTINATION_ID,
        nashvilleLookupId: NASHVILLE_LOOKUP_ID,
        nashvilleParentDestinationId: NASHVILLE_PARENT_DESTINATION_ID,
        destinationCount: destinations.length,
        nashvilleMatches: nashville.map((d: any) => ({
          destinationId: d.destinationId,
          name: d.name,
          type: d.type,
          parentDestinationId: d.parentDestinationId,
          lookupId: d.lookupId,
        })),
        requestId: result.requestId,
        rateLimitRemaining: result.rateLimitRemaining,
        rateLimitReset: result.rateLimitReset,
        accessTierNote:
          "Basic Access Affiliate sandbox. Do not call production or Full Access-only endpoints.",
      });
    }

    if (mode === "sync_destinations") {
      const startedAt = new Date().toISOString();
      const result = await viatorFetch("/destinations");
      const destinations = destinationArray(result.data);
      const rows = destinations
        .filter((d: any) => d?.destinationId != null && d?.name)
        .map((d: any) => mapDestination(d, startedAt));

      for (let i = 0; i < rows.length; i += 500) {
        await upsert(
          "viator_destinations",
          rows.slice(i, i + 500),
          "destination_id",
        );
      }

      const sourceId = await getViatorSourceId();
      if (sourceId) {
        await upsert(
          "ingestion_cursors",
          [{
            source_id: sourceId,
            stream_key: "viator_destinations",
            cursor_value: null,
            last_success_at: startedAt,
            metadata: {
              environment: VIATOR_ENV,
              count: rows.length,
              requestId: result.requestId,
            },
          }],
          "source_id,stream_key",
        );
      }

      return response({
        ok: true,
        environment: VIATOR_ENV,
        synced: rows.length,
        nashvilleMatches: rows.filter((r: any) => r.is_nashville),
        requestId: result.requestId,
        rateLimitRemaining: result.rateLimitRemaining,
      });
    }

    if (mode === "search_products") {
      const campaign = body?.campaign ? String(body.campaign) : "tours-marketplace";
      const searchBody = buildSearchBody({
        startDate: body?.startDate,
        endDate: body?.endDate,
        start: body?.start ?? body?.pagination?.start,
        count: body?.count ?? body?.pagination?.count,
        sort: body?.sort ?? body?.sorting?.sort,
        order: body?.order ?? body?.sorting?.order,
        currency: body?.currency,
        flags: body?.flags,
        tags: body?.tags,
        lowestPrice: body?.lowestPrice,
        highestPrice: body?.highestPrice,
      });

      const result = await searchProductsPage(searchBody, campaign);
      const rawProducts = Array.isArray((result.data as any)?.products)
        ? (result.data as any).products
        : [];
      const products = rawProducts
        .map(normalizeProduct)
        .filter(Boolean) as NormalizedProduct[];

      return response({
        ok: true,
        environment: VIATOR_ENV,
        destinationId: NASHVILLE_DESTINATION_ID,
        request: searchBody,
        totalCount: (result.data as any)?.totalCount ?? products.length,
        products,
        // Prove affiliate URLs survive normalization byte-for-byte
        affiliateUrlIntegrity: products.map((p: NormalizedProduct, i: number) => ({
          productCode: p.productCode,
          productUrlExactMatch: p.productUrl === rawProducts[i]?.productUrl,
        })),
        requestId: result.requestId,
        rateLimitRemaining: result.rateLimitRemaining,
        cacheHintSeconds: SEARCH_CACHE_TTL_MS / 1000,
      });
    }

    if (mode === "sync_nashville_catalog") {
      const startedAt = new Date().toISOString();
      const sourceId = await getViatorSourceId();
      if (!sourceId) {
        return response({
          ok: false,
          error: "Viator data_sources row missing",
        }, 500);
      }

      // Record ingestion run
      const runRows = await supabaseRest("ingestion_runs?select=id", {
        method: "POST",
        prefer: "return=representation",
        body: JSON.stringify([{
          source_id: sourceId,
          job_type: "viator_nashville_catalog",
          status: "running",
          metadata: { environment: VIATOR_ENV, destinationId: NASHVILLE_DESTINATION_ID },
        }]),
      });
      const runId = Array.isArray(runRows) ? runRows[0]?.id : null;

      const campaign = body?.campaign
        ? String(body.campaign)
        : "catalog-sync";
      const maxPages = Math.min(Math.max(Number(body?.maxPages) || 3, 1), 4);
      const pageSize = Math.min(Math.max(Number(body?.count) || 50, 1), 50);
      const all: NormalizedProduct[] = [];
      let lastRate: string | null = null;
      let lastRequestId: string | null = null;
      let fetched = 0;

      try {
        for (let page = 0; page < maxPages; page++) {
          const start = page * pageSize + 1;
          const searchBody = buildSearchBody({
            startDate: body?.startDate,
            endDate: body?.endDate,
            start,
            count: pageSize,
            sort: body?.sort || "TRAVELER_RATING",
            order: "DESCENDING",
            currency: "USD",
            flags: body?.flags,
            tags: body?.tags,
          });
          const result = await searchProductsPage(searchBody, campaign);
          lastRate = result.rateLimitRemaining;
          lastRequestId = result.requestId;
          const rawProducts = Array.isArray((result.data as any)?.products)
            ? (result.data as any).products
            : [];
          fetched += rawProducts.length;
          for (const raw of rawProducts) {
            const n = normalizeProduct(raw);
            if (n) all.push(n);
          }
          if (rawProducts.length < pageSize) break;
          // Gentle pacing — sandbox rate limits are tight
          await sleep(750);
          if (lastRate != null && Number(lastRate) <= 0) break;
        }

        const curated = dedupeByTitle(all)
          .sort((a, b) => qualityScore(b) - qualityScore(a))
          .slice(0, Math.min(Number(body?.limit) || 180, 200));

        const { upserted, published } = await upsertCatalogProducts(
          curated,
          sourceId,
          campaign,
        );

        await upsert(
          "ingestion_cursors",
          [{
            source_id: sourceId,
            stream_key: "viator_nashville_products_search",
            cursor_value: String(curated.length),
            last_success_at: startedAt,
            metadata: {
              environment: VIATOR_ENV,
              fetched,
              upserted,
              published,
              requestId: lastRequestId,
            },
          }],
          "source_id,stream_key",
        );

        // Mark Viator source active after successful authenticated sync
        await supabaseRest("data_sources?provider_key=eq.viator", {
          method: "PATCH",
          prefer: "return=minimal",
          body: JSON.stringify({
            active: true,
            base_url: BASE_URL,
            notes:
              `Basic Access Affiliate (${VIATOR_ENV}). Nashville destination ${NASHVILLE_DESTINATION_ID}. Preserve productUrl exactly.`,
          }),
        });

        if (runId) {
          await supabaseRest(`ingestion_runs?id=eq.${runId}`, {
            method: "PATCH",
            prefer: "return=minimal",
            body: JSON.stringify({
              status: "succeeded",
              completed_at: new Date().toISOString(),
              records_fetched: fetched,
              records_upserted: upserted,
              metadata: {
                published,
                environment: VIATOR_ENV,
                requestId: lastRequestId,
              },
            }),
          });
        }

        return response({
          ok: true,
          environment: VIATOR_ENV,
          destinationId: NASHVILLE_DESTINATION_ID,
          fetched,
          curated: curated.length,
          upserted,
          published,
          sample: curated.slice(0, 10).map((p) => ({
            productCode: p.productCode,
            title: p.title,
            productUrl: p.productUrl,
            rating: p.rating,
            reviewCount: p.reviewCount,
            fromPrice: p.fromPrice,
          })),
          requestId: lastRequestId,
          rateLimitRemaining: lastRate,
        });
      } catch (err) {
        if (runId) {
          const e = err as Error;
          await supabaseRest(`ingestion_runs?id=eq.${runId}`, {
            method: "PATCH",
            prefer: "return=minimal",
            body: JSON.stringify({
              status: "failed",
              completed_at: new Date().toISOString(),
              error_message: e.message,
              records_fetched: fetched,
            }),
          }).catch(() => null);
        }
        throw err;
      }
    }

    if (mode === "get_product") {
      const productCode = String(body?.productCode ?? "").trim();
      if (!productCode) return response({ error: "productCode required" }, 400);

      const campaign = body?.campaign
        ? `?campaign-value=${encodeURIComponent(String(body.campaign))}`
        : "";
      const result = await viatorFetch(
        `/products/${encodeURIComponent(productCode)}${campaign}`,
      );
      const data: any = result.data ?? {};
      if (data?.viatorUniqueContent) {
        data.viatorUniqueContent = "[REDACTED_FROM_DEBUG_RESPONSE]";
      }
      const normalized = normalizeProduct(data);

      return response({
        ok: true,
        environment: VIATOR_ENV,
        product: data,
        normalized,
        affiliateUrlExact: normalized
          ? normalized.productUrl === data.productUrl
          : null,
        requestId: result.requestId,
        rateLimitRemaining: result.rateLimitRemaining,
      });
    }

    if (mode === "get_schedules") {
      // Basic Access: GET /availability/schedules/{product-code}
      const productCode = String(body?.productCode ?? "").trim();
      if (!productCode) return response({ error: "productCode required" }, 400);
      const result = await viatorFetch(
        `/availability/schedules/${encodeURIComponent(productCode)}`,
      );
      return response({
        ok: true,
        environment: VIATOR_ENV,
        productCode,
        schedules: result.data,
        requestId: result.requestId,
        rateLimitRemaining: result.rateLimitRemaining,
      });
    }

    return response({
      error: `Unsupported mode: ${mode}`,
      supported: [
        "health",
        "sync_destinations",
        "search_products",
        "sync_nashville_catalog",
        "get_product",
        "get_schedules",
      ],
    }, 400);
  } catch (error) {
    const e = error as Error & {
      details?: unknown;
      status?: number;
      retryAfter?: string | null;
      rateLimitRemaining?: string | null;
    };
    const status = e.status === 401 || e.status === 403 || e.status === 429
      ? e.status
      : 502;
    return response(
      {
        ok: false,
        environment: VIATOR_ENV,
        baseUrl: BASE_URL,
        error: e.message,
        details: e.details ?? null,
        retryAfter: e.retryAfter ?? null,
        rateLimitRemaining: e.rateLimitRemaining ?? null,
      },
      status,
    );
  }
});
