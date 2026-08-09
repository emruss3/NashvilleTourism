# NASHVILLE / Nashroam

The most useful way to plan, book, and experience Nashville.

Nashroam is a conversion-focused Nashville city guide and trip-planning product built with **Next.js 14 (App Router) + TypeScript + Tailwind** on Vercel. The canonical tourism data platform lives in the dedicated **Nashroam Supabase** project.

Private provider credentials and the Supabase service-role key stay server-side. The browser is not a provider-integration boundary.

Brand rules: `.cursor/rules/nashville-brand.mdc`.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
npm run typecheck    # tsc --noEmit
```

Copy `.env.example` to `.env.local` for website-side integrations.

For Supabase-backed data, the site uses `SUPABASE_SERVICE_ROLE_KEY` server-side. **Do not put `VIATOR_API_KEY` on Vercel**; Viator stays behind Supabase Edge Functions.

---

## Architecture

```text
Nashroam website / Plan Your Trip
              |
              v
       Next.js server layer
              |
              v
          Supabase
   +----------+-----------+
   |          |           |
 Places      Events    Experiences
   |          |           |
 Editorial / context / relationships
   |
 Provider IDs + expiring provider state
   |
 Edge Functions + Cron
   |
 External providers
```

Repository structure:

```text
src/
├── app/                    # Routes + server APIs
├── components/             # UI
└── lib/
    ├── itinerary.ts        # Planner composition/rules
    ├── partners.ts         # Affiliate/deep-link helpers
    ├── supabase/           # Server-only Supabase access
    ├── feeds/              # Provider adapters / data access
    └── content/            # Legacy/seed editorial content

supabase/
├── migrations/             # Versioned Nashroam schema
└── functions/
    └── viator-sync/        # Viator Partner API boundary

docs/data-platform/
├── README.md               # Full source/data architecture
└── VIATOR.md               # Viator-specific rules
```

---

## Live Supabase snapshot — August 9, 2026

Project: `Nashroam`  
Ref: `aeomrsutkhwmnscvvfur`  
Region: `us-east-2`

| Item | Current state |
|---|---:|
| Neighborhoods | **18** |
| Canonical place stubs | **22** |
| Published places | **0** |
| Real Viator experiences | **188** |
| Approved/published experiences | **0** |
| Priority experience-review queue | **49** |
| Viator taxonomy tags | **1,263** |
| Canonical events | **0** |
| Data-source definitions | **13** |
| Active Viator Cron jobs | **3** |

The 22 place stubs are real Nashville institutions but remain unpublished/unverified until durable facts are checked. The original `[Sample]` restaurants are **not** being imported into Supabase.

All Viator experiences are real API inventory but remain pending editorial approval.

---

## Source stack

The full rules live in `docs/data-platform/README.md`.

| Source | Role | Status |
|---|---|---|
| **Nashroam Editorial** | First-party scores, local notes, best-for, planner context | **Active** |
| **Manual Verification** | Human confirmation / exception handling | **Active** |
| **Official Websites / venue sources** | Authoritative durable facts and URLs | **Active** |
| **Foursquare OS Places** | Planned durable Nashville POI backbone | Waiting on access/token |
| **Foursquare Places API** | Supplemental POI matching/intelligence | Not configured |
| **Google Places** | Just-in-time hours/status/rating validation | Not configured |
| **Yelp** | Consumer sentiment / rating + review-count layer | Not configured |
| **TripAdvisor Content API** | Supplemental ratings through existing repo adapter | Transitional / not in Supabase yet |
| **OpenTable** | Restaurant availability + reservation deep links | Partnership/API pending |
| **Viator Partner API v2** | Tours/experiences, pricing, ratings, affiliate booking URLs | **Active** |
| **Ticketmaster Discovery** | Primary automated concert/sports/event feed | Not configured in Supabase |
| **SeatGeek** | Secondary events/ticket coverage | Not configured |
| **Vivid Seats** | Secondary ticket marketplace / affiliate deep links | Partner/feed not configured |
| **Visit Music City / NCVC** | Nashville festivals/community/annual events | Licensed feed/partnership pending |
| **Direct venue calendars** | Ryman/Opry/Bluebird/Cheekwood/TPAC/etc. | Planned |
| **Booking.com Demand API** | Hotel inventory/rates/booking | Repo scaffold only |
| **Vrbo / Booking affiliate links** | Lodging fallback / large-group rentals | Existing link layer |

### Source philosophy

No provider is “the Nashroam database.”

- **Foursquare OS / official data** → durable place identity
- **Google / Foursquare / official source** → live operational validation
- **Yelp / Google** → consumer sentiment signals
- **OpenTable** → restaurant availability
- **Viator** → bookable experience inventory
- **Ticketmaster + secondary ticket providers** → event/ticket inventory
- **Nashroam** → quality judgment, traveler fit, local context, geography, itinerary logic

---

## Viator — live now

- Secret: `VIATOR_API_KEY` in Supabase only
- Current access: **sandbox Basic Access**
- Nashville destination ID: **799**
- Parent destination ID: **295**
- Lookup ID: `8.77.295.799`
- Current catalog: **188 real experiences**
- Local taxonomy: **1,263 tags**
- Priority human-review queue: **49**

Active refresh:

| Job | Cadence |
|---|---|
| Product/provider-state refresh | **Hourly** at minute 17 |
| Viator tag refresh | Weekly |
| Destination refresh | Weekly |

The product/provider state has a one-hour TTL, so the catalog refresh is hourly. Viator rate-limit headers describe a rolling short endpoint window, not a daily request budget.

Viator booking URLs must preserve the exact API-returned `productUrl`.

### Curation boundary

Provider ingestion may classify and prioritize records for review, but it **cannot** approve, publish, or write a Nashroam score.

Public `/tours`, direct product pages, and Plan Your Trip require:

```text
curation_status = approved
is_published = true
status = active
```

There is no public live-search fallback that bypasses curation.

Service-role-only curation actions:

- `approve_experience(...)`
- `reject_experience(...)`

See `docs/data-platform/VIATOR.md`.

---

## Trip planner

`src/lib/itinerary.ts` remains a deterministic composition/rules layer. The strategic split is:

1. candidate retrieval from Supabase
2. eligibility / freshness checks
3. Nashroam scoring and context
4. itinerary composition
5. on-demand availability for finalists

The planner must never invent a place, event, experience, price, opening time, or availability claim. Every final recommendation should resolve to a real eligible Supabase record.

Experiences now honor the approval gate. Places/events are next.

---

## Data ownership and freshness

Nashroam permanently owns:

- canonical IDs
- neighborhoods/geography
- editorial descriptions
- Nashroam scores
- traveler-fit tags
- planner priority
- relationships
- local/event context
- curation and verification state

Provider facts such as hours, external ratings, reservation availability, ticket inventory, tour prices, and cancellations are **volatile state** and carry source + `fetched_at` + `expires_at`.

Provider disagreements go to `verification_queue`; they do not silently overwrite one another.

---

## Security

- RLS is enabled on application tables.
- Operational/provider tables remain private by default.
- No service-role or provider secrets in browser code.
- Scheduled Edge Function calls authenticate using a private Supabase Vault credential.
- `viator-sync` uses custom service/Cron authorization and rejects unauthenticated traffic.
- The manual `/api/viator/sync` endpoint **fails closed** unless `NASHROAM_SYNC_TOKEN` is explicitly configured.
- Public website access uses server-side/narrow routes rather than broad database exposure.
- Raw provider payloads are stored only when provider terms allow it.

---

## Current build order

1. Curate the **49 priority Viator experiences** first, then the standard-review set.
2. Configure Foursquare OS Places and build the real restaurant/bar/attraction backbone.
3. Add live place validation (Google/Foursquare/Yelp as appropriate).
4. Configure Ticketmaster and begin canonical event ingestion.
5. Add NCVC/direct Nashville calendars and event context.
6. Complete OpenTable partnership/integration.
7. Move remaining planner candidate pools off static/sample content and onto Supabase.
8. Build an authenticated curation/verification dashboard over the service-role RPCs.

Target place corpus is roughly **500–750 places we would actually recommend**, not every business in Davidson County.

---

## Documentation

- `docs/data-platform/README.md` — **primary source/data strategy**
- `docs/data-platform/VIATOR.md` — Viator integration and curation rules
- `docs/ANALYTICS.md` — analytics contract
- `supabase/migrations/` — versioned schema history
- `supabase/functions/viator-sync/` — Viator server boundary
- `public/media/README.md` — media sourcing brief
- `.env.example` — website environment variables

---

## Known limitations

1. The real restaurant/place corpus is not loaded yet.
2. The event table is not populated yet.
3. Viator experiences still require curation/approval before public/planner eligibility.
4. Several static site listing modules still contain `[Sample]` content and must not be treated as verified production data.
5. Ticketmaster, Foursquare, Google, Yelp, SeatGeek, OpenTable, and Vivid are not yet credentialed in Supabase.
6. Booking.com Demand API remains a scaffold, not live hotel inventory.
7. Author, privacy/legal, and some media workflows still require production cleanup.

---

## Product thesis

The long-term product is a **curated, continuously refreshed Nashville knowledge graph** combining durable place identity, live operational facts, real events/bookable inventory, proprietary Nashroam judgment, Nashville geography/context, and a planner that composes only from trusted records.

That data layer—not generic AI output—is the moat.
