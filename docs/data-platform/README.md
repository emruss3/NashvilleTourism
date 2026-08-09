# Nashroam Data Platform Strategy

> **Updated:** August 9, 2026  
> **Supabase project:** `Nashroam`  
> **Project ref:** `aeomrsutkhwmnscvvfur`  
> **Region:** `us-east-2`

Nashroam is a Nashville-specific data, editorial, planning, and transaction platform. **Supabase is the system of record.** Outside providers supply narrowly defined facts or inventory; Nashroam owns the durable Nashville identity, editorial judgment, relationships, and planner context.

> **Core rule:** the planner chooses from real Supabase records. It does not invent businesses, events, experiences, hours, prices, availability, or ratings.

---

## 1. Current live state

| Item | Live state |
|---|---:|
| Nashville neighborhoods | **18** |
| Canonical place records | **22** |
| Published places | **0** |
| Canonical Viator experiences | **188** |
| Approved experiences | **0** |
| Published experiences | **0** |
| Priority experience-review queue | **49** |
| Viator taxonomy tags | **1,263** |
| Canonical events | **0** |
| Source definitions | **13** |
| Active Viator Cron jobs | **3** |

The 22 place records are real Nashville institutions/venues seeded only as canonical stubs. They remain `unverified` and unpublished until durable facts are confirmed. Fake `[Sample]` restaurant records from the original website were deliberately **not** imported.

The 188 Viator rows are real Nashville products connected to real Viator product codes and API-returned affiliate URLs. All remain pending human curation.

Machine curation currently classifies the 188 experiences into:

- **49 priority-review**
- **88 standard-review**
- **51 long-tail**

Machine classification is discovery support only. It is **not** Nashroam editorial approval.

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
   +----------+-----------+
              |
      Nashroam editorial
      planner context
      relationships
      curation / verification
              |
      provider IDs + expiring state
              |
      Edge Functions + Cron
              |
   +----------+-----------+-----------------------------+
   |          |           |           |                 |
 Viator   Foursquare   Google     Ticketing       Local/official
                      Places       providers        calendars
```

The browser never receives private provider credentials or the Supabase service-role key.

---

## 3. Source matrix

### First-party / authoritative

| Source | Supabase key | Role | Status |
|---|---|---|---|
| **Nashroam Editorial** | `nashroam_editorial` | Scores, local notes, best-for, traveler fit, planner priority/context | **Active** |
| **Manual Verification** | `manual_verification` | Human verification and exception resolution | **Active** |
| **Official Website / venue / business** | `official_website` | Official URLs and authoritative durable/operational facts | **Active** |

### Places / restaurants / POI

| Source | Supabase key | Role | Status / rule |
|---|---|---|---|
| **Foursquare OS Places** | `foursquare_os` | **Primary durable POI backbone** | Inactive until Places Portal / dataset access is configured. Intended for durable canonical identity and update/delta maintenance. |
| **Foursquare Places API** | `foursquare` | Supplemental matching / enrichment | Inactive; credential not configured. |
| **Google Places** | `google_places` | **Just-in-time operational validation** | Inactive; credential not configured. Persist durable Google Place IDs, not Google volatile content as our warehouse. |
| **Yelp** | `yelp` | Consumer rating / review-count layer where licensed | Inactive; credential not configured. Keep provider state short-lived and separate from Nashroam score. |
| **TripAdvisor Content API** | repo adapter today | Supplemental rating/review-count source | Transitional; only move into Supabase if approved partner access is used. |

### Restaurants / reservations

| Source | Supabase key | Role | Status / rule |
|---|---|---|---|
| **OpenTable** | `opentable` | Reservation availability + deep links | Inactive pending partner/API access. Query availability for final candidates rather than warehousing it. |

### Tours / experiences

| Source | Supabase key | Role | Status / rule |
|---|---|---|---|
| **Viator Partner API v2** | `viator` | Experiences, product metadata, ratings, prices, schedules, affiliate URLs | **Active in sandbox Basic Access.** Catalog + expiring provider state. |

#### Viator facts

- Nashville destination ID: **799**
- Parent destination ID: **295**
- Lookup ID: **`8.77.295.799`**
- Current canonical experiences: **188**
- Local tag taxonomy: **1,263 tags**
- Viator `productUrl` is stored **exactly as returned** because it contains affiliate attribution.
- Provider descriptions/tags are provider metadata, not Nashroam editorial copy.
- The ingestion function **cannot publish an experience and does not write `nashroam_score`.**
- Production Viator should not be enabled until a production credential is explicitly configured.

### Events / tickets

| Source | Supabase key | Role | Status / rule |
|---|---|---|---|
| **Ticketmaster Discovery** | `ticketmaster` | **Primary automated concert/sports/event feed** | Inactive; key not configured in Supabase yet. |
| **SeatGeek** | `seatgeek` | Secondary event/ticket coverage + affiliate option | Inactive; credentials not configured. Deduplicate against canonical events. |
| **Vivid Seats** | `vivid_seats` | Secondary ticket marketplace / affiliate deep links | Inactive. Treat as a monetization outlet unless/until a consumer event feed is formally available to us. Do not scrape it. |
| **Visit Music City / NCVC** | `visit_music_city` | Nashville festivals, civic/community events, annual calendar | Inactive pending licensed feed / partnership. |
| **Direct venue calendars** | official-source pattern | Ryman, Opry, Bluebird, Cheekwood, TPAC, Zoo, Farmers' Market, sports venues, etc. | Planned high-value local gap filler. |

### Hotels / lodging

| Source | Where today | Role | Status / rule |
|---|---|---|---|
| **Booking.com Demand API** | `src/lib/feeds/booking-demand.ts` | Hotel inventory/rates/booking | Scaffold only. Move provider state into Supabase once credentials are approved/configured. |
| Booking.com affiliate | `src/lib/partners.ts` | Hotel fallback monetization | Existing fallback link layer. |
| Vrbo | `src/lib/partners.ts` | Whole-home rental fallback | Useful for groups; not a core POI source. |

---

## 4. Who is allowed to decide what?

| Question | Strongest source |
|---|---|
| Does this place exist / where is it? | Nashroam canonical record + Foursquare OS / official source |
| Is it worth recommending? | **Nashroam editorial** |
| Who is it best for? | **Nashroam editorial** |
| Is it open right now? | Official source + live validation |
| What do consumers broadly think? | Permitted Google/Yelp/provider rating signals |
| Can I get a table? | OpenTable / reservation provider |
| What tours are actually bookable? | Viator provider state |
| Which tour should this traveler do? | **Nashroam ranking over eligible Viator records** |
| What concert/game is happening? | Ticketmaster + official venue + secondary event sources |
| Where can I buy tickets? | Official / Ticketmaster / SeatGeek / Vivid depending on relationship/availability |
| Does the event change the itinerary? | **Nashroam event impact + planner context** |

External ratings, popularity, conversion, and commission may inform operations, but **none automatically becomes a Nashroam editorial score**.

---

## 5. Durable vs. volatile data

### Nashroam owns permanently

- canonical place / event / experience identity
- neighborhoods and geography
- Nashroam descriptions and local notes
- `nashroam_score`
- editorial rank
- best-for / traveler-type tags
- vibe and suitability
- planner priority
- relationships such as `nearby`, `pairs_well_with`, alternatives, pre/post dinner
- event impact and planner context
- curation status / human verification
- first-party engagement and conversion signals when added

### External provider state expires

Examples:

- opening/special hours
- operational status
- third-party ratings/review counts
- reservation availability
- live ticket inventory/pricing
- Viator pricing/schedules
- event postponements/cancellations

Every external state record should retain:

```text
source_id
external_id
fetched_at
expires_at
display_allowed
attribution
metadata
```

Do not flatten provider data into editorial columns and lose provenance.

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

### Operations / governance

- `data_sources`
- `source_snapshots`
- `ingestion_runs`
- `ingestion_cursors`
- `ingestion_schedules`
- `verification_queue`
- `system_documents`

### Private internal views / functions

- `experience_curation_queue`
- `experience_auto_curation`
- `experience_duplicate_candidates`
- `source_health`
- `refresh_experience_machine_curation()`

These are service-role/internal surfaces, not browser APIs.

---

## 7. Experience curation model

Provider ingestion and editorial approval are deliberately separate.

### Automated layer may do

- resolve Viator tags
- classify broad categories
- suggest traveler types
- flag age restrictions / high price / out-of-city day trips / low review count
- calculate a **discovery score** for review ordering
- detect likely duplicates
- place stronger records into `verification_queue`

### Automated layer may NOT do

- set `curation_status='approved'`
- set `is_published=true`
- write a Nashroam editorial note
- populate `nashroam_score`
- claim that provider popularity equals editorial quality

Current review buckets:

| Bucket | Count |
|---|---:|
| Priority review | **49** |
| Standard review | **88** |
| Long tail | **51** |

All 188 currently remain pending and unpublished.

---

## 8. Live refresh / maintenance engine

Supabase Cron + `pg_net` + Edge Functions are now active for Viator. Cron-to-function calls use a private credential stored in **Supabase Vault**; the raw credential is not committed to GitHub.

### Active jobs

| Job | Schedule (UTC) | Action |
|---|---|---|
| `nashroam-viator-products` | `17 */6 * * *` | Every 6 hours; up to 3 pages / 150 Nashville products, DEFAULT ranking |
| `nashroam-viator-tags` | `35 8 * * 0` | Weekly Sunday tag taxonomy refresh |
| `nashroam-viator-destinations` | `50 8 * * 0` | Weekly Sunday destination refresh |

HTTP timeouts are explicitly set because catalog ingestion can exceed the default network timeout.

A live authenticated verification run successfully refreshed 10 products, created **0** new records, recomputed machine curation for all 188, and preserved the invariants:

- published experiences: **0**
- approved experiences: **0**
- automated non-null `nashroam_score`: **0**
- open priority-review queue: **49**

### Place freshness target once POI sources are enabled

**Tier A — ~150 high-frequency recommendations**  
Daily operational refresh + just-in-time validation when shortlisted.

**Tier B — ~300 secondary recommendations**  
Every 2–3 days.

**Tier C — long tail**  
Weekly or when entering an active itinerary candidate set.

### Other target cadences

| Data / source | Target cadence |
|---|---|
| Foursquare OS | Release/delta cadence once access is configured |
| Google live validation | On demand for shortlist/final candidates |
| Yelp sentiment | Daily where licensed/configured |
| OpenTable availability | On demand |
| Viator catalog | **Every 6 hours — active** |
| Viator tags | **Weekly — active** |
| Viator destinations | **Weekly — active** |
| Viator availability | On demand close to trip date |
| Ticketmaster near-term events | Every few hours once enabled |
| Long-range events | Daily |
| NCVC/direct local calendars | Daily |
| Nashroam editorial | Human review based on importance/staleness |

---

## 9. Reliability / conflict engine

These are different concepts:

- **`nashroam_score`** = Nashroam's editorial opinion.
- **confidence / freshness** = reliability of operational data.
- **planner fit** = appropriateness for this traveler and trip.

Provider disagreement should create/update `verification_queue`, not silently overwrite another source.

Examples:

- `status_conflict`
- `hours_conflict`
- `location_conflict`
- `provider_not_found`
- `website_dead`
- `possible_duplicate`
- `stale_editorial_review`
- `event_time_conflict`
- `experience_priority_curation`

Humans work exceptions and judgment calls; machines handle refresh, normalization, and triage.

---

## 10. Event strategy

The planner must distinguish **an event that exists** from **an event that changes the trip**.

High-impact examples include:

- Titans home games
- Predators games/playoffs
- CMA Fest
- stadium/arena concerts
- Tomato Art Fest
- neighborhood festivals
- major conventions / road closures

Canonical event facts belong in `events`. Provider identity belongs in `event_source_links`. Nashville-specific importance belongs in `impact_level`, `planner_priority`, and `planner_context`.

Ticket commissions must never define event importance.

---

## 11. Planner contract

The planner must:

1. Never invent a business, attraction, experience, event, price, hours, or availability.
2. Resolve every recommendation to a real Supabase record.
3. Use only eligible/approved records for final recommendations.
4. Suppress or flag stale/low-confidence operational state.
5. Query date-relevant events before composing the trip.
6. Treat high-impact events as constraints/context.
7. Respect neighborhood geography and minimize unnecessary cross-city travel.
8. Use Nashroam relationships/context to create coherent blocks.
9. Perform expensive live availability checks only for shortlisted/final candidates when possible.
10. Persist `planner_reason` so recommendations can be audited/improved.
11. Preserve alternatives so one stop can be swapped without rebuilding the entire trip.

```text
Traveler input
     |
     +--> PLACES
     +--> EVENTS
     +--> EXPERIENCES
     +--> EXPIRING PROVIDER STATE
     +--> NASHROAM EDITORIAL
     +--> PLANNER CONTEXT / RELATIONSHIPS
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
Persisted itinerary + reason + alternatives
```

The model/rules engine is a **composer**, never the source of truth.

---

## 12. Monetization rules

Potential transaction layers:

- Viator tours/experiences
- OpenTable reservations
- Ticketmaster tickets
- SeatGeek tickets
- Vivid Seats affiliate ticket links
- Booking.com lodging
- Vrbo rentals
- future local commerce

**Affiliate economics must not silently become “highest commission wins.”** Sponsored treatment, if introduced, must be explicitly modeled/displayed separately from editorial ranking.

---

## 13. Security posture

- RLS is enabled on application tables.
- No public `anon`/`authenticated` table policies exist today by design.
- Privileged reads/writes are service-side.
- Views use `security_invoker`.
- `VIATOR_API_KEY` stays inside Supabase Edge Function secrets.
- `SUPABASE_SERVICE_ROLE_KEY` is never browser-exposed.
- Scheduled service-to-service authentication uses a private Vault credential.
- The `viator-sync` function does not rely on a user JWT; it validates service/Cron authorization itself.
- Public website surfaces should be narrow route handlers/server components rather than opening broad database access.

Supabase security advisors currently report only informational `RLS enabled/no policy` notices, which are intentional under this private-by-default architecture.

---

## 14. Next build sequence

1. **Curate the top 49 Viator experiences.** Approve/reject, add Nashroam notes, traveler fit, priority, and editorial score.
2. **Enable the POI backbone.** Configure Foursquare OS / Places access and build the first real restaurant/bar/attraction import.
3. **Backfill ~250–300 real restaurants** plus bars, coffee, shopping, venues, parks, and attractions; never import placeholder/sample listings.
4. **Add live POI validation.** Google/Foursquare/Yelp only within their licensing/storage rules.
5. **Enable Ticketmaster** and create canonical events + impact/context.
6. **Add local calendars** for festivals/community events not covered well by ticket feeds.
7. **Obtain OpenTable access** and use live reservation availability for final dining candidates.
8. **Wire places + events fully into Plan Your Trip** alongside approved experiences.
9. **Build an internal curation dashboard** so humans can work the review/verification queue efficiently.

The end-state is a living Nashville knowledge graph whose facts stay fresh automatically, while the recommendation layer remains distinctly Nashroam.
