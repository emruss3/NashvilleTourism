# Viator live availability

NashRoam uses a non-transactional Viator integration:

- `viator-live` supplies production product search and product details.
- `viator-availability` supplies single-product schedules and, after Viator Full-access Affiliate approval, real-time `/availability/check` quotes.
- NashRoam does not call booking, cart, payment, cancellation, or refund endpoints.
- Checkout and all post-booking service remain on Viator through the unmodified affiliate `productUrl`.

## Public routes

- `GET /api/viator/availability/{productCode}` — normalized retail-facing schedule data.
- `POST /api/viator/availability/check` — date/time/traveler quote. Returns `fullAccessRequired: true` until Viator enables that permission.
- `/tours/{productCode}/book/` — customer-facing schedule and quote flow with handoff to Viator.

## Secrets

`VIATOR_PRODUCTION_API_KEY` (or the existing `VIATOR_API_KEY` fallback) stays in Supabase Edge Function secrets. The key must never be exposed in Vercel client variables or browser code.
