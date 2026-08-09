# NASHVILLE

The most useful way to plan, book, and experience Nashville.

A conversion-focused city guide and trip-planning site. Built with
**Next.js 14 (App Router) + TypeScript + Tailwind** on Vercel with a server
runtime (not a static export). Canonical experience inventory and Viator
integration live in the **Nashroam Supabase** project; the browser never talks
to Viator or uses the service-role key.

Domain and legal entity remain placeholders in `src/lib/site.ts`. Brand rules:
`.cursor/rules/nashville-brand.mdc`.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000

npm run build        # production build (Vercel / Node server)
npm run typecheck    # tsc --noEmit
```

No credentials are required to run or build. Every integration degrades
gracefully when its key is absent. Copy `.env.example` to `.env.local` to wire
up live feeds. For tours/experiences and planner bookables, set
`SUPABASE_SERVICE_ROLE_KEY` (server-only). Viator credentials stay in Supabase
Edge Function secrets — do not put `VIATOR_API_KEY` on Vercel.

---

## Architecture

```
src/
├── app/                    # Routes + API (App Router, server runtime)
├── components/             # Reusable UI
└── lib/
    ├── types.ts            # Content models
    ├── site.ts             # Brand strings + navigation
    ├── seo.ts              # Metadata builders + JSON-LD
    ├── analytics.ts        # Event contract
    ├── media.ts            # Keyed image/video library
    ├── partners.ts         # Affiliate deep-link builders
    ├── itinerary.ts        # Trip planner rules engine
    ├── supabase/           # Server-only Supabase client
    ├── feeds/              # Ticketmaster, reviews, experiences, Viator Edge client
    └── content/            # Seed content (the CMS stand-in)
supabase/
├── migrations/             # Nashroam data platform schema
└── functions/viator-sync/  # Viator Partner API boundary (sandbox)
```

### Content system

Content lives in typed modules under `src/lib/content/`. Every listing carries
provenance fields, which is what the trust UI reads:

| Field | Purpose |
|---|---|
| `dataStatus` | `verified` / `needs-recheck` / `unverified` |
| `dateChecked` | When a human last confirmed the practical details |
| `dateUpdated` | When the written content last changed |
| `placement` | `editorial` / `sponsored` / `affiliate` |
| `sponsorName` | Required when `placement` is `sponsored` |
| `sourceNote` | Where the details came from (internal, not rendered) |

Swapping in a real CMS means replacing the modules in `src/lib/content/` with
fetch calls that return the same shapes. Nothing else changes.

### Trip planner

`src/lib/itinerary.ts` is a **deterministic rules engine**, not a generative
model. Candidate retrieval (Supabase experiences via `/api/experiences?planner=1`)
is separate from scoring/composition. It never invents products, places, or
prices — bookable afternoon stops resolve to real catalog rows when available.

---

## Integrations

| Integration | Env / boundary | Behavior without credentials |
|---|---|---|
| Viator (experiences) | Supabase `VIATOR_API_KEY` + site `SUPABASE_SERVICE_ROLE_KEY` | `/tours` shows empty/error state (no sample inventory) |
| Ticketmaster Discovery | `TICKETMASTER_API_KEY` | `/live-music-tonight/` renders seeded shows and labels them as samples |
| Google Places reviews | `GOOGLE_PLACES_API_KEY` | Review block renders nothing |
| TripAdvisor rating | `TRIPADVISOR_API_KEY` | Review block renders nothing |
| Affiliate IDs | `NEXT_PUBLIC_*` | Links work, carry no attribution |

Ticketmaster/reviews may still refresh on a schedule; experiences load at
request time from Supabase (with Edge Function fallback for discovery). See
`docs/data-platform/VIATOR.md`.

**Review licensing** is handled in `src/lib/feeds/reviews.ts`. Google requires
attribution, a link back, and forbids caching beyond 30 days. TripAdvisor
requires an approved partner account and does **not** permit reproducing full
review text, which is why that adapter returns a rating and count only.

---

## Media

No photography or video ships with this repo. Every image slot renders a
placeholder that reserves the correct space, so adding real files causes **no
layout shift**.

See `public/media/README.md` for the sourcing brief, exact filenames, and the
two-step activation process. The hero supports a looping background video with
a poster fallback and full `prefers-reduced-motion` handling.

---

## Measured results

Lighthouse, desktop preset, against the production build:

| | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Homepage | 90 | 100 | 96 | 100 |
| Guide page | 90 | 100 | 96 | 100 |
| Trip planner | 90 | 100 | 96 | 100 |

LCP 0.6–0.7s · CLS 0–0.028 · TBT 0ms · First Load JS 87 kB shared

**axe-core:** 0 WCAG 2.1/2.2 AA violations across desktop and mobile.

Verified manually: skip link is the first tab stop, mobile drawer sets
`aria-expanded` and returns focus on Escape, search is a full keyboard combobox,
all internal links resolve, all page titles and descriptions are unique.

---

## SEO

- Statically generated, semantic HTML
- Unique title + description + canonical per page
- JSON-LD: Organization/NewsMediaOrganization, WebSite, BreadcrumbList,
  Article, FAQPage, ItemList, Speakable, Person, Restaurant, Hotel, Event,
  TouristAttraction, Place
- `sitemap.xml` and `robots.txt` generated from content
- Search results are `noindex` and disallowed, to avoid thin/infinite URLs

## Built for AI answer engines

Assistants are a primary discovery channel for a guide like this, so the site
exposes itself structurally rather than making a model infer meaning from HTML.

| Endpoint | What it is |
|---|---|
| `/llms.txt` | Short site map for models, in the llmstxt.org convention |
| `/llms-full.txt` | Full answer reference: every guide's short answer, FAQs, author, and dates |
| `/api/listings.json` | All listings with neighborhood, category, and verification state |
| `/api/events.json` | The event calendar |
| `/api/index.json` | Every indexable URL with type, title, and summary |
| `/feed.xml` | RSS 2.0 |

Design decisions worth knowing:

- **Provenance travels with the data.** Every record in the JSON and text
  exports carries its verification state, check date, and author. A model can
  therefore tell a confirmed fact from a placeholder, and the licence block
  explicitly instructs it not to quote unverified records as fact.
- **`robots.txt` states an explicit policy for 16 named AI agents** rather than
  leaving access to inference. Retrieval agents that cite sources are allowed.
  `CCBot` is disallowed, because a bulk training corpus offers no citation path
  back to the publisher. Change that one line if the policy changes.
- **`ItemList` on every directory page**, which is what answer engines read for
  "best X in Nashville" queries.
- **`Speakable` targets the `.short-answer` block**, and the `KeyFacts`
  component gives that block a stable class and a real definition list, so the
  passage worth quoting is unambiguous.
- **`publishingPrinciples`, `correctionsPolicy`, and `ownershipFundingInfo`**
  are declared on the publisher entity. These are the provenance properties the
  major engines read, and they point at pages a reader would want anyway.

---

## Documentation

- `docs/ANALYTICS.md` — the full event contract
- `public/media/README.md` — media sourcing brief
- `.env.example` — every environment variable, annotated
- `/style-guide` — live design system page

---

## Known limitations

See the handover notes for the full list. The main ones:

1. **No photography or video.** Placeholders throughout.
2. **Listings are sample data.** Restaurants and hotels use bracketed
   `[Sample]` names. Nothing is marked `verified`, and a site-wide banner says
   so. Do not launch without replacing them.
3. **Author profiles are placeholders.** Real bylines are a trust requirement.
4. **Privacy and Terms are unreviewed templates.** They need counsel.
5. **Newsletter and itinerary save/email are not wired** to a provider.
6. **The Grand Ole Opry has no neighborhood slug** — the Opry House sits in
   Music Valley, which is not in the neighborhood union. Add it before
   publishing Opry content.
