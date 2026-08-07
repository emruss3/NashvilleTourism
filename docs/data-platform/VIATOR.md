# Viator Integration

## Status

Viator is now modeled as a first-class Nashroam data source in the dedicated Supabase project.

- Supabase project: `Nashroam`
- Project ref: `aeomrsutkhwmnscvvfur`
- Edge Function: `viator-sync`
- Edge Function JWT verification: enabled
- Default Viator environment: sandbox
- `data_sources.provider_key`: `viator`
- Source remains `active = false` until authenticated runtime access is verified.

## Secret naming

The Edge Function looks for the API key in this order:

1. `VIATOR_API_KEY`
2. `VIATOR_PARTNER_API_KEY`
3. `VIATOR_API`

Do not expose the Viator Partner API key in browser code or any `NEXT_PUBLIC_*` environment variable.

Optional:

- `VIATOR_API_ENV=sandbox` — default and required for testing.
- `VIATOR_API_ENV=production` — use only after the integration is ready for live operation and the Viator account is approved for the intended production use.

## Viator request requirements

Every Partner API request must include:

- `exp-api-key: <secret>`
- `Accept: application/json;version=2.0`
- `Accept-Language: en-US`

The Edge Function sets these automatically.

## Affiliate attribution

For affiliate accounts, Viator may return a `productUrl` containing the attribution required for commission.

**Store and use that URL exactly as returned. Do not rebuild, shorten, strip, or modify its query string.**

Use Viator `campaign-value` when useful to attribute bookings back to Nashroam surfaces such as:

- trip planner
- neighborhood pages
- editorial guides
- experience pages
- seasonal/event itineraries

## Unique content

Viator can return premium `viatorUniqueContent` for accounts that have access to it. That content has special search-indexing restrictions.

Do not put Viator Unique Content into statically generated/indexable HTML. The debug `get_product` mode explicitly redacts this field from its response.

## Supabase tables

### `experiences`
Canonical Nashroam record for tours and bookable experiences. This is the first-party identity layer and should not simply be a mirror of Viator.

### `experience_editorial`
Nashroam scoring/context, including local notes, best-for tags, traveler types, and planner priority.

### `experience_source_ids`
Maps a canonical Nashroam experience to an external provider/product ID. For Viator, `external_id` is the Viator product code and `external_url` should preserve the returned product URL.

### `experience_source_state`
Current provider state such as rating, review count, starting price, currency, confirmation type, booking URL, timestamps, and provider metadata.

### `viator_destinations`
Local copy of the Viator destination taxonomy. The sync function flags exact `Nashville` destination matches for review/use in product discovery.

### `ingestion_cursors`
Stores progress for provider streams. This becomes important if the Viator account has access to delta-ingestion endpoints such as `products/modified-since`.

## Edge Function modes

`viator-sync` currently supports:

### `health`
Calls Viator `/destinations` and returns authentication status, destination count, Nashville matches, request ID, and remaining rate-limit information. Does not store the destination feed.

### `sync_destinations`
Calls `/destinations` and upserts the destination taxonomy to `viator_destinations`. It also updates `ingestion_cursors` with the last successful destination sync.

### `get_product`
Retrieves a single product by Viator product code. Intended for controlled debugging/integration work, not bulk ingestion. Optional `campaign` input is passed as Viator `campaign-value`.

## Next implementation step

After runtime authentication is verified:

1. Sync the Viator destination taxonomy and resolve Nashville's current destination ID.
2. Confirm the account access tier (basic affiliate vs. full-access affiliate).
3. Build Nashville product discovery using the Viator-supported search endpoint rather than scraping Viator pages.
4. Normalize selected Nashville tours/experiences into `experiences` + provider state.
5. Keep Nashroam editorial fields independent from Viator content.
6. Feed only active, planner-eligible experiences into Plan Your Trip.
7. Query live availability/pricing only when the account tier and endpoint access permit it.
8. Preserve the exact Viator affiliate URL used for conversion attribution.

The objective is not to import every Viator product. It is to maintain a curated Nashville experience catalog that the planner can trust and monetize.
