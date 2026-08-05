# UI Redesign Audit — NASHVILLE Homepage

**Date:** 2026-08-04  
**Scope:** Visible product experience, Nashville specificity, geography credibility, media accuracy.  
**Method:** Full read of brand rules, media system, homepage, header/media/cards/booking/map/trust, content models, Tailwind/Next config; live review of `http://localhost:3000/` (desktop viewport).  
**Status:** Phase 1 complete. Broad implementation must not start until this document is accepted as the working brief.

---

## 1. Current homepage hierarchy

Top → bottom as shipped in `src/app/page.tsx` (+ global chrome from `layout.tsx`):

| Order | Surface | What it does |
|---|---|---|
| 0a | `DemoDataNotice` (layout) | Site-wide “Demonstration build” banner |
| 0b | `Header` | 7 primary links + search + Plan Your Trip |
| 1 | `HeroMedia` (~86vh) | Concert video + navy scrim + centered H1/CTAs |
| 2 | `BookingWidget` | Hotels / Tours / Tickets affiliate form overlapping hero |
| 3 | Intent hubs | 6 equal cards — Hotels, Restaurants, Live Music, Things to Do, Events, Trip Planner |
| 4 | Start here | 3 `GuideCard`s |
| 5 | Trending now | 2 large image cards (tonight + weekender) |
| 6 | Group trip chips | 6 planner type pills |
| 7 | This Weekend | 4 compact `EventCard`s |
| 8 | Pick your neighborhood | Illustrated map + detail panel |
| 9 | How we choose | Full-bleed Cumberland inverse trust section |
| 10 | Newsletter | Weekender signup |
| — | `Footer` + mobile `StickyCta` | Persistent conversion chrome |

**First-screen problem:** Emotion (hero) is immediately overwritten by monetization (booking widget). Decision value (tonight, neighborhoods, trip type) arrives mid-page.

---

## 2. Sections that feel repetitive

1. **Category discovery × 3** — Intent hubs (Hotels/Restaurants/Music…), Trending (tonight + weekender), and This Weekend all answer “what should I do?” with similar card patterns.
2. **Planner entry × 3** — Hero “Plan Your Trip”, Trip Planner hub card, and “Planning a group trip?” chips all point at `/plan/` without distinct outcomes.
3. **Guide / editorial × 2** — “Start here” guides and Trending weekender compete as editorial entry points without hierarchy between them.
4. **Trust × many** — Demo banner, booking disclosure, verification badges on cards, Cumberland “How we choose” block, footer affiliation/affiliate copy. Correct for compliance; wrong weight on the homepage.
5. **Equal cards everywhere** — Nearly every module is a bordered `rounded-card` grid. Rhythm never changes from utility directory → editorial → schedule.

---

## 3. Components that overuse cards

| Component / pattern | Issue |
|---|---|
| Intent hub links in `page.tsx` | Six identical image+border cards |
| `GuideCard` | Border, metadata row, equal columns |
| Trending links | Card shells with heavy navy gradient overlays |
| `EventCard` | Compact cards in a 2-col grid — fine for lists, weak as “now” |
| `RestaurantCard` / `HotelCard` / `VenueCard` / `AttractionCard` | Always `PhotoSlot` + border card (listing pages feel like a directory) |
| `NeighborhoodMap` panel | Nested cards inside a Cumberland chrome frame |
| `BookingWidget` | Large floating card as the first product surface |

**Keep the card primitive for interactive listing units.** Stop using it as the default section language on the homepage.

---

## 4. Generic or inaccurate imagery

Reviewed via `src/lib/media.ts` alts/credits + file inventory. Full replacement matrix will live in `docs/MEDIA-REPLACEMENT-LIST.md` (Phase 2 deliverable). Summary:

| Key | Verdict | Why |
|---|---|---|
| `hero/video` (Pexels concert) | **Replace as sole brand statement** | Generic live-music loop; dark/navy overlay fights brand “bright/approachable” hero |
| `hub/tours` | **Replace** | Alt: “Open road through mountains” — not Nashville tours |
| `hub/opryland` | **Replace** | Generic hotel suite; not Opryland / Gaylord |
| `hub/hotels` | **Replace or re-brief** | Resort pool — could be anywhere |
| `hub/restaurants` | **Keep as category only** | Plated food OK for hub; never for a named restaurant |
| `hub/live-music` / `tickets` / `honky-tonk-highway` | **Keep with caution** | Generic concert stock; OK for hubs, not venues |
| `neighborhood/wedgewood-houston` | **Replace** | Melrose Theater / Berry Hill — adjacent, not WeHo |
| `neighborhood/midtown` | **Keep with caveat** | Parthenon = West End/Centennial; weak for Music Row story |
| `neighborhood/east-nashville` | **Keep with caveat** | Shelby Bottoms greenway — true East, not Five Points street life |
| `neighborhood/12-south` | **Keep** | I Believe mural — place-accurate |
| `neighborhood/downtown-broadway` | **Keep** | Broadway neon — place-accurate |
| `neighborhood/the-gulch` | **Keep** | ICON / Gulch banners — place-accurate |
| `neighborhood/hillsboro-village` | **Keep** | 21st Ave storefronts — place-accurate |
| `neighborhood/germantown` | **Keep** | Historic brick — place-accurate |
| Listing cards | **N/A / broken promise** | Always `PhotoSlot` — no `imageKey` path for restaurants/hotels/venues/attractions |

`public/media/README.md` is stale vs live hero paths (`nashville-hero.mp4` vs documented `nashville-skyline-day.*`).

---

## 5. Trust and affiliate messaging — too prominent

| Placement | Problem |
|---|---|
| `DemoDataNotice` above header | Visually owns every page before brand |
| Booking widget under hero | Affiliate conversion before any editorial value |
| Widget disclosure line | Correct, but sits in the first scroll |
| Cumberland “How we choose” | Large inverse marketing block for methodology |
| Card-level `VerificationBadge` | Fine on detail/index; noisy if homepage shows many listing cards |
| Footer disclosures | Appropriate — keep |

**Do not remove** placement labels, affiliate builders, methodology pages, or noindex gates. **Do demote** homepage surface area for trust copy.

---

## 6. Conflicts with brand rules (`.cursor/rules/nashville-brand.mdc`)

| Rule | Current conflict |
|---|---|
| Hero bright/approachable; avoid heavy dark overlays | `HeroMedia` uses `from-navy/75 via-navy/30` over concert video |
| Centering reserved for hero | Homepage still centers Trending, group trip, How we choose, newsletter |
| Type scale in `tailwind.config.ts`; no `text-[Npx]` | Arbitrary sizes remain across `src/` (homepage still has `text-[15px]`, `text-[16px]`) |
| Sky/Dogwood/Mint = component accents only | Mostly improved after surface pass; BookingWidget inactive tabs still use full `bg-sky` strip |
| Feel like institution + editorial + marketplace — not tourism board / affiliate directory | Nav + hubs + booking-first hierarchy read as CVB + OTA template |
| Masthead: image assets in `/public/brand/` | OK (`Wordmark`) |
| Section grounds: paper / paper-card / one inverse | Homepage mostly compliant; Cumberland trust block is the inverse |

---

## 7. Components to retain

- `Wordmark`, `StarMark`, brand PNG assets  
- `SmartImage` + `AVAILABLE_MEDIA` allowlist (extend, don’t replace)  
- `HeroVideo` reduced-motion / pause behavior (reshape presentation)  
- `BookingWidget` logic: tabs, ARIA, affiliate URL builders, analytics events, disclosure  
- `SectionHeader`, form field classes, button system  
- `EventCard` / `GuideCard` as **building blocks** (restyle; don’t delete)  
- `NewsletterForm` + analytics location prop  
- `Trust` primitives (`PlacementLabel`, `VerificationBadge`, `AffiliateDisclosure`, `Byline`)  
- Content modules, planner (`itinerary.ts`), partners, SEO/JSON-LD, static export config  
- Header a11y: Escape, focus return, `aria-expanded`, active routes, body scroll lock  

---

## 8. Components to redesign or remove

| Item | Action |
|---|---|
| Homepage monolith in `page.tsx` | Split into focused section components |
| Intent hub 6-card grid | **Remove** from homepage; replace with 4 trip-type paths |
| Trending now + diamond ornament | **Remove / fold** into Now in Nashville + Editorial feature |
| Group-trip chip row | **Remove**; trip types become full outcome paths |
| Cumberland “How we choose” homepage block | **Remove or shrink** to quiet text link; keep `/how-we-choose/` |
| `NeighborhoodMap` hotspot-% model | **Replace architecture** with lat/lng (and GeoJSON-ready) data |
| `PhotoSlot`-only listing cards | **Redesign** to accept optional `ImageKey` / content `image` |
| Hero height / overlay / copy / CTAs | **Redesign** per Phase 2 brief |
| `primaryNav` in `site.ts` | **Simplify** labels/order |
| Demo banner styling | **Redesign** quieter; keep function until launch gates clear |

---

## 9. Proposed new homepage hierarchy

```
Header (simplified nav)
  Tonight · Eat & Drink · Stay · Neighborhoods · Guides · [Plan a Trip]
  Search icon retained

1. HomepageHero (~58–65vh desktop)
   Make the most of Nashville.
   Where to stay, what to book, and what is actually worth your time.
   [Build My Trip]  [See What’s Happening Tonight]
   Bright cinematic media / montage-capable — light scrim, not navy blanket

2. NowInNashville
   Editorial/schedule layout (not 3 equal cards)
   Tonight shows · weekend highlights · one timely pick
   Date, venue, neighborhood, why it matters, action

3. TripTypeExplorer
   What kind of Nashville are you planning?
   First Visit · Couples Weekend · Group Trip · Family Trip
   Outcome-led blurbs → /plan/?type=…

4. NeighborhoodExplorer
   Geo-defensible map + decision panel
   Best for / Avoid if / walkability / nightlife / noise /
   time to Broadway / typical hotel price / landmarks / short edit

5. EditorialFeature + LiveSchedule (asymmetric)
   One large guide/story · compact schedule beside it

6. BookingSection
   Ready to book the trip?
   Existing BookingWidget (behavior unchanged)

7. Newsletter (NASHVILLE Weekender)
   Weekly plan framing, not generic signup

Footer + quiet StickyCta (mobile)
```

Demo notice stays in layout but visually demoted.

---

## 10. Files intended to modify

### Primary (homepage redesign)

- `src/app/page.tsx` — compose new sections only  
- `src/lib/site.ts` — `primaryNav`, hero/supporting copy strings if centralized  
- `src/components/Header.tsx` — nav density only; preserve a11y  
- `src/components/Media.tsx` — hero height, lighter scrim, montage hooks  
- `src/components/BookingWidget.tsx` — framing via parent; minimal internal UI polish  
- `src/components/NeighborhoodMap.tsx` → replace with `NeighborhoodExplorer` + geo data  
- `src/components/Cards.tsx` — optional image keys on listing cards  
- `src/components/Trust.tsx` — quieter `DemoDataNotice`  
- `src/app/globals.css` / `tailwind.config.ts` — type scale + hierarchy helpers as needed  

### New components (names flexible)

- `src/components/home/HomepageHero.tsx`  
- `src/components/home/NowInNashville.tsx`  
- `src/components/home/TripTypeExplorer.tsx`  
- `src/components/home/EditorialFeature.tsx`  
- `src/components/home/LiveSchedule.tsx`  
- `src/components/home/BookingSection.tsx`  
- `src/components/home/NeighborhoodExplorer.tsx`  

### New data / geo

- `src/lib/geo/neighborhoods.ts` (or `.geojson` + typed loader) — lat/lng centers, optional polygons, river/interstate layers documented for drop-in GeoJSON  
- Extend `Neighborhood` in `src/lib/types.ts` + `src/lib/content/neighborhoods.ts` for avoid-if, walkability, nightlife, noise, Broadway time, hotel price band, landmarks  

### Docs (Phase 2+ as specified)

- `docs/MEDIA-REPLACEMENT-LIST.md`  
- `docs/LAUNCH-CHECKLIST.md`  
- `docs/TECHNICAL-UPGRADE-PLAN.md`  
- Update `public/media/README.md` to match live hero assets  

### Explicitly out of scope this pass

- AI-discovery endpoints, `llms.txt`, structured-data system, robots policy  
- Framework upgrade (document only)  
- Inventing venue photography or AI images  

---

## Live UI observations (desktop, 2026-08-04)

- Hero reads as a dark concert template; pause control visible; CTAs centered.  
- Booking widget overlaps hero — first interactive product is affiliate search.  
- Seven-item primary nav feels crowded vs editorial masthead.  
- “What are you here to do?” six-up grid is the clearest “tourism board / directory” signal.  
- Sample event titles (`[Sample] …`) surface mid-page without a dedicated “now” narrative.  
- Neighborhood map illustration is distinctive and better than inventing SVG rivers, but hotspots are % boxes over art — **not** lat/lng architecture; relative geography is only as good as the illustration, and the data model cannot accept GeoJSON.  
- Sticky CTA / body padding exists for mobile; mobile hierarchy still stacks every desktop module.

---

## Geography note (accuracy)

Current `NeighborhoodMap.tsx` uses percentage hotspots over `nashville-illustrated-map.png`. It does **not** currently draw invented river/highway SVG paths (that critique applies to an earlier pattern / mental model). The redesign still requires:

1. Separating presentation from geographic data.  
2. Real lat/lng for neighborhood centers (and Music Row / West End as distinct map labels even if content slugs share `midtown`).  
3. Documented Cumberland + I-24 / I-40 / I-65 / I-440 geometry (ship simplified coordinate polylines or empty GeoJSON slots — no fake orthogonal highways).  
4. Decision fields in the detail panel beyond summary + `knownFor` chips.

---

## Gate to Phase 2

Phase 2 implementation begins only after this audit is treated as the agreed plan. Next implementation order:

1. Docs: media list, launch checklist, tech upgrade plan (can parallelize with UI).  
2. Type/geo content model extensions.  
3. Homepage section components + `page.tsx` rewire.  
4. Nav + hero + Now in Nashville.  
5. Neighborhood explorer.  
6. Cards image support + media flags.  
7. Verification: typecheck, build, a11y, affiliate URLs, reduced motion.
