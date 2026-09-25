# Hotel booking: LiteAPI marketplace + Nuitée white-label checkout

Last updated 2026-09-25. Supersedes every Booking.com affiliate note in this repo.

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

Removed: `NEXT_PUBLIC_BOOKING_AID`, `BOOKING_DEMAND_API_KEY`, `BOOKING_DEMAND_AFFILIATE_ID`. `NEXT_PUBLIC_VRBO_AID` goes when the rentals hub switches to LiteAPI inventory in Phase 2.

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

## Analytics

`HOTEL_AFFILIATE_CLICKED` keeps its name. Payload: `partner` (`LiteAPI` or `Booking.com`), `placement` (`whitelabel` or `affiliate`), `client_reference`, `hotel_id`, `nightly_shown` (Phase 2). `HOTEL_MARKET_VIEWED` (Phase 2): area, result count, cached.

## Phases

1. **Links and leaks** (this PR): env, `stay-links.ts`, `liteApiHotelId` on the 14, white-label CTAs on hotel rows and detail pages, widget and stay search routing on-site to `/hotels/?…`, Booking Demand scaffold deleted, disclosure copy.
2. **Marketplace**: `liteapi-live` edge function with cache tables and weekly catalog refresh, `hotels-live.ts`, ranking, `HotelMarketCard`, `/hotels/` grid, neighborhood centroids, hub presets including rentals (Vrbo removed), neighborhood rails.
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
