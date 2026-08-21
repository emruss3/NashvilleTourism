import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * NashRoam -> Viator production boundary for the REAL-TIME SEARCH MODEL.
 *
 * Allowed provider calls from this function:
 * - POST /products/search: user-initiated Nashville browse, <= 50 results/call
 * - POST /search/freetext: user-initiated text search, <= 50 results/call
 * - GET  /products/{product-code}: one product selected from search
 *
 * Explicitly NOT used here:
 * - /products/modified-since or other catalog ingestion endpoints
 * - /products/bulk
 * - /locations/bulk or other auxiliary-data lookups
 *
 * Availability for one selected product lives in viator-availability.
 */

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? "https://aeomrsutkhwmnscvvfur.supabase.co";
const VIATOR_API_KEY = Deno.env.get("VIATOR_PRODUCTION_API_KEY") ?? "";
const VIATOR_BASE = "https://api.viator.com/partner";
const NASHVILLE_DESTINATION_ID = "799";
const API_TIMEOUT_MS = 120_000;

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

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${VIATOR_BASE}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

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

function clampCount(value: unknown): number {
  return Math.min(Math.max(Math.trunc(Number(value) || 24), 1), 50);
}

function clampStart(value: unknown): number {
  return Math.max(Math.trunc(Number(value) || 1), 1);
}

function pickVariantUrl(image: any, targetWidth = 960): string | null {
  const variants = Array.isArray(image?.variants)
    ? image.variants.filter((variant: any) => typeof variant?.url === "string")
    : [];
  if (!variants.length) return typeof image?.url === "string" ? image.url : null;
  variants.sort(
    (a: any, b: any) =>
      Math.abs(Number(a.width ?? 0) - targetWidth) -
      Math.abs(Number(b.width ?? 0) - targetWidth),
  );
  return variants[0]?.url ?? null;
}

function pickImages(images: any) {
  if (!Array.isArray(images) || !images.length) return undefined;
  const seen = new Set<string>();
  const mapped = images
    .map((image: any) => {
      const url = pickVariantUrl(image, 1200);
      if (!url || seen.has(url)) return null;
      seen.add(url);
      return {
        url,
        thumbUrl: pickVariantUrl(image, 240) ?? url,
        caption:
          typeof image?.caption === "string" && image.caption.trim()
            ? image.caption.trim()
            : undefined,
        isCover: Boolean(image?.isCover),
      };
    })
    .filter(Boolean) as Array<{
      url: string;
      thumbUrl: string;
      caption?: string;
      isCover: boolean;
    }>;
  mapped.sort((a, b) => Number(b.isCover) - Number(a.isCover));
  return mapped.length ? mapped : undefined;
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
    return from === to ? minutesLabel(from) : `${minutesLabel(from)}-${minutesLabel(to)}`;
  }
  if (Number.isFinite(from) && from > 0) return `From ${minutesLabel(from)}`;
  return null;
}

function textList(value: any): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((item: any) => {
      if (typeof item === "string") return item;
      return item?.description ?? item?.otherDescription ?? item?.text ?? item?.name ?? null;
    })
    .filter((item: unknown): item is string => typeof item === "string" && Boolean(item.trim()));
  return items.length ? [...new Set(items)] : undefined;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function languageName(code: string) {
  const names: Record<string, string> = {
    en: "English",
    "en-us": "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ja: "Japanese",
    zh: "Chinese",
    ko: "Korean",
  };
  return names[code.toLowerCase()] ?? code;
}

function languageGuideLabel(guide: any): string | null {
  const codes = Array.isArray(guide?.languages)
    ? guide.languages.map(String)
    : typeof guide?.language === "string"
      ? [guide.language]
      : [];
  if (!codes.length) return null;
  const names = uniqueStrings(codes.map(languageName)).join(", ");
  const type = String(guide?.type ?? "").toUpperCase();
  if (type === "AUDIO") return `Audio guide: ${names}`;
  if (type === "WRITTEN") return `Written guide: ${names}`;
  return `Live guide: ${names}`;
}

function categoryLabels(tags: any): string[] {
  if (!Array.isArray(tags)) return [];
  return [...new Set(
    tags
      .map((tag: any) => TAG_LABELS[Number(tag)])
      .filter((label: string | undefined): label is string => Boolean(label)),
  )].slice(0, 3);
}

function addressText(value: any): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const parts = [
    value.street,
    value.city,
    value.administrativeArea,
    value.state,
    value.postcode,
    value.country,
  ].filter((part) => typeof part === "string" && part.trim());
  return parts.length ? parts.join(", ") : undefined;
}

function logisticsPoints(points: any) {
  if (!Array.isArray(points)) return undefined;
  const mapped = points
    .map((point: any) => {
      const location = point?.location ?? {};
      const name =
        typeof point?.name === "string"
          ? point.name
          : typeof location?.name === "string"
            ? location.name
            : undefined;
      const description =
        typeof point?.description === "string" ? point.description : undefined;
      const address = addressText(point?.address ?? location?.address);
      return name || description || address ? { name, description, address } : null;
    })
    .filter(Boolean);
  return mapped.length ? mapped : undefined;
}

function pickupLabel(type: unknown): string | undefined {
  switch (String(type ?? "")) {
    case "PICKUP_EVERYONE":
      return "Pickup included";
    case "MEET_EVERYONE_AT_START_POINT":
      return "Meet at the starting point";
    case "PICKUP_AND_MEET_AT_START_POINT":
      return "Hotel pickup or meet at the starting point";
    default:
      return undefined;
  }
}

function itineraryName(item: any): string | undefined {
  const candidates = [
    item?.name,
    item?.pointOfInterestLocation?.location?.name,
    item?.stopLocation?.name,
    item?.location?.name,
  ];
  return candidates.find((value) => typeof value === "string" && value.trim()) as
    | string
    | undefined;
}

function itineraryStop(item: any, dayLabel?: string) {
  const name = itineraryName(item);
  const description = typeof item?.description === "string" ? item.description : undefined;
  if (!name && !description) return null;
  return {
    name,
    description,
    durationLabel: durationLabel(item?.duration) ?? undefined,
    passByWithoutStopping: Boolean(item?.passByWithoutStopping),
    admissionIncluded:
      typeof item?.admissionIncluded === "string" ? item.admissionIncluded : undefined,
    dayLabel,
  };
}

function normalizeItinerary(itinerary: any) {
  if (!itinerary || typeof itinerary !== "object") return {};
  const stops: any[] = [];
  for (const item of itinerary.itineraryItems ?? []) {
    const stop = itineraryStop(item);
    if (stop) stops.push(stop);
  }
  (itinerary.days ?? []).forEach((day: any, index: number) => {
    const dayLabel = typeof day?.title === "string" ? day.title : `Day ${index + 1}`;
    for (const item of day?.items ?? []) {
      const stop = itineraryStop(item, dayLabel);
      if (stop) stops.push(stop);
    }
  });
  for (const route of itinerary.routes ?? []) {
    for (const item of route?.stops ?? []) {
      const stop = itineraryStop(
        item,
        typeof route?.title === "string" ? route.title : undefined,
      );
      if (stop) stops.push(stop);
    }
  }
  if (itinerary.activityInfo) {
    const stop = itineraryStop(itinerary.activityInfo);
    if (stop) stops.unshift(stop);
  }

  const overview =
    typeof itinerary.unstructuredDescription === "string"
      ? itinerary.unstructuredDescription
      : typeof itinerary.unstructuredItinerary === "string"
        ? itinerary.unstructuredItinerary
        : undefined;

  return {
    itineraryType:
      typeof itinerary.itineraryType === "string" ? itinerary.itineraryType : undefined,
    skipTheLine:
      typeof itinerary.skipTheLine === "boolean" ? itinerary.skipTheLine : undefined,
    privateTour:
      typeof itinerary.privateTour === "boolean" ? itinerary.privateTour : undefined,
    maxTravelersInSharedTour: Number.isFinite(Number(itinerary.maxTravelersInSharedTour))
      ? Number(itinerary.maxTravelersInSharedTour)
      : undefined,
    itineraryOverview: overview,
    itineraryStops: stops.length ? stops : undefined,
  };
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
  const images = pickImages(product?.images);

  const normalized: Record<string, unknown> = {
    productCode,
    title,
    description: typeof product?.description === "string" ? product.description : undefined,
    productUrl,
    imageUrl: images?.[0]?.url ?? undefined,
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
    const languages = Array.isArray(product?.languageGuides)
      ? uniqueStrings(
          product.languageGuides.flatMap((guide: any) => {
            if (typeof guide?.language === "string") return [languageName(guide.language)];
            if (Array.isArray(guide?.languages)) {
              return guide.languages.map((code: string) => languageName(String(code)));
            }
            return [];
          }),
        )
      : [];
    const guideLabels = Array.isArray(product?.languageGuides)
      ? uniqueStrings(
          product.languageGuides.map(languageGuideLabel).filter(Boolean) as string[],
        )
      : [];
    const productOptions = Array.isArray(product?.productOptions)
      ? product.productOptions
          .map((option: any) => ({
            code: String(option?.productOptionCode ?? "").trim(),
            title: String(option?.title ?? "").trim(),
            description:
              typeof option?.description === "string" ? option.description : undefined,
          }))
          .filter((option: { title: string }) => option.title)
      : [];

    Object.assign(normalized, {
      confirmationType:
        product?.bookingConfirmationSettings?.confirmationType ??
        product?.confirmationType ??
        undefined,
      languages: languages.length ? languages : undefined,
      languageGuideLabels: guideLabels.length ? guideLabels : undefined,
      inclusions: textList(product?.inclusions),
      exclusions: textList(product?.exclusions),
      additionalInfo: textList(product?.additionalInfo),
      ticketTypeDescription:
        typeof product?.ticketInfo?.ticketTypeDescription === "string"
          ? product.ticketInfo.ticketTypeDescription
          : undefined,
      supplierName:
        typeof product?.supplier?.name === "string" ? product.supplier.name : undefined,
      cancellationPolicy: product?.cancellationPolicy
        ? {
            type: product.cancellationPolicy.type,
            description: product.cancellationPolicy.description,
            cancelIfBadWeather: Boolean(product.cancellationPolicy.cancelIfBadWeather),
            cancelIfInsufficientTravelers: Boolean(
              product.cancellationPolicy.cancelIfInsufficientTravelers,
            ),
          }
        : undefined,
      meetingPoints: logisticsPoints(product?.logistics?.start),
      endPoints: logisticsPoints(product?.logistics?.end),
      pickupLabel: pickupLabel(product?.logistics?.travelerPickup?.pickupOptionType),
      productOptions: productOptions.length ? productOptions : undefined,
      images,
      pricingType:
        typeof product?.pricingInfo?.type === "string" ? product.pricingInfo.type : undefined,
      unitType:
        typeof product?.pricingInfo?.unitType === "string"
          ? product.pricingInfo.unitType
          : undefined,
      minTravelers:
        typeof product?.bookingRequirements?.minTravelersPerBooking === "number"
          ? product.bookingRequirements.minTravelersPerBooking
          : undefined,
      maxTravelers:
        typeof product?.bookingRequirements?.maxTravelersPerBooking === "number"
          ? product.bookingRequirements.maxTravelersPerBooking
          : undefined,
      ...normalizeItinerary(product?.itinerary),
    });
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
    pagination: { start: clampStart(input?.start), count: clampCount(input?.count) },
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
        pagination: { start: clampStart(input?.start), count: clampCount(input?.count) },
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
      return json(
        {
          ok: Boolean(VIATOR_API_KEY),
          configured: Boolean(VIATOR_API_KEY),
          environment: "production",
          baseUrl: VIATOR_BASE,
          endpointModel: "real-time-search",
          providerRequestMade: false,
          supported: ["search_products", "search_freetext", "get_product"],
        },
        VIATOR_API_KEY ? 200 : 503,
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
      const products = rawProducts
        .map((product: any) => normalizeProduct(product))
        .filter(Boolean);
      return json(
        {
          ok: result.ok,
          environment: "production",
          baseUrl: VIATOR_BASE,
          endpointModel: "real-time-search",
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
      const products = rawProducts
        .map((product: any) => normalizeProduct(product))
        .filter(Boolean);
      return json(
        {
          ok: result.ok,
          environment: "production",
          baseUrl: VIATOR_BASE,
          endpointModel: "real-time-search",
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
          endpointModel: "real-time-search",
          status: result.status,
          normalized,
          requestId: result.requestId,
          rateLimitRemaining: result.rateLimitRemaining,
          retryAfter: result.retryAfter,
          error: result.ok && normalized ? null : result.data,
        },
        result.ok && normalized ? 200 : result.status || 502,
      );
    }

    return json(
      {
        ok: false,
        error: `Unsupported mode: ${mode}`,
        supported: ["health", "search_products", "search_freetext", "get_product"],
      },
      400,
    );
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "AbortError";
    return json(
      {
        ok: false,
        environment: "production",
        baseUrl: VIATOR_BASE,
        endpointModel: "real-time-search",
        error: isTimeout
          ? "Viator API request timed out after 120 seconds"
          : error instanceof Error
            ? error.message
            : String(error),
      },
      isTimeout ? 504 : 500,
    );
  }
});
