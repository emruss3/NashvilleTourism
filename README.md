# NASHVILLE / NashRoam

The most useful way to plan, book, shop, and experience Nashville.

A conversion-focused Nashville city guide built with **Next.js 14 App Router,
TypeScript, and Tailwind**, deployed as a Vercel application at
`www.nashroam.com`.

The public editorial brand is currently **NASHVILLE** on the NashRoam domain.
Brand rules live in `.cursor/rules/nashville-brand.mdc`.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck
npm run build
npm run start        # run the production build
```

Copy `.env.example` to `.env.local`. Most integrations degrade gracefully when
their credentials are absent. The Shopify shop renders a setup state until the
Headless storefront variables are configured.

---

## Deployment model

The application previously used `output: 'export'`. The white-label Shopify
storefront requires a Vercel server runtime for:

- Server-only Storefront API credentials
- Dynamic Shopify product routes
- Anonymous cart creation and mutation
- Fresh checkout URLs

`NEXT_PUBLIC_BASE_PATH` should be blank for `www.nashroam.com`.

---

## Architecture

```text
src/
├── app/
│   ├── shop/                         # Shopify collection + product pages
│   ├── cart/                         # NashRoam cart page
│   ├── api/shopify/cart/             # Server-only cart API
│   └── ...                           # Editorial and planning routes
├── components/
│   ├── commerce/                     # Product, variant, cart, and drawer UI
│   └── ...
└── lib/
    ├── shopify/
    │   ├── client.ts                 # Private Storefront API client
    │   ├── queries.ts                # Storefront GraphQL documents
    │   ├── products.ts               # Product data access
    │   ├── cart.ts                   # Cart operations
    │   └── types.ts                  # Commerce types
    ├── content/                      # Editorial seed content
    ├── feeds/                        # Ticketmaster and review adapters
    ├── media.ts                      # Rights-tracked media registry
    ├── itinerary.ts                  # Deterministic trip planner
    ├── partners.ts                   # Affiliate deep-link builders
    ├── seo.ts                        # Metadata and structured data
    └── site.ts                       # Brand, domain, and navigation
```

---

## White-label commerce

Customer-facing commerce stays inside the NashRoam application:

```text
www.nashroam.com/shop/
www.nashroam.com/shop/[product-handle]/
www.nashroam.com/cart/
checkout.nashroam.com                 # configured in Shopify
```

Shopify provides catalog, pricing, inventory, discounts, payments, tax,
shipping, and hosted checkout. Printful connects directly to Shopify for
white-label production and fulfillment.

Required server environment variables:

```text
SHOPIFY_STORE_DOMAIN=nashroam.myshopify.com
SHOPIFY_STOREFRONT_PRIVATE_TOKEN=...
SHOPIFY_STOREFRONT_API_VERSION=2026-07
SHOPIFY_COLLECTION_HANDLE=nashroam
```

The private token is used only by Server Components and the cart Route Handler.
It must never be exposed through a `NEXT_PUBLIC_*` variable.

Full admin and fulfillment setup:

- `docs/commerce/SHOPIFY-PRINTFUL-SETUP.md`
- `docs/commerce/MERCH-LAUNCH-CHECKLIST.md`

---

## Content system

Editorial content lives in typed modules under `src/lib/content/`. Every
listing carries provenance fields used by the trust UI:

| Field | Purpose |
|---|---|
| `dataStatus` | `verified`, `needs-recheck`, or `unverified` |
| `dateChecked` | When practical details were confirmed |
| `dateUpdated` | When editorial copy changed |
| `placement` | `editorial`, `sponsored`, or `affiliate` |
| `sponsorName` | Required for sponsored content |
| `sourceNote` | Internal source record |

The current restaurant and hotel inventory is still demonstration content and
must be replaced before indexing is enabled.

---

## Integrations

| Integration | Environment variable | Behavior without credentials |
|---|---|---|
| Shopify Headless | `SHOPIFY_*` | Shop displays setup state; cart API returns 503 |
| Ticketmaster Discovery | `TICKETMASTER_API_KEY` | Seeded events remain clearly labeled |
| Google Places | `GOOGLE_PLACES_API_KEY` | Review block is omitted |
| TripAdvisor | `TRIPADVISOR_API_KEY` | Rating block is omitted |
| Booking affiliates | `NEXT_PUBLIC_*` partner IDs | Links work without attribution |

Printful uses the official Shopify app. No Printful API token is required by
this repository for normal order fulfillment.

---

## Media and rights

The repository includes owned Nashville photography, openly licensed
neighborhood imagery, a rights ledger, and public attribution pages.

- `src/lib/media.ts` — keyed registry
- `docs/media/ASSET-RIGHTS.json` — internal rights records
- `docs/media/ATTRIBUTION.md` — attribution requirements
- `/photo-credits/` — public Creative Commons credits

Named businesses should use exact photography or the intentional branded
placeholder, never unrelated category stock.

---

## SEO and indexing safety

- Unique metadata and canonicals
- Sitemap and robots generation
- Structured data for publisher, guides, events, places, listings, and authors
- `llms.txt`, `llms-full.txt`, JSON endpoints, and RSS
- Search results and cart pages are noindex
- Product pages remain subject to the global indexing gate

Indexing requires both:

```text
NEXT_PUBLIC_ALLOW_INDEXING=true
```

and completion of the business-identity fields in `src/lib/site.ts`.

---

## Validation

The pull-request workflow runs:

```bash
npm ci
npm run typecheck
npm run build
```

Commerce should also be tested manually with a real Shopify test product and a
Printful sample order before launch.

---

## Known launch blockers

1. Restaurant, hotel, and event content still includes sample records.
2. Author profiles are placeholders.
3. Legal entity, street address, ZIP, and phone are incomplete.
4. Privacy and terms require final review.
5. Newsletter and itinerary save/email are not connected.
6. Shopify, checkout-domain, and Printful admin setup require store credentials.
7. Physical merchandise samples must be approved before products are published.
