# Hotel booking: LiteAPI marketplace + Nuitée white-label checkout

Last updated 2026-09-26. Supersedes every Booking.com affiliate note in this repo.

## Architecture

- **Editorial tier**: the curated hotels in `src/lib/content/hotels.ts`. Our copy, our order, our photos. Indexable.
- **Marketplace tier** (Phase 2): live LiteAPI results on our pages, ranked by our rules with editorial picks pinned first. `noindex`, like `/tours/`.
- **Checkout**: the Nuitée white-label site on `stay.nashroam.com` (later `stay.nashville.com`). It owns hotel pages, room selection, payment, confirmation, manage-booking and 24/7 guest support. Nuitée Travel Limited is merchant of record and appears on the card statement. Our code only deep-links into it (`src/lib/stay-links.ts`).
- **Provider secrets** live in Supabase Edge Function secrets, never in Vercel or `NEXT_PUBLIC_*`. Phase 2's `liteapi-live` function is the only code that talks to LiteAPI.

Doctrine (`system_documents.data_refresh_strategy` v3): we own identity, editorial judgment and ranking; the provider supplies volatile commercial facts; every external field carries provenance and expiry; affiliate economics never override editorial ranking.

## Environment

| Where | Variable | Value | Notes |
| --- | --- | --- | --- |
| Vercel (public) | `NEXT_PUBLIC_STAY_HOST` | `stay.nashroam.com` → `stay.nashville.com` | Unset = every hotel CTA falls back to its search link |
| Vercel (public) | `NEXT_PUBLIC_NASHVILLE_PLACE_ID` | `ChIJPZDrEzLsZIgRoNrpodC5P30` | Google Place ID for Nashville, TN (36.1627, -86.7816). White-label listing fallback only |
| Vercel (public) | `NEXT_PUBLIC_STAY_DIRECT_CHECKOUT` | `false` | Experimental `/booking?offerId=` links |
| Vercel (server) | `SUPABASE_SERVICE_ROLE_KEY` | existing | Used by `invokeEdgeFunction`, same as tours |
| Supabase secrets | `LITEAPI_SANDBOX_KEY` | set | `sand_…` |
| Supabase secrets | `LITEAPI_PRODUCTION_API_KEY` | when issued | `prod_…` |
| Supabase secrets | `LITEAPI_ENV` | `sandbox` \| `production` | default production |
| Supabase secrets | `LITEAPI_PROBE_TOKEN` | random | Accepted by `liteapi-live` for `health` mode only, so deploys can be verified from SQL without the service key |
| Supabase secrets | `NASHROAM_CRON_TOKEN` | must equal Vault secret `nashroam_cron_token` | Accepted by `liteapi-live` for every mode; the weekly pg_cron job and SQL smoke tests send it |

Removed: `NEXT_PUBLIC_BOOKING_AID`, `BOOKING_DEMAND_API_KEY`, `BOOKING_DEMAND_AFFILIATE_ID`, `NEXT_PUBLIC_VRBO_AID` (the rentals hub now uses marketplace inventory).

Cutover to `stay.nashville.com` and to the production key are config changes only: the env var, the Supabase secret and the dashboard domain. No code edit.

## Deep-link contract

Base `https://{NEXT_PUBLIC_STAY_HOST}`; every link carries `language=en`, `currency=USD` and `clientReference`.

- Hotel page: `/hotels/{liteApiHotelId}?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&occupancies={b64}&clientReference={ref}` plus optional `needFreeCancellation=1`, `needBreakfast=1`.
- `occupancies` = base64 of `[{ "adults": N, "children": [] }]`, one object per room.
- Listing page (fallback only): `/hotels?placeId=…&checkin&checkout&occupancies&clientReference` plus optional `stars`, `min_price`, `max_price`, `freeCancellation=2`, `facilities`, `sorting`.
- Direct checkout (flagged off): `/booking?offerId=…`.
- Dates absent → params omitted; the white label prompts.
- `clientReference` = `nsh:{surface}:{slug}`: `nsh:hotel:w-nashville`, `nsh:market:the-gulch`, `nsh:hub:hotels-with-pools`, `nsh:widget:home`, `nsh:guide:where-to-stay-nashville`. Short, no PII, no dates.

`hotelBookingHref(hotel, opts)` in `src/lib/hotel-booking.ts` is the single entry point for every surface. It returns the white-label link when the host and the hotel's `liteApiHotelId` are both known, otherwise the hotel's `fallbackUrl` with `placement: 'affiliate'`. Never both buttons.

## Dashboard configuration (human steps)

Partner back office: https://partners.wlbl.cloud/ (linked from the LiteAPI dashboard).

| Setting | Value | Why |
| --- | --- | --- |
| Company Name | `Nashville.com` (or the chosen master brand wordmark) | Site title and email sender name |
| Logo, colors | NSVL rule (`.cursor/rules/nsvl-brand.mdc`): Manrope + Inter, black `#111111`, cream `#EDE2CF`, paper `#FCFBF8`. Light-background lockup in `public/brand/nsvl/nsvl-lockup-1280.png` | One brand across the hand-off |
| Domain Name | Start on their default subdomain; then Custom Domain = `stay.nashroam.com` now, `stay.nashville.com` after DNS control | Guests stay on our domain |
| Require Login | Off | Public browsing |
| Enable Guest Prices Markup | Off | Otherwise non-account guests see +10% |
| Enable Advanced Accessibility Option | Off; expose accessibility as a filter on our side instead | On cuts supply about 90% |
| Markup | Low until the SSP question is answered; then per Nuitée's guidance | Public pages must not sell below the hotel's suggested selling price |
| Support Contact Email / Phone 1 / Phone 2 | Leave Nuitée defaults (vip.support@nuitee.com, +1 866 338 3099, +44 330 818 4701) | They are the 24/7 desk |
| Google Tag Manager ID | Our GTM container (same as nashroam.com) | Booking events land in our analytics |
| Google Site Verification | Add for the `stay.` subdomain | Search Console visibility |

## Custom domain / DNS (human steps)

- Add the CNAME records the back office generates. Subdomain = CNAMEs only. Keep the trailing dot on values. No Cloudflare proxy (DNS-only).
- CAA: their guide suggests CAA records authorising Amazon if certificate issuance fails. If needed, add CAA only on `stay.nashville.com`, never at the `nashville.com` apex, or add `letsencrypt.org` alongside. Otherwise Vercel cannot renew TLS for the main site.
- Verify with dnschecker.org; propagation up to 24 hours.

## Who owns what

| Guest-facing step | Owner |
| --- | --- |
| Search, filters, ranking on our pages | Us |
| Hotel page on the booking site, room and rate selection | White label (deep-linked with our dates and occupancy) |
| Checkout, card entry, 3-D Secure | White label (card never touches us) |
| Merchant of record, card statement "Nuitée Travel Limited" | Nuitée |
| Confirmation email, voucher | Nuitée |
| Manage booking, cancellations | White label (`/manage-bookings/{id}?email=`) |
| Guest support | Nuitée 24/7 |
| Chargebacks | Filed against Nuitée; their T&C may pass the loss back to us (open item) |
| Analytics | GTM on both surfaces; `clientReference` on every link |

## Marketplace (Phase 2)

### Data flow

```
page (server component, revalidate 3600)
  -> src/lib/feeds/hotels-live.ts  getAreaRates / getHotelRates
  -> invokeEdgeFunction('liteapi-live')   [SUPABASE_SERVICE_ROLE_KEY, server only]
  -> hotel_rate_cache hit?  yes: return payload (no provider call, nothing logged)
                            no:  POST api.liteapi.travel/v3.0/hotels/rates
                                 (includeHotelData, maxRatesPerHotel 1, currency USD,
                                  guestNationality US, timeout 18s)
                                 -> normalize, drop anything outside Davidson County,
                                    write hotel_rate_cache (TTL = data_sources.default_ttl_minutes, 180),
                                    log ingestion_runs (job_type liteapi_area_rates | liteapi_hotel_rates)
  -> src/lib/feeds/hotel-marketplace-rank.ts   filters, then our score
  -> HotelMarketRail / HotelMarketCard         noindex surfaces, "from" price with fetch time
```

Modes of `liteapi-live` (POST JSON `{ mode, ... }`, `apikey` = service key):

| Mode | Auth | Body | Cache key |
| --- | --- | --- | --- |
| `area_rates` | service | `lat, lng, radiusKm, checkin, checkout, adults \| occupancies[], areaKey?` | `areaKey` (neighborhood slug, `hub-<slug>`, `nashville`) or `geo:{lat4}:{lng4}:{r}` + dates + occupancy |
| `hotel_rates` | service | `hotelIds[], checkin, checkout, adults` | `ids:<hash of sorted ids>` + dates + occupancy |
| `hotel_detail` | service | `hotelId` | `detail:<id>`, 7 days |
| `catalog_refresh` | service or cron token | `maxPages?, radiusKm?` | `hotel_catalog_cache`, lookups; weekly Monday 09:20 UTC |
| `lookups_refresh` | service or cron token | none | facility and hotel-type lookups only (`/data/facilities`, `/data/hotelTypes`) |
| `health` | service, cron token or probe token | none | reports env, cache and catalog row counts, last catalog refresh, which tokens are set |

The cron token unlocks every mode, not only `catalog_refresh`: it lives in Vault (database admins only) and in function secrets, so SQL smoke tests can exercise `area_rates` without the service key. The probe token stays health-only. The provider rejects an area radius under 1 km, so the function and the feed both clamp to 1 km; small neighborhoods still rank by their own center.

Rate limiting inside the function: at most 3 concurrent provider calls, 400 ms spacing in sandbox (150 ms in production), 3 attempts with backoff on 429 and 5xx, 120 s abort.

### Ranking

`rankMarketplace()` in `src/lib/feeds/hotel-marketplace-rank.ts`, unit-tested in `tests/hotel-rank.test.ts`.

1. Editorial hotels (any `liteApiHotelId` in `hotels.ts`) first, in editorial order, badged "Our pick".
2. Then `RANK_WEIGHTS`: distance to the active center 0.40 (zero at 4 km), guest rating scaled by log review volume 0.30, stars 0.15, fit against the neighborhood's `typicalHotelPrice` band 0.15.
3. Filters before ranking: `stars`, `max` nightly, `refundable`, `type` (hotel or rental by provider type id: 201 Apartments, 220 Holiday homes, 230 Cottages, 250 Private vacation home, 229 Condos and 213 Villas are rentals; 204 Hotels, 219 Aparthotels, 205 Motels, 218 Inns, 216 Guest houses and 206 Resorts are hotels; unknown ids fall back to the lookup name, then the listing name), facilities (pool, matched to real pool amenities and not pool furniture), chain size, occupancy.
4. Margin and SSP are never inputs. The net rate never leaves the edge function; `ssp` is carried for the display floor only, and the test asserts the order is identical with SSP values permuted.
5. Rows outside Davidson County are dropped in the function and again in the feed.

### Surfaces

| Page | What it shows | Dates |
| --- | --- | --- |
| `/hotels/` | Editorial rows with live "from" price, then "More places to stay" rail (editorial ids excluded, filter chips) | URL or next Fri–Sun |
| `/hotels/?neighborhood=…` | Same, scoped to the neighborhood's centroid and radius (`src/lib/content/neighborhoods.ts`) | same |
| `/hotels/[slug]/` | "From $X a night" for the coming weekend; CTA carries those dates | next Fri–Sun |
| `/where-to-stay/[slug]/` | Preset rail from `src/lib/content/stay-search-presets.ts`; rentals hub searches whole homes for 8 in one unit, no Vrbo | next Fri–Sun |
| `/where-to-stay/` | "See rates" per area row | none |
| `/neighborhoods/[slug]/` | "Stay in …" rail, top 6 | next Fri–Sun |

Every rail renders nothing when `NEXT_PUBLIC_STAY_HOST` is unset, the service key is missing, or the provider fails. No empty state carries partner branding. Any `/hotels/` view with a query string is `noindex`.

### Sandbox acceptance, 2026-09-26

| Check | Result |
| --- | --- |
| `health` | ok, sandbox, both tokens set, provider row present |
| `catalog_refresh` | 1,910 fetched, 1,828 kept inside the county bounds; 820 facilities, 52 hotel types |
| Gulch, Fri 2 to Sun 4 Oct, 2 adults, 1 km | 40 rates; 7 editorial hotels present and pinned first by `rankMarketplace` |
| Same call again inside the TTL | `cached: true`, `ingestion_runs` count unchanged (7 before, 7 after) |
| Cached rows outside Davidson County | 0 |
| Rentals preset (East Nashville, 3.5 km, one unit for 8) | 2 rates, none of a rental type. A 2-adult probe of the same area returned 106 rates with only 2 apartments, so sandbox rental supply is thin; the rail renders nothing rather than an empty partner state. Re-run on the production key. |

### Acceptance checks (repeat on production)

1. `health` via probe token (SQL below) returns `configured: true`, `sourceRow: true`.
2. Fire `catalog_refresh` once (service key from a trusted machine, or the cron token from SQL). Expect `kept` in the hundreds and `lookup_liteapi_hotel_types` populated. Then the weekly job keeps it fresh.
3. Load `/hotels/?neighborhood=the-gulch&checkin=<Fri>&checkout=<Sun>` on a deploy with the env set. Expect editorial rows with prices and at least one live card below.
4. Reload inside 3 hours. `select count(*) from ingestion_runs where job_type like 'liteapi_%' and started_at > now() - interval '5 minutes'` (statuses are running, succeeded, partial or failed) must be 0.
5. `select count(*) from hotel_rate_cache r, jsonb_array_elements(r.payload) h where (h->>'lat')::float not between 35.97 and 36.41 or (h->>'lng')::float not between -87.06 and -86.52` must be 0.
6. `/where-to-stay/group-rentals-bachelor-bachelorette/` shows the rentals rail and no Vrbo link.

## Analytics

`HOTEL_AFFILIATE_CLICKED` keeps its name. Payload: `partner` (`LiteAPI` or `Booking.com`), `placement` (`whitelabel` or `affiliate`), `client_reference`, `hotel_id`. `HOTEL_MARKET_VIEWED` fires once per rendered rail: `item_id` = `surface:area`, `neighborhood`, `result_count`, `cached`.

## Phases

1. **Links and leaks** (merged, PR #22): env, `stay-links.ts`, `liteApiHotelId` on the 14, white-label CTAs on hotel rows and detail pages, widget and stay search routing on-site to `/hotels/?…`, Booking Demand scaffold deleted, disclosure copy.
2. **Marketplace** (this PR): `liteapi-live` edge function with cache tables and weekly catalog refresh, `hotels-live.ts`, ranking, `HotelMarketCard`, `/hotels/` rail, neighborhood centroids plus `music-valley-opryland`, hub presets including rentals (Vrbo removed), neighborhood rails, `HOTEL_MARKET_VIEWED`.
3. **Polish** after Nuitée answers the open items: direct checkout flag, facility filters, reviews if permitted.

## Verifying a Phase 2 deploy without the service key

`liteapi-live` accepts `x-probe-token: {LITEAPI_PROBE_TOKEN}` for `health` mode only. From SQL, with the `http` extension:

```sql
select status, content::json
from http((
  'POST',
  'https://aeomrsutkhwmnscvvfur.supabase.co/functions/v1/liteapi-live',
  array[http_header('apikey', '<publishable key>'), http_header('x-probe-token', '<probe token>'), http_header('content-type', 'application/json')],
  'application/json',
  '{"mode":"health"}'
)::http_request);
```

## Open items (block production launch, not Phase 1 or 2)

1. SSP pricing: ask Nuitée how to price at `suggestedSellingPrice` automatically (their managed dynamic pricing). A flat markup is not acceptable across hundreds of hotels.
2. Chargebacks: confirm whether the partner-liability clause governs white-label bookings and what the account card can be charged for.
3. Payout trigger: check-in vs check-out (their docs disagree).
4. Look-to-book: confirm the cached-marketplace pattern is within fair use.
5. Entity: account, payouts and W-9 in BPH Nashville.com, LLC's name.
6. Privacy: the privacy policy must cover booking data; request their DPA; confirm guest-email export with consent.
7. Travel-seller registration (FL and WA in particular): counsel question.
