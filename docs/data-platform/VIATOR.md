# Viator Integration

## Architecture

```text
Nashroam UI
    → Next.js server
        → Supabase catalog / curation
            → Edge Function `viator-sync`
                → Viator Partner API v2

Supabase Cron
    → pg_net
        → private Vault-authenticated `viator-sync`
            → Viator
```

- **Supabase project:** Nashroam (`aeomrsutkhwmnscvvfur`)
- **Provider credential:** `VIATOR_API_KEY` in Supabase Edge Function secrets
- **Current environment:** sandbox Basic Access Affiliate
- **Next.js does not call Viator directly** and does not need `VIATOR_API_KEY` on Vercel
- The browser never receives Viator credentials, Supabase service-role credentials, or unrestricted database access

## Security / authorization

`viator-sync` is deployed with platform JWT verification disabled **only because scheduled pg_net/Cron traffic is service-to-service**. The function performs its own authorization before doing any work.

Accepted callers:

1. a server request carrying the Supabase service-role credential; or
2. Supabase Cron carrying a private `x-nashroam-cron-token` whose raw value lives only in Supabase Vault.

All other requests receive `401 Unauthorized`.

Never put the Cron token, `VIATOR_API_KEY`, or the service-role key in GitHub, client JavaScript, or a `NEXT_PUBLIC_*` variable.

## Nashville destination

| Field | Value |
|---|---|
| Destination ID | `799` |
| lookupId | `8.77.295.799` |
| Parent destination ID | `295` |

Every discovery search scopes `filtering.destination` to **799**.

## Access tier

Current credential is a Viator **Basic Access Affiliate sandbox key**.

Use Basic Access-compatible endpoints such as:

- `POST /products/search`
- `GET /products/{product-code}`
- `GET /products/tags`
- `POST /attractions/search`
- `GET /attractions/{attraction-id}`
- `GET /availability/schedules/{product-code}`
- `GET /destinations`

Do not architect around Full Access-only bulk/delta endpoints such as:

- `/products/modified-since`
- `/products/bulk`
- `/availability/check`
- bulk availability endpoints

Production Viator must not be enabled until a production credential is explicitly configured.

## Current catalog state

- Canonical Viator experiences in Supabase: **188**
- Local Viator taxonomy tags: **1,263**
- Approved experiences: **0**
- Published experiences: **0**
- Priority human-review queue: **49**

All current experiences remain pending curation.

## Critical ingestion rule

**Provider ingestion is not editorial approval.**

`viator-sync` may:

- discover and normalize products
- store/update provider IDs
- preserve the exact affiliate `productUrl`
- refresh rating, review count, price, duration, image URL, tags, flags, schedules, and other allowed provider state
- create new canonical experience records as `unverified`, unpublished, and `curation_status='pending'`
- trigger machine classification / review prioritization

`viator-sync` may **not**:

- set `is_published=true`
- set `curation_status='approved'`
- write Nashroam editorial copy
- write `nashroam_score`
- treat Viator rating/conversion/popularity as Nashroam editorial judgment

## Edge Function modes

| Mode | Purpose |
|---|---|
| `health` | Authentication/destination probe |
| `sync_tags` | Refresh local `viator_tags` taxonomy |
| `sync_destinations` | Refresh `viator_destinations` |
| `search_products` | Real-time Nashville `/products/search` |
| `sync_products` | Multi-page Nashville catalog/provider-state refresh; never auto-publishes |
| `get_product` | Fetch one product; protected unique content is redacted from debug response |
| `get_schedules` | Fetch supported availability schedules for one product |

`sync_nashville_catalog` may be accepted as a legacy alias for `sync_products`, but new code should use `sync_products`.

## Active automated refresh

Supabase Cron + `pg_net` is live.

| Job | Cron (UTC) | Work |
|---|---|---|
| `nashroam-viator-products` | `17 */6 * * *` | Every six hours; max 3 pages / 150 products using DEFAULT ranking |
| `nashroam-viator-tags` | `35 8 * * 0` | Weekly Sunday taxonomy refresh |
| `nashroam-viator-destinations` | `50 8 * * 0` | Weekly Sunday destination refresh |

Product calls use a 60-second pg_net timeout; tags/destinations use 30 seconds.

A verified Cron-style product refresh completed successfully with:

- 10 products fetched
- 10 provider-state rows refreshed
- 0 new products created
- all 188 machine classifications refreshed
- 0 automated publications
- 0 automated approvals
- 0 automated Nashroam scores

## Affiliate attribution

Viator returns `productUrl` with affiliate attribution.

**Store and use the URL exactly as returned.** Do not rebuild it, shorten it, remove query parameters, or replace it with a generic Viator URL.

Use `campaign-value` / the returned campaign-bearing URL to distinguish surfaces such as:

- catalog sync
- tours marketplace
- Plan Your Trip
- neighborhood pages
- guide/editorial pages

## Data model

| Table / view | Role |
|---|---|
| `experiences` | Canonical Nashroam identity, machine category/type, human curation state |
| `experience_editorial` | **First-party only**: Nashroam score, planner priority, local note, traveler fit |
| `experience_source_ids` | Viator `productCode` + exact external `productUrl` |
| `experience_source_state` | Expiring provider state: rating, reviews, price, duration, booking URL, metadata |
| `viator_destinations` | Destination taxonomy |
| `viator_tags` | Provider tag taxonomy |
| `experience_curation_queue` | Private internal provider/curation view |
| `experience_auto_curation` | Private machine classification + discovery score |
| `experience_duplicate_candidates` | Private duplicate triage view |
| `verification_queue` | Human review / exception queue |
| `ingestion_runs` | Auditable sync history |
| `ingestion_schedules` | Intended/live refresh cadence |

## Machine curation

Machine curation exists to make human review efficient.

It may suggest:

- music
- food/drink
- history
- city sightseeing
- museums/attractions
- water/outdoor
- ghost tours
- day trips
- nightlife/party
- private/luxury
- traveler-type fit
- risk flags such as age restriction, high price, out-of-core day trip, low review count

The discovery score only determines **review order**. It must never be displayed as a Nashroam recommendation score.

Current buckets:

| Bucket | Count |
|---|---:|
| Priority review | **49** |
| Standard review | **88** |
| Long tail | **51** |

## Website usage

The website should prefer Supabase catalog records rather than call Viator on every render.

Typical flow:

```text
Supabase catalog
   → approved/eligible candidates
   → traveler/date/neighborhood ranking
   → shortlist
   → on-demand availability/schedule check when useful
   → exact Viator productUrl for booking
```

Do not fix an empty website state by auto-publishing provider inventory. Build/perform curation instead.

## Rate limits / resilience

- Keep catalog refresh bounded and paced.
- Use provider rate-limit headers for diagnostics.
- Handle 429 / `Retry-After` without user-facing retry storms.
- Background jobs may back off; interactive requests should fail gracefully.
- Prefer Supabase provider state to repeated live calls.
- Use on-demand schedules only for shortlisted candidates.
- `ingestion_runs` must reflect successes/failures so source health is auditable.

## Provider content rules

- Supplier descriptions remain provider metadata unless explicitly permitted for the intended display.
- Do not copy provider descriptions into Nashroam editorial fields.
- Do not expose protected Viator unique content in indexable/debug payloads.
- Preserve provider attribution and exact affiliate URL behavior.
