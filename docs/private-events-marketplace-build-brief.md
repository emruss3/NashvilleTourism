# BUILD BRIEF — Private events referral marketplace (Nashroam → nashville.com)

Supersedes the current `/private-events/` page and everything in `src/lib/private-events.ts`. Read the listed files, propose a plan and file list, then build in the phases below. Ask before adding any dependency.

Last verified: 2026-09-28.

## 0. What we are building and why

A Nashville-only referral marketplace for private events. Planners browse real venue data, send one brief to up to five venues, and venues reply inside an SLA. Nashville.com earns a 5% success fee on booked events and never touches payments, contracts, or event operations. The venue's own sales team does the selling; the venue's own booking system takes any deposit.

The category's national players fail on thin data ("capacity on request", week-old RFPs). We win by being deeper, faster and more honest in one city: real capacities and minimums on every listing, a 24-business-hour response guarantee, verified availability on the big dates, and instant-book packages for small groups.

Business rules that govern every screen:

- Every listed space shows seated and standing capacity, a minimum spend or room fee, and a buyout threshold. A space missing any of these is not published.
- 5% success fee on contracted venue spend (rental + F&B minimum), $250 minimum fee, on every booked event that originated on the site. Instant-book packages: same 5% on the package price. Same terms for every venue, including BPH-owned ones.
- Three venues are owned by BPH Hospitality, Nashville.com's parent: JBJ's Nashville (405 Broadway), Hank Williams Jr.'s Boogie Bar (Lower Broadway), Playdate (2405 12th Ave S). They are listed on identical terms, labeled "Owned by BPH Hospitality, Nashville.com's parent company", and never ranked above unowned venues because of ownership.
- Sponsored placement, when sold, is labeled. Ranking is never a function of fees paid or ownership.
- No fake social proof. No reviews until real events have happened; no "planners love us" copy.

## 1. Verified facts about the repo (read first)

- `src/app/private-events/page.tsx` — current single page: quick brief (GET) → full form → `POST /api/private-events/` → `event_inquiries`. Featured space is a shortlist hotel chosen by regex. Space tiles link to hub pages, not venues.
- `src/app/api/private-events/route.ts` — validates and inserts into `event_inquiries` with the service role. Sends no email; the code comment says the events desk reads the table. The table holds 0 rows as of 2026-09-28. This is the first thing to fix.
- `src/components/private-events/InquiryForm.tsx` — client form; 503 falls back to mailto.
- `src/lib/private-events.ts` — `EVENT_TYPES`, `BUDGET_RANGES`, `OCCASIONS`, `SERVICES`, `STEPS`, `SPACE_TILES`. Keep the type/budget enums (the table's check constraints depend on them); replace the rest.
- `supabase/migrations/…_add_event_inquiries_v1.sql` — existing table. Extend, don't recreate.
- `src/lib/seo.ts` — `buildMetadata`, `serviceSchema`. The service schema currently says planners "confirm directly with the venue"; that stays true and is the disclosure.
- Places: `public.places` / `public.place_editorial` hold the site's venue-like records. JBJ's, Hank's and Playdate are not in `places`. Check `src/lib/content/listings.ts` for them too; if absent, add them as places (they belong on /music and /restaurants regardless of this project).
- Brand: `.cursor/rules/nsvl-brand.mdc` (Manrope + Inter, black/cream, no accent color, 2px card radius).
- Runtime: Next.js on Vercel with server runtime (`next.config.mjs`); Supabase project `aeomrsutkhwmnscvvfur`; service role available server-side; edge functions follow the `viator-live` / `liteapi-live` pattern with `ingestion_runs` logging.
- Email: no provider connected. Use Resend (one dependency, ask first). Sending domain: `mail.nashroam.com` now, `mail.nashville.com` after cutover; DNS records go to the human runbook.
- Hotels: `src/lib/hotel-booking.ts` / `stay-links.ts` exist. Group hotel-block requests are routed as leads (see §5), not booked here.

## 2. Data model (Supabase migrations, committed to repo)

All tables: RLS on. Anon may read only `published = true` rows on listing tables; everything else service-role or the venue's own auth (Phase 2).

`event_venues` — `id`, `slug` (unique), `name`, `kind` (enum: `bar`, `restaurant`, `music_venue`, `rooftop`, `hotel`, `event_space`, `other`), `neighborhood_slug` (fk to neighborhoods content slugs), `address`, `lat`, `lng`, `summary` (≤300 chars, editorial), `description` (editorial), `website`, `owned_by_bph` bool, `place_id` (fk `places`, nullable), `sales_contact_name`, `sales_contact_email`, `sales_contact_phone`, `lead_system` (enum: `email`, `tripleseat`, `perfect_venue`, `other`), `lead_system_endpoint` (text, nullable — e.g. Tripleseat lead-form URL or API key ref), `referral_terms_signed_at`, `fee_pct` numeric default 5.0, `sla_hours` int default 24, `published` bool, `featured_until` date nullable (sponsored), `created_at`, `updated_at`.

`event_spaces` (one venue → many spaces; the bookable unit) — `id`, `venue_id`, `slug`, `name`, `summary`, `seated_capacity` int, `standing_capacity` int, `min_guests` int nullable, `pricing_model` (enum: `room_fee`, `min_spend`, `per_person`, `buyout`), `min_spend_cents` bigint nullable, `room_fee_cents` bigint nullable, `per_person_cents` int nullable, `buyout_from_cents` bigint nullable, `fb_minimum_cents` bigint nullable, `pricing_note` (short editorial), `av_included` bool, `av_note`, `outdoor` bool, `accessible` bool, `private_entrance` bool, `hours_note`, `blackout_note`, `sort_order`, `published` bool. Publish check: both capacities > 0 and at least one of the price fields set, else `published` cannot be true (enforce with a check constraint or trigger).

`event_packages` (instant-book, Phase 3) — `id`, `venue_id`, `space_id`, `slug`, `name`, `for_occasions` text[] (values from `EVENT_TYPES` + `bachelorette`, `rehearsal_dinner`, `welcome_party`), `min_guests`, `max_guests`, `price_cents` (total or per person; `price_basis` enum), `includes` text[], `deposit_note`, `book_url` (venue's own system), `published`.

`event_media` — `id`, `venue_id`, `space_id` nullable, `url`, `alt`, `credit`, `rights_cleared` bool, `sort_order`. Only `rights_cleared = true` renders.

`event_availability` (big dates, Phase 3) — `id`, `venue_id`, `space_id` nullable, `date`, `status` (enum `open`, `limited`, `booked`), `note`, `updated_by`, `updated_at`. Seeded from `event_key_dates` (below).

`event_key_dates` (content) — `date`, `label` (e.g. "CMA Fest", "Titans vs. Seahawks", "NYE"), `kind`, `source`. Maintained as content, not scraped.

`event_inquiries` — extend existing table: add `occasion` (wider enum than `event_type`; keep `event_type` for back-compat), `neighborhood_pref` text[], `budget_range` (exists), `guests` (exists), `need_hotel_rooms` (exists), `shortlist_venue_ids` uuid[], `status` (enum `new`, `routed`, `replied`, `proposal`, `booked`, `lost`, `spam`), `booked_value_cents`, `booked_venue_id`, `fee_due_cents` (computed = max(booked_value × fee_pct, 25000)), `planner_org`, `planner_phone`, `utm` jsonb, `client_reference`.

`event_leads` (one row per venue per inquiry — the marketplace's core object) — `id`, `inquiry_id`, `venue_id`, `space_id` nullable, `status` (same enum as inquiry, per venue), `routed_at`, `first_reply_at`, `sla_deadline_at` (routed_at + venue.sla_hours business hours, America/Chicago), `sla_met` bool nullable, `proposal_at`, `outcome_at`, `outcome_value_cents`, `venue_notes`, `lost_reason`, `notify_log` jsonb (each email/push attempt with timestamp and result).

`event_venue_users` (Phase 2) — `user_id` (auth), `venue_id`, `role` (`owner`, `sales`). RLS: users see only their venue's leads and listing.

Indexes: `event_spaces(venue_id, published)`, `event_leads(venue_id, status)`, `event_leads(sla_deadline_at) where first_reply_at is null`, `event_inquiries(created_at)`.

## 3. Public pages

All indexable unless noted. All copy in NSVL voice, no stock phrases. Prices display as "from $X" derived from the pricing fields, never typed in copy.

- `/private-events/` — hub. Keep the quick brief. Sections: Browse by occasion (corporate, convention reception, holiday party, celebration, bachelorette, rehearsal dinner/welcome party), Browse by neighborhood, Browse by size (≤25, 25–75, 75–200, 200+), Featured venues (owned venues plus partners, in editorial order, ownership label on the three), How it works (brief → up to five venues → they reply within 24 business hours → you confirm with the venue; we're paid by the venue only if you book), Big dates (upcoming key dates with a "check availability" link).
- `/private-events/venues/[slug]/` — venue page. Hero gallery, summary, address + map, spaces as cards (name, capacities, "from" price, pricing note, AV/outdoor/accessible chips), packages (Phase 3), big-date availability strip (Phase 3), response-time badge (Phase 2: "Replies within N hours on average"), ownership label if `owned_by_bph`, sponsored label if featured, "Add to shortlist" and "Send a brief" CTAs. JSON-LD: `EventVenue` with `maximumAttendeeCapacity` = max standing capacity.
- `/private-events/occasions/[occasion]/`, `/private-events/neighborhoods/[slug]/`, `/private-events/size/[band]/` — browse pages listing venues that match, with a 2–3 paragraph editorial intro each (content file, human-written). These are the SEO surface.
- `/private-events/brief/` — the RFP flow (§4). `noindex`.
- `/private-events/packages/[slug]/` (Phase 3) — instant-book package page; CTA is the venue's `book_url` with `?ref=nashville` and our `clientReference`; disclosure that the deposit is taken by the venue.

Shortlist: client state (URL param `v=slug,slug,…` so it survives refresh and sharing; no localStorage), max five, shown as a persistent bar on browse and venue pages.

Owned-venue disclosure text (use verbatim): "Owned by BPH Hospitality, Nashville.com's parent company. Listed on the same terms as every other venue here."

## 4. The RFP flow (`/private-events/brief/`)

Single page, progressive, server-validated, works without JS as a plain POST fallback.

1. The event — occasion, guest count, date (or month + flexible), start time band, budget band, neighborhood preference (multi), needs (F&B, live music, AV, outdoor, accessible, hotel rooms), notes.
2. Venues — the shortlist (prefilled from `?v=`), or "let Nashville.com suggest" which auto-selects up to five published spaces matching guests/budget/neighborhood, ranked by §6. Planner can remove/add. Owned venues get no boost.
3. You — name, org, email, phone, how you heard.
4. Send — creates one `event_inquiries` row and one `event_leads` row per venue; routes (§5); shows a confirmation with each venue's name, SLA promise, and the planner's reference number; emails the planner a copy.

Honeypot and rate limit as today. Spam flag sets `status = spam` and routes nothing.

## 5. Routing and notifications (Phase 1 — ship first)

Server route `POST /api/private-events/` becomes the intake for both the simple form and the RFP.

- Per lead, by `venue.lead_system`:
  - `email`: Resend email to `sales_contact_email`, reply-to the planner, subject `New event inquiry via Nashville.com — {occasion}, {guests} guests, {date}`, body = the brief plus a one-click "Reply within 24h" link to a magic-link page (Phase 1: a signed URL that opens a minimal reply form writing `first_reply_at` + `venue_notes`; Phase 2: the dashboard).
  - `tripleseat` / `perfect_venue`: POST the lead into their lead form/API (`lead_system_endpoint`), then also email as above. Log result in `notify_log`.
- Every inquiry also goes to the events desk address (`EVENTS_DESK_EMAIL` env) and, when `need_hotel_rooms`, to `GROUP_HOTELS_EMAIL` with a note that the LiteAPI group-rate path is manual for now.
- Planner gets a confirmation email with the reference number and the list of venues contacted.
- SLA watchdog: pg_cron job every hour; for leads with `first_reply_at is null` and `sla_deadline_at < now()`, mark `sla_met = false`, email the venue a reminder, and email the events desk. A second miss (48h) emails the planner an apology plus two alternative venues chosen by §6.
- All sends go through one `notifications` edge function or server module with retries and a `notify_log` entry; never fail the intake because email failed (return `ok` with a `warning` and let the desk email catch it).

Env: `RESEND_API_KEY` (server only), `EVENTS_DESK_EMAIL`, `GROUP_HOTELS_EMAIL`, `EVENTS_FROM_EMAIL`, `EVENTS_MAGIC_LINK_SECRET`.

## 6. Ranking and suggestion (`src/lib/events/venue-rank.ts`)

Deterministic, unit-tested, one exported weights object. Inputs: guest count, budget band, occasion, neighborhood prefs, needs. Score = capacity fit (space where guests fit between min_guests and standing/seated as appropriate) × budget fit (min spend within band) × neighborhood match × needs match × response-time score (Phase 2) × editorial priority (content file). Ownership, fee tier, and sponsorship are not inputs. Test asserts that flipping `owned_by_bph` or `featured_until` never changes order.

## 7. Venue dashboard (Phase 2) — `/venues/`

Supabase auth (magic link). Users in `event_venue_users`.

- Leads inbox: new/open/closed tabs, SLA countdown, one-click reply (writes `first_reply_at`), set status, log outcome and booked value (required to move to `booked`), lost reason.
- Listing editor: venue fields, spaces with the publish check, media upload (Supabase storage, `rights_cleared` checkbox required), packages, blackout notes.
- Availability (Phase 3): mark big dates open/limited/booked.
- Stats: leads, reply time, booked value, fees due this month.

Admin (Newco ops) at `/admin/events/` behind an `is_admin` claim: all leads, SLA compliance, venues missing data, fees due report (CSV export), sponsored slots.

## 8. Instant-book packages (Phase 3)

Package pages (§3) with a "Book with {venue}" CTA to the venue's system. On click, log a `package_click` event with `client_reference`; venue marks booked in the dashboard. No payment on our side. Copy states the deposit is taken by the venue and lists what's included.

## 9. Analytics and trust

- Events: `EVENTS_BRIEF_STARTED`, `EVENTS_BRIEF_SENT` (venue count, occasion, guests band), `EVENTS_VENUE_VIEWED`, `EVENTS_SHORTLIST_ADDED`, `EVENTS_PACKAGE_CLICKED`. Add `client_reference` and `utm`.
- Disclosure block on hub and venue pages: how we're paid (5% by the venue only when you book), ownership, sponsorship labeling. Link to `/advertising/#disclosure` and update that page.
- `serviceSchema` on the hub updated to the marketplace description.

## 10. Content the humans supply (blocks publish, not build)

Per venue, in a shared sheet or one PDF each: spaces with capacities and pricing fields, packages, 6–10 rights-cleared photos with credits, sales contact, lead system, signed referral terms date. Start with the three owned venues, then the first ten partners. Occasion and neighborhood intros (2–3 paragraphs each) are editorial and human-written. Key dates for the next 12 months.

The build ships with the three owned venues in a seed fixture with placeholder numbers clearly marked `TODO` so pages render in preview; nothing publishes until real numbers replace them (the publish check enforces it).

## 11. Phases and acceptance

**Phase 1 — Routing + owned venues (2–3 weeks).** Migrations; Resend; intake rewrite; per-venue email + Tripleseat/Perfect Venue push; planner confirmation; SLA watchdog; magic-link reply; three venue pages + hub restructure; ranking; disclosure. Accept: a test inquiry produces one `event_leads` row per venue, emails arrive at the venue, desk and planner within 60s, `notify_log` shows results; an unanswered lead triggers the 24h reminder; publish check rejects a space with missing capacity; no page renders a `TODO` value in production.

**Phase 2 — Marketplace (4–6 weeks).** Multi-venue brief with shortlist; occasion/neighborhood/size browse pages; venue dashboard; admin views; response-time badge; 40 venues loaded. Accept: RFP to five venues creates five leads and five emails; venue user sees only own leads; fees-due report reconciles to booked leads; ownership flip test passes.

**Phase 3 — Book now (following quarter).** Packages, big-date availability, sponsored placement, hotel-block handoff improvements.

## 12. Do not

- No payments, contracts, e-signatures, or deposits on our side.
- No ranking or badge influenced by ownership, fee, or sponsorship.
- No published space without capacities and a price field.
- No stock or unlicensed photos; no "on request" placeholders in production.
- No AI-written venue descriptions passed off as editorial; summaries are human-written or clearly generated for review.
- Don't remove the existing `event_inquiries` rows or constraints; extend.

Start by reading §1's files and the existing migration. Propose the plan and file list before writing code.

---

## Handoff decisions (2026-09-28)

Decisions already made (do not re-ask):

- Success fee is 5% of contracted venue spend, $250 minimum, identical for BPH-owned venues. Store `fee_pct` per venue with default 5.0.
- Supply is run by Newco; fees flow to BPH Nashville.com, LLC.
- Venue dashboard ships in Phase 2, not Phase 1. Phase 1 uses the magic-link reply page.
- Email provider is Resend. It may be added as the one new dependency; the sending domain is `mail.nashroam.com` (DNS records go in the runbook).
- Brand rule is `.cursor/rules/nsvl-brand.mdc`.
- The three owned venues ship as a seed fixture with `TODO` placeholders; the publish check must block any `TODO` value from production.

Phase 1 scope (one PR, or two if migrations + routing land first):

1. Migrations: `event_venues`, `event_spaces` (with publish check), `event_media`, `event_leads`, `event_key_dates`; extend `event_inquiries`. RLS as specified. Commit under `supabase/migrations` and apply with the Supabase connector.
2. Intake rewrite: `POST /api/private-events/` creates the inquiry and one `event_leads` row per venue; routes by `venue.lead_system` (email via Resend; Tripleseat/Perfect Venue push when configured); emails the events desk and, when `need_hotel_rooms`, the group-hotels inbox; emails the planner a confirmation with reference number. Never fail the intake on an email error; log to `notify_log`.
3. Magic-link reply page for venues (signed URL, writes `first_reply_at` and `venue_notes`).
4. SLA watchdog: pg_cron hourly job + edge function or server route that flags misses, reminds the venue, alerts the desk, and on 48h emails the planner two alternatives from venue-rank.
5. Pages: restructured `/private-events/` hub (browse by occasion / neighborhood / size, featured venues with ownership label, how it works, big dates), and `/private-events/venues/[slug]/` for the three owned venues. Shortlist bar driven by `?v=` (no localStorage).
6. `src/lib/events/venue-rank.ts` with the ownership/fee invariance test.
7. Disclosure copy on hub, venue pages and `/advertising/#disclosure`.
8. Analytics events per brief §9.
9. `docs/PRIVATE-EVENTS.md` runbook: env vars (`RESEND_API_KEY`, `EVENTS_DESK_EMAIL`, `GROUP_HOTELS_EMAIL`, `EVENTS_FROM_EMAIL`, `EVENTS_MAGIC_LINK_SECRET`), Resend DNS records, how to load a venue, the referral one-pager checklist, and the Phase 2/3 backlog.

Acceptance (brief §11 Phase 1): test inquiry → one lead per venue, three emails within 60s, `notify_log` populated; unanswered lead triggers the 24h reminder; publish check rejects a space with a missing capacity or price; no `TODO` renders in production; typecheck, tests and build clean; every touched page rendered in a served build at phone width.
