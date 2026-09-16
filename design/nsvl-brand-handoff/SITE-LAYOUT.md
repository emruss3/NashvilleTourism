# Nashville.com layout and interaction specification

## Mobile-first priority
The expected traffic mix is 60% mobile. MOBILE-FIRST.md governs mobile module order, navigation, conversion flows and acceptance. The table below retains the desktop composition; its mobile order is superseded by that dedicated specification.

## Design direction
Preserve the reference's large centered identity, social hero photography, practical discovery strip, neighborhood cards, events/shop pairing and lower trip planner. Translate the reference into a fast responsive website; do not flatten the whole page into one image. Apply the production palette in design-tokens.css. Replace decorative side slogans with breathing room where they impair clarity.

## Grid and spacing
Desktop >=1024px: 12 columns, 24px gutters, 1280px maximum content width, outer padding clamp(24px, 4vw, 64px). Large photography may bleed edge to edge. Tablet 768–1023px: 8 columns, 24px outer padding. Mobile <768px: 4 columns, 20px outer padding, 16px gutters. Use 8px-based spacing with 4px refinements. Section spacing 64–88px desktop, 40–48px mobile. Card radii 0–4px; form/button radius 4px. Avoid pill-shaped cards, floating glass panels and unnecessary shadows.

## Homepage, in order
| Section | Desktop | Mobile | Intended action |
|---|---|---|---|
| Header | Centered NSVL lockup; utility icons; second nav row | Compact 64px header: menu, NSVL, search and bag | Navigate with minimal friction |
| Hero | Full bleed image, text left, 480–600px high | Text plus art-directed image, content-driven height | Explore the city |
| Discovery | Full-width charcoal band, three controls + CTA | Labeled controls stacked or compact summary expanding inline | Find relevant events/places |
| Neighborhoods | Three equal landscape cards | One column; all cards reachable without swiping | Open a neighborhood guide |
| Events + shop | Two equal columns with shared baseline | Events first, shop second | Tickets and merchandise |
| Trip planner | Paper-toned horizontal band, copy left, controls right | Heading, support, dates, party size, CTA stacked | Build an itinerary |
| Email signup | Slim paper section | Single-column form | Weekly return visits |
| Footer | Brand, useful link columns, socials | Compact accessible link groups | Trust and onward navigation |

### Header
Keep header identity large enough to feel editorial, around 220–280px wide on desktop, with 24px vertical breathing room. Top-level navigation: Explore, Music, Neighborhoods, Eat & Drink, Shop, Plan, Journal. Search and bag need accessible labels; bag shows real quantity. “Music” routes to filtered events/editorial, “Plan” to the planner. A smaller sticky navigation bar may appear after scrolling; do not retain a 160px header on small screens. The mobile menu supports keyboard focus, Escape and focus return.

### Hero
Eyebrow: MUSIC. PEOPLE. PLACES.
H1: Get into Nashville.
Support: Great music. Good food. Better company.
CTA: Explore the city → /explore.

Use an actual link. Desktop text width 520px; preserve faces. Do not use a carousel. A video is optional only with an effective poster, reduced-motion support and no audio/autoplay obstruction. Default to one optimized image. On mobile use either copy above the photograph or a validated scrim with at least 4.5:1 text contrast. One H1 on this page.

### Discovery band
Improve the reference by replacing the unhelpful Nashville-only location selector with Neighborhood: All Nashville + real neighborhood options. Other inputs: Interest and Dates. Labels remain visible after selection; placeholders are not labels. Default dates should be unset or computed from the current date; never ship the illustrated June 6–8 date.

CTA: Find your plans. It opens /explore with selections in URL parameters. Results preserve filters on Back/reload. Start with event/place discovery; lodging search lives in the planner or stay section. Quick links such as Tonight and This weekend compute boundaries in America/Chicago. A fixed city selector is unnecessary unless other cities are supported.

### Neighborhood cards
Heading: Find your corner. Support: Different neighborhoods. A closer Nashville.
Initial cards: East Nashville, Germantown, Wedgewood-Houston. These names are content requirements; the concept's photographs are not evidence of the locations. Each card has a real licensed image, name, brief editorial description, and a single link. Overlay needs a sufficient scrim. “Explore all neighborhoods” links to a full index.

### Events and merchandise
Events column: On the calendar. Tabs All / Music / Arts / Food / Culture; three to four current entries, then See all events. Entry anatomy: thumbnail, localized day/month, title, venue, time and optional truthful price/status. Entire title is a link to the detail page; save control is a separate button. Do not nest buttons in links. Show loading, empty and failed states. Never fabricate artist appearances to fill the layout.

Shop column: one strong still-life or model photograph, “Good here. Good anywhere.”, support “Nashville, worn your way.” and Shop NSVL. Keep text outside busy product details. Link to a shoppable collection. Below this campaign panel on shop pages, use real product cards with names, prices and availability. No invented discounts, counters or sold-out claims.

### Trip planner — required headline edit
Eyebrow: PLAN YOUR TRIP.
H2: One good plan changes everything.
Support: Find the shows, tables and places that make the trip yours.
Inputs: arrival/departure date range, people. CTA: Build a trip.
Suggested desktop wrap: “One good plan / changes everything.” Where the narrower reference column requires it, use three lines. Avoid hard-coded breaks on mobile. Never reduce the font until it is illegible to preserve a particular wrap.

On submit open /plan with inputs preserved. Ask interests and pace next, then let users add events/places, group them by day and reorder. Clearly distinguish saved itinerary items from paid reservations. Hotel/experience outbound buttons must identify partner destinations and any applicable affiliate relationship. A booking widget is not implied by a decorative date selector.

### Newsletter and footer
Newsletter: Your next good plan. Support: A weekly edit of Nashville shows, places and new releases. Email + “Send me the edit.” Show success only on confirmed provider response; preserve input on error. Use genuine consent language tied to the site's privacy policy.
Footer: NSVL/Nashville lockup, About, Contact, Neighborhoods, Events, Shop, Plan, Journal, Privacy, Terms, accessibility/contact route and verified social accounts. Include shipping/returns on shop routes. No dead social icons. Nashville.com can appear as small destination text.

## Secondary page templates
### Explore / event index
Desktop: intro, search, date/category/neighborhood controls; results count; 3-column cards with optional map toggle. Mobile: search, filter button with active count, 1-column results. Filters are URL-addressable. Provide pagination with real links for discovery; do not rely entirely on endless scrolling. Distinguish editorial recommendations from sponsored placements.

### Event detail
Breadcrumb, title, date/time/timezone, verified venue, price/availability timestamp, image, ticket CTA, save button, practical details, location, related events. Mobile may use a bottom ticket CTA only while the main CTA is offscreen, with safe-area padding. Canceled/postponed status is prominent. Outbound ticket links point to trusted known providers. Do not promise remaining inventory without live data.

### Neighborhood detail
Hero title, 80–120-word original introduction, map/list toggle, category filters, curated places, upcoming events and one suggested half-day itinerary. Show addresses, sources and last-reviewed date when appropriate. Include nearby neighborhoods through useful internal links. No repetitive keyword filler.

### Shop collection / product
Collection: restrained campaign intro; 4 products across desktop / 2 mobile; filters only if inventory warrants them. Product: image gallery + information panel, price/currency, color, size, size guide, availability, add to bag, materials, fit, shipping and returns. Size choice is required before purchase; unavailable variants cannot be added. Show real cart and checkout integration. Guest checkout where supported. Never make the site planner look like checkout.

### Plan / saved itinerary
Desktop day list with details pane; mobile chronological list with an optional map. Draft can persist locally without requiring registration; authenticated sync/share only if a real backend exists. Share links must be backed by durable records and explicit visibility. Do not claim localStorage plans are shareable across devices. Handle time conflicts, sold-out events and stale links. Lodging referrals may be added after core planning works.

### Journal / article
Index with one feature, categories and readable cards. Article with headline, author, date/updated date, captioned media, narrow reading column, related places/events and a relevant next action. Stories should connect naturally to a plan or collection without interruptive commerce blocks.

## Motion and accessibility
Hover: subtle underline or 2px translate, not zooming every photograph. Transitions 150–200ms. Honor prefers-reduced-motion. All interactions work without hover. Controls target >=44px. Visible keyboard focus, landmarks, skip link, semantic headings, labeled forms and described validation errors. Date picker must be keyboard accessible. Modals trap focus correctly and return it on close.

## Trip planner scope correction
GROUP-TRIP-PLANNER.md governs the planner. It creates an optimized itinerary from group occasion (including bachelorette or corporate retreat), headcount, age ranges, budget, dates, preferences and constraints. Earlier saved-list-first descriptions are superseded; saving and editing support the generated plan.
