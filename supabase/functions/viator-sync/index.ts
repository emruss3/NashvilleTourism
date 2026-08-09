import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const API_KEY = Deno.env.get("VIATOR_API_KEY") ?? Deno.env.get("VIATOR_PARTNER_API_KEY") ?? Deno.env.get("VIATOR_API");
const VIATOR_ENV = (Deno.env.get("VIATOR_API_ENV") ?? "sandbox").toLowerCase();
const BASE_URL = VIATOR_ENV === "production" ? "https://api.viator.com/partner" : "https://api.sandbox.viator.com/partner";
const NASHVILLE_DESTINATION_ID = "799";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

async function viatorFetch(path: string, init: RequestInit = {}) {
  if (!API_KEY) throw new Error("Missing VIATOR_API_KEY");
  const headers = new Headers(init.headers);
  headers.set("exp-api-key", API_KEY);
  headers.set("Accept", "application/json;version=2.0");
  headers.set("Accept-Language", "en-US");
  if (init.body) headers.set("Content-Type", "application/json;version=2.0");
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 1000) }; }
  return { res, data, requestId: res.headers.get("x-unique-id"), rateLimitRemaining: res.headers.get("ratelimit-remaining") };
}

async function rest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", SERVICE_ROLE_KEY);
  headers.set("authorization", `Bearer ${SERVICE_ROLE_KEY}`);
  headers.set("content-type", "application/json");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 1000)}`);
  return data;
}

function destinationArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.destinations)) return payload.destinations;
  return [];
}

function mapDestination(d: any, fetchedAt: string) {
  const center = d?.center ?? {};
  return {
    destination_id: Number(d.destinationId),
    name: String(d?.name ?? ""),
    destination_type: d?.type ?? null,
    parent_destination_id: d?.parentDestinationId ?? null,
    lookup_id: d?.lookupId ?? null,
    destination_url: d?.destinationUrl ?? null,
    default_currency_code: d?.defaultCurrencyCode ?? null,
    time_zone: d?.timeZone ?? null,
    iata_code: d?.iataCode ?? null,
    latitude: center?.latitude ?? null,
    longitude: center?.longitude ?? null,
    is_nashville: Number(d.destinationId) === 799,
    fetched_at: fetchedAt,
  };
}

function durationBounds(d: any): [number | null, number | null] {
  if (!d || typeof d !== "object") return [null, null];
  const fixed = Number(d.fixedDurationInMinutes);
  if (Number.isFinite(fixed) && fixed >= 0) return [fixed, fixed];
  const from = Number(d.variableDurationFromMinutes);
  const to = Number(d.variableDurationToMinutes);
  return [Number.isFinite(from) ? from : null, Number.isFinite(to) ? to : (Number.isFinite(from) ? from : null)];
}

function pickImageUrl(images: any): string | null {
  if (!Array.isArray(images) || !images.length) return null;
  const img = images.find((x:any) => x?.isCover) ?? images[0];
  const variants = Array.isArray(img?.variants) ? img.variants.filter((v:any) => v?.url) : [];
  variants.sort((a:any,b:any) => Math.abs((a.width ?? 0)-720)-Math.abs((b.width ?? 0)-720));
  return variants[0]?.url ?? null;
}

async function getViatorSourceId(): Promise<string> {
  const rows = await rest("data_sources?provider_key=eq.viator&select=id&limit=1");
  if (!rows?.[0]?.id) throw new Error("Viator source missing");
  return rows[0].id;
}

function productSearchBody(input: any) {
  const count = Math.max(1, Math.min(Number(input?.count ?? 50), 50));
  const start = Math.max(1, Number(input?.start ?? 1));
  return {
    filtering: {
      destination: NASHVILLE_DESTINATION_ID,
      ...(input?.startDate ? { startDate: String(input.startDate) } : {}),
      ...(input?.endDate ? { endDate: String(input.endDate) } : {}),
      ...(Array.isArray(input?.flags) && input.flags.length ? { flags: input.flags } : {}),
    },
    sorting: { sort: input?.sort ?? "TRAVELER_RATING", order: input?.order ?? "DESCENDING" },
    pagination: { start, count },
    currency: input?.currency ?? "USD",
  };
}

async function searchProducts(input: any) {
  const campaign = encodeURIComponent(String(input?.campaign ?? "nashroam_catalog"));
  return await viatorFetch(`/products/search?campaign-value=${campaign}`, { method: "POST", body: JSON.stringify(productSearchBody(input)) });
}

async function syncProducts(input: any) {
  const fetchedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const result = await searchProducts(input);
  if (!result.res.ok) return { ok:false, result };
  const products = Array.isArray(result.data?.products) ? result.data.products : [];
  const active = products.filter((p:any) => p?.status !== "INACTIVE" && p?.productCode && p?.title && p?.productUrl);
  const sourceId = await getViatorSourceId();
  const experienceRows = active.map((p:any) => {
    const [minDuration, maxDuration] = durationBounds(p?.duration ?? p?.itinerary?.duration);
    return {
      slug: `viator-${String(p.productCode).toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,
      title: p.title,
      experience_type: "tour",
      categories: [],
      summary: null,
      duration_min_minutes: minDuration,
      duration_max_minutes: maxDuration,
      status: "active",
      is_published: false,
    };
  });
  const inserted = experienceRows.length ? await rest("experiences?on_conflict=slug&select=id,slug,title", { method:"POST", headers:{"prefer":"resolution=merge-duplicates,return=representation"}, body:JSON.stringify(experienceRows) }) : [];
  const bySlug = new Map((inserted ?? []).map((r:any) => [r.slug, r]));
  const idRows:any[] = [];
  const stateRows:any[] = [];
  for (const p of active) {
    const slug = `viator-${String(p.productCode).toLowerCase().replace(/[^a-z0-9]+/g,"-")}`;
    const exp:any = bySlug.get(slug);
    if (!exp) continue;
    const [minDuration, maxDuration] = durationBounds(p?.duration ?? p?.itinerary?.duration);
    const rating = p?.reviews?.combinedAverageRating ?? null;
    const reviewCount = p?.reviews?.totalReviews ?? null;
    const rawPrice = p?.pricing?.summary?.fromPrice ?? p?.pricingInfo?.fromPrice ?? null;
    const price = rawPrice == null ? null : Number(rawPrice);
    idRows.push({ experience_id:exp.id, source_id:sourceId, external_id:p.productCode, external_url:p.productUrl, is_primary:true, last_matched_at:fetchedAt, metadata:{destination_id:799} });
    stateRows.push({
      experience_id:exp.id, source_id:sourceId, external_status:p.status ?? "ACTIVE", rating_value:rating, rating_scale:rating == null ? null : 5,
      review_count:reviewCount, from_price:Number.isFinite(price) ? price : null, currency:p?.pricing?.currency ?? p?.currency ?? "USD",
      duration_min_minutes:minDuration, duration_max_minutes:maxDuration, booking_url:p.productUrl,
      confirmation_type:p?.bookingConfirmationSettings?.confirmationType ?? null, fetched_at:fetchedAt, expires_at:expiresAt,
      display_allowed:true, attribution:"Viator",
      metadata:{ image_url:pickImageUrl(p.images), flags:Array.isArray(p.flags)?p.flags:[], tags:Array.isArray(p.tags)?p.tags:[], description:typeof p.description==="string"?p.description:null, supplier:p.supplier??null, destinations:p.destinations??null }
    });
  }
  if (idRows.length) await rest("experience_source_ids?on_conflict=experience_id,source_id", { method:"POST", headers:{"prefer":"resolution=merge-duplicates,return=minimal"}, body:JSON.stringify(idRows) });
  if (stateRows.length) await rest("experience_source_state?on_conflict=experience_id,source_id", { method:"POST", headers:{"prefer":"resolution=merge-duplicates,return=minimal"}, body:JSON.stringify(stateRows) });
  await rest(`data_sources?id=eq.${sourceId}`, { method:"PATCH", headers:{"prefer":"return=minimal"}, body:JSON.stringify({active:true}) });
  return { ok:true, returned:products.length, imported:idRows.length, fetchedAt, sample:active.slice(0,10).map((p:any)=>({productCode:p.productCode,title:p.title,productUrl:p.productUrl})) };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return response({error:"POST required"},405);
  let body:any={}; try { body=await req.json(); } catch {}
  const mode=body?.mode ?? "health";
  try {
    if (mode === "health") {
      const r=await viatorFetch("/destinations");
      const destinations=destinationArray(r.data);
      return response({ok:r.res.ok,environment:VIATOR_ENV,status:r.res.status,authenticated:r.res.ok,destinationCount:destinations.length,nashvilleMatches:destinations.filter((d:any)=>Number(d.destinationId)===799),requestId:r.requestId,rateLimitRemaining:r.rateLimitRemaining,error:r.res.ok?null:r.data},r.res.ok?200:502);
    }
    if (mode === "sync_destinations") {
      const fetchedAt=new Date().toISOString();
      const r=await viatorFetch("/destinations");
      if(!r.res.ok) return response({ok:false,status:r.res.status,error:r.data,requestId:r.requestId},502);
      const rows=destinationArray(r.data).filter((d:any)=>d?.destinationId!=null&&d?.name).map((d:any)=>mapDestination(d,fetchedAt));
      for(let i=0;i<rows.length;i+=500) await rest("viator_destinations?on_conflict=destination_id",{method:"POST",headers:{"prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(rows.slice(i,i+500))});
      return response({ok:true,synced:rows.length,nashvilleMatches:rows.filter((r:any)=>r.is_nashville),requestId:r.requestId,rateLimitRemaining:r.rateLimitRemaining});
    }
    if (mode === "search_products") {
      const r=await searchProducts(body);
      return response({ok:r.res.ok,status:r.res.status,products:r.res.ok?(r.data?.products??[]):[],totalCount:r.data?.totalCount??null,requestId:r.requestId,rateLimitRemaining:r.rateLimitRemaining,error:r.res.ok?null:r.data},r.res.ok?200:502);
    }
    if (mode === "sync_products") {
      const s:any=await syncProducts(body);
      if(!s.ok) return response({ok:false,status:s.result.res.status,error:s.result.data,requestId:s.result.requestId,rateLimitRemaining:s.result.rateLimitRemaining},502);
      return response(s);
    }
    if (mode === "get_product") {
      const code=String(body?.productCode??"").trim();
      if(!code) return response({error:"productCode required"},400);
      const campaign=body?.campaign?`?campaign-value=${encodeURIComponent(String(body.campaign))}`:"";
      const r=await viatorFetch(`/products/${encodeURIComponent(code)}${campaign}`);
      if(r.data?.viatorUniqueContent) r.data.viatorUniqueContent="[REDACTED_FROM_DEBUG_RESPONSE]";
      return response({ok:r.res.ok,status:r.res.status,product:r.res.ok?r.data:null,requestId:r.requestId,rateLimitRemaining:r.rateLimitRemaining,error:r.res.ok?null:r.data},r.res.ok?200:502);
    }
    return response({error:`Unsupported mode: ${mode}`},400);
  } catch(error){ return response({ok:false,error:error instanceof Error?error.message:String(error)},500); }
});
