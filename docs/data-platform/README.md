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
| FSQ OS staging candidates | **0** — importer ready; dataset access still required |
| Canonical Viator experiences | **188** |
| Approved / published experiences | **0** |
| Priority experience-review queue | **49** |
| Viator taxonomy tags | **1,263** |
| Canonical events | **0** |
| Active planner-context rules | **15** |
| Canonical place relationships | **10** |
| Registered data sources | **15** |
| Active sources | **4** |
| Enabled ingestion schedules | **3** (Viator) |
| Prepared/disabled schedules | **1** (Ticketmaster) |

The original website's fake `[Sample]` restaurants have **not** been imported into Supabase. The 22 current place records are real Nashville institution/venue stubs, deliberately unverified/unpublished until durable facts are confirmed.

All 188 Viator experiences are real API inventory and remain pending human curation. Machine review buckets are:

- **49 priority-review**
- **88 standard-review**
- **51 long-tail**

Machine scoring/classification is workflow triage only. It cannot publish a record or write a Nashroam editorial score.

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
 External providers / official sources
```

Private provider credentials and the Supabase service-role key never belong in browser code.

Public site surfaces should use narrow server APIs/server components. Operational tables stay private by default.

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
| **Foursquare OS Places** | `foursquare_os` | **Primary durable POI backbone** | Staging/import/promotion pipeline is live; dataset access/export still required. |
| **Foursquare Places API** | `foursquare` | Supplemental matching/enrichment | Inactive; credentials not configured. |
| **Google Places** | `google_places` | **Just-in-time operational validation** | Inactive; credential not configured. Persist durable Google Place IDs; do not make volatile Google content the permanent warehouse. |
| **Yelp** | `yelp` | Consumer rating/review-count layer where licensed | Inactive; credential not configured. Keep provider state separate from Nashroam score. |
| **TripAdvisor Content API** | `tripadvisor` | Supplemental rating/review-count source | Registered; inactive pending approved credentials/current terms. |

See [FOURSQUARE.md](./FOURSQUARE.md) for the bulk POI workflow.

### Restaurant reservations

| Source | Supabase key | Role | Status / rule |
|---|---|---|---|
| **OpenTable** | `opentable` | Reservation availability + deep links | Inactive pending partner/API access. Query final candidates on demand rather than warehousing availability. |

### Tours / experiences

| Source | Supabase key | Role | Status / rule |
|---|---|---|---|
| **Viator Partner API v2** | `viator` | Experiences, ratings, prices, schedules, affiliate URLs | **Active in sandbox Basic Access.** Canonical catalog + expiring provider state. |

Viator facts:

- Nashville destination ID: **799**
- parent destination: **295**
- lookup ID: **`8.77.295.799`**
- 188 canonical experiences
- 1,263 local Viator tags
- exact API-returned `productUrl` is preserved
- provider descriptions/tags never automatically become Nashroam editorial copy
- ingestion cannot approve, publish, or write `nashroam_score`
- provider-state refresh is **hourly**
- tags/destinations refresh weekly
- production Viator stays disabled until a production key exists

See [VIATOR.md](./VIATOR.md).

### Events / tickets

| Source | Supabase key | Role | Status / rule |
|---|---|---|---|
| **Ticketmaster Discovery** | `ticketmaster` | **Primary automated concerts/sports/event feed** | Supabase Edge Function + canonical reader prepared; inactive until `TICKETMASTER_API_KEY` is added to Supabase and first sync is verified. |
| **SeatGeek** | `seatgeek` | Secondary event/ticket coverage + affiliate option | Inactive; credentials not configured. Deduplicate into canonical events. |
| **Vivid Seats** | `vivid_seats` | Secondary ticket marketplace / affiliate deep links | Inactive. Treat as monetization outlet unless/until formal consumer feed access exists; do not scrape it. |
| **Visit Music City / NCVC** | `visit_music_city` | Nashville festivals/community/annual calendar | Inactive pending licensed feed/partnership. |
| **Direct venue calendars** | official-source pattern | Ryman, Opry, Bluebird, Cheekwood, TPAC, Zoo, Farmers' Market, sports venues, etc. | Planned local gap filler. |

See [TICKETMASTER.md](./TICKETMASTER.md).

### Hotels / lodging

| Source | Supabase key / location | Role | Status / rule |
|---|---|---|---|
| **Booking.com Demand API** | `booking_demand` | Hotel inventory/rates/booking | Registered but inactive; repo adapter is scaffold-only. |
| Booking.com affiliate | `src/lib/partners.ts` | Hotel fallback monetization | Existing link layer. |
| Vrbo | `src/lib/partners.ts` | Whole-home rental fallback | Existing link layer; useful for groups. |

---

## 4. Who decides what?

| Question | Strongest source |
|---|---|
| Does this place exist / where is it? | Nashroam canonical record + Foursquare OS / official source |
| Is it worth recommending? | **Nashroam editorial** |
| Who is it best for? | **Nashroam editorial** |
| Is it open right now? | Official source + live validation |
| What do consumers broadly think? | Permitted Google/Yelp/TripAdvisor/provider signals |
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
- place relationships / alternatives
- event impact / planner context
- curation and verification state
- first-party engagement/conversion signals when added

### Provider state expires

Examples:

- hours / operational status
- third-party ratings/review counts
- reservation availability
- ticket inventory/pricing
- Viator pricing/schedules
- cancellations/postponements

External state keeps provenance such as:

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

### FSQ OS staging

`fsq_os_categories`, `fsq_os_place_candidates`, private view `fsq_os_place_candidate_queue`

Promotion is service-role-only through `promote_fsq_os_candidate(...)`. Bulk FSQ data never publishes directly into the canonical corpus.

### Events

`events`, `event_source_links`, `planner_context`

`events.time_tbd` explicitly distinguishes an announced date with an unknown start time from an all-day event. Exact-name provider venues are automatically linked to known canonical venue places/neighborhoods.

### Experiences

`experiences`, `experience_editorial`, `experience_source_ids`, `experience_source_state`, `viator_destinations`, `viator_tags`

### Planner / persistence

`planner_context`, `itineraries`, `itinerary_items`

### Data operations / governance

`data_sources`, `source_snapshots`, `ingestion_runs`, `ingestion_cursors`, `ingestion_schedules`, `verification_queue`, `system_documents`

### Private operational views

`experience_curation_queue`, `experience_auto_curation`, `experience_duplicate_candidates`, `source_health`, `fsq_os_place_candidate_queue`

---

## 7. Curation boundary

### Experiences

Provider ingestion may:

- create/update provider identity;
- refresh price/rating/review/schedule metadata;
- calculate machine review priority;
- suggest categories/traveler types;
- flag likely issues/duplicates.

It may **not**:

- approve;
- publish;
- create a Nashroam editorial score;
- create a Nashroam local note.

Public `/tours`, product pages and Plan Your Trip require:

```text
curation_status = approved
is_published = true
status = active
```

Atomic service-role actions:

- `approve_experience(...)`
- `reject_experience(...)`

### Places

FSQ bulk data lands in private staging. Promotion creates/links a canonical place but leaves it **unverified and unpublished**. Editorial/operational verification is a separate step.

---

## 8. Internal admin

Private surfaces:

```text
/admin/experiences
/admin/places
/admin/sources
```

They fail closed unless `NASHROAM_ADMIN_TOKEN` is configured server-side.

Login exchanges the token for a signed, HttpOnly, SameSite=Strict session with a cryptographically enforced 12-hour expiry.

- **Experiences:** review 49 priority Viator products; explicit approve/reject.
- **Places:** review/promote/ignore FSQ staging candidates; exact-name canonical-match hinting.
- **Sources:** registry, active/inactive state, schedules, latest ingestion result.

Machine suggestions remain hints; human editorial fields start blank.

---

## 9. Planner context

`planner_context` now contains **15 active first-party Nashville rules** plus **10 canonical place relationships**.

Examples:

- 12 South is normally a compact 2–3 hour shopping/meal block.
- Broadway belongs in a first visit but should not automatically consume the whole day.
- Ryman/Bluebird/Opry show times are fixed itinerary anchors.
- East Nashville/Five Points and Germantown work better as clustered blocks.
- The Gulch pairs naturally with Downtown.
- West End is primarily a daytime park/culture block.
- Nissan Stadium / Bridgestone events need explicit logistics treatment.
- family trips suppress unnecessary late-night movement.

Context has structured `rules` JSON (for example `max_block_hours`, `avoid_late_night`, `fixed_time_anchor`, `travel_buffer_minutes`) so deterministic code can apply rules without parsing prose.

Plan Your Trip now fetches applicable Supabase neighborhood/audience context and passes it into the deterministic builder. The first applied rules are compact-block transitions and family late-night suppression; the relevant Nashroam guidance is displayed above each day.

Event/logistics contexts remain stored but are not blindly applied until a real date-specific event triggers them.

---

## 10. Refresh / ingestion

### Viator — active

| Job | Cadence | State |
|---|---|---|
| Nashville product/provider-state refresh | **Hourly** at minute 17 | enabled |
| Tags | weekly | enabled |
| Destinations | weekly | enabled |

Cron calls the protected Edge Function using a credential stored in Supabase Vault. Provider-state TTL is one hour.

### Ticketmaster — prepared

`ticketmaster-sync` is deployed and JWT-protected. The schedule definition exists at every 3 hours but remains **disabled** until the Supabase secret is added and a live sync is verified.

The public calendar already prefers fresh canonical Supabase events, then falls back to the legacy direct Ticketmaster adapter during migration, then clearly labelled seed data.

### Foursquare OS — prepared

The repo contains:

```text
scripts/fsq-os-nashville.sql
scripts/import-fsq-os.mjs
docs/data-platform/FOURSQUARE.md
```

Once Places Portal/Iceberg dataset access is available, export the Nashville slice and import it into private staging. Monthly delta handling is the intended maintenance path after initial load.

---

## 11. Reliability / verification

`nashroam_score` = editorial quality.  
`confidence_score` = operational reliability.  
Planner fit = appropriateness for this traveler/date/context.

These are intentionally separate.

Provider disagreement belongs in `verification_queue`, not silent overwrites. Example reasons include status/hour/location conflicts, possible duplicates, stale editorial checks and event-time conflicts.

Target operating model: most provider state refreshes automatically; humans work the exceptions and editorial decisions.

---

## 12. Security posture

- RLS enabled on application/provider tables.
- No broad `anon` / `authenticated` access to operational tables.
- Service-role/provider credentials never in client bundles.
- Viator scheduled calls authenticate through Vault.
- `viator-sync` rejects unauthenticated traffic.
- `ticketmaster-sync` is JWT-protected and remains inactive without its Supabase secret.
- manual website sync route fails closed unless `NASHROAM_SYNC_TOKEN` exists.
- internal admin fails closed unless `NASHROAM_ADMIN_TOKEN` exists.
- raw provider payloads are stored only when allowed by provider rules.

Current Supabase security advisor output contains only the intentional informational "RLS enabled with no public policy" notices.

---

## 13. Next source activations

1. **Foursquare OS Places access/export** → first real restaurant/bar/coffee/attraction corpus.
2. **Ticketmaster key in Supabase** → populate canonical Nashville events and enable 3-hour refresh.
3. Google/Foursquare/Yelp live validation as credentials/terms are configured.
4. OpenTable partnership/API → reservation availability for final dining candidates.
5. NCVC/direct calendars → festivals/local events that ticket feeds miss.
6. Booking.com Demand → live lodging inventory when credentials are ready.

Target canonical place corpus remains roughly **500–750 places Nashroam would actually recommend**, not every business in Davidson County.
