import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

const jsonHeaders = { "content-type": "application/json" };

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function viatorFetch(path: string, init: RequestInit = {}) {
  if (!API_KEY) {
    throw new Error(
      "Missing VIATOR_API_KEY (or VIATOR_PARTNER_API_KEY / VIATOR_API) Edge Function secret",
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

  if (!res.ok) {
    const err = new Error(`Viator ${res.status} ${res.statusText}`) as Error & {
      details?: unknown;
    };
    err.details = data;
    throw err;
  }

  return {
    data,
    requestId: res.headers.get("x-unique-id"),
    rateLimitRemaining: res.headers.get("ratelimit-remaining"),
  };
}

async function upsert(table: string, rows: unknown[], onConflict?: string) {
  if (!rows.length) return;

  const params = new URLSearchParams();
  if (onConflict) params.set("on_conflict", onConflict);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    throw new Error(
      `Supabase upsert ${table} failed: ${res.status} ${await res.text()}`,
    );
  }
}

function destinationArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.destinations)) return payload.destinations;
  return [];
}

function mapDestination(d: any, fetchedAt: string) {
  const center = d?.center ?? {};
  const name = String(d?.name ?? "");

  return {
    destination_id: Number(d.destinationId),
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
    is_nashville: name.trim().toLowerCase() === "nashville",
    fetched_at: fetchedAt,
  };
}

async function getViatorSourceId(): Promise<string | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/data_sources?provider_key=eq.viator&select=id&limit=1`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    },
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.id ?? null;
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
      const nashville = destinations.filter((d: any) =>
        String(d?.name ?? "").toLowerCase().includes("nashville")
      );

      return response({
        ok: true,
        environment: VIATOR_ENV,
        authenticated: true,
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

      // Never return Viator Unique Content in this debugging endpoint. Viator
      // requires special protection from search indexing for this content.
      if (data?.viatorUniqueContent) {
        data.viatorUniqueContent = "[REDACTED_FROM_DEBUG_RESPONSE]";
      }

      return response({
        ok: true,
        environment: VIATOR_ENV,
        product: data,
        requestId: result.requestId,
        rateLimitRemaining: result.rateLimitRemaining,
      });
    }

    return response({ error: `Unsupported mode: ${mode}` }, 400);
  } catch (error) {
    const e = error as Error & { details?: unknown };
    return response(
      {
        ok: false,
        environment: VIATOR_ENV,
        error: e.message,
        details: e.details ?? null,
      },
      502,
    );
  }
});
