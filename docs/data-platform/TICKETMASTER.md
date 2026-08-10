# Ticketmaster → Nashroam Canonical Events

## Status

The Supabase ingestion boundary is deployed but intentionally inactive until a Ticketmaster key is configured in **Supabase Edge Function secrets**.

- Edge Function: `ticketmaster-sync`
- Supabase source key: `ticketmaster`
- Secret name: `TICKETMASTER_API_KEY`
- Prepared cadence: every 3 hours (disabled until first verified sync)
- Public calendar migration path: Supabase canonical events first → legacy direct adapter second → clearly labelled seed fallback last

The existing website adapter in `src/lib/feeds/ticketmaster.ts` remains a transitional fallback only. Once the Supabase feed is verified and scheduled, remove the website-side `TICKETMASTER_API_KEY`.

## Why Supabase owns the event feed

Ticketmaster provides event facts and ticket URLs. Nashroam owns:

- canonical event identity;
- event-to-neighborhood/place relationships;
- event impact level;
- planner priority;
- traveler relevance;
- Nashville-specific logistical context.

Ticket price or commercial economics must not silently determine event importance.

## Nashville guardrail

`ticketmaster-sync` does not trust the upstream city query alone. It requests:

- city = Nashville
- stateCode = TN
- countryCode = US

and independently rejects any returned record whose **embedded venue** does not resolve to Nashville, Tennessee.

This prevents broader-market/DMA leakage into the Nashville city calendar.

## Edge Function modes

### `health`
Makes a minimal Nashville event request and verifies that the Supabase secret is accepted.

### `search_events`
Returns normalized Nashville events without mutating the canonical database. Useful for verification/debugging.

### `sync_events`
Fetches one or more pages and upserts:

- `events`
- `event_source_links`
- `ingestion_runs`

The provider is marked active only after a successful sync.

## Canonical event model

Ticketmaster events are currently keyed as:

```text
canonical_key = ticketmaster:<event-id>
```

This guarantees stable repeat ingestion. Cross-provider reconciliation (Ticketmaster ↔ SeatGeek ↔ official venue calendar) should later merge equivalent provider records into one canonical event rather than exposing duplicates.

Provider IDs/URLs live in `event_source_links`; provider metadata stays there rather than being flattened into Nashroam editorial fields.

## Time handling

Ticketmaster may provide a local date before a specific start time is announced.

Nashroam has an explicit:

```text
events.time_tbd
```

When the start time is unknown:

- `time_tbd = true`
- the date still sorts correctly
- the UI must not display the placeholder storage time as an announced start time

When a local time exists, `ticketmaster-sync` converts the Nashville wall clock to UTC using `America/Chicago`, including DST handling.

## Provider-state freshness

`event_source_links` stores:

- `fetched_at`
- `expires_at`
- `display_allowed`
- source URL
- provider metadata

Initial provider-state TTL is six hours. The prepared production cadence is every three hours, so normal source state can stay fresh without hitting Ticketmaster per page view.

The public calendar ignores expired provider links.

## Metadata retained from Ticketmaster

Provider metadata can include:

- local date/time
- time-TBD indicator
- Ticketmaster sale/status code
- segment / genre / subgenre
- image URL/fallback/attribution
- starting advertised price + currency where present
- Ticketmaster venue ID
- embedded city/state/country

This metadata is evidence and display context. It does not become a Nashroam score.

## Event status mapping

Ticketmaster status is normalized into Nashroam's canonical states:

- cancellation → `cancelled`
- postponement/reschedule → `postponed`
- normal announced statuses → `scheduled`
- missing/unknown status → `unverified`

The public canonical calendar currently serves `scheduled` and `postponed` records with fresh provider state.

## Public website cutover

`src/lib/feeds/calendar.ts` now uses:

1. fresh published Supabase events with a Ticketmaster source link;
2. the legacy direct Ticketmaster adapter if Supabase has no live records yet;
3. labelled seed records only if no live source is available.

That means adding the Supabase key and running a successful sync can migrate the public calendar without a separate UI rewrite.

## Activation checklist

1. Add `TICKETMASTER_API_KEY` to the Nashroam Supabase Edge Function secrets.
2. Invoke `ticketmaster-sync` with `{ "mode": "health" }` using service-role authorization.
3. Run `search_events` and verify Nashville venue filtering.
4. Run a small `sync_events` (for example one page).
5. Verify `events` and `event_source_links` counts/timestamps.
6. Verify `/live-music-tonight` reads canonical events correctly, including time-TBD records.
7. Only then enable the `ticketmaster_nashville_events` ingestion schedule and schedule the protected recurring invocation.
8. Remove the website/Vercel `TICKETMASTER_API_KEY` after the canonical feed is stable.
