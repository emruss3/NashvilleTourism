# Overture Maps — primary automated place discovery

> **Updated:** August 10, 2026  
> **Status:** Credential-free primary Nashville POI discovery feed  
> **Package pin:** `overturemaps==1.0.1`  
> **Supabase project:** `aeomrsutkhwmnscvvfur`

## Role in the source matrix

| Layer | Source | Role |
|---|---|---|
| Durable identity | **Nashroam canonical `places`** | Stable IDs humans publish |
| Primary discovery | **Overture Maps Places** (`overture_maps`) | Automated Nashville extract → `place_discovery_candidates` |
| Secondary durable | **Foursquare OS** (`foursquare_os`) | Enrichment / deltas when portal access exists |
| Authoritative verification | **Official website** | Human-confirmed URLs and durable facts |
| Live validation | **Google Places** | JIT status/hours/ratings — not the warehouse |
| Editorial | **Nashroam only** | Score, local note, best_for, traveler fit, planner priority |

**Manual restaurant seeding is DEPRECATED.**  
The ~20 officially verified restaurant rows already in Supabase are **bootstrap anchors** for matcher integration tests. Do not add restaurants one-by-one.

---

## Pipeline

```text
Overture Places (latest STAC release)
        |
        v
scripts/sync-overture-places.py   (weekly GH Action — never on website request)
        |
        v
place_discovery_candidates        (upsert on source_id + external_id)
        |
        v
score_place_discovery_candidates()
        |
        v
match_place_discovery_candidates()
        |
        +---- strong match ---> attach place_source_ids to existing canonical place
        |
        +---- strong new POI --> auto-create UNPUBLISHED places row
        |                       (is_published=false, curation_status=pending,
        |                        no place_editorial / nashroam_score)
        |
        +---- ambiguous / closed / missing ---> verification_queue
        |
        v
Human approve_place / reject_place
        |
        v
Published Nashroam place → Plan Your Trip / guides
```

Automation owns **identity**. Humans own **publication and editorial judgment**.

Overture confidence never becomes `nashroam_score`.

---

## Taxonomy (current Overture — not deprecated `categories`)

Prefer:

- `basic_category`
- `taxonomy.primary`
- `taxonomy.hierarchy`
- `taxonomy.alternates`

Tourism roots ingested:

- `food_and_drink`
- `arts_and_entertainment`
- `cultural_and_historic`
- `shopping`
- `sports_and_recreation`
- `lodging`

Restaurant discovery looks for hierarchy containing both `food_and_drink` and `restaurant` (plus sensible primary/basic fallbacks). Accountants, dentists, warehouses, etc. are excluded.

Preserve per-record `sources` / license metadata in `source_licenses` + `source_metadata`. Overture Places is multi-license; do not flatten provenance away.

---

## Matching rules (deterministic)

Never merge on name alone (chains: Starbucks, Edley’s, Five Guys).

| Confidence | Rule |
|---|---|
| High | Same provider external ID already linked |
| High | Unique normalized website domain |
| High | Same normalized name + street address or ZIP |
| High | Same normalized name + coordinates within ~75 m |
| Ambiguous | Multiple hits for any of the above → verification_queue |
| Auto-create | Tourism-relevant, not permanently closed, score ≥ ~70, enough identity, no match |

---

## Closure / freshness

Each sync:

1. Upserts current release candidates (`last_seen_at`, `source_release`)
2. Scores all candidates
3. Flags stale / provider-missing via `flag_stale_place_discovery_candidates(...)`
4. Permanently closed provider status → candidate `closed` + verification — **never blind-delete** a published Nashroam place

Canonical Nashroam IDs remain stable across provider merges; update `place_source_ids` only.

---

## Operations

### Local / CI

```bash
pip install -r scripts/requirements-overture.txt
export SUPABASE_URL=https://aeomrsutkhwmnscvvfur.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=...   # never NEXT_PUBLIC_*, never logged
export NASHVILLE_BBOX=-87.06,35.97,-86.46,36.41
npm run sync:overture-places
# or: python scripts/sync-overture-places.py
```

The CLI uses Overture’s latest-release / STAC behavior. Do not hardcode a June 2026 (or any) release ID forever.

### GitHub Action

`.github/workflows/overture-place-sync.yml`

- Schedule: **Monday 06:00 UTC**
- Also: `workflow_dispatch`
- Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Optional vars: `NASHVILLE_BBOX`, `MIN_CANDIDATE_SCORE`

Never echo secrets. Never upload GeoJSON as an artifact. Never run this path from a browser or Next.js request.

### Admin

- `/admin/places` — provider-agnostic `place_discovery_queue`
- `/admin/places/canonical` — human approve/reject (publication boundary)
- `/admin/places/fsq` — legacy FSQ staging (secondary)

---

## Planner cutover

`/api/planner/places` returns only:

```text
curation_status = approved
is_published = true
status = active
confidence_score >= 60
needs_review = false
```

`TripPlanner` passes those candidates into `buildItinerary`. Per category (meals / attractions / nightlife): if ≥1 approved Supabase place exists in that pool, static `[Sample]` listings for that category are not mixed in.

Unapproved discovery candidates never appear publicly.
