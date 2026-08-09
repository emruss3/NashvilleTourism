import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Nashroam -> Viator Partner API v2 service boundary.
 *
 * SECURITY
 * - verify_jwt is intentionally false because Cron/pg_net is service-to-service.
 * - The handler itself requires either the Supabase service-role key or the
 *   private Cron token whose SHA-256 hash is embedded below.
 * - VIATOR_API_KEY never leaves this function.
 *
 * DATA OWNERSHIP
 * - Viator supplies provider state, tags, price/rating/review metadata and the
 *   exact affiliate productUrl.
 * - This function NEVER publishes an experience and NEVER writes
 *   experience_editorial / nashroam_score.
 * - New experiences are pending + unpublished until human curation.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VIATOR_API_KEY = Deno.env.get("VIATOR_API_KEY") ?? Deno.env.get("VIATOR_PARTNER_API_KEY") ?? Deno.env.get("VIATOR_API");
const VIATOR_ENV = (Deno.env.get("VIATOR_API_ENV") ?? "sandbox").toLowerCase();
const VIATOR_BASE = VIATOR_ENV === "production"
  ? "https://api.viator.com/partner"
  : "https://api.sandbox.viator.com/partner";
const NASHVILLE_DESTINATION_ID = "799";
const NASHVILLE_LOOKUP_ID = "8.77.295.799";
const CRON_TOKEN_SHA256 = "bf6d4248c199262ce56e654bef557f6bc37f32a4481521c6340574df329db7a7";
const SOURCE_STATE_TTL_MS = 60 * 60 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function isAuthorized(req: Request) {
  const apiKey = req.headers.get("apikey")?.trim();
  const authorization = req.headers.get("authorization")?.trim();
  if (apiKey && apiKey === SERVICE_ROLE_KEY) return true;
  if (authorization === `Bearer ${SERVICE_ROLE_KEY}`) return true;
  const cronToken = req.headers.get("x-nashroam-cron-token")?.trim();
  if (!cronToken) return false;
  return (await sha256Hex(cronToken)) === CRON_TOKEN_SHA256;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ViatorResult = {
  ok: boolean;
  status: number;
  data: any;
  requestId: string | null;
  rateLimitRemaining: string | null;
  retryAfter: string | null;
};

async function viatorFetch(path: string, init: RequestInit = {}): Promise<ViatorResult> {
  if (!VIATOR_API_KEY) throw new Error("Missing VIATOR_API_KEY");
  const headers = new Headers(init.headers);
  headers.set("exp-api-key", VIATOR_API_KEY);
  headers.set("Accept", "application/json;version=2.0");
  headers.set("Accept-Language", "en-US");
  if (init.body) headers.set("Content-Type", "application/json;version=2.0");
  const res = await fetch(`${VIATOR_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 1000) }; }
  return {
    ok: res.ok,
    status: res.status,
    data,
    requestId: res.headers.get("x-unique-id") ?? res.headers.get("X-Unique-ID"),
    rateLimitRemaining: res.headers.get("ratelimit-remaining") ?? res.headers.get("RateLimit-Remaining"),
    retryAfter: res.headers.get("retry-after") ?? res.headers.get("Retry-After"),
  };
}

async function rest(path: string, init: RequestInit & { prefer?: string } = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", SERVICE_ROLE_KEY);
  headers.set("authorization", `Bearer ${SERVICE_ROLE_KEY}`);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (init.prefer) headers.set("prefer", init.prefer);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${path} failed: ${res.status} ${text.slice(0, 1000)}`);
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

async function upsert(table: string, rows: unknown[], onConflict?: string) {
  if (!rows.length) return;
  const params = new URLSearchParams();
  if (onConflict) params.set("on_conflict", onConflict);
  await rest(`${table}?${params}`, {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify(rows),
  });
}

async function getViatorSourceId(): Promise<string> {
  const rows = await rest("data_sources?provider_key=eq.viator&select=id&limit=1");
  if (!Array.isArray(rows) || !rows[0]?.id) throw new Error("Viator source row missing");
  return rows[0].id;
}

async function startRun(sourceId: string, jobType: string, metadata: Record<string, unknown>) {
  const rows = await rest("ingestion_runs?select=id", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify([{ source_id: sourceId, job_type: jobType, status: "running", metadata }]),
  });
  return Array.isArray(rows) ? rows[0]?.id ?? null : null;
}

async function finishRun(runId: string | null, patch: Record<string, unknown>) {
  if (!runId) return;
  await rest(`ingestion_runs?id=eq.${runId}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({ ...patch, completed_at: new Date().toISOString() }),
  });
}

function destinationArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.destinations)) return payload.destinations;
  return [];
}

function durationBounds(d: any): [number | null, number | null] {
  if (!d || typeof d !== "object") return [null, null];
  const fixed = Number(d.fixedDurationInMinutes);
  if (Number.isFinite(fixed) && fixed >= 0) return [fixed, fixed];
  const from = Number(d.variableDurationFromMinutes);
  const to = Number(d.variableDurationToMinutes);
  const lo = Number.isFinite(from) ? from : null;
  const hi = Number.isFinite(to) ? to : lo;
  return [lo, hi];
}

function pickImageUrl(images: any): string | null {
  if (!Array.isArray(images) || !images.length) return null;
  const image = images.find((x: any) => x?.isCover) ?? images[0];
  const variants = Array.isArray(image?.variants) ? image.variants.filter((v: any) => v?.url) : [];
  variants.sort((a: any, b: any) => Math.abs((a.width ?? 0) - 720) - Math.abs((b.width ?? 0) - 720));
  return variants[0]?.url ?? null;
}

function slugForProduct(code: string) {
  return `viator-${code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}

function buildSearchBody(input: any, start: number, count: number) {
  const filtering: Record<string, unknown> = { destination: NASHVILLE_DESTINATION_ID };
  if (input?.startDate) filtering.startDate = String(input.startDate);
  if (input?.endDate) filtering.endDate = String(input.endDate);
  if (Array.isArray(input?.flags) && input.flags.length) filtering.flags = input.flags;
  if (Array.isArray(input?.tags) && input.tags.length) filtering.tags = input.tags;
  if (input?.lowestPrice != null) filtering.lowestPrice = Number(input.lowestPrice);
  if (input?.highestPrice != null) filtering.highestPrice = Number(input.highestPrice);
  return {
    filtering,
    sorting: {
      sort: input?.sort ?? "TRAVELER_RATING",
      order: input?.order === "ASCENDING" ? "ASCENDING" : "DESCENDING",
    },
    pagination: { start, count },
    currency: input?.currency ?? "USD",
  };
}

async function searchProducts(input: any, start: number, count: number) {
  const campaign = encodeURIComponent(String(input?.campaign ?? "nashroam_catalog"));
  return viatorFetch(`/products/search?campaign-value=${campaign}`, {
    method: "POST",
    body: JSON.stringify(buildSearchBody(input, start, count)),
  });
}

async function syncTags(sourceId: string) {
  const runId = await startRun(sourceId, "viator_tags", { environment: VIATOR_ENV });
  try {
    const result = await viatorFetch("/products/tags");
    if (!result.ok) throw Object.assign(new Error(`Viator tags HTTP ${result.status}`), { result });
    const tags = Array.isArray(result.data) ? result.data : Array.isArray(result.data?.tags) ? result.data.tags : [];
    const now = new Date().toISOString();
    const rows = tags
      .filter((t: any) => t?.tagId != null)
      .map((t: any) => ({
        tag_id: Number(t.tagId),
        name: t?.allNamesByLocale?.en ?? t?.name ?? null,
        parent_tag_id: t?.parentTagId ?? null,
        group_name: t?.groupName ?? null,
        raw: t,
        fetched_at: now,
      }));
    for (let i = 0; i < rows.length; i += 500) await upsert("viator_tags", rows.slice(i, i + 500), "tag_id");
    await finishRun(runId, { status: "succeeded", records_fetched: tags.length, records_upserted: rows.length, metadata: { requestId: result.requestId, rateLimitRemaining: result.rateLimitRemaining } });
    return { synced: rows.length, requestId: result.requestId, rateLimitRemaining: result.rateLimitRemaining };
  } catch (error) {
    await finishRun(runId, { status: "failed", error_message: error instanceof Error ? error.message : String(error) }).catch(() => null);
    throw error;
  }
}

async function syncDestinations(sourceId: string) {
  const runId = await startRun(sourceId, "viator_destinations", { environment: VIATOR_ENV });
  try {
    const result = await viatorFetch("/destinations");
    if (!result.ok) throw Object.assign(new Error(`Viator destinations HTTP ${result.status}`), { result });
    const now = new Date().toISOString();
    const rows = destinationArray(result.data)
      .filter((d: any) => d?.destinationId != null && d?.name)
      .map((d: any) => {
        const center = d?.center ?? {};
        return {
          destination_id: Number(d.destinationId),
          name: String(d.name),
          destination_type: d?.type ?? null,
          parent_destination_id: d?.parentDestinationId ?? null,
          lookup_id: d?.lookupId ?? null,
          destination_url: d?.destinationUrl ?? null,
          default_currency_code: d?.defaultCurrencyCode ?? null,
          time_zone: d?.timeZone ?? null,
          iata_code: d?.iataCode ?? null,
          latitude: center?.latitude ?? null,
          longitude: center?.longitude ?? null,
          is_nashville: Number(d.destinationId) === 799 || String(d?.lookupId ?? "") === NASHVILLE_LOOKUP_ID,
          fetched_at: now,
        };
      });
    for (let i = 0; i < rows.length; i += 500) await upsert("viator_destinations", rows.slice(i, i + 500), "destination_id");
    await finishRun(runId, { status: "succeeded", records_fetched: rows.length, records_upserted: rows.length, metadata: { requestId: result.requestId, rateLimitRemaining: result.rateLimitRemaining } });
    return { synced: rows.length, nashvilleMatches: rows.filter((r: any) => r.is_nashville), requestId: result.requestId, rateLimitRemaining: result.rateLimitRemaining };
  } catch (error) {
    await finishRun(runId, { status: "failed", error_message: error instanceof Error ? error.message : String(error) }).catch(() => null);
    throw error;
  }
}

async function syncProducts(input: any, sourceId: string) {
  const runId = await startRun(sourceId, "viator_nashville_products", { environment: VIATOR_ENV, destinationId: 799 });
  const pageSize = Math.min(Math.max(Number(input?.count) || 50, 1), 50);
  const maxPages = Math.min(Math.max(Number(input?.maxPages) || 3, 1), 4);
  const limit = Math.min(Math.max(Number(input?.limit) || 180, 1), 200);
  const rawByCode = new Map<string, any>();
  let lastRequestId: string | null = null;
  let lastRate: string | null = null;
  try {
    for (let page = 0; page < maxPages; page++) {
      const result = await searchProducts(input, page * pageSize + 1, pageSize);
      lastRequestId = result.requestId;
      lastRate = result.rateLimitRemaining;
      if (!result.ok) throw Object.assign(new Error(`Viator products HTTP ${result.status}`), { result });
      const products = Array.isArray(result.data?.products) ? result.data.products : [];
      for (const p of products) {
        if (p?.productCode && p?.title && p?.productUrl && p?.status !== "INACTIVE") rawByCode.set(String(p.productCode), p);
      }
      if (products.length < pageSize) break;
      if (lastRate != null && Number(lastRate) <= 0) break;
      await sleep(750);
    }

    const products = [...rawByCode.values()].slice(0, limit);
    const existingLinks = await rest(`experience_source_ids?source_id=eq.${sourceId}&select=experience_id,external_id`);
    const linkByCode = new Map<string, string>((Array.isArray(existingLinks) ? existingLinks : []).map((r: any) => [String(r.external_id), String(r.experience_id)]));
    const existingExperiences = await rest("experiences?slug=like.viator-*&select=id,slug,curation_status");
    const idBySlug = new Map<string, string>((Array.isArray(existingExperiences) ? existingExperiences : []).map((r: any) => [String(r.slug), String(r.id)]));

    const newRows: any[] = [];
    for (const p of products) {
      const code = String(p.productCode);
      if (linkByCode.has(code) || idBySlug.has(slugForProduct(code))) continue;
      const [minDuration, maxDuration] = durationBounds(p?.duration ?? p?.itinerary?.duration);
      newRows.push({
        slug: slugForProduct(code),
        title: String(p.title),
        experience_type: "tour",
        categories: [],
        summary: null,
        duration_min_minutes: minDuration,
        duration_max_minutes: maxDuration,
        status: "unverified",
        is_published: false,
        curation_status: "pending",
      });
    }

    if (newRows.length) {
      const inserted = await rest("experiences?select=id,slug", {
        method: "POST",
        prefer: "return=representation",
        body: JSON.stringify(newRows),
      });
      for (const r of Array.isArray(inserted) ? inserted : []) idBySlug.set(String(r.slug), String(r.id));
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + SOURCE_STATE_TTL_MS).toISOString();
    const idRows: any[] = [];
    const stateRows: any[] = [];

    for (const p of products) {
      const code = String(p.productCode);
      const experienceId = linkByCode.get(code) ?? idBySlug.get(slugForProduct(code));
      if (!experienceId) continue;
      const [minDuration, maxDuration] = durationBounds(p?.duration ?? p?.itinerary?.duration);
      const rating = typeof p?.reviews?.combinedAverageRating === "number" ? p.reviews.combinedAverageRating : null;
      const reviewCount = typeof p?.reviews?.totalReviews === "number" ? p.reviews.totalReviews : null;
      const rawPrice = p?.pricing?.summary?.fromPrice ?? p?.pricingInfo?.fromPrice ?? null;
      const price = rawPrice == null ? null : Number(rawPrice);
      const flags = Array.isArray(p?.flags) ? p.flags : [];
      const tags = Array.isArray(p?.tags) ? p.tags : [];

      idRows.push({
        experience_id: experienceId,
        source_id: sourceId,
        external_id: code,
        external_url: String(p.productUrl),
        is_primary: true,
        last_matched_at: now,
        metadata: { destination_id: 799, flags, tags },
      });
      stateRows.push({
        experience_id: experienceId,
        source_id: sourceId,
        external_status: p?.status ?? "ACTIVE",
        rating_value: rating,
        rating_scale: rating == null ? null : 5,
        review_count: reviewCount,
        from_price: Number.isFinite(price) ? price : null,
        currency: p?.pricing?.currency ?? p?.currency ?? "USD",
        duration_min_minutes: minDuration,
        duration_max_minutes: maxDuration,
        booking_url: String(p.productUrl),
        confirmation_type: p?.bookingConfirmationSettings?.confirmationType ?? p?.confirmationType ?? null,
        fetched_at: now,
        expires_at: expiresAt,
        display_allowed: true,
        attribution: "Viator",
        metadata: {
          image_url: pickImageUrl(p?.images),
          flags,
          tags,
          description: typeof p?.description === "string" ? p.description : null,
          supplier: p?.supplier ?? null,
          destinations: p?.destinations ?? null,
          free_cancellation: flags.includes("FREE_CANCELLATION"),
          environment: VIATOR_ENV,
        },
      });
    }

    if (idRows.length) await upsert("experience_source_ids", idRows, "experience_id,source_id");
    if (stateRows.length) await upsert("experience_source_state", stateRows, "experience_id,source_id");

    const curation = await rest("rpc/refresh_experience_machine_curation", {
      method: "POST",
      body: "{}",
    });

    await rest(`data_sources?id=eq.${sourceId}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({
        active: true,
        base_url: VIATOR_BASE,
        notes: `Basic Access Affiliate (${VIATOR_ENV}). Nashville destination 799. Preserve productUrl exactly. Ingestion never auto-publishes or writes Nashroam editorial scores.`,
      }),
    });

    await finishRun(runId, {
      status: "succeeded",
      records_fetched: rawByCode.size,
      records_upserted: idRows.length,
      metadata: { requestId: lastRequestId, rateLimitRemaining: lastRate, newExperiences: newRows.length, curation },
    });

    return {
      fetched: rawByCode.size,
      upserted: idRows.length,
      newExperiences: newRows.length,
      curation,
      requestId: lastRequestId,
      rateLimitRemaining: lastRate,
      sample: products.slice(0, 10).map((p: any) => ({ productCode: p.productCode, title: p.title, productUrl: p.productUrl })),
    };
  } catch (error) {
    await finishRun(runId, { status: "failed", error_message: error instanceof Error ? error.message : String(error), records_fetched: rawByCode.size }).catch(() => null);
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (!(await isAuthorized(req))) return json({ ok: false, error: "Unauthorized" }, 401);
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const mode = body?.mode ?? "health";

  try {
    const sourceId = await getViatorSourceId();

    if (mode === "health") {
      const r = await viatorFetch("/destinations");
      const destinations = destinationArray(r.data);
      return json({
        ok: r.ok,
        environment: VIATOR_ENV,
        status: r.status,
        authenticated: r.ok,
        destinationCount: destinations.length,
        nashvilleMatches: destinations.filter((d: any) => Number(d?.destinationId) === 799),
        requestId: r.requestId,
        rateLimitRemaining: r.rateLimitRemaining,
        retryAfter: r.retryAfter,
        error: r.ok ? null : r.data,
      }, r.ok ? 200 : r.status);
    }

    if (mode === "sync_tags") return json({ ok: true, environment: VIATOR_ENV, ...(await syncTags(sourceId)) });
    if (mode === "sync_destinations") return json({ ok: true, environment: VIATOR_ENV, ...(await syncDestinations(sourceId)) });

    if (mode === "search_products") {
      const r = await searchProducts(body, Math.max(Number(body?.start) || 1, 1), Math.min(Math.max(Number(body?.count) || 24, 1), 50));
      return json({
        ok: r.ok,
        environment: VIATOR_ENV,
        status: r.status,
        destinationId: 799,
        products: r.ok ? (r.data?.products ?? []) : [],
        totalCount: r.data?.totalCount ?? null,
        requestId: r.requestId,
        rateLimitRemaining: r.rateLimitRemaining,
        retryAfter: r.retryAfter,
        error: r.ok ? null : r.data,
      }, r.ok ? 200 : r.status);
    }

    if (mode === "sync_products" || mode === "sync_nashville_catalog") {
      return json({ ok: true, environment: VIATOR_ENV, ...(await syncProducts(body, sourceId)) });
    }

    if (mode === "get_product") {
      const code = String(body?.productCode ?? "").trim();
      if (!code) return json({ error: "productCode required" }, 400);
      const campaign = body?.campaign ? `?campaign-value=${encodeURIComponent(String(body.campaign))}` : "";
      const r = await viatorFetch(`/products/${encodeURIComponent(code)}${campaign}`);
      if (r.data?.viatorUniqueContent) r.data.viatorUniqueContent = "[REDACTED_FROM_RESPONSE]";
      return json({ ok: r.ok, status: r.status, product: r.ok ? r.data : null, requestId: r.requestId, rateLimitRemaining: r.rateLimitRemaining, error: r.ok ? null : r.data }, r.ok ? 200 : r.status);
    }

    if (mode === "get_schedules") {
      const code = String(body?.productCode ?? "").trim();
      if (!code) return json({ error: "productCode required" }, 400);
      const r = await viatorFetch(`/availability/schedules/${encodeURIComponent(code)}`);
      return json({ ok: r.ok, status: r.status, productCode: code, schedules: r.ok ? r.data : null, requestId: r.requestId, rateLimitRemaining: r.rateLimitRemaining, error: r.ok ? null : r.data }, r.ok ? 200 : r.status);
    }

    return json({ error: `Unsupported mode: ${mode}`, supported: ["health", "sync_tags", "sync_destinations", "search_products", "sync_products", "get_product", "get_schedules"] }, 400);
  } catch (error) {
    return json({ ok: false, environment: VIATOR_ENV, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
