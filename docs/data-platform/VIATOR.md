# Viator Integration

## Architecture

```text
Nashroam UI
    → Next.js server
        → approved Supabase catalog
            → Edge Function `viator-sync`
                → Viator Partner API v2

Supabase Cron
    → pg_net
        → Vault-authenticated `viator-sync`
            → Viator
```

- **Supabase project:** Nashroam (`aeomrsutkhwmnscvvfur`)
- **Provider credential:** `VIATOR_API_KEY` in Supabase Edge Function secrets
- **Current environment:** sandbox Basic Access Affiliate
- **Next.js does not call Viator directly** and does not need `VIATOR_API_KEY` on Vercel
- The browser never receives Viator credentials or the Supabase service-role key

## Security

`viator-sync` uses custom service authorization because scheduled `pg_net` calls are service-to-service. It accepts only:

1. the Supabase service-role credential; or
2. a private Cron token stored in Supabase Vault and sent as `x-nashroam-cron-token`.

All other requests receive `401 Unauthorized`.

The raw Cron token, `VIATOR_API_KEY`, and service-role key must never be committed to GitHub or exposed as `NEXT_PUBLIC_*` variables.

## Nashville destination

| Field | Value |
|---|---|
| Destination ID | `799` |
| lookupId | `8.77.295.799` |
| Parent destination ID | `295` |

Every discovery search is scoped to destination **799**.

## Access tier

Current credential is a **Basic Access Affiliate sandbox key**.

Supported workflow includes:

- `POST /products/search`
- `GET /products/{product-code}`
- `GET /products/tags`
- `POST /attractions/search`
- `GET /attractions/{attraction-id}`
- `GET /availability/schedules/{product-code}`
- `GET /destinations`

Do not design Basic Access ingestion around Full Access-only bulk/delta endpoints such as `/products/modified-since`, `/products/bulk`, `/availability/check`, or bulk availability endpoints.

Production must not be enabled until a production credential is explicitly configured.

## Current catalog state

- Canonical Viator experiences: **188**
- Local Viator taxonomy tags: **1,263**
- Approved experiences: **0**
- Published experiences: **0**
- Priority human-review queue: **49**
- Standard review: **88**
- Long tail: **51**

All current experiences remain pending curation.

## Critical rule: ingestion is not editorial approval

`viator-sync` may:

- discover and normalize products
- preserve product codes and exact affiliate `productUrl`s
- refresh ratings, review counts, price, duration, images, tags, flags and other permitted provider state
- create new canonical experiences as `unverified`, unpublished and `curation_status='pending'`
- run machine classification and review prioritization

`viator-sync` may **not**:

- set `is_published=true`
- set `curation_status='approved'`
- write Nashroam editorial copy
- write `nashroam_score`
- treat Viator popularity, rating or conversion as Nashroam editorial judgment

Public tours, direct product pages and Plan Your Trip are separately gated on:

```text
curation_status = approved
is_published = true
status = active
```

There is no public live-search fallback that bypasses these conditions.

## Edge Function modes

| Mode | Purpose |
|---|---|
| `health` | Auth/destination probe |
| `sync_tags` | Refresh local `viator_tags` taxonomy |
| `sync_destinations` | Refresh `viator_destinations` |
| `search_products` | Internal Nashville `/products/search` discovery |
| `sync_products` | Multi-page provider-state/catalog refresh; never auto-publishes |
| `get_product` | One product detail request; protected unique content is redacted from debug response |
| `get_schedules` | Supported availability schedules for one product |

## Active automated refresh

Supabase Cron + `pg_net` is live.

| Job | Cron (UTC) | Work |
|---|---|---|
| `nashroam-viator-products` | `17 * * * *` | **Hourly**; max 3 pages / 150 Nashville products using DEFAULT ranking |
| `nashroam-viator-tags` | `35 8 * * 0` | Weekly Sunday taxonomy refresh |
| `nashroam-viator-destinations` | `50 8 * * 0` | Weekly Sunday destination refresh |

The product-state TTL is one hour, so the hourly catalog refresh keeps normal displayed provider state inside that freshness window.

Product calls use a 60-second pg_net timeout; tag/destination jobs use 30 seconds.

`ingestion_runs` logs each run. `ingestion_schedules.last_run_at` and `next_run_after` are updated after successful ingestion.

## Rate limits

Viator rate limits are **per endpoint / per Partner Unique ID over a rolling 10-second window**, with an additional IP-based burst layer. `RateLimit-Remaining` is therefore not a daily quota.

The integration should:

- inspect rate-limit headers
- honor `Retry-After` on 429/503 responses
- avoid bursty retry loops
- pace multi-page jobs
- keep interactive requests bounded

Hourly catalog ingestion uses only a handful of `/products/search` calls and is deliberately modest relative to the observed endpoint limit.

## Curation

Machine curation exists only to order human review. It may suggest:

- category
- traveler fit
- age restriction
- high-price / low-review flags
- out-of-Nashville day-trip flag
- likely duplicates
- discovery score / review bucket

The discovery score is not a public Nashroam score.

### Atomic editorial actions

Supabase exposes service-role-only RPCs:

- `approve_experience(...)`
- `reject_experience(...)`

Approval requires a real `local_note`, `nashroam_score`, and `planner_priority`, publishes the experience atomically, and resolves its open review queue items. Rejection unpublishes/deactivates the experience and requires a reason.

## Affiliate attribution

Store and use Viator `productUrl` **exactly as returned**. Do not reconstruct, shorten, strip query parameters, or replace it with a generic Viator URL.

Campaign values can distinguish catalog sync, tours marketplace, Plan Your Trip, neighborhood pages and guide pages when the URL is freshly returned for that surface.

## Data model

| Table / view | Role |
|---|---|
| `experiences` | Canonical Nashroam identity, machine categories, human curation state |
| `experience_editorial` | **First-party only**: Nashroam score, planner priority, local note, traveler fit |
| `experience_source_ids` | Viator product code + exact external URL |
| `experience_source_state` | Expiring rating/reviews/price/duration/booking metadata |
| `viator_destinations` | Destination taxonomy |
| `viator_tags` | Provider tag taxonomy |
| `experience_curation_queue` | Private curation/provider view |
| `experience_auto_curation` | Private machine classification / discovery score |
| `experience_duplicate_candidates` | Private duplicate triage |
| `verification_queue` | Human review and exception queue |
| `ingestion_runs` | Auditable sync history |
| `ingestion_schedules` | Live/expected refresh cadence |

## Website behavior

```text
Approved Supabase catalog
    → traveler/date/category ranking
    → shortlist
    → on-demand schedule/detail check when useful
    → exact Viator productUrl for booking
```

An empty approved catalog should produce an honest empty state. Do **not** fix it by auto-publishing or displaying raw live search results.

## Provider content

- Supplier descriptions remain provider metadata unless explicitly permitted for the intended display.
- Never copy provider descriptions into Nashroam editorial fields automatically.
- Do not expose protected Viator unique content in indexable/debug payloads.
- Preserve provider attribution and affiliate URL behavior.
