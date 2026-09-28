# Private events marketplace: runbook

Phase 1 (routing and owned venues). Spec: `docs/private-events-marketplace-build-brief.md`. Background: `docs/private-events-business-plan.md`. Last updated 2026-09-28.

## What happens when a planner sends a brief

```
form (quick brief or /private-events/)  ->  POST /api/private-events/
  1. validate, honeypot, per-instance rate limit
  2. choose venues: the planner's shortlist (?v= slugs) or up to five suggested
     by src/lib/events/venue-rank.ts; published venues only
  3. insert event_inquiries (reference NSH-XXXXXX), then one event_leads row per
     venue with sla_deadline_at = now + sla_hours Nashville business hours
     (Mon-Fri 09:00-18:00)
  4. route each lead: Tripleseat / Perfect Venue push when lead_system_endpoint
     is set, then always the email to sales_contact_email with the brief and the
     signed "log your reply" link; result appended to event_leads.notify_log
  5. email the desk (EVENTS_DESK_EMAIL), the group-hotels inbox when rooms are
     needed (GROUP_HOTELS_EMAIL), and the planner's confirmation; results go in
     event_inquiries.utm.notify_log
  6. answer { ok, reference, venues, warnings }. Email failures are warnings,
     never a failed intake.
```

Hourly, `pg_cron` posts to `/api/private-events/sla/` (job `nashroam-events-sla`): leads past their deadline with no reply get `sla_met = false`, a reminder to the venue and an alert to the desk; 24 business hours later the planner gets an apology with two alternatives from venue-rank, and the desk is told whether both alternatives were house venues (`alternatives_all_house` in `notify_log`).

Venue reply: the link in the lead email opens `/private-events/reply/{token}/`, a plain form that writes `first_reply_at`, `venue_notes` and a status. Tokens are HMAC-signed with `EVENTS_MAGIC_LINK_SECRET` and expire after 30 days.

## Pages

| Path | What | Indexing |
| --- | --- | --- |
| `/private-events/` | Hub: quick brief, browse by occasion / neighborhood / size, venues in editorial order, how it works, big dates, disclosure, the brief | indexable; `noindex` when any of `occasion`, `type`, `guests`, `date`, `v` is in the URL |
| `/private-events/venues/[slug]/` | Venue page: spaces with both capacities and a "from" price, rights-cleared photos, owned-venue disclosure verbatim, sponsored label, EventVenue JSON-LD | indexable when published and free of placeholders; unpublished venues 404 in production and render in preview with every `TODO` marked |
| `/private-events/occasions/[slug]/` | Venues ordered by fit for the occasion (`EVENT_OCCASIONS[].needs`) | canonical points at the hub until a person writes `intro` in `src/lib/private-events.ts`; then it stands alone |
| `/private-events/neighborhoods/[slug]/`, `/private-events/size/[band]/` | Filtered views | canonical points at the hub |
| `/private-events/reply/[token]/` | Venue reply page | `noindex` |

The shortlist is `?v=slug,slug` (max five), carried across every link on these pages and into the brief; nothing is stored in the browser. Analytics events: `events_brief_started`, `events_brief_sent` (venue_count, occasion, guests_band, client_reference, utm), `events_venue_viewed` (placement `sponsored` or `editorial`), `events_shortlist_added`, `events_package_clicked` (Phase 3).

Preview builds (`VERCEL_ENV !== 'production'`) read unpublished venues so the seed fixture can be checked; every `TODO` renders as a marked placeholder with a preview banner above it. Production reads published venues only, through the `event_venues_public` view.

## Environment

| Where | Variable | Notes |
| --- | --- | --- |
| Vercel (server) | `RESEND_API_KEY` | From the Resend account in Newco's name. Unset = sends are logged as skipped; intake still works |
| Vercel (server) | `EVENTS_FROM_EMAIL` | `Nashville.com events desk <events@mail.nashroam.com>`; must be on a verified Resend domain |
| Vercel (server) | `EVENTS_DESK_EMAIL` | The events desk inbox |
| Vercel (server) | `GROUP_HOTELS_EMAIL` | The group hotels inbox |
| Vercel (server) | `EVENTS_MAGIC_LINK_SECRET` | 32+ random characters. Rotating it invalidates open reply links |
| Vercel (server) | `NASHROAM_CRON_TOKEN` | Same value as the Vault secret `nashroam_cron_token`. This token now unlocks `/api/private-events/sla/` as well as the Supabase functions; server-only, never in a client bundle, rotate everywhere at once if it leaks |
| Vercel (server) | `SUPABASE_SERVICE_ROLE_KEY` | Existing |

No new npm dependency: Resend is called over its REST API with `fetch` (`src/lib/events/notify.ts`).

## Resend DNS (human step)

In Resend, add the domain `mail.nashroam.com` (later `mail.nashville.com`) and create the records it shows. They are always of this shape; copy the exact values from the Resend domain page:

| Type | Name | Value |
| --- | --- | --- |
| TXT | `resend._domainkey.mail` | the DKIM public key Resend shows |
| MX | `send.mail` | `feedback-smtp.us-east-1.amazonses.com` priority 10 (region per the page) |
| TXT | `send.mail` | `v=spf1 include:amazonses.com ~all` |
| TXT | `_dmarc.mail` | `v=DMARC1; p=none;` to start |

Verify in Resend, then set `EVENTS_FROM_EMAIL` to an address on that domain. Replies from venues go to the planner (`reply-to`), not to this address.

## Loading a venue

1. Insert a `public.places` row (unpublished, `curation_status = pending`) if the venue is not already a place; editorial for /music and /restaurants goes through `place_editorial` like every other place.
2. Insert `event_venues` with `published = false`: name, kind, content neighborhood slug, address, coordinates, a human-written summary and description, website, `owned_by_bph`, sales contact, `lead_system` and endpoint, `referral_terms_signed_at`, `fee_pct` (5.0 unless the agreement says otherwise), `sla_hours` (24).
3. Insert `event_spaces` per bookable space: both capacities, `pricing_model` and at least one price field in cents, pricing note, chips (AV, outdoor, accessible, private entrance), hours and blackout notes.
4. Insert `event_media` with `rights_cleared = true` only for photos the venue has cleared in writing; credit each.
5. Set `published = true` on the spaces, then on the venue. The publish triggers refuse any row that still contains `TODO`, a missing capacity or price, or a venue without a sales contact email.

The seed migration `20260928120100_private_events_seed_owned_venues_v1.sql` loads JBJ's, Hank's and Playdate this way with `TODO` placeholders, unpublished. Replace the placeholders with real content by `update` statements, then publish.

Migrations applied 2026-09-28 with the Supabase connector: `…120000` (schema, triggers, RLS), `…120100` (seed), `…120200` (cron job), `…120300` (pinned `search_path` on the trigger functions), `…120400` (public view).

### Who can read what

| Reader | Venues | Spaces, media, key dates | Inquiries, leads |
| --- | --- | --- | --- |
| anon / authenticated | `event_venues_public` view only: published rows, public columns (no contacts, lead system, referral terms or fee terms). No grant on `event_venues` and no policy, so a mistaken grant would still read nothing | published rows only (RLS) | nothing |
| service role (server) | base table; pages read the view, preview builds read unpublished rows, routing reads contacts (`listVenues({ withContacts: true })`) | all | all |

## Referral one-pager checklist (signed before publishing)

- 5% of contracted venue spend (rental plus F&B minimum), $250 minimum, on every booked event that originated on Nashville.com; same terms for BPH-owned venues.
- Reply to every lead within 24 business hours; a second miss sends the planner alternatives.
- Permission to publish capacities, pricing fields and photos (rights cleared, credited).
- Self-report bookings from Nashville.com leads; quarterly reconciliation against the inquiry list.
- Sales contact and lead system named; `referral_terms_signed_at` recorded.

## Checks after deploy

```sql
-- one lead per venue for the last inquiry, with what was sent
select i.reference, v.slug, l.status, l.sla_deadline_at, l.first_reply_at, l.sla_met, l.notify_log
from event_inquiries i join event_leads l on l.inquiry_id = i.id join event_venues v on v.id = l.venue_id
order by i.created_at desc limit 10;

-- publish check: this must fail
update event_spaces set published = true where seated_capacity = 0;

-- watchdog ran this hour
select * from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'nashroam-events-sla') order by start_time desc limit 3;
```

## Backlog

Phase 2: multi-venue brief page with the shortlist bar, occasion / neighborhood / size browse pages with human-written intros, venue dashboard (`/venues/`, Supabase auth, `event_venue_users`), admin views and fees-due report, response-time badge, first 40 venues.

Phase 3: instant-book packages, big-date availability, sponsored placement, hotel-block handoff through the LiteAPI path.
