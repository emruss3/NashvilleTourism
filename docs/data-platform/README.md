# Nashroam Data Platform Strategy

> **Status:** V1 backend created August 6, 2026. The current website is not yet wired to this database.

Nashroam should not be an AI model inventing Nashville recommendations. It should be a Nashville-specific data and editorial platform where AI/rules select from real, verified places and events.

The core principle is simple:

> **Nashroam owns the durable Nashville knowledge and recommendation logic. Licensed/official providers supply volatile facts. The planner chooses from verified records; it does not invent them.**

---

### Provider integrations (website)

| Provider | Status | Notes |
|---|---|---|
| **Viator Partner API v2** | Wired in Next.js (`src/lib/feeds/viator.ts`) | Server-only `VIATOR_API_KEY`. Nashville destination **799**. Marketplace at `/tours`. Use `productUrl` exactly for booking CTAs. Status: `/api/viator-status`. |
| **Booking.com Demand API** | Scaffold (`src/lib/feeds/booking-demand.ts`) | Hotels are **not** Viator. Sample `/hotels` catalog ≠ production inventory. Status: `/api/booking-demand-status`. |
| **Google Places** | Supplemental only | Maps/hours/ratings when permitted — never hotel booking inventory. |

**Provenance:** `src/lib/feeds/provider-provenance.ts` maps provider IDs without copying volatile fields into editorial columns. Seed providers via migration `20260807140000_seed_viator_booking_demand_sources.sql`.

---

### Supabase

- **Project:** `Nashroam`
- **Project ref:** `aeomrsutkhwmnscvvfur`
- **Region:** `us-east-2`
- **Postgres:** 17
- **Current schema:** 18 application tables
- **Seeded neighborhoods:** 18
- **Seeded source definitions:** 9

Applied migrations:

1. `20260806212347_create_nashroam_data_platform_v1`
2. `20260806212413_harden_and_index_nashroam_v1`

Both applied migrations are versioned under `supabase/migrations/` in this repository.

### Security posture

Every application table has Row Level Security enabled.

There are intentionally **no `anon` or `authenticated` policies yet**. The tables are private and service-role-only until the website integration is designed. This is deliberate: provider data, internal planner logic, raw snapshots, verification information, and saved-trip data should not become publicly queryable by accident.

When the frontend is connected, expose the minimum necessary surface through tightly scoped RLS policies, server-side queries, or purpose-built endpoints.

**Never put the Supabase service-role/secret key in browser code or a `NEXT_PUBLIC_*` variable.**

---

## 2. Product thesis

Generic AI already knows that Nashville has Broadway, hot chicken, the Ryman, and the Country Music Hall of Fame. That is not the product.

Nashroam becomes useful when it knows:

- which restaurants are actually worth recommending;
- what is open and operating now;
- what is happening on the traveler's exact dates;
- which events materially change an itinerary;
- which neighborhoods pair well together;
- where a traveler should eat before a specific show;
- what requires advance reservations;
- what works for couples, groups, families, first-timers, locals, food-focused travelers, etc.;
- which recommendations are current and which need verification;
- which booking/ticket links can generate revenue.

The moat is the **Nashroam context layer**, not a generic language model.

---

## 3. Own durable data; rent volatile data

### Nashroam-owned data

This is first-party intellectual property and should live permanently in Supabase:

- canonical place record;
- Nashville neighborhood;
- category/cuisine taxonomy;
- Nashroam description and local note;
- `nashroam_score`;
- editorial rank;
- `best_for` tags;
- traveler-type tags;
- vibe;
- typical visit duration;
- tourist/local orientation;
- family/group suitability;
- rooftop/live-music/outdoor flags;
- booking lead-time guidance;
- planner priority;
- `pairs_well_with`, alternatives, pre-dinner/post-dinner relationships;
- neighborhood context;
- event impact/context;
- internal verification state;
- first-party engagement/conversion signals when available.

### Volatile third-party data

Do not pretend Nashroam can manually keep these current at scale:

- current opening hours;
- holiday/special hours;
- temporary/permanent closure status;
- third-party rating;
- review count;
- permitted review snippets;
- reservation availability;
- live ticket inventory;
- event changes/cancellations/postponements;
- provider-specific prices or metadata.

These fields should be refreshed from approved providers and stored/displayed only within the provider's license, caching, attribution, and retention rules.

---

## 4. Source hierarchy

The initial source registry contains:

| Source | Intended use | Initial state |
|---|---|---|
| Nashroam Editorial | First-party recommendations/context | Active |
| Manual Verification | Human confirmation | Active |
| Official Website | Durable official facts/URLs | Active |
| Yelp | Ratings/review counts and permitted review content | Disabled pending credentials/terms |
| Foursquare | POI verification/place intelligence | Disabled pending credentials/terms |
| OpenTable | Reservations and availability | Disabled pending partnership/API approval |
| Ticketmaster Discovery | Events/tickets | Disabled pending integration |
| SeatGeek | Secondary event/ticket coverage | Disabled pending integration |
| Visit Music City / NCVC | Local calendar/festival coverage | Disabled pending licensed feed/partnership |

Additional direct sources should eventually include major Nashville institutions and venues where their terms/feed support automated use.

### Source rules

Every live fact needs:

- a source;
- a fetch timestamp;
- an expiration timestamp when applicable;
- attribution metadata when required;
- a clear rule for whether the value can be displayed;
- a clear rule for whether raw payloads may be stored.

**Do not scrape and republish third-party editorial descriptions or reviews.**

---

## 5. Database model

### Core geography/content

#### `neighborhoods`
Canonical Nashville neighborhood records and planner summaries.

#### `places`
The golden record for restaurants, bars, coffee shops, music venues, attractions, shopping, parks, tours, etc.

This table stores durable facts and Nashroam identity, not every volatile field from every provider.

#### `place_editorial`
Nashroam's opinion/context layer:

- score;
- editorial rank;
- summary/local note;
- vibe;
- best-for and traveler types;
- visit duration;
- suitability flags;
- reservation guidance;
- planner priority;
- human-verification date.

#### `tags` / `place_tags`
Flexible taxonomy used by guides, search, recommendations, SEO, and the trip planner.

#### `place_relationships`
First-party knowledge graph between places:

- nearby;
- pairs well with;
- alternative;
- pre-dinner;
- post-dinner;
- same experience;
- avoid pairing.

This is one of the most strategically valuable tables because generic POI providers do not know how Nashroam believes Nashville should be experienced.

---

## 6. Provider identity and live state

#### `data_sources`
Master registry of external/internal providers, licensing capabilities, attribution requirements, and default freshness rules.

#### `place_source_ids`
Maps a Nashroam `place_id` to provider IDs such as Yelp, Foursquare, OpenTable, etc.

This prevents repeated fuzzy matching and allows us to change providers without changing the canonical place record.

#### `place_source_state`
One current state per place/provider, including fields such as:

- rating and scale;
- review count;
- provider business status;
- regular/special hours;
- open-now status;
- fetched/expiry timestamps;
- whether display is legally/contractually permitted;
- attribution.

Do not collapse all provider data into one field and lose provenance.

#### `source_snapshots`
Optional raw snapshots for providers whose terms explicitly allow storage.

The database enforces the rule that a payload cannot be stored unless `storage_permitted = true`.

---

## 7. Reliability and verification

### `place_health`

`confidence_score` measures **data reliability**, not restaurant quality.

It should eventually incorporate:

- freshness of operational data;
- agreement/disagreement among providers;
- official-source confirmation;
- successful provider matching;
- recent human verification;
- unexplained changes in location/hours/status.

Example:

**95 confidence**

- official site live;
- provider IDs matched;
- status sources agree;
- current hours recently refreshed;
- no location conflict;
- recently human verified.

**45 confidence**

- one provider says closed;
- another says open;
- official site is unavailable;
- hours are stale;
- no recent human verification.

Low-confidence places should be suppressed from automated itineraries or placed in the verification queue.

### `verification_queue`

Humans should work exceptions, not manually re-check hundreds of listings.

Examples of queue reasons:

- `status_conflict`;
- `hours_conflict`;
- `location_conflict`;
- `provider_not_found`;
- `website_dead`;
- `stale_editorial_review`;
- `possible_duplicate`;
- `event_time_conflict`.

The desired operating model is:

> 95%+ of records refresh automatically; humans review the small set of exceptions.

---

## 8. Events

### `events`

Canonical event record with:

- title/type;
- start/end;
- venue/place;
- neighborhood;
- location;
- official/ticket/affiliate URLs;
- expected attendance when available;
- `impact_level`;
- `planner_priority`;
- traveler-type relevance;
- schedule/cancel/postpone status.

### `event_source_links`

Connects the same canonical event to Ticketmaster, SeatGeek, official calendars, NCVC, etc. so the database can deduplicate overlapping feeds.

### Event philosophy

The planner should distinguish between:

1. an event that merely exists; and
2. an event that should change the trip.

A major Titans game, CMA Fest, Tomato Art Fest, a stadium concert, or a neighborhood festival can materially affect traffic, neighborhood choice, restaurant availability, and the value of spending time in that area.

That impact belongs in Nashroam's own data.

---

## 9. Nashroam context layer

### `planner_context`

This table stores the city knowledge that makes a Nashville planner better than a generic itinerary generator.

Examples:

- "When there is a Ryman show, prioritize a walkable Downtown dinner beforehand."
- "Do not schedule East Nashville-to-Downtown movement immediately after a Titans game unless necessary."
- "12 South is normally a 2-3 hour shopping/lunch block, not an all-day itinerary."
- "A Bluebird Cafe reservation is an anchor event; build the evening around its fixed time."
- "First-time visitors should experience Broadway, but do not automatically allocate the entire day to it."
- "During CMA Fest, Downtown congestion and crowds materially change normal itinerary logic."

`planner_context` can be citywide, neighborhood-specific, event-specific, seasonal, logistical, audience-specific, or editorial.

---

## 10. Ranking: quality is not reliability

Do not confuse these concepts:

### `nashroam_score`
Our editorial view of the quality/value of a place.

### `confidence_score`
How confident we are that the operational data is correct/current.

### Planner fit
How appropriate that place is for this traveler at this moment.

The planner should rank using a combination of:

- editorial quality;
- traveler fit;
- neighborhood/geographic fit;
- date/time fit;
- current status/hours;
- event context;
- booking feasibility;
- itinerary diversity;
- first-party engagement/conversion data once available.

A 4.8-star restaurant should not automatically outrank a 4.6-star restaurant if the second one is materially better for the user's trip.

---

## 11. Trip planner contract

The trip planner must follow these rules:

1. **Never invent a business, attraction, or event.** Every recommended place/event must resolve to a Supabase record ID.
2. Use only active/publishable places that meet the minimum data-confidence threshold.
3. Validate operational state near the trip date before presenting a place as open.
4. Query date-relevant events before composing the itinerary.
5. Treat high-impact events as itinerary constraints/context, not merely optional cards.
6. Respect neighborhood geography; minimize unnecessary cross-city movement.
7. Use `place_relationships` and `planner_context` to build locally coherent blocks.
8. Request reservation/ticket availability on demand where integrations permit it.
9. Persist the reason a recommendation was selected (`planner_reason`) so behavior can be audited/improved.
10. Keep alternatives so a user can swap one stop without regenerating the entire trip.

### Planner flow

```text
Traveler inputs
      |
      v
Trip dates + party + hotel + preferences
      |
      +----> Fetch date-relevant EVENTS
      |
      +----> Fetch eligible PLACES
      |
      +----> Apply LIVE STATE / CONFIDENCE
      |
      +----> Apply NASHROAM EDITORIAL + CONTEXT
      |
      +----> Apply GEOGRAPHY / RELATIONSHIPS
      |
      +----> Check BOOKING / TICKET feasibility
      |
      v
Ranked itinerary candidates
      |
      v
Deterministic planner / AI composition layer
      |
      v
Persisted itinerary + explanation + alternatives
```

The model/rules engine is the **composer**, not the source of truth.

---

## 12. Itinerary persistence

### `itineraries`
Stores trip dates, party/profile, preferences, hotel context, generation version, and status.

### `itinerary_items`
Stores each itinerary stop with:

- date/time;
- place/event ID;
- booking link/status;
- planner reason;
- alternatives;
- notes.

The `generation_version` field is important. As ranking/planner logic changes, we need to know which algorithm created an itinerary.

---

## 13. Ingestion architecture

### `ingestion_runs`
Every refresh job should be auditable:

- provider;
- job type;
- start/end;
- fetched/upserted/flagged counts;
- success/partial/failure;
- error information.

### Target workflow

```text
Supabase Cron
     |
     v
Edge Function / worker
     |
     v
Provider API / licensed feed
     |
     v
Normalize + match external ID
     |
     +--> place_source_state / events
     |
     +--> source_snapshots (only if storage is permitted)
     |
     v
Conflict + freshness checks
     |
     +--> place_health
     |
     +--> verification_queue
     |
     v
Planner-ready dataset
```

Provider credentials belong in server-side secrets, never in the browser or repository.

For larger workloads, introduce Supabase Queues so individual place/event refreshes can retry independently rather than failing an entire batch.

---

## 14. Proposed freshness model

These are operating targets, not provider-license overrides. Provider terms always win.

| Data | Target refresh pattern |
|---|---|
| Permanent closure/status | Daily baseline; more frequently for itinerary candidates |
| Regular/special hours | Daily baseline; refresh close to an active trip |
| Ratings/review counts | Daily where permitted |
| Major upcoming events | Multiple times per day |
| Long-range events | Daily |
| Reservation availability | On demand |
| Ticket availability | On demand / near-real-time where permitted |
| Nashroam editorial | Human review based on priority/staleness |
| Neighborhood context | Human/editorial updates as Nashville changes |

Avoid wasting API calls refreshing every field at the same frequency.

---

## 15. Initial content target

The goal is not every business in Davidson County. The goal is the set of places Nashroam would plausibly recommend.

Suggested first target:

| Category | Approx. target |
|---|---:|
| Restaurants | 250-300 |
| Bars/nightlife | 75-100 |
| Coffee/brunch | 50 |
| Attractions/museums | 50-75 |
| Shopping | 50 |
| Live-music venues | 40-50 |
| Parks/outdoor | 20-30 |
| Tours/experiences | 40-50 |

Roughly **500-750 high-quality places** is enough to make a Nashville-only planner feel deep without turning the project into an uncurated business directory.

---

## 16. Neighborhoods seeded in V1

- Downtown
- SoBro
- The Gulch
- Germantown
- East Nashville
- Five Points
- 12 South
- Wedgewood-Houston
- Music Row
- Midtown
- West End
- Hillsboro Village
- Belmont
- Music Valley
- Marathon Village
- The Nations
- Sylvan Park
- Green Hills

These are records, not a finished taxonomy. Neighborhood boundaries/centroids should be verified before location-sensitive planner logic relies on them.

---

## 17. Monetization should sit on top of trust

Potential transaction layers:

- restaurant reservations;
- event tickets;
- hotel bookings;
- tours/experiences;
- affiliate commerce.

The ranking system must not silently become "highest commission wins."

If commercial placement changes ranking, the UI/data model must clearly distinguish editorial, sponsored, and affiliate treatment. Nashroam's long-term value depends on users believing the itinerary is genuinely the best trip for them.

---

## 18. Cursor / implementation guardrails

Any agent modifying this system should follow these rules:

1. Do not create a second canonical place database in application code.
2. `places.id` and `events.id` are the canonical identifiers.
3. Do not hard-code live ratings, review counts, hours, or event status into editorial source files.
4. Preserve source provenance on every imported live field.
5. Do not save raw provider payloads unless `can_store_raw` / `storage_permitted` allows it.
6. Do not expose Supabase service-role credentials to the client.
7. Do not create broad public RLS policies for convenience.
8. Do not allow the planner to emit a real-world recommendation without a database-backed place/event ID.
9. Do not publish `unverified`, closed, cancelled, or stale records without explicit logic allowing it.
10. Log ingestion runs and surface failures; silent stale data is worse than an explicit error.
11. Keep Nashroam editorial score separate from provider rating and data-confidence score.
12. Do not scrape copyrighted descriptions/reviews to populate Nashroam editorial copy.
13. Prefer official/licensed feeds over brittle page scraping.
14. Every new third-party integration must document caching, display, attribution, and retention rules before being enabled.
15. Any schema change should be represented as a Supabase migration and run through Supabase security/performance advisors.

---

## 19. Implementation phases

### Phase 1 — Foundation **(started)**

- [x] Create dedicated Nashroam Supabase project
- [x] Create V1 schema
- [x] Enable RLS on every application table
- [x] Seed source registry
- [x] Seed core neighborhoods
- [x] Add indexes / security hardening
- [x] Version migrations in this GitHub repository
- [ ] Add Supabase server client to the Next.js app
- [ ] Replace sample content layer with repository/data-access interfaces

### Phase 2 — First-party Nashville corpus

- [ ] Import/curate first 250-300 restaurants
- [ ] Add bars, coffee, shopping, attractions, music, parks, tours
- [ ] Assign neighborhoods/tags
- [ ] Add Nashroam editorial scores/context
- [ ] Add place relationships
- [ ] Human-verify launch set

### Phase 3 — Live place reliability

- [ ] Choose/approve place/review provider(s)
- [ ] Build source-ID matching
- [ ] Build operational refresh functions
- [ ] Compute `place_health`
- [ ] Build verification/admin queue
- [ ] Add stale/conflict suppression to planner

### Phase 4 — Live Nashville events

- [ ] Ticketmaster ingestion
- [ ] SeatGeek ingestion
- [ ] Major venue/direct calendars
- [ ] NCVC/Visit Music City partnership/feed if available
- [ ] Event deduplication
- [ ] Event impact/context rules

### Phase 5 — Transactions

- [ ] OpenTable partnership/API
- [ ] Reservation availability/deep links
- [ ] Ticket affiliate tracking
- [ ] Tour/experience affiliate feeds
- [ ] Conversion tracking by itinerary item

### Phase 6 — Planner V2

- [ ] Query Supabase rather than static sample modules
- [ ] Require canonical IDs for recommendations
- [ ] Date-aware event context
- [ ] Neighborhood clustering
- [ ] Availability-aware itinerary composition
- [ ] Alternative/swap logic
- [ ] Saved/shared itineraries
- [ ] Generation analytics and ranking feedback loop

---

## 20. Definition of success

The data platform is working when a traveler can enter dates and preferences and Nashroam can reliably answer:

> **What should I actually do in Nashville on these exact dates, in what order, and why?**

with recommendations that are:

- real;
- current;
- geographically coherent;
- locally informed;
- personalized;
- explainable;
- bookable where possible;
- monetizable without compromising trust.

That is the product we are building.
