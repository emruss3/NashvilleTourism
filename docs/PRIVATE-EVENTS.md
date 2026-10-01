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
| `/private-events/` | Hub for corporate, holiday, convention and group planners: compact hero, the event finder (four inputs, recommendation, matched spaces), listed venues as featured blocks with a capacity table, three steps and FAQ with the disclosures, brief entry | indexable; `noindex` when any of `event`, `size`, `area`, `pri`, `v` is in the URL |
| `/private-events/venues/[slug]/` | Venue page: spaces with both capacities and a "from" price, rights-cleared photos, owned-venue disclosure verbatim, sponsored label, EventVenue JSON-LD | indexable when published and free of placeholders; unpublished venues 404 in production and render in preview with every `TODO` marked |
| `/private-events/occasions/[slug]/` | Venues ordered by fit for the occasion (`EVENT_OCCASIONS[].needs`) | canonical points at the hub until a person writes `intro` in `src/lib/private-events.ts`; then it stands alone |
| `/private-events/neighborhoods/[slug]/`, `/private-events/size/[band]/` | Filtered views | canonical points at the hub |
| `/private-events/brief/` | The brief, in two steps. Edit: event type, exact guest count, date or month plus flexibility, time of day, total budget (bands plus "Need guidance"), area, up to three priorities; name, work email, company or group; optional phone, convention or hotel, backup dates, requirements; the shortlist. Review: the complete brief with Edit per group, then send. State arrives in the URL: the finder's `event`, `size`, `area`, `pri`; the older `occasion`, `guests`, `date`, `flexible`; `v=` from the shortlist bar; `venue=` from a venue page. Fields the row has no column for (format, priorities, flexibility wording, convention/hotel, backup dates, requirements) go into `details`, labeled | `noindex` |
| `/private-events/brief/details/[token]/` | Planner "add detail" page from the signed link in the confirmation email (60-day HMAC token in its own signing domain); posts to `/api/private-events/details/`, updates the inquiry, emails the desk | `noindex` |
| `/private-events/status/[reference]/` | Planner countdown: every venue on the brief as waiting, overdue, replied, proposal, unavailable or booked, with "replies by" in Nashville time from `event_leads.sla_deadline_at`. Looked up by reference only; shows venue names and statuses, never the planner's contact details. Linked from the confirmation and the receipt | `noindex` |
| `/private-events/reply/[token]/` | Venue reply page | `noindex` |
| `/venues/` | Venue dashboard (listing editor) behind Supabase magic-link auth | `noindex` |
| `/admin/events/` | Desk view: members, publish blockers, first-publish approval | admin session |

**Hub order (redesign, 2026-10).** Hero ("Bring your people. Make it Nashville." with the audience line, "Find my event fit" to `#plan`, "Browse event spaces" to `#spaces`, the no-planning-fee line, a BPH-owned JBJ's rooftop photograph), then the event finder, then the listed venues, then three steps and the FAQ with the compact disclosure, then the brief entry band. Phones get a sticky "Plan my event" bar (`StickyPlanCta`) that hides while the finder or the brief band is on screen, while a field has focus, while the menu is open, and whenever the shortlist bar is showing. The header on `/private-events*` is the compact single row from the start with "Plan an event" as the boxed action; other pages keep the two-row masthead.

**Event finder (`src/lib/events/finder.ts`, `EventFinder`).** Inputs: event type (promoted: corporate, holiday party, convention reception, team off-site, private celebration; the other occasions behind an optgroup), group size (the browse bands), preferred area (neighborhood or "Open to the best fit"), up to three priorities (great food and drinks, live music, room to talk, skyline or rooftop, presentations and AV, easy group logistics). No contact details. "See my recommendation" returns a format (seated, standing or mixed, from the type, priorities and size), a suggested area (the planner's, or the best-scoring neighborhood from the content rows, with the reasons), why it fits, what to plan for (weather backup, sound and curfew, AV, transport, convention timing, buyouts, seated versus standing capacity), and up to three verified spaces from the published rows that fit the size band on the capacity the layout needs, ordered by fit (unmet priority ×0.75, outside the chosen area ×0.7, tightest capacity wins ties). Ownership, fee and sponsorship are not inputs; `tests/events-finder.test.ts` flips ownership and asserts the order holds. Selections mirror into the URL (`event`, `size`, `area`, `pri`) and "Build my inquiry" carries them to the brief; the brief's back link returns them. `team off-site` stores as `occasion = corporate` with "Format: Team off-site" in the notes.

**Listed venues (`FeaturedVenue`).** One featured block per published venue without placeholders: photograph (venue-uploaded `event_media` photo first, else the registry key in `VENUE_IMAGE`), kind and area, name, verified and sponsored chips, the owned-venue disclosure verbatim, summary, seated and standing maxima, space count, the price-band span, features, "View all spaces", shortlist, and a capacity table of its spaces (name, seated, standing, minimum group, price band, features; six rows, then a link to the venue page). Spaces get their own photo cards only once the venue has supplied per-space photography; until then the table carries the numbers. Preview builds list the still-onboarding venues by name in a banner above and never show their placeholder rows as listings.

**Empty state.** While no venue is published the venues section carries a short note and "Build my inquiry"; the finder still runs (it recommends a format and area and offers the desk's hand shortlist). Every brief lands in the desk inbox and is routed by hand until venues publish.

The shortlist is `?v=slug,slug` (max five), carried across every link on these pages and into the brief; nothing is stored in the browser. Analytics events: `events_finder_recommended` (occasion, guests_band, neighborhood, priorities), `events_brief_started`, `events_brief_sent` (venue_count, occasion, guests_band, client_reference, utm; not fired on a preview receipt), `events_venue_viewed` (placement `sponsored` or `editorial`), `events_shortlist_added`, `events_package_clicked` (Phase 3).

**Reply promise.** Copy says "within 24 business hours, Monday to Friday, 9am to 6pm Nashville time" (`REPLY_PROMISE`, `REPLY_PROMISE_SHORT` in `src/lib/private-events.ts`), which is exactly what `sla_hours = 24` and `src/lib/events/sla.ts` measure and the hourly watchdog enforces. Change the constants if a venue is onboarded with a different `sla_hours`.

Preview builds (`VERCEL_ENV !== 'production'`) read unpublished venues so the seed fixture can be checked; every `TODO` renders as a marked placeholder with a preview banner above it. Production reads published venues only, through the `event_venues_public` view.

## Inquiry delivery gate (private preview)

`inquiryDeliveryEnabled()` (`src/lib/events/delivery.ts`) is true only when `VERCEL_ENV = production` and `EVENTS_INQUIRY_DELIVERY` is not `off`. Everywhere else, including every Vercel preview and local build:

- `POST /api/private-events/` validates the body and answers `{ ok: true, preview: true, delivered: false, reference: null, venues: [] }` before touching Supabase: no `event_inquiries` or `event_leads` row, no Tripleseat or Perfect Venue push, no Resend email to a venue, the desk, group hotels or the planner.
- The hub and the brief show a dashed "Private preview" banner, the review step repeats it, and the receipt reads "Reviewed, not sent" with the full brief under it. `events_brief_sent` is not fired.

To activate live delivery once the redesign is approved: merge to `main` (production is the only environment where the gate opens), confirm `EVENTS_INQUIRY_DELIVERY` is unset or anything but `off` in Vercel production env, and run the post-deploy checks below with a synthetic planner (name "Preview Test", a mailbox the desk controls) and `EVENTS_DESK_EMAIL` pointing at that mailbox; then delete the test rows by reference. To pause delivery in production without a deploy, set `EVENTS_INQUIRY_DELIVERY=off` and redeploy.

Local builds without a service role can set `EVENTS_FIXTURE_FILE=tests/fixtures/events-venues.json` (synthetic ids, shaped like the rows) so the hub, finder and venue page render for browser checks; the loader is ignored in production and whenever Supabase is configured.

## Environment

| Where | Variable | Notes |
| --- | --- | --- |
| Vercel (server) | `RESEND_API_KEY` | From the Resend account in Newco's name. Unset = sends are logged as skipped; intake still works |
| Vercel (server) | `EVENTS_FROM_EMAIL` | `Nashville.com events desk <events@mail.nashroam.com>`; must be on a verified Resend domain |
| Vercel (server) | `EVENTS_DESK_EMAIL` | The events desk inbox |
| Vercel (server) | `GROUP_HOTELS_EMAIL` | The group hotels inbox |
| Vercel (server) | `EVENTS_MAGIC_LINK_SECRET` | 32+ random characters. Rotating it invalidates open reply links |
| Vercel (server) | `EVENTS_INQUIRY_DELIVERY` | Unset by default. `off` pauses delivery in production (the intake answers with a preview receipt and stores nothing). Previews are always off; see "Inquiry delivery gate" |
| Local only | `EVENTS_FIXTURE_FILE` | Path to a synthetic venue fixture for builds without a service role; ignored in production |
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
3. Insert `event_spaces` per bookable space: both capacities, `pricing_model` and at least one price field in cents, pricing note, chips (AV, outdoor, accessible, private entrance), hours and blackout notes. Public pages never show the stored minimum: a space renders its price band ($ under $2,500; $$ $2,500 to $5,000; $$$ $5,000 to $10,000; $$$$ $10,000 to $25,000; $$$$$ $25,000 and up, from the minimum spend, room fee or buyout figure) and, when `per_person_cents` is set, a per-person figure or range (`per_person_max_cents` is the optional top). "From $X" is for packages only. The exact minimum stays on the row for ranking, budget filtering and fee estimates; the brief's budget question uses the same bands.
4. Insert `event_media` with `rights_cleared = true` only for photos the venue has cleared in writing; credit each.
5. Set `published = true` on the spaces, then on the venue. The publish triggers refuse any row that still contains `TODO`, a missing capacity or price, or a venue without a sales contact email.

The seed migration `20260928120100_private_events_seed_owned_venues_v1.sql` loads JBJ's, Hank's and Playdate this way with `TODO` placeholders, unpublished. Replace the placeholders with real content by `update` statements, then publish.

Migrations applied with the Supabase connector: 2026-09-28 `…120000` (schema, triggers, RLS), `…120100` (seed), `…120200` (cron job), `…120300` (pinned `search_path` on the trigger functions), `…120400` (public view), `…120500` (price bands), `…120600` (dashboard); 2026-10-01 `20261001120000` (layout capacities, terms, verification, media kinds, availability).

### Who can read what

| Reader | Venues | Spaces, media, key dates | Inquiries, leads |
| --- | --- | --- | --- |
| anon / authenticated | `event_venues_public` view only: published rows, public columns (no contacts, lead system, referral terms or fee terms). No grant on `event_venues` and no policy, so a mistaken grant would still read nothing | published rows only (RLS) | nothing |
| service role (server) | base table; pages read the view, preview builds read unpublished rows, routing reads contacts (`listVenues({ withContacts: true })`) | all | all |

## Venue dashboard (/venues/)

Venues edit their own listing at `/venues/`: venue fields, spaces (exact minimum in, public band preview), features, hours, virtual tour link, packages, and photos with a required rights box and credit. Sign-in is a Supabase magic link; no password. Everything the dashboard does runs in the browser against Supabase as the signed-in user, and row level security (`is_venue_member()`, `event_venue_users`) limits every read and write to venues that user's email is attached to. The service role is never in the browser.

Setup once in Supabase Auth (human step): enable the Email provider with magic links (OTP), set Site URL to `https://nashroam.com` (later `https://nashville.com`), and add `https://nashroam.com/venues/` and the Vercel preview pattern `https://*-bobs-projects-d150ad75.vercel.app/venues/` to Redirect URLs. Sending from Supabase's default mailer is fine for a handful of venues; switch the Auth SMTP to Resend when the volume grows.

Giving a venue access: `/admin/events/` → the venue card → "Add by email" (or insert into `event_venue_users`). The seed migration attached `TODO-events@example.com` as owner of the three BPH venues; replace it with the real events inbox. A user who signs in with an email that is on no venue sees a "not attached" message.

First publish: the venue completes its details and at least one space, then presses "Request approval". The desk sees the request on `/admin/events/`, checks the listing and the signed referral terms, and approves (optionally publishing in the same step; the publish triggers still run and any refusal is shown). After approval the venue publishes and unpublishes itself; spaces and packages publish from their own forms. The plain-language rules in `src/lib/events/publish-check.ts` mirror the triggers, and the triggers stay the guard.

Photos land in the `venue-media` storage bucket at `{venue_id}/{uuid}.{ext}` (public read; members write inside their own folder). A row cannot be inserted without `rights_cleared` and a credit.

Packages (`event_packages`) are the one place "From $X" shows. The button goes to the venue's own `book_url` with `?ref=nashville&client_reference=nsh:package:{venue}:{package}`; the click is `events_package_clicked`. No payment or deposit here.

Next PR: the leads inbox (open leads, SLA countdown, one-click reply, outcome and booked value) in the same dashboard.

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

## Phase 2 PR 1: editor, bands, availability, terms, tour, floor plans, approval

Spec: `docs/private-events-phase2-best-in-class-brief.md` (supersedes the Phase 2 items in the Phase 1 brief). Migration `20261001120000_private_events_phase2a_v1.sql`, applied 2026-10-01.

**What a venue page shows now.** Verified badge (only when the desk set `verified_at`), a Matterport walk-through embedded in place when `tour_url` is a `my.matterport.com/show` link (any other tour URL is a plain link), then one tabbed block: Spaces (each card with both capacities, layout capacities for cocktail / banquet / theater / classroom / boardroom, the price band, the per-person range, and three months of stated availability), Floor plans (`event_media.kind = floor_plan`, one per floor with its label), Terms (deposit, cancellation, notice, service charge, outside catering, curfew, insurance, parking, transit, as the venue wrote them).

**Availability.** `event_availability` holds one status per (space, month) with an optional (space, day) override: Open, Limited, Booked. No row means Ask; silence never greys a venue out. The brief page greys a shortlisted venue out, and leaves it out of the send, only when the venue said every listed space is booked for the chosen date or month. Pure helpers in `src/lib/events/availability.ts`, tested.

**Onboarding a venue manager, step by step (no SQL).**

1. Desk: `/admin/events/` → the venue → "Who can edit" → add the manager's work email. (Playdate and Hank's already carry the placeholder owner; replace it.)
2. Manager: `/venues/` → "Email me a sign-in link" with that address → open the link.
3. Venue and terms tab: name, kind, neighborhood, address, summary, description, website, virtual tour link, hours, features, the nine terms fields, sales contact and lead system. Save.
4. Spaces tab: one entry per bookable space. Seated and standing capacities are required; layout capacities optional; exact minimum in dollars (private) with the public band previewed underneath; notes. "Save and publish" per space once its problems list is empty. Problems read as sentences ("Rooftop patio needs a standing capacity").
5. Availability tab: tap months to set Open / Limited / Booked per space; add single dates for exceptions.
6. Photos and plans tab: photos (rights box and credit required), floor plans (one per floor, with a floor label, PNG or PDF), the event menu as a PDF, Vimeo or YouTube links.
7. Packages tab, optional: fixed offers with a price and the venue's own booking link.
8. Publish tab: "Request approval". The desk approves on `/admin/events/` (and can mark the venue verified after a visit or call). After the first approval the venue publishes and unpublishes itself.

**Media bucket.** `venue-media`, public read, members write under `{venue_id}/`; JPEG, PNG, WebP and PDF up to 10 MB. Object URLs are on the Supabase host, so they survive the domain cutover (`docs/CUTOVER.md`).

**No new environment variables.** The Matterport embed is an iframe; availability is plain markup.

## Backlog

Phase 2: multi-venue brief page with the shortlist bar, occasion / neighborhood / size browse pages with human-written intros, venue dashboard (`/venues/`, Supabase auth, `event_venue_users`), admin views and fees-due report, response-time badge, first 40 venues.

Phase 3: instant-book packages, big-date availability, sponsored placement, hotel-block handoff through the LiteAPI path.
