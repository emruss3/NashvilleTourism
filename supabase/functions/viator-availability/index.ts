import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * NashRoam customer-facing Viator availability boundary.
 *
 * This function is intentionally separate from catalog ingestion:
 * - get_schedules uses the Basic/Full Affiliate endpoint for one selected product.
 * - check_availability is ready for Full-access Affiliate approval.
 * - no booking, payment, hold, cancellation, or card data ever passes through here.
 */

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? "https://aeomrsutkhwmnscvvfur.supabase.co";
const VIATOR_API_KEY =
  Deno.env.get("VIATOR_PRODUCTION_API_KEY") ?? Deno.env.get("VIATOR_API_KEY") ?? "";
const VIATOR_BASE = "https://api.viator.com/partner";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
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

function finiteNumber(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function dateString(value: unknown): string | undefined {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : undefined;
}

function providerError(data: any, fallback: string): string {
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  if (typeof data?.code === "string" && data.code.trim()) return data.code;
  return fallback;
}

function normalizeUnavailableDates(value: any) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: any) => {
      if (typeof item === "string") {
        return dateString(item) ? { date: item } : null;
      }
      const date = dateString(item?.date);
      if (!date) return null;
      return {
        date,
        reason: typeof item?.reason === "string" ? item.reason : undefined,
      };
    })
    .filter(Boolean);
}

function normalizeRetailPrice(price: any) {
  if (!price || typeof price !== "object") return undefined;
  const original = finiteNumber(price?.original?.recommendedRetailPrice);
  const special = finiteNumber(price?.special?.recommendedRetailPrice);
  const offerStartDate = dateString(price?.special?.offerStartDate);
  const offerEndDate = dateString(price?.special?.offerEndDate);

  if (original == null && special == null) return undefined;
  return {
    original,
    special,
    offerStartDate,
    offerEndDate,
  };
}

function normalizeSchedule(schedule: any) {
  const bookableItems = Array.isArray(schedule?.bookableItems)
    ? schedule.bookableItems
        .map((item: any) => {
          const productOptionCode = String(item?.productOptionCode ?? "").trim();
          if (!productOptionCode) return null;

          const seasons = Array.isArray(item?.seasons)
            ? item.seasons
                .map((season: any) => {
                  const startDate = dateString(season?.startDate);
                  if (!startDate) return null;

                  const pricingRecords = Array.isArray(season?.pricingRecords)
                    ? season.pricingRecords
                        .map((record: any) => {
                          const daysOfWeek = Array.isArray(record?.daysOfWeek)
                            ? record.daysOfWeek.map(String).filter(Boolean)
                            : [];
                          if (!daysOfWeek.length) return null;

                          const timedEntries = Array.isArray(record?.timedEntries)
                            ? record.timedEntries.map((entry: any) => ({
                                startTime:
                                  typeof entry?.startTime === "string"
                                    ? entry.startTime
                                    : undefined,
                                unavailableDates: normalizeUnavailableDates(
                                  entry?.unavailableDates,
                                ),
                              }))
                            : [];

                          const pricingDetails = Array.isArray(record?.pricingDetails)
                            ? record.pricingDetails
                                .map((detail: any) => {
                                  const retailPrice = normalizeRetailPrice(detail?.price);
                                  if (!retailPrice) return null;
                                  return {
                                    pricingPackageType:
                                      typeof detail?.pricingPackageType === "string"
                                        ? detail.pricingPackageType
                                        : undefined,
                                    ageBand:
                                      typeof detail?.ageBand === "string"
                                        ? detail.ageBand
                                        : undefined,
                                    minTravelers: finiteNumber(detail?.minTravelers),
                                    maxTravelers: finiteNumber(detail?.maxTravelers),
                                    price: retailPrice,
                                  };
                                })
                                .filter(Boolean)
                            : [];

                          return {
                            daysOfWeek,
                            timedEntries,
                            pricingDetails,
                          };
                        })
                        .filter(Boolean)
                    : [];

                  return {
                    startDate,
                    endDate: dateString(season?.endDate),
                    pricingRecords,
                  };
                })
                .filter(Boolean)
            : [];

          return { productOptionCode, seasons };
        })
        .filter(Boolean)
    : [];

  return {
    productCode: String(schedule?.productCode ?? "").trim(),
    currency:
      typeof schedule?.currency === "string" && schedule.currency.trim()
        ? schedule.currency
        : "USD",
    fromPrice: finiteNumber(schedule?.summary?.fromPrice),
    bookableItems,
  };
}

const AGE_BANDS = new Set([
  "ADULT",
  "CHILD",
  "INFANT",
  "YOUTH",
  "SENIOR",
  "TRAVELER",
]);

function buildAvailabilityCheck(input: any):
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; error: string } {
  const productCode = String(input?.productCode ?? "").trim();
  const productOptionCode = String(input?.productOptionCode ?? "").trim();
  const travelDate = dateString(input?.travelDate);
  const currency = String(input?.currency ?? "USD").trim().toUpperCase();
  const startTime = String(input?.startTime ?? "").trim();

  if (!productCode) return { ok: false, error: "productCode required" };
  if (!productOptionCode) return { ok: false, error: "productOptionCode required" };
  if (!travelDate) return { ok: false, error: "travelDate must use YYYY-MM-DD" };
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: "currency must be a three-letter code" };
  if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) {
    return { ok: false, error: "startTime must use HH:mm" };
  }

  const paxMix = Array.isArray(input?.paxMix)
    ? input.paxMix
        .map((item: any) => {
          const ageBand = String(item?.ageBand ?? "").trim().toUpperCase();
          const numberOfTravelers = Math.trunc(Number(item?.numberOfTravelers));
          if (!AGE_BANDS.has(ageBand)) return null;
          if (!Number.isFinite(numberOfTravelers) || numberOfTravelers < 1 || numberOfTravelers > 99) {
            return null;
          }
          return { ageBand, numberOfTravelers };
        })
        .filter(Boolean)
    : [];

  if (!paxMix.length) return { ok: false, error: "At least one traveler is required" };

  const payload: Record<string, unknown> = {
    productCode,
    productOptionCode,
    travelDate,
    currency,
    paxMix,
  };
  if (startTime) payload.startTime = startTime;

  return { ok: true, payload };
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const number = finiteNumber(value);
    if (number != null) return number;
  }
  return undefined;
}

function normalizeAvailabilityCheck(data: any) {
  const status = String(
    data?.status ?? data?.availabilityStatus ?? data?.bookingStatus ?? "UNKNOWN",
  ).toUpperCase();
  const available =
    typeof data?.available === "boolean"
      ? data.available
      : ["AVAILABLE", "BOOKABLE", "FREESALE"].includes(status);

  const totalPrice = firstNumber(
    data?.totalPrice?.recommendedRetailPrice,
    data?.pricing?.totalPrice?.recommendedRetailPrice,
    data?.pricing?.summary?.recommendedRetailPrice,
    data?.pricing?.recommendedRetailPrice,
    data?.recommendedRetailPrice,
    typeof data?.totalPrice === "number" ? data.totalPrice : undefined,
  );

  const rawLineItems =
    (Array.isArray(data?.lineItems) && data.lineItems) ||
    (Array.isArray(data?.pricing?.lineItems) && data.pricing.lineItems) ||
    (Array.isArray(data?.pricingDetails) && data.pricingDetails) ||
    [];
  const lineItems = rawLineItems
    .map((item: any) => {
      const recommendedRetailPrice = firstNumber(
        item?.recommendedRetailPrice,
        item?.price?.recommendedRetailPrice,
        item?.price?.original?.recommendedRetailPrice,
        item?.subtotal?.recommendedRetailPrice,
      );
      const ageBand =
        typeof item?.ageBand === "string"
          ? item.ageBand
          : typeof item?.travelerType === "string"
            ? item.travelerType
            : undefined;
      const numberOfTravelers = firstNumber(
        item?.numberOfTravelers,
        item?.quantity,
      );
      if (recommendedRetailPrice == null && !ageBand) return null;
      return { ageBand, numberOfTravelers, recommendedRetailPrice };
    })
    .filter(Boolean);

  return {
    available,
    status,
    productCode:
      typeof data?.productCode === "string" ? data.productCode : undefined,
    productOptionCode:
      typeof data?.productOptionCode === "string"
        ? data.productOptionCode
        : undefined,
    travelDate: dateString(data?.travelDate),
    startTime:
      typeof data?.startTime === "string" ? data.startTime : undefined,
    currency:
      typeof data?.currency === "string" ? data.currency : undefined,
    totalPrice,
    lineItems,
  };
}

Deno.serve(async (req: Request) => {
  if (!(await hasServiceAccess(req))) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "POST required" }, 405);
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const mode = String(body?.mode ?? "health");

  try {
    if (mode === "health") {
      return json({
        ok: Boolean(VIATOR_API_KEY),
        environment: "production",
        baseUrl: VIATOR_BASE,
        schedulesSupported: true,
        liveCheckPrepared: true,
        transactionalEndpointsEnabled: false,
      }, VIATOR_API_KEY ? 200 : 503);
    }

    if (mode === "get_schedules") {
      const code = String(body?.productCode ?? "").trim();
      if (!code) return json({ ok: false, error: "productCode required" }, 400);

      const result = await viatorFetch(
        `/availability/schedules/${encodeURIComponent(code)}`,
      );
      const schedule = result.ok ? normalizeSchedule(result.data) : null;

      return json(
        {
          ok: Boolean(result.ok && schedule),
          environment: "production",
          baseUrl: VIATOR_BASE,
          status: result.status,
          schedule,
          requestId: result.requestId,
          rateLimitRemaining: result.rateLimitRemaining,
          retryAfter: result.retryAfter,
          error: result.ok
            ? null
            : providerError(result.data, `Viator schedules HTTP ${result.status}`),
        },
        result.ok && schedule ? 200 : result.status || 502,
      );
    }

    if (mode === "check_availability") {
      const built = buildAvailabilityCheck(body);
      if (!built.ok) return json({ ok: false, error: built.error }, 400);

      const result = await viatorFetch("/availability/check", {
        method: "POST",
        body: JSON.stringify(built.payload),
      });
      const availability = result.ok
        ? normalizeAvailabilityCheck(result.data)
        : null;
      const fullAccessRequired = result.status === 403;

      return json(
        {
          ok: Boolean(result.ok && availability),
          environment: "production",
          baseUrl: VIATOR_BASE,
          status: result.status,
          availability,
          fullAccessRequired,
          requestId: result.requestId,
          rateLimitRemaining: result.rateLimitRemaining,
          retryAfter: result.retryAfter,
          error: result.ok
            ? null
            : providerError(
                result.data,
                fullAccessRequired
                  ? "Viator Full-access Affiliate approval is required for real-time availability checks"
                  : `Viator availability check HTTP ${result.status}`,
              ),
        },
        result.ok && availability ? 200 : result.status || 502,
      );
    }

    return json(
      {
        ok: false,
        error: `Unsupported mode: ${mode}`,
        supported: ["health", "get_schedules", "check_availability"],
      },
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
