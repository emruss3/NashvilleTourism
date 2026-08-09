# Viator Integration

## Architecture

```
NashRoam UI
    → Next.js server (API routes / RSC)
        → Supabase (catalog + editorial)
            → Edge Function `viator-sync`
                → Viator Partner API v2 (sandbox by default)
```

- **Supabase project:** Nashroam (`aeomrsutkhwmnscvvfur`)
- **Integration boundary:** Supabase Edge Function secrets hold `VIATOR_API_KEY`
- **Next.js does not call Viator directly** and does **not** need `VIATOR_API_KEY` on Vercel
- **Browser never** sees Viator keys, service-role keys, or raw Partner API payloads
- Content tables keep RLS with no public policies; Next reads via service role server-side

## Environment

| Secret / env | Where | Notes |
|---|---|---|
| `VIATOR_API_KEY` | Supabase Edge Function secrets | Basic Access Affiliate **sandbox** key today |
| `VIATOR_API_ENV` | Supabase secrets (optional) | Default `sandbox`. Set `production` only with a production key |
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | Vercel / local server | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel / local server only | Never `NEXT_PUBLIC_*` |

Default Viator base URL: `https://api.sandbox.viator.com/partner`  
Production (`https://api.viator.com/partner`) must not be used with the sandbox key.

## Nashville destination

| Field | Value |
|---|---|
| Destination ID | `799` |
| lookupId | `8.77.295.799` |
| Parent destination ID | `295` |

Every discovery search scopes `filtering.destination` to **799**.

## Access tier (Basic Access Affiliate)

Use only Basic Access endpoints:

- `POST /products/search`
- `GET /products/{product-code}`
- `GET /products/tags`
- `POST /attractions/search`
- `GET /attractions/{attraction-id}`
- `GET /availability/schedules/{product-code}`
- `GET /destinations`

Do **not** call Full Access-only endpoints:

- `/products/modified-since`
- `/products/bulk`
- `/availability/check`
- bulk availability endpoints

## Edge Function modes (`viator-sync`)

| Mode | Purpose |
|---|---|
| `health` | Auth + `/destinations` probe; rate-limit headers |
| `sync_destinations` | Upsert `viator_destinations` + cursor |
| `search_products` | Nashville `POST /products/search` (destination 799) |
| `get_product` | Single product debug (redacts unique content) |
| `get_schedules` | `GET /availability/schedules/{product-code}` |
| `sync_nashville_catalog` | Search → normalize → quality gate → upsert experiences |

### `search_products` inputs

Aligned with Partner API v2 `/products/search`:

- `startDate` / `endDate` (optional filtering)
- `pagination.start` / `pagination.count` (max 50)
- `sorting.sort` / `order` (e.g. `TRAVELER_RATING`)
- `currency`
- optional `flags` / `tags` when supported by the schema
- `campaign` → Viator `campaign-value` header

## Affiliate attribution

Viator returns `productUrl` with affiliate attribution.

**Store and use that URL exactly as returned.** Do not rebuild, shorten, strip query params, or replace with a generic viator.com URL.

All Book CTAs must use the API-supplied `productUrl`. Prefer `campaign-value` to distinguish planner, tours marketplace, neighborhood, and guide surfaces.

## Catalog model

| Table | Role |
|---|---|
| `experiences` | Canonical NashRoam ID, slug, title, type, categories, duration, status |
| `experience_editorial` | First-party score, planner priority, local note, best_for, traveler_types |
| `experience_source_ids` | `source=viator`, `external_id=productCode`, `external_url=exact productUrl` |
| `experience_source_state` | Rating, reviews, from-price, booking URL, freshness, metadata |
| `viator_destinations` | Destination taxonomy cache |
| `ingestion_runs` / `ingestion_cursors` | Sync progress and rate-limit awareness |
| `data_sources` | Provider registry (`viator`) |

Principles:

- Viator supplies volatile commercial data; NashRoam owns editorial/ranking
- Do not blindly publish everything — quality gate + default unpublished until approved
- Target ~100–200 useful Nashville experiences, not thousands of near-duplicates
- Never treat supplier descriptions as NashRoam editorial copy

## Website surfaces

| Surface | Path / module |
|---|---|
| Tours marketplace | `/tours` → `getExperienceCatalog` |
| Product detail | `/tours/[productCode]` |
| Narrow read API | `/api/experiences` (`?planner=1` for planner candidates) |
| Edge client | `src/lib/feeds/viator.ts` |
| Catalog | `src/lib/feeds/experiences.ts` |
| Status | `/api/viator-status` |
| Sync trigger | `/api/viator/sync` (server-only) |

## Rate limits / resilience

Sandbox rate limits are tight (`rateLimitRemaining` can be `0`).

- Cache search/catalog on the server (TTL ≤ 1 hour for real-time guidance)
- Deduplicate in-flight identical Edge invocations
- Handle 429 + `Retry-After`; exponential backoff only in background sync
- No retry storms on user-facing requests
- Prefer Supabase catalog over per-render Viator calls
- Planner uses catalog candidates; on-demand schedule calls only for shortlists

## Request headers (set by Edge Function)

- `exp-api-key: <secret>`
- `Accept: application/json;version=2.0`
- `Accept-Language: en-US`
- Optional `campaign-value`
