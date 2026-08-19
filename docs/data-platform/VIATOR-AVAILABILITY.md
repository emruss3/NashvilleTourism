# Viator live pricing and availability

## Customer flow

```text
NashRoam tour detail page
    → Next.js server API
        → Supabase Edge Function `viator-availability`
            → Viator Partner API v2

Customer chooses date / option / time / travelers
    → NashRoam displays permitted schedule or live-check data
    → customer follows the exact Viator `productUrl`
    → Viator handles checkout, payment, confirmation, cancellation and support
```

NashRoam is an affiliate display and referral surface. It is **not** the merchant of record and does not implement cart, booking hold, booking, payment, refund or cancellation endpoints.

## Boundaries

| Component | Purpose |
|---|---|
| `viator-live` | Production product search, product content, photos, ratings and affiliate URLs |
| `viator-availability` | Customer-triggered schedule retrieval and Full-access real-time availability checks |
| `viator-sync` | Background catalog/provider-state ingestion and curation support |

All three keep the Viator credential in Supabase Edge Function secrets. The browser and Vercel never receive `VIATOR_API_KEY`.

## Supported now

`viator-availability` mode `get_schedules` calls:

```text
GET /availability/schedules/{product-code}
```

The public website loads this only after a customer opens a tour. It normalizes and returns:

- product options
- seasons and operating days
- scheduled start times
- unavailable dates
- recommended retail schedule pricing
- special-offer dates and prices
- per-person versus unit pricing inputs

The website caches successful schedule responses for five minutes. It does not use this endpoint for bulk ingestion.

## Prepared for Full-access Affiliate

`viator-availability` mode `check_availability` calls:

```text
POST /availability/check
```

The request is limited to:

- product code
- product option code
- travel date
- optional start time
- display currency
- traveler age-band mix

The Edge Function strips partner-net, commission and other non-customer pricing fields and returns only customer-facing availability, recommended retail totals and age-band line items.

Until Viator approves Full-access Affiliate for the production key, this endpoint may return `403`. The UI degrades to schedule-level pricing and sends the customer to Viator for final confirmation. Once the same key is approved, no website code or Vercel secret change is required.

## Explicitly excluded

NashRoam does not call or expose:

```text
/bookings/cart/hold
/bookings/cart/book
/products/booking-questions
/bookings/status
/bookings/cancel-reasons
/bookings/{booking-reference}/cancel-quote
/bookings/{booking-reference}/cancel
/bookings/modified-since
/bookings/modified-since/acknowledge
```

No cardholder data is collected, processed or transmitted by NashRoam.

## Public routes

```text
GET  /api/viator/availability/{productCode}
POST /api/viator/availability/{productCode}/check
```

Successful schedule responses use a short shared cache. Real-time checks are always `no-store`.

## Affiliate URL rule

Use the full `productUrl` exactly as returned by Viator. Never reconstruct it, strip parameters, shorten it, or replace it with a generic destination URL.
