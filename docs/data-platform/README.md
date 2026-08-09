# Nashroam Data Platform Strategy

> **Updated:** August 9, 2026  
> **Supabase project:** `Nashroam`  
> **Project ref:** `aeomrsutkhwmnscvvfur`  
> **Region:** `us-east-2`

Nashroam is not an LLM inventing Nashville recommendations. It is a Nashville-specific data, editorial, and transaction platform. Supabase is the system of record; outside providers supply narrowly defined facts or inventory; the planner selects only from real records.

> **Core principle:** Nashroam owns durable Nashville identity, editorial judgment, relationships, and planner context. Licensed/official providers supply volatile operational and commercial data. Every external fact keeps its provenance, fetch time, expiry, and display/storage rules.

---

## 1. Current live state

As of August 9, 2026, the dedicated Supabase project contains:

| Item | Live count / state |
|---|---:|
| Public-schema application tables | **27** |
| Nashville neighborhoods | **18** |
| Canonical place records | **22** |
| Published places | **0** |
| Viator experiences | **188** |
| Approved/published experiences | **0** — all are pending curation |
| Viator taxonomy tags | **1,263** |
| Canonical events | **0** |
| Source definitions | **13** |
| Ingestion schedules defined | **3** |
| System strategy documents | **1** |

The 22 place records are real Nashville institutions/venues seeded only as canonical stubs. They are deliberately `unverified` and unpublished until durable facts are verified. Fake/sample restaurant content from the original website has **not** been imported into Supabase.

The 188 Viator records are real Nashville products linked to Viator product codes and exact API-returned affiliate URLs. They are also unpublished until curated.

---

## 2. Architecture

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
   v          v           v
Places      Events    Experiences
   |          |           |
Editorial / planner context / relationships
   |
Source IDs + expiring provider state
   |
Supabase Edge Functions / scheduled ingestion
   |
   +--> Viator
   +--> Foursquare OS / Foursquare
   +--> Google Places
   +--> Yelp
   +--> OpenTable
   +--> Ticketmaster
   +--> SeatGeek
   +--> Vivid Seats
   +--> Visit Music City / NCVC
   +--> Official venue/business sources
```

The browser should not hold privileged provider credentials. `VIATOR_API_KEY`, Supabase service-role credentials, and future private provider keys belong server-side only.

---

## 3. Source strategy — complete provider matrix

### First-party / authoritative sources

| Source | Supabase key | Role | Current status | Storage / refresh rule |
|---|---|---|---|---|
| **Nashroam Editorial** | `nashroam_editorial` | Scores, recommendations, local notes, best-for, traveler fit, planner context | **Active** | Permanent first-party IP |
| **Manual Verification** | `manual_verification` | Human confirmation and exception resolution | **Active** | Permanent verification history |
| **Official Website / venue / business** | `official_website` | Official URLs and authoritative durable/operational facts | **Active** | Store durable facts/URLs; refresh priority listings frequently |

### Places / restaurant / POI sources

| Source | Supabase key | Role | Current status | Strategy |
|---|---|---|---|---|
| **Foursquare OS Places** | `foursquare_os` | **Primary durable POI backbone** | Inactive — Places Portal/token not configured | Import/store canonical POI identity; use releases/deltas for long-term maintenance |
| **Foursquare Places API** | `foursquare` | Supplemental POI matching / place intelligence | Inactive — credential not configured | Useful for matching/enrichment where terms permit; not required for the OS backbone |
| **Google Places** | `google_places` | **Just-in-time validation**: operating status, hours, ratings, place identity | Inactive — credential not configured | Persist Google Place IDs; do not turn Google volatile content into the permanent Nashroam warehouse; use for shortlisted/live checks |
| **Yelp** | `yelp` | Consumer rating/review-count layer and permitted place facts | Inactive — credential not configured | Short-lived provider state only; keep Nashroam editorial score independent |
| **TripAdvisor Content API** | repo adapter only today | Supplemental rating/review-count source | Not yet registered as a live Supabase source | Transitional website integration; add to Supabase only if approved partner access is used going forward |

### Restaurant reservation source

| Source | Supabase key | Role | Current status | Strategy |
|---|---|---|---|---|
| **OpenTable** | `opentable` | Restaurant reservation availability + deep links | Inactive — partnership/API approval pending | Query availability on demand for final planner candidates rather than warehousing availability |

### Tours / experiences

| Source | Supabase key | Role | Current status | Strategy |
|---|---|---|---|---|
| **Viator Partner API v2** | `viator` | Tours/experiences, ratings, prices, affiliate URLs, schedules | **Active** | Current sandbox Basic Access is verified; canonical curated subset + expiring provider state |

#### Viator live facts

- Current environment: **sandbox** until Viator issues/activates production access.
- Nashville destination ID: **799**.
- Parent destination ID: **295**.
- Lookup ID: **`8.77.295.799`**.
- Current canonical Viator experiences in Supabase: **188**.
- Local Viator tag taxonomy: **1,263 tags**.
- Viator `productUrl` must be stored and used **exactly as returned**; it contains affiliate attribution.
- Current Basic Access workflow uses supported real-time endpoints such as destination/product search, product details, tags, attractions, and availability schedules.
- Do not design ingestion around bulk/full-access endpoints that the account tier does not have.
- Provider descriptions/tags are provider metadata. They are not automatically Nashroam editorial copy.

### Events and tickets

| Source | Supabase key | Role | Current status | Strategy |
|---|---|---|---|---|
| **Ticketmaster Discovery** | `ticketmaster` | **Primary automated concerts/sports/event feed** | Inactive — credential not configured in Supabase | Ingest Nashville events every few hours; dedupe into canonical `events`; preserve ticket/affiliate URL |
| **SeatGeek** | `seatgeek` | Secondary event/ticket coverage + affiliate option | Inactive — credential not configured | Reconcile with canonical events rather than duplicate Ticketmaster records |
| **Vivid Seats** | `vivid_seats` | Secondary ticket marketplace / affiliate deep links | Inactive — affiliate/partner feed not configured | Public affiliate/deep-link opportunity; no public consumer inventory API has been verified, so do not pretend it is a primary feed or scrape it |
| **Visit Music City / NCVC** | `visit_music_city` | Nashville-specific festivals, civic/community events, annual calendar | Inactive — licensed feed/partnership pending | Use a licensed feed/approved relationship; ingest event facts, not copied editorial prose |
| **Direct venue / institution calendars** | official-source pattern | Ryman, Opry, Bluebird, Cheekwood, TPAC, Zoo, Farmers' Market, sports venues, etc. | Planned | High-value Nashville-specific gap filler; official facts beat aggregators when conflicts exist |

### Hotels / lodging

| Source | Location today | Role | Current status | Strategy |
|---|---|---|---|---|
| **Booking.com Demand API** | repo scaffold: `src/lib/feeds/booking-demand.ts` | Live hotel inventory/rates/booking | Scaffold only | Hotels remain a separate lodging domain; move server-side provider state into Supabase when credentials are approved/configured |
| Booking.com affiliate deep links | `src/lib/partners.ts` | Fallback hotel monetization | Existing link layer | Use only as fallback when live inventory is unavailable |
| Vrbo affiliate/deep links | `src/lib/partners.ts` | Whole-home rental fallback | Existing link layer | Useful for larger groups; not a core POI source |

---

## 4. What each provider is allowed to decide

No single third party should become “the Nashroam database.”

| Question | Source of truth / strongest input |
|---|---|
| Does this place exist and where is it? | Nashroam canonical record + Foursquare OS / official source |
| Is it worth recommending? | **Nashroam editorial** |
| Who is it best for? | **Nashroam editorial** |
| Is it open right now / on this trip? | Official source + live validation (eventually Google/Foursquare where licensed) |
| What do consumers broadly think? | Yelp / Google / permitted provider rating signals |
| Can I get a table? | OpenTable / restaurant reservation provider |
| What tour should I book? | Nashroam ranking over real Viator inventory |
| Can I buy this tour? | Viator exact `productUrl` / supported availability |
| What concert/game is happening? | Ticketmaster + official venue + secondary event sources |
| Where can I buy tickets? | Ticketmaster / SeatGeek / Vivid / official depending on availability and commercial relationship |
| Does this event materially change the itinerary? | **Nashroam event impact + planner context** |

---

## 5. Durable data vs. volatile data

### Nashroam owns permanently

- canonical place / event / experience identity;
- neighborhood and geography;
- Nashroam descriptions and local notes;
- `nashroam_score`;
- editorial rank;
- `best_for` and traveler-type tags;
- vibe and suitability;
- typical duration;
- planner priority;
- place-to-place relationships;
- neighborhood context;
- event impact/context;
- curation status and human verification;
- first-party engagement/conversion signals when added.

### External provider state expires

Examples:

- current/special hours;
- business status;
- third-party ratings/review counts;
- reservation availability;
- ticket inventory/pricing;
- Viator pricing/availability;
- event postponements/cancellations;
- any provider field whose terms or real-world accuracy require refresh.

External state should carry at minimum:

```text
source_id
external_id
fetched_at
expires_at
display_allowed
attribution
metadata
```

Do not flatten provider values into first-party editorial columns and lose provenance.

---

## 6. Current database model

### Places

- `neighborhoods`
- `places`
- `place_editorial`
- `tags`
- `place_tags`
- `place_relationships`
- `place_source_ids`
- `place_source_state`
- `place_health`

### Events

- `events`
- `event_source_links`
- `planner_context`

### Experiences / Viator

- `experiences`
- `experience_editorial`
- `experience_source_ids`
- `experience_source_state`
- `viator_destinations`
- `viator_tags`

### Planner / persistence

- `itineraries`
- `itinerary_items`

### Data operations / governance

- `data_sources`
- `source_snapshots`
- `ingestion_runs`
- `ingestion_cursors`
- `ingestion_schedules`
- `verification_queue`
- `system_documents`

### Private operational views

- `experience_curation_queue`
- `source_health`

These views are for internal/service-role use, not public browser access.

---

## 7. Reliability / freshness engine

Quality and reliability are different concepts.

### `nashroam_score`
How strongly Nashroam recommends the experience/place.

### `confidence_score`
How confident we are that the operational facts are current/correct.

### Planner fit
How appropriate the item is for this particular traveler, date, neighborhood, budget, pace, and itinerary.

A high external star rating does not automatically produce a high Nashroam recommendation.

### Priority tiers for places

**Tier A — ~150 high-frequency recommendations**  
Daily operational refresh plus just-in-time validation when they make a final itinerary.

**Tier B — ~300 secondary recommendations**  
Refresh every 2–3 days.

**Tier C — long tail**  
Weekly or when the record enters an active itinerary candidate set.

### Conflict handling

Provider disagreements create/update `verification_queue` rather than silently overwriting each other.

Examples:

- `status_conflict`
- `hours_conflict`
- `location_conflict`
- `provider_not_found`
- `website_dead`
- `possible_duplicate`
- `stale_editorial_review`
- `event_time_conflict`

Humans should work exceptions, not manually re-audit the entire catalog.

---

## 8. Ingestion cadence

Provider terms always override these operating targets.

| Data / source | Target cadence |
|---|---|
| Foursquare OS releases/deltas | Release/delta cadence once portal access is configured |
| Tier A place status/hours | Daily baseline |
| Tier B place status/hours | Every 2–3 days |
| Tier C place status/hours | Weekly / on candidate use |
| Google live validation | On demand for shortlist/final itinerary candidates |
| Yelp sentiment | Daily where licensed/configured |
| OpenTable availability | On demand |
| Viator product catalog | Daily curated search refresh |
| Viator tags | Weekly + refresh when unknown tag appears |
| Viator destinations | Weekly |
| Viator availability | On demand / close to trip date |
| Ticketmaster near-term events | Every few hours |
| Long-range events | Daily |
| NCVC/direct local calendars | Daily |
| Nashroam editorial | Human review based on importance/staleness |

`ingestion_schedules` already contains initial Viator schedule definitions. Automated cron invocation still needs to be enabled deliberately after the production integration path is finalized.

---

## 9. Event strategy

The planner must distinguish between **an event that exists** and **an event that changes the trip**.

Examples of high-impact context:

- Titans home game;
- Predators playoff/game-night traffic;
- CMA Fest;
- major Nissan Stadium or Bridgestone concert;
- Tomato Art Fest;
- significant 12 South / East Nashville / Germantown festivals;
- downtown road closures or major conventions.

Canonical event facts live in `events`. Provider identities live in `event_source_links`. Nashroam-specific importance lives in `impact_level`, `planner_priority`, and `planner_context`.

Ticket vendors should never be allowed to define event importance just because a ticket has a high price or commission.

---

## 10. Planner contract

The planner must:

1. Never invent a business, attraction, experience, or event.
2. Resolve every recommendation to a Supabase ID.
3. Use only eligible/approved records.
4. Suppress or flag stale/low-confidence operational data.
5. Query date-relevant events before composing the trip.
6. Treat high-impact events as constraints/context.
7. Respect neighborhood geography and avoid unnecessary cross-city movement.
8. Use Nashroam relationships/context to build coherent blocks.
9. Check reservation/ticket/availability only for shortlisted candidates when possible.
10. Persist `planner_reason` so recommendations can be audited/improved.
11. Keep alternatives so a traveler can swap one stop without rebuilding the trip.

```text
Traveler input
     |
     +--> Supabase PLACES
     +--> Supabase EVENTS
     +--> Supabase EXPERIENCES
     +--> LIVE / EXPIRING PROVIDER STATE
     +--> NASHROAM EDITORIAL
     +--> PLANNER CONTEXT + RELATIONSHIPS
     |
     v
Eligible candidate set
     |
     v
Ranking / itinerary composition
     |
     v
On-demand availability for finalists
     |
     v
Persisted itinerary + reasons + alternatives
```

The model/rules engine is a **composer**, never the source of truth.

---

## 11. Monetization rules

Potential transaction layers:

- Viator tours/experiences;
- OpenTable restaurant reservations;
- Ticketmaster tickets;
- SeatGeek tickets;
- Vivid Seats affiliate ticket links;
- Booking.com lodging;
- Vrbo rentals;
- future local commerce.

Commercial economics must not silently become “highest commission wins.”

If a placement changes ranking because it is sponsored, that treatment must be explicitly modeled/displayed separately from Nashroam editorial ranking.

Affiliate URLs must preserve provider attribution. For Viator specifically, store/use the API-returned `productUrl` exactly.

---

## 12. Security posture

All application data is private by default.

- RLS is enabled on application tables.
- `anon` / `authenticated` access is intentionally restricted unless a narrow public read surface is explicitly created.
- Service-role secrets never belong in `NEXT_PUBLIC_*` variables.
- Provider secrets live server-side / Supabase secrets.
- Raw provider payload storage is allowed only when the provider/license permits it.
- Internal curation, source-health, verification, and ingestion tables/views are not browser APIs.

When the website needs public data, prefer server components, route handlers, or purpose-built server endpoints instead of opening the underlying operational schema broadly.

---

## 13. Current gaps / next build order

### 1. Finish experience curation

188 real Viator experiences are loaded, but none should be planner-eligible until approved. Use the 1,263-tag taxonomy plus ratings/review count and human judgment to reduce this to a strong Nashville catalog rather than publishing supplier spam/duplicates.

### 2. Build the Nashville POI backbone

Current `places` has 22 real institution stubs and **no real restaurant corpus yet**. Do not import the original `[Sample]` restaurant records.

Preferred next step: configure **Foursquare OS Places** access and load the Nashville POI universe, then curate roughly:

| Category | Target |
|---|---:|
| Restaurants | 250–300 |
| Bars/nightlife | 75–100 |
| Coffee/brunch | ~50 |
| Attractions/museums | 50–75 |
| Shopping | ~50 |
| Live-music venues | 40–50 |
| Parks/outdoor | 20–30 |
| Tours/experiences | 100–200 curated |

### 3. Add live place validation

Configure Google Places and/or other approved operational sources for just-in-time status/hours validation. Add Yelp if desired for sentiment/review-count display under its commercial terms.

### 4. Start event ingestion

Configure Ticketmaster first. Then add direct/NCVC Nashville context and secondary ticket providers.

### 5. OpenTable

Apply/complete partnership and wire on-demand restaurant availability once the restaurant corpus is established.

### 6. Move the planner off static arrays

The current planner UI/rules are useful, but its candidate retrieval should become Supabase-backed. Preserve deterministic planner logic while replacing fake/static candidate pools with verified records.

---

## 14. Cursor / agent guardrails

Any coding agent working on this project should:

- read this document and `docs/data-platform/VIATOR.md` before changing provider architecture;
- treat Supabase as the canonical data layer;
- never duplicate provider credentials in browser code;
- never invent provider endpoint schemas;
- never import demo `[Sample]` listings into production Supabase;
- preserve source IDs and provider provenance;
- keep provider-specific volatile facts out of Nashroam editorial fields;
- run database advisors after schema changes;
- version live schema changes in `supabase/migrations/`;
- verify integrations with real calls before claiming success;
- keep temporary diagnostic endpoints locked/removed after use;
- preserve exact affiliate URLs when provider attribution requires it;
- fail gracefully rather than fabricating inventory.

---

## 15. Documentation map

- `docs/data-platform/README.md` — **this file; primary data/source architecture**
- `docs/data-platform/VIATOR.md` — Viator-specific integration and compliance notes
- `supabase/migrations/` — versioned live database changes
- `supabase/functions/viator-sync/` — server-side Viator integration
- `src/lib/itinerary.ts` — current deterministic planner composition logic
- `src/lib/partners.ts` — commercial/affiliate link layer
- `src/lib/feeds/` — website-side provider adapters during migration to Supabase

---

## Bottom line

The product is not “a database of Nashville businesses” and it is not “ChatGPT with a Nashville prompt.”

The product is a **curated, continuously refreshed Nashville knowledge graph** that combines:

1. durable POI identity;
2. live operational facts;
3. real event and bookable inventory;
4. proprietary Nashroam editorial judgment;
5. Nashville-specific context and geography;
6. transaction links/availability;
7. a planner that composes only from trusted records.

That data layer is the long-term moat.