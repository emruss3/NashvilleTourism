import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://aeomrsutkhwmnscvvfur.supabase.co";
const VIATOR_API_KEY =
  Deno.env.get("VIATOR_PRODUCTION_API_KEY") ?? Deno.env.get("VIATOR_API_KEY") ?? "";
const VIATOR_BASE = "https://api.viator.com/partner";
const NASHVILLE_DESTINATION_ID = "799";

const TAG_LABELS: Record<number, string> = {
  11930: "Bus Tours",
  12033: "Pub Tours",
  12046: "Walking Tours",
  12075: "City Tours",
  12691: "Boat Tours",
  13018: "Bike Tours",
  13279: "Bar & Pub Tours",
  13284: "Distillery Tours",
  21515: "Music Tours",
  21702: "Bike Tours",
  21729: "Sightseeing Cruises",
  21911: "Food & Drink",
  22189: "Boat Tours",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function hasServiceAccess(req: Request): Promise<boolean> {
  const apiKey = req.headers.get("apikey")?.trim() ?? "";
  if (!apiKey) return false;

  const headers = new Headers({ apikey: apiKey, Accept: "application/json" });
  if (apiKey.startsWith("eyJ")) headers.set("Authorization", `Bearer ${apiKey}`);

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/data_sources?select=id&limit=1`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ViatorResponse = {
  ok: boolean;
  status: number;
  data: any;
  requestId: string | null;
  rateLimitRemaining: string | null;
  retryAfter: string | null;
};

async function viatorFetch(path: string, init: RequestInit = {}): Promise<ViatorResponse> {
  if (!VIATOR_API_KEY) {
    return {
      ok: false,
      status: 503,
      data: { error: "Viator production API key is not configured in Supabase" },
      requestId: null,
      rateLimitRemaining: null,
      retryAfter: null,
    };
  }

  let last: ViatorResponse | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const headers = new Headers(init.headers);
    headers.set("exp-api-key", VIATOR_API_KEY);
    headers.set("Accept", "application/json;version=2.0");
    headers.set("Accept-Language", "en-US");
    if (init.body) headers.set("Content-Type", "application/json;version=2.0");

    const res = await fetch(`${VIATOR_BASE}${path}`, { ...init, headers });
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text.slice(0, 1000) };
    }

    last = {
      ok: res.ok,
      status: res.status,
      data,
      requestId: res.headers.get("x-unique-id") ?? res.headers.get("X-Unique-ID"),
      rateLimitRemaining:
        res.headers.get("ratelimit-remaining") ?? res.headers.get("RateLimit-Remaining"),
      retryAfter: res.headers.get("retry-after") ?? res.headers.get("Retry-After"),
    };

    if (res.ok || ![429, 500, 502, 503, 504].includes(res.status)) return last;
    const retrySeconds = Number(last.retryAfter);
    await sleep(
      Number.isFinite(retrySeconds) && retrySeconds > 0
        ? Math.min(retrySeconds * 1000, 5000)
        : 600 * (attempt + 1),
    );
  }
  return last!;
}

function pickImageUrl(images: any): string | null {
  if (!Array.isArray(images) || !images.length) return null;
  const image = images.find((item: any) => item?.isCover) ?? images[0];
  const variants = Array.isArray(image?.variants)
    ? image.variants.filter((variant: any) => typeof variant?.url === "string")
    : [];
  variants.sort(
    (a: any, b: any) =>
      Math.abs(Number(a.width ?? 0) - 960) - Math.abs(Number(b.width ?? 0) - 960),
  );
  return variants[0]?.url ?? null;
}

function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function durationLabel(duration: any): string | null {
  if (!duration || typeof duration !== "object") return null;
  const fixed = Number(duration.fixedDurationInMinutes);
  if (Number.isFinite(fixed) && fixed > 0) return minutesLabel(fixed);
  const from = Number(duration.variableDurationFromMinutes);
  const to = Number(duration.variableDurationToMinutes);
  if (Number.isFinite(from) && Number.isFinite(to) && from > 0 && to > 0) {
    return from === to ? minutesLabel(from) : `${minutesLabel(from)}–${minutesLabel(to)}`;
  }
  if (Number.isFinite(from) && from > 0) return `From ${minutesLabel(from)}`;
  return null;
}

function textList(value: any): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((item: any) =>
      typeof item === "string"
        ? item
        : typeof item?.description === "string"
          ? item.description
          : typeof item?.otherDescription === "string"
            ? item.otherDescription
            : typeof item?.text === "string"
              ? item.text
              : typeof item?.name === "string"
                ? item.name
                : null,
    )
    .filter((item: string | null): item is string => Boolean(item));
  return items.length ? items : undefined;
}

function categoryLabels(tags: any): string[] {
  if (!Array.isArray(tags)) return [];
  const labels = tags
    .map((tag: any) => TAG_LABELS[Number(tag)])
    .filter((label: string | undefined): label is string => Boolean(label));
  return [...new Set(labels)].slice(0, 3);
}

function normalizeProduct(product: any, detail = false) {
  const productCode = String(product?.productCode ?? "").trim();
  const title = String(product?.title ?? "").trim();
  const productUrl = typeof product?.productUrl === "string" ? product.productUrl : "";
  if (!productCode || !title || !productUrl) return null;

  const flags = Array.isArray(product?.flags) ? product.flags.map(String) : [];
  const price = Number(product?.pricing?.summary?.fromPrice ?? product?.pricingInfo?.fromPrice);
  const currency =
    typeof product?.pricing?.currency === "string"
      ? product.pricing.currency
      : typeof product?.currency === "string"
        ? product.currency
        : "USD";
  const rating = Number(product?.reviews?.combinedAverageRating);
  const reviewCount = Number(product?.reviews?.totalReviews);

  const normalized: Record<string, unknown> = {
    productCode,
    title,
    description: typeof product?.description === "string" ? product.description : undefined,
    productUrl,
    imageUrl: pickImageUrl(product?.images) ?? undefined,
    rating: Number.isFinite(rating) ? rating : undefined,
    reviewCount: Number.isFinite(reviewCount) ? reviewCount : undefined,
    fromPrice: Number.isFinite(price) ? price : undefined,
    currency,
    durationLabel: durationLabel(product?.duration ?? product?.itinerary?.duration) ?? undefined,
    freeCancellation: flags.includes("FREE_CANCELLATION"),
    flags,
    categories: categoryLabels(product?.tags),
  };

  if (detail) {
    normalized.confirmationType =
      product?.bookingConfirmationSettings?.confirmationType ?? product?.confirmationType ?? undefined;
    normalized.languages = Array.isArray(product?.languageGuides)
      ? product.languageGuides.flatMap((guide: any) =>
          Array.isArray(guide?.languages) ? guide.languages.map(String) : [],
        )
      : undefined;
    normalized.inclusions = textList(product?.inclusions);
    normalized.exclusions = textList(product?.exclusions);
    normalized.additionalInfo = textList(product?.additionalInfo);
    normalized.itineraryOverview =
      typeof product?.itinerary?.unstructuredDescription === "string"
        ? product.itinerary.unstructuredDescription
        : undefined;
    normalized.pricingType =
      typeof product?.pricingInfo?.type === "string" ? product.pricingInfo.type : undefined;
    normalized.unitType =
      typeof product?.pricingInfo?.unitType === "string" ? product.pricingInfo.unitType : undefined;
    normalized.minTravelers =
      typeof product?.bookingRequirements?.minTravelersPerBooking === "number"
        ? product.bookingRequirements.minTravelersPerBooking
        : undefined;
    normalized.maxTravelers =
      typeof product?.bookingRequirements?.maxTravelersPerBooking === "number"
        ? product.bookingRequirements.maxTravelersPerBooking
        : undefined;
    normalized.privateTour =
      typeof product?.itinerary?.privateTour === "boolean" ? product.itinerary.privateTour : undefined;
    normalized.itineraryType =
      typeof product?.itinerary?.itineraryType === "string"
        ? product.itinerary.itineraryType
        : undefined;
  }
  return normalized;
}

function buildProductSearchBody(input: any) {
  const filtering: Record<string, unknown> = { destination: NASHVILLE_DESTINATION_ID };
  if (input?.startDate) filtering.startDate = String(input.startDate);
  if (input?.endDate) filtering.endDate = String(input.endDate);
  if (Array.isArray(input?.flags) && input.flags.length) filtering.flags = input.flags;
  if (Array.isArray(input?.tags) && input.tags.length) filtering.tags = input.tags;

  return {
    filtering,
    sorting: {
      sort: input?.sort ?? "TRAVELER_RATING",
      order: input?.order === "ASCENDING" ? "ASCENDING" : "DESCENDING",
    },
    pagination: {
      start: Math.max(Number(input?.start) || 1, 1),
      count: Math.min(Math.max(Number(input?.count) || 24, 1), 50),
    },
    currency: input?.currency ?? "USD",
  };
}

function buildFreetextBody(input: any) {
  const productFiltering: Record<string, unknown> = { destination: NASHVILLE_DESTINATION_ID };
  if (input?.startDate || input?.endDate) {
    productFiltering.dateRange = {
      from: String(input?.startDate ?? input?.endDate),
      to: String(input?.endDate ?? input?.startDate),
    };
  }
  if (Array.isArray(input?.tags) && input.tags.length) productFiltering.tags = input.tags;
  if (Array.isArray(input?.flags) && input.flags.length) productFiltering.flags = input.flags;

  return {
    searchTerm: String(input?.query ?? "").trim(),
    productFiltering,
    productSorting: {
      sort: input?.freetextSort ?? "REVIEW_AVG_RATING",
      order: input?.order === "ASCENDING" ? "ASCENDING" : "DESCENDING",
    },
    searchTypes: [
      {
        searchType: "PRODUCTS",
        pagination: {
          start: Math.max(Number(input?.start) || 1, 1),
          count: Math.min(Math.max(Number(input?.count) || 24, 1), 50),
        },
      },
    ],
    currency: input?.currency ?? "USD",
  };
}

function freetextProducts(data: any): any[] {
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.products?.results)) return data.products.results;
  if (Array.isArray(data?.results?.products)) return data.results.products;
  if (Array.isArray(data?.searchResults?.products)) return data.searchResults.products;
  return [];
}

function freetextTotal(data: any, fallback: number): number {
  const candidates = [
    data?.totalCount,
    data?.products?.totalCount,
    data?.results?.totalCount,
    data?.searchResults?.totalCount,
  ];
  const found = candidates.find((value) => typeof value === "number");
  return typeof found === "number" ? found : fallback;
}

Deno.serve(async (req: Request) => {
  if (!(await hasServiceAccess(req))) return json({ ok: false, error: "Unauthorized" }, 401);
  if (req.method !== "POST") return json({ ok: false, error: "POST required" }, 405);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const mode = String(body?.mode ?? "health");

  try {
    if (mode === "health") {
      const result = await viatorFetch("/destinations");
      const destinations = Array.isArray(result.data?.destinations)
        ? result.data.destinations
        : Array.isArray(result.data)
          ? result.data
          : [];
      return json(
        {
          ok: result.ok,
          environment: "production",
          baseUrl: VIATOR_BASE,
          status: result.status,
          authenticated: result.ok,
          destinationCount: destinations.length,
          nashvilleMatches: destinations.filter(
            (destination: any) => Number(destination?.destinationId) === 799,
          ),
          requestId: result.requestId,
          rateLimitRemaining: result.rateLimitRemaining,
          error: result.ok ? null : result.data,
        },
        result.ok ? 200 : result.status,
      );
    }

    if (mode === "search_products") {
      const campaign = encodeURIComponent(String(body?.campaign ?? "tours-marketplace"));
      const result = await viatorFetch(`/products/search?campaign-value=${campaign}`, {
        method: "POST",
        body: JSON.stringify(buildProductSearchBody(body)),
      });
      const rawProducts =
        result.ok && Array.isArray(result.data?.products) ? result.data.products : [];
      const products = rawProducts.map((product: any) => normalizeProduct(product)).filter(Boolean);
      return json(
        {
          ok: result.ok,
          environment: "production",
          baseUrl: VIATOR_BASE,
          status: result.status,
          destinationId: 799,
          products,
          totalCount: result.data?.totalCount ?? products.length,
          requestId: result.requestId,
          rateLimitRemaining: result.rateLimitRemaining,
          retryAfter: result.retryAfter,
          error: result.ok ? null : result.data,
        },
        result.ok ? 200 : result.status,
      );
    }

    if (mode === "search_freetext") {
      const query = String(body?.query ?? "").trim();
      if (!query) return json({ ok: false, error: "query required" }, 400);
      const campaign = encodeURIComponent(String(body?.campaign ?? "tours-search"));
      const result = await viatorFetch(`/search/freetext?campaign-value=${campaign}`, {
        method: "POST",
        body: JSON.stringify(buildFreetextBody(body)),
      });
      const rawProducts = result.ok ? freetextProducts(result.data) : [];
      const products = rawProducts.map((product: any) => normalizeProduct(product)).filter(Boolean);
      return json(
        {
          ok: result.ok,
          environment: "production",
          baseUrl: VIATOR_BASE,
          status: result.status,
          destinationId: 799,
          products,
          totalCount: freetextTotal(result.data, products.length),
          requestId: result.requestId,
          rateLimitRemaining: result.rateLimitRemaining,
          retryAfter: result.retryAfter,
          error: result.ok ? null : result.data,
        },
        result.ok ? 200 : result.status,
      );
    }

    if (mode === "get_product") {
      const code = String(body?.productCode ?? "").trim();
      if (!code) return json({ ok: false, error: "productCode required" }, 400);
      const campaign = encodeURIComponent(String(body?.campaign ?? "tours-detail"));
      const result = await viatorFetch(
        `/products/${encodeURIComponent(code)}?campaign-value=${campaign}`,
      );
      const normalized = result.ok ? normalizeProduct(result.data, true) : null;
      return json(
        {
          ok: Boolean(result.ok && normalized),
          environment: "production",
          baseUrl: VIATOR_BASE,
          status: result.status,
          normalized,
          requestId: result.requestId,
          rateLimitRemaining: result.rateLimitRemaining,
          error: result.ok && normalized ? null : result.data,
        },
        result.ok && normalized ? 200 : result.status || 502,
      );
    }

    return json(
      { ok: false, error: `Unsupported mode: ${mode}`, supported: ["health", "search_products", "search_freetext", "get_product"] },
      400,
    );
  } catch (error) {
    return json(
      {
        ok: false,
        environment: "production",
        baseUrl: VIATOR_BASE,
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});
