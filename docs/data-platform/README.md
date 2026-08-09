# Nashroam Data Platform Strategy

> **Updated:** August 9, 2026  
> **Supabase project:** `Nashroam`  
> **Project ref:** `aeomrsutkhwmnscvvfur`  
> **Region:** `us-east-2`

Nashroam is a Nashville-specific data, editorial, planning, and transaction platform. **Supabase is the system of record.** Outside providers supply narrowly defined facts or inventory; Nashroam owns durable Nashville identity, editorial judgment, relationships, and planner context.

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

The 22 places are real Nashville institution/venue stubs only. They remain `unverified` and unpublished until durable facts are confirmed. Fake `[Sample]` restaurant content from the original site was deliberately **not** imported.

The 188 Viator rows are real Nashville products tied to real product codes and exact API-returned affiliate URLs. They remain pending editorial curation.

Machine review buckets:

- **49 priority-review**
- **88 standard-review**
- **51 long-tail**

Machine classification is workflow triage, **not** Nashroam editorial approval.

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
   +----------+------------+--------------------------+
   |          |            |                          |
 Viator   POI sources   Ticket/event sources   Official/local sources
```

Private provider credentials and the Supabase service-role key never belong in browser code.

---

## 3. Source matrix

### First-party / authoritative

| Source | Supabase key | Role | Status |
|---|---|---|---|
| **Nashroam Editorial** | `nashroam_editorial` | Scores, local notes, traveler fit, best-for, planner priority/context | **Active** |
| **Manual Verification** | `manual_verification` | Human verification and exception resolution | **Active** |
| **Official Website / venue / business** | `official_website` | Authoritative URLs and durable/operational facts | **Active** |

### Places / restaurants / POI

| Source | Supabase key | Role | Status / rule |
|---|---|---|---|
| **Foursquare OS Places** | `foursquare_os` | **Primary durable POI backbone** | Inactive until Places Portal/dataset access is configured. Intended for canonical POI identity and update maintenance. |
| **Foursquare Places API** | `foursquare` | Supplemental matching/enrichment | Inactive; credential not configured. |
| **Google Places** | `google_places` | **Just-in-time operational validation** | Inactive; credential not configured. Persist durable Google Place IDs; do not make volatile Google content the permanent warehouse. |
| **Yelp** | `yelp` | Consumer rating/review-count layer where licensed | Inactive; credential not configured. Provider state stays separate from Nashroam score. |
| **TripAdvisor Content API** | repo adapter today | Supplemental rating/review-count source | Transitional; move into Supabase only with approved partner access. |

### Restaurant reservations

| Source | Supabase key | Role | Status / rule |
|---|---|---|---|
| **OpenTable** | `opentable` | Reservation availability + deep links | Inactive pending partner/API access. Query final candidates on demand rather than warehousing availability. |

### Tours / experiences

| Source | Supabase key | Role | Status / rule |
|---|---|---|---|
| **Viator Partner API v2** | `viator` | Experiences, provider metadata, ratings, prices, schedules, affiliate URLs | **Active in sandbox Basic Access.** Canonical catalog + expiring provider state. |

Viator facts:

- Nashville destination ID: **799**
- parent destination: **295**
- lookup ID: **`8.77.295.799`**
- 188 canonical experiences
- 1,263 local Viator tags
- `productUrl` is stored/used exactly as returned
- supplier metadata does not become Nashroam editorial copy
- ingestion cannot approve, publish, or write `nashroam_score`
- production stays disabled until a production credential is explicitly configured

See [VIATOR.md](./VIATOR.md) for the operational contract.

### Events / tickets

| Source | Supabase key | Role | Status / rule |
|---|---|---|---|
| **Ticketmaster Discovery** | `ticketmaster` | **Primary automated concert/sports/event feed** | Inactive; credential not configured in Supabase yet. |
| **SeatGeek** | `seatgeek` | Secondary event/ticket coverage + affiliate option | Inactive; credentials not configured. Deduplicate into canonical events. |
| **Vivid Seats** | `vivid_seats` | Secondary ticket marketplace / affiliate deep links | Inactive. Treat as a monetization outlet unless/until formal consumer feed access exists; do not scrape it. |
| **Visit Music City / NCVC** | `visit_music_city` | Nashville festivals/community/annual calendar | Inactive pending licensed feed/partnership. |
| **Direct venue calendars** | official-source pattern | Ryman, Opry, Bluebird, Cheekwood, TPAC, Zoo, Farmers' Market, sports venues, etc. | Planned local gap filler. |

### Hotels / lodging

| Source | Where today | Role | Status / rule |
|---|---|---|---|
| **Booking.com Demand API** | `src/lib/feeds/booking-demand.ts` | Hotel inventory/rates/booking | Scaffold only; move live provider state into Supabase when credentials are ready. |
| Booking.com affiliate | `src/lib/partners.ts` | Hotel fallback monetization | Existing link layer. |
| Vrbo | `src/lib/partners.ts` | Whole-home rental fallback | Useful for groups; not a POI source. |

---

## 4. Who decides what?

| Question | Strongest source |
|---|---|
| Does this place exist / where is it? | Nashroam canonical record + Foursquare OS / official source |
| Is it worth recommending? | **Nashroam editorial** |
| Who is it best for? | **Nashroam editorial** |
| Is it open right now? | Official source + live validation |
| What do consumers broadly think? | Permitted Google/Yelp/provider rating signals |
| Can I get a table? | OpenTable / reservation provider |
| Which tours exist / what do they cost? | Viator provider state |
| Which tour should this traveler do? | **Nashroam ranking over approved records** |
| What concert/game is happening? | Ticketmaster + official venue + secondary sources |
| Where can I buy tickets? | Official / Ticketmaster / SeatGeek / Vivid as available |
| Does an event materially change the trip? | **Nashroam impact + planner context** |

External rating, popularity, conversion, and commission may inform workflow but **never automatically become a Nashroam editorial score**.

---

## 5. Durable vs. volatile data

### Nashroam owns permanently

- canonical place/event/experience identity
- neighborhood/geography
- Nashroam descriptions/local notes
- `nashroam_score`
- editorial rank
- best-for / traveler types
- vibe/suitability
- planner priority
- relationships and alternatives
- event impact/planner context
- curation status / human verification
- first-party engagement/conversion signals when added

### Provider state expires

Examples:

- hours and operational status
- third-party ratings/review counts
- restaurant availability
- ticket inventory/pricing
- Viator price/schedules
- cancellations/postponements

External state keeps provenance fields such as:

```text
source_id
external_id
fetched_at
expires_at
display_allowed
attribution
metadata
```

---

## 6. Database model

### Places

`neighborhoods`, `places`, `place_editorial`, `tags`, `place_tags`, `place_relationships`, `place_source_ids`, `place_source_state`, `place_health`

### Events

`events`, `event_source_links`, `planner_context`

### Experiences

`experiences`, `experience_editorial`, `experience_source_ids`, `experience_source_state`, `viator_destinations`, `viator_tags`

### Planner / persistence

`itineraries`, `itinerary_items`

### Operations / governance

`data_sources`, `source_snapshots`, `ingestion_runs`, `ingestion_cursors`, `ingestion_schedules`, `verification_queue`, `system_documents`

### Private internal surfaces

- `experience_curation_queue`
- `experience_auto_curation`
- `experience_duplicate_candidates`
- `source_health`
- `refresh_experience_machine_curation()`
- `approve_experience(...)`
- `reject_experience(...)`

These are service-role/internal surfaces, not public browser APIs.

---

## 7. Curation boundary

### Automation may

- normalize provider records
- resolve Viator tags
- suggest broad categories/traveler types
- flag age restrictions, high price, out-of-core day trips, low review count
- calculate a private **discovery score** to order review
- detect likely duplicates
- create verification/review queue items

### Automation may NOT

- set `curation_status='approved'`
- set `is_published=true`
- write Nashroam editorial notes
- populate `nashroam_score`

### Atomic editorial actions

Service-role-only RPCs:

- `approve_experience(...)`
- `reject_experience(...)`

Approval requires a real local note, Nashroam score and planner priority; it publishes atomically and resolves open review items. Rejection requires a reason and unpublishes/deactivates atomically.

Public `/tours`, direct product pages and Plan Your Trip require:

```text
curation_status = approved
is_published = true
status = active
```

Raw live provider search is an internal discovery tool, **not a public fallback**.

---

## 8. Live maintenance engine

Supabase Cron + `pg_net` + Edge Functions are active for Viator. Scheduled calls authenticate with a private credential stored in **Supabase Vault**.

| Job | Cron (UTC) | Action |
|---|---|---|
| `nashroam-viator-products` | `17 * * * *` | **Hourly**; max 3 pages / 150 Nashville products using DEFAULT ranking |
| `nashroam-viator-tags` | `35 8 * * 0` | Weekly Sunday tag taxonomy refresh |
| `nashroam-viator-destinations` | `50 8 * * 0` | Weekly Sunday destination refresh |

The provider-state TTL is one hour, so hourly product refresh keeps normal catalog state inside that freshness window.

Viator rate-limit headers represent a per-endpoint/per-partner rolling 10-second window, not a daily quota. The hourly job uses only a handful of search requests and remains deliberately modest.

Product sync uses a 60-second pg_net timeout; tag/destination jobs use 30 seconds. Successful ingestion updates `ingestion_schedules.last_run_at` / `next_run_after`.

A verified protected sync refreshed provider state and preserved all editorial invariants:

- published experiences: **0**
- approved experiences: **0**
- automated non-null Nashroam scores: **0**
- priority review queue: **49**

### Future place freshness tiers

**Tier A — ~150 high-frequency recommendations:** daily + just-in-time validation  
**Tier B — ~300 secondary recommendations:** every 2–3 days  
**Tier C — long tail:** weekly or when entering an active candidate set

---

## 9. Reliability / conflicts

Keep three concepts separate:

- **Nashroam score** = editorial opinion
- **freshness/confidence** = reliability of operational state
- **planner fit** = appropriateness for this traveler/trip

Provider disagreement creates/updates `verification_queue` rather than silently overwriting another source.

Typical reasons include `status_conflict`, `hours_conflict`, `location_conflict`, `provider_not_found`, `website_dead`, `possible_duplicate`, `stale_editorial_review`, `event_time_conflict`, and `experience_priority_curation`.

Humans work exceptions and editorial judgment; machines handle refresh, normalization and triage.

---

## 10. Event strategy

The planner must distinguish **an event that exists** from **an event that changes the trip**.

High-impact examples include Titans games, Predators games/playoffs, CMA Fest, stadium/arena concerts, Tomato Art Fest, neighborhood festivals, major conventions and road closures.

Canonical facts live in `events`; provider identity lives in `event_source_links`; Nashville-specific importance lives in `impact_level`, `planner_priority`, and `planner_context`.

Ticket commission must never define event importance.

---

## 11. Planner contract

The planner must:

1. Never invent a business, attraction, experience, event, price, hours, or availability.
2. Resolve every final recommendation to a real Supabase ID.
3. Use only eligible/approved records.
4. Suppress/flag stale operational state.
5. Query date-relevant events before composing the trip.
6. Treat high-impact events as constraints/context.
7. Respect neighborhood geography.
8. Use Nashroam relationships/context to make coherent blocks.
9. Perform expensive live checks only for shortlisted/final candidates when possible.
10. Persist `planner_reason` for audit/improvement.
11. Keep alternatives so a single stop can be swapped.

The model/rules engine is a **composer**, never the source of truth.

---

## 12. Monetization

Potential transaction layers:

- Viator experiences
- OpenTable reservations
- Ticketmaster tickets
- SeatGeek tickets
- Vivid Seats affiliate links
- Booking.com lodging
- Vrbo rentals
- future local commerce

**Affiliate economics must not silently become “highest commission wins.”** Sponsored treatment must be explicit and separate from editorial ranking.

---

## 13. Security posture

- RLS is enabled on application tables.
- No public `anon`/`authenticated` table policies exist today by design.
- Privileged access is server-side/service-role.
- Internal views use `security_invoker`.
- `VIATOR_API_KEY` stays in Supabase Edge Function secrets.
- Scheduled service authentication uses a private Vault credential.
- `viator-sync` rejects unauthenticated calls; an explicit unauthenticated test returned `401`.
- The manual website sync endpoint fails closed unless `NASHROAM_SYNC_TOKEN` is explicitly configured.
- Public website routes must not expose raw provider discovery as a curation bypass.

Supabase security advisors currently show only informational `RLS enabled/no policy` notices, which are intentional under this private-by-default design. Performance advisors currently show unused-index notices expected for a new/mostly empty schema; no index is being removed preemptively.

---

## 14. Next build sequence

1. Curate the **49 priority Viator experiences** using the atomic approval/rejection workflow.
2. Configure **Foursquare OS / Places access** and build the first real POI import.
3. Backfill ~250–300 restaurants plus bars, coffee, shopping, venues, parks and attractions.
4. Add live POI validation via Google/Foursquare/Yelp within licensing rules.
5. Enable **Ticketmaster** and build canonical events + impact/context.
6. Add Nashville-specific licensed/direct calendars.
7. Obtain **OpenTable** access for live dining availability.
8. Wire approved places/events fully into Plan Your Trip alongside approved experiences.
9. Build an authenticated internal curation dashboard over the service-role curation RPCs.

The end-state is a living Nashville knowledge graph whose facts refresh automatically while recommendation judgment remains distinctly Nashroam.
