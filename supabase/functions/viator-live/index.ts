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

function pickVariantUrl(image: any, targetWidth = 960): string | null {
  const variants = Array.isArray(image?.variants)
    ? image.variants.filter((variant: any) => typeof variant?.url === "string")
    : [];
  if (!variants.length) return typeof image?.url === "string" ? image.url : null;
  variants.sort(
    (a: any, b: any) =>
      Math.abs(Number(a.width ?? 0) - targetWidth) - Math.abs(Number(b.width ?? 0) - targetWidth),
  );
  return variants[0]?.url ?? null;
}

function pickImageUrl(images: any): string | null {
  if (!Array.isArray(images) || !images.length) return null;
  const image = images.find((item: any) => item?.isCover) ?? images[0];
  return pickVariantUrl(image);
}

function pickImages(images: any) {
  if (!Array.isArray(images) || !images.length) return undefined;
  const mapped = images
    .map((image: any) => {
      const url = pickVariantUrl(image, 1200);
      if (!url) return null;
      return {
        url,
        caption: typeof image?.caption === "string" && image.caption.trim() ? image.caption.trim() : undefined,
        isCover: Boolean(image?.isCover),
      };
    })
    .filter(Boolean);
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
    return from === to ? minutesLabel(from) : `${minutesLabel(from)}–${minutesLabel(to)}`;
  }
  if (Number.isFinite(from) && from > 0) return `From ${minutesLabel(from)}`;
  return null;
}

function textList(value: any): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const counts = new Map<string, number>();
  for (const item of value) {
    const text =
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
                : null;
    if (!text) continue;
    counts.set(text, (counts.get(text) ?? 0) + 1);
  }
  const items = [...counts.entries()].map(([text, count]) => (count > 1 ? `${text} (${count})` : text));
  return items.length ? items : undefined;
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
    nl: "Dutch",
    da: "Danish",
    sv: "Swedish",
    no: "Norwegian",
  };
  return names[code.toLowerCase()] ?? code;
}

function languageGuideLabel(guide: any): string | null {
  const code = typeof guide?.language === "string" ? guide.language : null;
  const codes = Array.isArray(guide?.languages) ? guide.languages.map(String) : code ? [code] : [];
  if (!codes.length) return null;
  const names = uniqueStrings(codes.map(languageName)).join(", ");
  const type = String(guide?.type ?? "").toUpperCase();
  if (type === "AUDIO") return `Audio guide: ${names}`;
  if (type === "WRITTEN") return `Written guide: ${names}`;
  return `Live guide: ${names}`;
}

function collectLocationRefs(product: any): string[] {
  const refs: string[] = [];
  const push = (ref: unknown) => {
    if (typeof ref === "string" && ref.startsWith("LOC-")) refs.push(ref);
  };
  for (const point of product?.logistics?.start ?? []) push(point?.location?.ref);
  for (const point of product?.logistics?.end ?? []) push(point?.location?.ref);
  for (const item of product?.itinerary?.itineraryItems ?? []) {
    push(item?.pointOfInterestLocation?.location?.ref);
  }
  for (const poi of product?.itinerary?.pointsOfInterest ?? []) push(poi?.ref ?? poi?.location?.ref);
  push(product?.itinerary?.activityInfo?.location?.ref);
  for (const day of product?.itinerary?.days ?? []) {
    for (const item of day?.items ?? []) push(item?.pointOfInterestLocation?.location?.ref);
  }
  for (const route of product?.itinerary?.routes ?? []) {
    for (const stop of route?.stops ?? []) push(stop?.stopLocation?.ref ?? stop?.location?.ref);
  }
  return uniqueStrings(refs);
}

function locationLookup(locations: any[]) {
  const map = new Map<string, { name?: string; address?: string }>();
  for (const location of locations) {
    const ref = typeof location?.reference === "string" ? location.reference : "";
    if (!ref) continue;
    const addressParts = [
      location?.address?.street,
      location?.address?.administrativeArea,
      location?.address?.state,
      location?.address?.postcode,
      location?.address?.country,
    ].filter((part) => typeof part === "string" && part.trim());
    map.set(ref, {
      name: typeof location?.name === "string" ? location.name : undefined,
      address: addressParts.length ? addressParts.join(", ") : undefined,
    });
  }
  return map;
}

function logisticsPoints(points: any, locations: Map<string, { name?: string; address?: string }>) {
  if (!Array.isArray(points) || !points.length) return undefined;
  const mapped = points
    .map((point: any) => {
      const ref = typeof point?.location?.ref === "string" ? point.location.ref : "";
      const resolved = locations.get(ref);
      const description = typeof point?.description === "string" ? point.description : undefined;
      return {
        name: resolved?.name,
        description,
        address: resolved?.address,
      };
    })
    .filter((point: any) => point.name || point.description || point.address);
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

function itineraryStop(
  item: any,
  locations: Map<string, { name?: string; address?: string }>,
  dayLabel?: string,
) {
  const ref = item?.pointOfInterestLocation?.location?.ref ?? item?.stopLocation?.ref ?? item?.location?.ref;
  const resolved = typeof ref === "string" ? locations.get(ref) : undefined;
  const description = typeof item?.description === "string" ? item.description : undefined;
  const name = resolved?.name;
  if (!name && !description) return null;
  return {
    name,
    description,
    durationLabel: durationLabel(item?.duration) ?? undefined,
    passByWithoutStopping: Boolean(item?.passByWithoutStopping),
    admissionIncluded: typeof item?.admissionIncluded === "string" ? item.admissionIncluded : undefined,
    dayLabel,
  };
}

function normalizeItinerary(itinerary: any, locations: Map<string, { name?: string; address?: string }>) {
  if (!itinerary || typeof itinerary !== "object") return {};
  const stops: any[] = [];
  if (Array.isArray(itinerary.itineraryItems)) {
    for (const item of itinerary.itineraryItems) {
      const stop = itineraryStop(item, locations);
      if (stop) stops.push(stop);
    }
  }
  if (Array.isArray(itinerary.days)) {
    itinerary.days.forEach((day: any, index: number) => {
      const dayLabel = typeof day?.title === "string" ? day.title : `Day ${index + 1}`;
      for (const item of day?.items ?? []) {
        const stop = itineraryStop(item, locations, dayLabel);
        if (stop) stops.push(stop);
      }
    });
  }
  if (Array.isArray(itinerary.routes)) {
    for (const route of itinerary.routes) {
      for (const item of route?.stops ?? []) {
        const stop = itineraryStop(item, locations, typeof route?.title === "string" ? route.title : undefined);
        if (stop) stops.push(stop);
      }
    }
  }
  if (itinerary.activityInfo) {
    const ref = itinerary.activityInfo?.location?.ref;
    const resolved = typeof ref === "string" ? locations.get(ref) : undefined;
    const description = typeof itinerary.activityInfo?.description === "string"
      ? itinerary.activityInfo.description
      : undefined;
    if (resolved?.name || description) {
      stops.unshift({
        name: resolved?.name,
        description,
      });
    }
  }

  const unstructured =
    typeof itinerary.unstructuredDescription === "string"
      ? itinerary.unstructuredDescription
      : typeof itinerary.unstructuredItinerary === "string"
        ? itinerary.unstructuredItinerary
        : undefined;

  return {
    itineraryType: typeof itinerary.itineraryType === "string" ? itinerary.itineraryType : undefined,
    skipTheLine: typeof itinerary.skipTheLine === "boolean" ? itinerary.skipTheLine : undefined,
    privateTour: typeof itinerary.privateTour === "boolean" ? itinerary.privateTour : undefined,
    maxTravelersInSharedTour: Number.isFinite(Number(itinerary.maxTravelersInSharedTour))
      ? Number(itinerary.maxTravelersInSharedTour)
      : undefined,
    itineraryOverview: unstructured,
    itineraryStops: stops.length ? stops : undefined,
  };
}

function categoryLabels(tags: any): string[] {
  if (!Array.isArray(tags)) return [];
  const labels = tags
    .map((tag: any) => TAG_LABELS[Number(tag)])
    .filter((label: string | undefined): label is string => Boolean(label));
  return [...new Set(labels)].slice(0, 3);
}

function normalizeProduct(product: any, detail = false, locations = new Map<string, { name?: string; address?: string }>()) {
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
    imageUrl: pickImageUrl(product?.images) ?? images?.[0]?.url ?? undefined,
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
            if (Array.isArray(guide?.languages)) return guide.languages.map((code: string) => languageName(String(code)));
            return [];
          }),
        )
      : [];
    const languageGuideLabels = Array.isArray(product?.languageGuides)
      ? uniqueStrings(product.languageGuides.map(languageGuideLabel).filter(Boolean) as string[])
      : [];
    const productOptions = Array.isArray(product?.productOptions)
      ? product.productOptions
          .map((option: any) => ({
            code: String(option?.productOptionCode ?? "").trim(),
            title: String(option?.title ?? "").trim(),
            description: typeof option?.description === "string" ? option.description : undefined,
          }))
          .filter((option: { title: string }) => option.title)
      : [];

    Object.assign(normalized, {
      confirmationType:
        product?.bookingConfirmationSettings?.confirmationType ?? product?.confirmationType ?? undefined,
      languages: languages.length ? languages : undefined,
      languageGuideLabels: languageGuideLabels.length ? languageGuideLabels : undefined,
      inclusions: textList(product?.inclusions),
      exclusions: textList(product?.exclusions),
      additionalInfo: textList(product?.additionalInfo),
      ticketTypeDescription:
        typeof product?.ticketInfo?.ticketTypeDescription === "string"
          ? product.ticketInfo.ticketTypeDescription
          : undefined,
      supplierName: typeof product?.supplier?.name === "string" ? product.supplier.name : undefined,
      cancellationPolicy: product?.cancellationPolicy
        ? {
            type: product.cancellationPolicy.type,
            description: product.cancellationPolicy.description,
            cancelIfBadWeather: Boolean(product.cancellationPolicy.cancelIfBadWeather),
            cancelIfInsufficientTravelers: Boolean(product.cancellationPolicy.cancelIfInsufficientTravelers),
          }
        : undefined,
      meetingPoints: logisticsPoints(product?.logistics?.start, locations),
      endPoints: logisticsPoints(product?.logistics?.end, locations),
      pickupLabel: pickupLabel(product?.logistics?.travelerPickup?.pickupOptionType),
      productOptions: productOptions.length ? productOptions : undefined,
      images,
      pricingType:
        typeof product?.pricingInfo?.type === "string" ? product.pricingInfo.type : undefined,
      unitType:
        typeof product?.pricingInfo?.unitType === "string" ? product.pricingInfo.unitType : undefined,
      minTravelers:
        typeof product?.bookingRequirements?.minTravelersPerBooking === "number"
          ? product.bookingRequirements.minTravelersPerBooking
          : undefined,
      maxTravelers:
        typeof product?.bookingRequirements?.maxTravelersPerBooking === "number"
          ? product.bookingRequirements.maxTravelersPerBooking
          : undefined,
      ...normalizeItinerary(product?.itinerary, locations),
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
      if (!result.ok) {
        return json({
          ok: false,
          environment: "production",
          baseUrl: VIATOR_BASE,
          status: result.status,
          normalized: null,
          requestId: result.requestId,
          rateLimitRemaining: result.rateLimitRemaining,
          error: result.data,
        }, result.status || 502);
      }

      const refs = collectLocationRefs(result.data);
      let locations = new Map<string, { name?: string; address?: string }>();
      if (refs.length) {
        const locationResult = await viatorFetch("/locations/bulk", {
          method: "POST",
          body: JSON.stringify({ locations: refs.slice(0, 500) }),
        });
        if (locationResult.ok && Array.isArray(locationResult.data?.locations)) {
          locations = locationLookup(locationResult.data.locations);
        }
      }

      const normalized = normalizeProduct(result.data, true, locations);
      return json({
        ok: Boolean(normalized),
        environment: "production",
        baseUrl: VIATOR_BASE,
        status: result.status,
        normalized,
        requestId: result.requestId,
        rateLimitRemaining: result.rateLimitRemaining,
        error: normalized ? null : result.data,
      }, normalized ? 200 : 502);
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
