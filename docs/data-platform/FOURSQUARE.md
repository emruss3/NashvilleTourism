# Foursquare OS Places → Nashroam

## Why this is the place backbone

Nashroam needs a durable POI identity layer that we can actually store and maintain. Foursquare OS Places is the preferred backbone because the Open Source dataset is licensed under Apache 2.0 and includes durable POI fields such as:

- `fsq_place_id`
- name
- latitude / longitude
- address / locality / region / postcode / country
- created / refreshed / closed dates
- telephone
- website / email
- social handles
- category IDs + category labels
- Placemaker URL
- unresolved quality flags

Official docs:

- https://docs.foursquare.com/data-products/docs/access-fsq-os-places
- https://docs.foursquare.com/data-products/docs/places-os-data-schema

## Current Foursquare delivery model

Foursquare no longer uses the legacy public S3 bucket for the primary OS Places delivery. The current workflow is:

1. Create/sign into a **Foursquare Places Portal** account.
2. Browse the Places, Categories, and Delta datasets.
3. Generate a Places Portal access token.
4. Use the Portal-provided connection snippet for DuckDB, Spark, PyIceberg, or another Iceberg-compatible tool.
5. Query/export only the Nashville slice we need.

The Portal connection snippet is intentionally **not** committed here because it contains account-specific access information.

## Nashroam architecture

```text
Foursquare Places Portal / Iceberg
              |
              v
     Nashville JSONL export
              |
              v
 scripts/import-fsq-os.mjs
              |
              v
       private Supabase staging
   +---------------------------+
   | fsq_os_categories         |
   | fsq_os_place_candidates   |
   +---------------------------+
              |
      machine quality/type hints
              |
              v
  fsq_os_place_candidate_queue
              |
       human/editorial review
              |
              v
 promote_fsq_os_candidate(...)
              |
              v
 canonical places + source IDs/state
```

**Bulk data never publishes directly to `places`.**

## Export

The repo contains:

```text
scripts/fsq-os-nashville.sql
```

After connecting DuckDB to the Iceberg catalog using the Portal-generated snippet, run that SQL. It exports:

```text
fsq-categories.jsonl
fsq-nashville-places.jsonl
```

The Nashville bounding box in that file is an operational capture window, not a legal boundary. It can be adjusted later.

The initial place query deliberately:

- scopes to Tennessee / the Nashville capture window;
- excludes records with `date_closed`;
- requires a relatively recent `date_refreshed`;
- excludes blocking unresolved flags such as `closed`, `duplicate`, `delete`, `privatevenue`, `inappropriate`, and `doesnt_exist`;
- limits the initial slice to tourism-relevant categories (restaurants, bars, coffee, attractions, music, outdoor, shopping, and lodging).

## Import

Required local/server environment variables:

```text
SUPABASE_URL=https://aeomrsutkhwmnscvvfur.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

Import categories first:

```bash
node scripts/import-fsq-os.mjs categories fsq-categories.jsonl
```

Then places:

```bash
node scripts/import-fsq-os.mjs places fsq-nashville-places.jsonl
```

The importer:

- reads JSONL line-by-line;
- upserts in batches;
- records an `ingestion_runs` row;
- never publishes canonical places;
- marks the `foursquare_os` source active only after a successful place import.

## Supabase staging tables

### `fsq_os_categories`

Local copy of the Foursquare OS category hierarchy used for classification and filtering.

### `fsq_os_place_candidates`

Durable raw-ish staging fields from the OS Places export. Candidate state is one of:

- `pending`
- `promoted`
- `ignored`
- `needs_review`

### `fsq_os_place_candidate_queue`

Private service-role view that adds:

- suggested Nashroam place types;
- data-quality score;
- blocking-flag indicator.

This is **not** an editorial rating. It is only a data-quality / review-priority aid.

## Promotion

Canonical promotion is service-role-only:

```sql
select public.promote_fsq_os_candidate(
  p_fsq_place_id := '...',
  p_primary_category := 'restaurant',
  p_neighborhood_id := null,
  p_existing_place_id := null
);
```

If the candidate corresponds to an already-seeded canonical Nashroam place, pass `p_existing_place_id` so the FSQ record attaches to that existing place instead of creating a duplicate.

Promotion creates/updates:

- `places`
- `place_source_ids`
- `place_source_state`

The new canonical place remains `unverified` and unpublished until Nashroam editorial/operational verification is complete.

Candidates can also be ignored with:

```sql
select public.ignore_fsq_os_candidate('fsq_place_id');
```

## Delta strategy

Foursquare publishes a Delta dataset with actions:

- `add`
- `update`
- `remove`
- `merge`

Future monthly maintenance should use those deltas rather than reprocessing the entire world dataset.

Recommended behavior:

- `add` / `update` → refresh the matching staging candidate and any linked source state;
- `remove` → flag linked canonical place for verification rather than silently deleting it;
- `merge` → move the source identity to the surviving `redirect` FSQ Place ID and open a duplicate/identity review if needed.

Never let an external delta silently erase Nashroam editorial history.

## What Foursquare does not decide

Foursquare OS answers questions such as:

- does this POI exist?
- where is it?
- what kind of place is it?
- when was Foursquare's record refreshed/closed?

It does **not** decide:

- whether Nashroam recommends it;
- Nashroam score;
- traveler fit;
- planner priority;
- neighborhood itinerary context;
- whether it should be published.

Those remain first-party Nashroam decisions.
