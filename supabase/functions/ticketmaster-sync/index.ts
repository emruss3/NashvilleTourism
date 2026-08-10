import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const API_KEY = Deno.env.get("TICKETMASTER_API_KEY");
const API = "https://app.ticketmaster.com/discovery/v2/events.json";
const SOURCE_KEY = "ticketmaster";
const NASHVILLE_CITY = "nashville";
const NASHVILLE_STATE = "TN";
const UNITED_STATES = "US";
const TIME_ZONE = "America/Chicago";
const STATE_TTL_HOURS = 6;

// SHA-256 of the vault-held nashroam_cron_token. Same value viator-sync pins;
// only the hash lives in code, never the token itself.
const CRON_TOKEN_SHA256 = "bf6d4248c199262ce56e654bef557f6bc37f32a4481521c6340574df329db7a7";

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Same gate as viator-sync: service-role key, or the vault cron token.
 * Without this, anyone could trigger sync_events (service-role writes) or
 * burn the Ticketmaster API quota through search_events.
 */
async function isAuthorized(req: Request) {
  const apiKey = req.headers.get("apikey")?.trim();
  const authorization = req.headers.get("authorization")?.trim();
  if (apiKey && apiKey === SERVICE_ROLE_KEY) return true;
  if (authorization === `Bearer ${SERVICE_ROLE_KEY}`) return true;
  const cronToken = req.headers.get("x-nashroam-cron-token")?.trim();
  if (!cronToken) return false;
  return (await sha256Hex(cronToken)) === CRON_TOKEN_SHA256;
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function rest(path: string, init: RequestInit & { prefer?: string } = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", SERVICE_ROLE_KEY);
  headers.set("authorization", `Bearer ${SERVICE_ROLE_KEY}`);
  if (init.body) headers.set("content-type", "application/json");
  if (init.prefer) headers.set("prefer", init.prefer);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${path} failed: ${res.status} ${text.slice(0, 1000)}`);
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

async function sourceId(): Promise<string> {
  const rows = await rest(`data_sources?provider_key=eq.${SOURCE_KEY}&select=id&limit=1`);
  if (!Array.isArray(rows) || !rows[0]?.id) throw new Error("Ticketmaster source missing");
  return rows[0].id;
}

function isoDate(daysFromNow = 0) {
  const d = new Date(Date.now() + daysFromNow * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** Convert a Nashville-local wall clock into an ISO UTC instant, DST-aware. */
function localNashvilleToIso(date: string, time?: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss] = (time || "12:00:00").split(":").map(Number);
  const targetAsUtc = Date.UTC(y, m - 1, d, hh || 0, mm || 0, ss || 0);
  let guess = targetAsUtc;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  });

  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(guess))
        .filter((p) => p.type !== "literal")
        .map((p) => [p.type, p.value]),
    );
    const shownAsUtc = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second),
    );
    const delta = targetAsUtc - shownAsUtc;
    if (delta === 0) break;
    guess += delta;
  }
  return new Date(guess).toISOString();
}

function venueIsNashville(v: any): boolean {
  const city = String(v?.city?.name ?? "").trim().toLowerCase();
  const state = String(v?.state?.stateCode ?? "").trim().toUpperCase();
  const country = String(v?.country?.countryCode ?? "").trim().toUpperCase();
  return city === NASHVILLE_CITY && (!state || state === NASHVILLE_STATE) && (!country || country === UNITED_STATES);
}

function pickImage(images: any[]): any | null {
  if (!Array.isArray(images) || !images.length) return null;
  return [...images]
    .filter((x) => x?.url)
    .sort((a, b) => {
      if (Boolean(a.fallback) !== Boolean(b.fallback)) return a.fallback ? 1 : -1;
      if ((a.ratio === "16_9") !== (b.ratio === "16_9")) return a.ratio === "16_9" ? -1 : 1;
      return Math.abs((a.width ?? 0) - 960) - Math.abs((b.width ?? 0) - 960);
    })[0] ?? null;
}

function mapStatus(code?: string): "scheduled" | "cancelled" | "postponed" | "unverified" {
  const c = String(code || "").toLowerCase();
  if (c.includes("cancel")) return "cancelled";
  if (c.includes("postpon") || c.includes("resched")) return "postponed";
  if (c) return "scheduled";
  return "unverified";
}

function eventType(e: any): string {
  const segment = String(e?.classifications?.[0]?.segment?.name ?? "event").trim().toLowerCase();
  return segment.replace(/[^a-z0-9]+/g, "_") || "event";
}

function normalise(e: any) {
  const venue = e?._embedded?.venues?.[0];
  const localDate = e?.dates?.start?.localDate;
  const localTime = e?.dates?.start?.localTime;
  if (!e?.id || !e?.name || !e?.url || !localDate || !venueIsNashville(venue)) return null;

  const classification = e?.classifications?.[0] ?? {};
  const image = pickImage(e?.images ?? []);
  const status = mapStatus(e?.dates?.status?.code);
  const timeTbd = !localTime || Boolean(e?.dates?.start?.noSpecificTime);
  const startsAt = localNashvilleToIso(localDate, localTime || undefined);
  const location = venue?.location ?? {};
  const latitude = location?.latitude == null ? null : Number(location.latitude);
  const longitude = location?.longitude == null ? null : Number(location.longitude);
  const price = e?.priceRanges?.[0] ?? {};

  return {
    externalId: String(e.id),
    canonicalKey: `ticketmaster:${e.id}`,
    slug: `ticketmaster-${String(e.id).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: String(e.name),
    eventType: eventType(e),
    startsAt,
    timeTbd,
    venueName: String(venue?.name ?? "Nashville venue"),
    address: venue?.address?.line1 ?? null,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    ticketUrl: String(e.url),
    status,
    sourceUrl: String(e.url),
    metadata: {
      localDate,
      localTime: localTime ?? null,
      noSpecificTime: Boolean(e?.dates?.start?.noSpecificTime),
      onSaleStatus: e?.dates?.status?.code ?? null,
      segment: classification?.segment?.name ?? null,
      genre: classification?.genre?.name ?? null,
      subGenre: classification?.subGenre?.name ?? null,
      imageUrl: image?.url ?? null,
      imageFallback: Boolean(image?.fallback),
      imageAttribution: image?.attribution ?? null,
      priceFrom: price?.min ?? null,
      currency: price?.currency ?? null,
      venueExternalId: venue?.id ?? null,
      venueCity: venue?.city?.name ?? null,
      venueState: venue?.state?.stateCode ?? null,
      venueCountry: venue?.country?.countryCode ?? null,
    },
  };
}

async function fetchPage(input: any, page = 0) {
  if (!API_KEY) return { ok: false, status: 503, data: { error: "TICKETMASTER_API_KEY missing" } };
  const start = String(input?.startDate || isoDate(0));
  const end = String(input?.endDate || isoDate(120));
  const size = Math.min(Math.max(Number(input?.size) || 200, 1), 200);

  const url = new URL(API);
  url.searchParams.set("apikey", API_KEY);
  url.searchParams.set("city", "Nashville");
  url.searchParams.set("stateCode", NASHVILLE_STATE);
  url.searchParams.set("countryCode", UNITED_STATES);
  url.searchParams.set("startDateTime", `${start}T00:00:00Z`);
  url.searchParams.set("endDateTime", `${end}T23:59:59Z`);
  url.searchParams.set("size", String(size));
  url.searchParams.set("page", String(page));
  url.searchParams.set("sort", "date,asc");
  if (input?.classificationName) url.searchParams.set("classificationName", String(input.classificationName));

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 1000) }; }
  return { ok: res.ok, status: res.status, data };
}

async function syncEvents(input: any) {
  const sid = await sourceId();
  const startedAt = new Date().toISOString();
  const runRows = await rest("ingestion_runs?select=id", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify([{
      source_id: sid,
      job_type: "ticketmaster_nashville_events",
      status: "running",
      metadata: { startDate: input?.startDate ?? null, endDate: input?.endDate ?? null },
    }]),
  });
  const runId = Array.isArray(runRows) ? runRows[0]?.id : null;
  let fetched = 0;
  let upserted = 0;

  try {
    const maxPages = Math.min(Math.max(Number(input?.maxPages) || 3, 1), 5);
    const normalized: any[] = [];
    for (let page = 0; page < maxPages; page++) {
      const result = await fetchPage(input, page);
      if (!result.ok) throw Object.assign(new Error(`Ticketmaster HTTP ${result.status}`), { status: result.status, details: result.data });
      const raw = result.data?._embedded?.events ?? [];
      fetched += raw.length;
      normalized.push(...raw.map(normalise).filter(Boolean));
      const totalPages = Number(result.data?.page?.totalPages ?? 1);
      if (page + 1 >= totalPages || raw.length === 0) break;
    }

    const byId = new Map<string, any>();
    for (const e of normalized) byId.set(e.externalId, e);
    const rows = [...byId.values()];
    const eventRows = rows.map((e) => ({
      canonical_key: e.canonicalKey,
      slug: e.slug,
      name: e.name,
      event_type: e.eventType,
      short_description: null,
      description: null,
      starts_at: e.startsAt,
      ends_at: null,
      timezone: TIME_ZONE,
      all_day: false,
      time_tbd: e.timeTbd,
      venue_name: e.venueName,
      address: e.address,
      latitude: e.latitude,
      longitude: e.longitude,
      official_url: null,
      ticket_url: e.ticketUrl,
      affiliate_url: null,
      expected_attendance: null,
      impact_level: 50,
      planner_priority: 50,
      traveler_types: [],
      status: e.status,
      is_published: true,
    }));

    let returned: any[] = [];
    if (eventRows.length) {
      returned = await rest("events?on_conflict=canonical_key&select=id,canonical_key", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=representation",
        body: JSON.stringify(eventRows),
      });
    }
    const ids = new Map((returned ?? []).map((r: any) => [r.canonical_key, r.id]));
    const expiresAt = new Date(Date.now() + STATE_TTL_HOURS * 3600_000).toISOString();
    const links = rows.flatMap((e) => {
      const eventId = ids.get(e.canonicalKey);
      return eventId ? [{
        event_id: eventId,
        source_id: sid,
        external_id: e.externalId,
        source_url: e.sourceUrl,
        fetched_at: startedAt,
        expires_at: expiresAt,
        display_allowed: true,
        metadata: e.metadata,
      }] : [];
    });

    if (links.length) {
      await rest("event_source_links?on_conflict=event_id,source_id", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=minimal",
        body: JSON.stringify(links),
      });
    }
    upserted = links.length;

    await rest(`data_sources?id=eq.${sid}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ active: true }),
    });

    if (runId) {
      await rest(`ingestion_runs?id=eq.${runId}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: JSON.stringify({
          status: "succeeded",
          completed_at: new Date().toISOString(),
          records_fetched: fetched,
          records_upserted: upserted,
        }),
      });
    }

    return { ok: true, fetched, upserted, sample: rows.slice(0, 10) };
  } catch (err) {
    if (runId) {
      await rest(`ingestion_runs?id=eq.${runId}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: JSON.stringify({
          status: "failed",
          completed_at: new Date().toISOString(),
          records_fetched: fetched,
          records_upserted: upserted,
          error_message: err instanceof Error ? err.message : String(err),
        }),
      }).catch(() => null);
    }
    throw err;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return response({ error: "POST required" }, 405);
  if (!(await isAuthorized(req))) return response({ error: "Unauthorized" }, 401);
  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const mode = body?.mode ?? "health";

  try {
    if (!API_KEY) return response({ ok: false, configured: false, error: "TICKETMASTER_API_KEY missing" }, 503);

    if (mode === "health") {
      const result = await fetchPage({ size: 1 }, 0);
      return response({
        ok: result.ok,
        configured: true,
        status: result.status,
        sampleCount: result.data?._embedded?.events?.length ?? 0,
      }, result.ok ? 200 : 502);
    }

    if (mode === "search_events") {
      const result = await fetchPage(body, Number(body?.page) || 0);
      if (!result.ok) return response({ ok: false, status: result.status, error: result.data }, 502);
      const raw = result.data?._embedded?.events ?? [];
      const events = raw.map(normalise).filter(Boolean);
      return response({ ok: true, events, page: result.data?.page ?? null });
    }

    if (mode === "sync_events") {
      return response(await syncEvents(body));
    }

    return response({ error: `Unsupported mode: ${mode}` }, 400);
  } catch (err) {
    const e = err as Error & { status?: number; details?: unknown };
    return response({ ok: false, error: e.message, details: e.details ?? null }, e.status === 401 || e.status === 403 || e.status === 429 ? e.status : 502);
  }
});
