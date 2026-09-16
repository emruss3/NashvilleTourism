# Eight page layouts — NSVL / Nashville.com
Version 1.4 • September 16, 2026

This specification governs behavior and data for the eight requested page families. For the redesigned visual composition, page-designs/README.md and its eight concept boards supersede the previous generic wireframe atlas. It extends SITE-LAYOUT.md and MOBILE-FIRST.md, preserving mobile-first priorities and replacing conflicting directory guidance. Routes below are proposed labels: inspect existing routes before implementation and preserve working URLs. These are design blueprints, not deployed pages or live inventory.

## Shared frame
- Palette: Paper White #F5F3ED and Charcoal Ink #1F2421. Supporting neutrals only; no third brand accent. Color inside genuine photography is permitted.
- Authentic NSVL mark: desktop full lockup, mobile standalone. Use available provisional assets only for prototypes; follow logos/README.md for production limitations.
- Desktop: 1280px maximum content width, 12-column layout, 24px gaps; compact header followed by navigation. Avoid tall hero photos on search-led pages.
- Primary desktop navigation: Explore (Restaurants, Tours, Neighborhoods, Things to do, Hotels), Events, Shop, Plan your trip. Search and bag at right. Mobile: 64px header; Explore / Events / Shop / Plan bottom navigation. Every requested category is available through Explore and the menu.
- Mobile: 20px gutters (16px at 320px), one column except shop, at least 44px touch targets and 48px primary controls. Search/booking inputs appear before long editorial sections. At 390×844 the title and primary search/input are reachable in the first viewport; preserve text reflow on smaller displays.
- Filters: desktop toolbar/sidebar, mobile accessible sheet with Apply/Reset/Close. Applied filters and pagination persist in URL; Back restores results and position. Maps load only when requested and use verified geometry.
- Shared Save control adds an item to the trip, not a reservation. Separate interactive Save button from card links. Cross-page trip context preserves dates/party only where relevant and editable.
- Footer: About, Contact, Journal, useful category links, Privacy, Terms; shipping/returns on commerce pages. Newsletter is optional and secondary.
- Loading skeletons reserve media sizes; empty/error states preserve user input. No fake price, rating, scarcity, bookable table, or reservation confirmation. Fixtures belong only in development.

## Page ownership
Restaurants owns dining discovery; Tours owns bookable experiences; Neighborhoods owns geographic guides; Things to do owns evergreen activity discovery; Events owns dated happenings; Hotels owns lodging; Shop owns merchandise; Plan assembles saved choices. Link between entity records rather than create conflicting duplicates.

## Reading the visual atlas
Open page-layouts/PAGE-LAYOUTS.html. Choose a page, then Desktop or Mobile. The atlas is a structural wireframe with photo placeholders, numbered modules and annotations; it is not a working booking prototype. Each page includes ordered sections and the corresponding detail-page flow.

## 1. Restaurants

Proposed route: `/restaurants`. H1: **A good table. A better night.**

Support: Find your next meal by neighborhood, cuisine or occasion.

Primary action: **Find restaurants**. Filters: Neighborhood, Cuisine, Price, Occasion, More filters.

| Order | Module | Layout and behavior |
|---|---|---|
| 1 | Search + intent | Compact title and search first. Quick links: Brunch, Date night, With a group, Late night. Date, time and party size appear only when a working reservation integration can return availability. |
| 2 | Restaurant results | Two-column cards beside an optional map on desktop. Each card: verified photograph, name, cuisine, neighborhood, price band, concise editorial reason to go, Save and View restaurant. Three or four initial results before supplemental editorial content. |
| 3 | Editorial collections | Three story cards: A long lunch, Dinner before the show, A table for everyone. Each opens a curated collection, not an arbitrary search result. |
| 4 | Eat by neighborhood | Compact links into dining-filtered neighborhood guides. |
| 5 | Build the evening | Link a saved restaurant to nearby events and add it to the itinerary. No implied reservation. |

**Mobile order:** Search → occasion shortcuts → Filters / Map → single-column restaurant cards → collections → neighborhood links → plan prompt. Map replaces the list when selected; retain filters and scroll.

**Detail / conversion flow:** Restaurant detail: name + cuisine/neighborhood/price band → gallery → editorial summary → menu link and practical details → reservation panel if connected, otherwise Visit website → address/map → nearby activities. Reservation inputs: date, time, party size. Show real bookable times only. Sticky Reserve action only with a working integration; otherwise use View website.

**Required data:** Name; verified image; cuisine; address; neighborhood; price-band source; website/menu URLs; hours with source/review date; reservation provider and live availability when integrated.

**Empty / error state:** No matches: retain filters, offer Clear filters and nearby neighborhoods. Provider failure: say reservations are unavailable and provide the verified restaurant website; never manufacture times.

## 2. Tours

Proposed route: `/tours`. H1: **Go beyond the usual.**

Support: Find an experience worth making time for.

Primary action: **Find tours**. Filters: Date, Travelers, Category, Duration, Price.

| Order | Module | Layout and behavior |
|---|---|---|
| 1 | Search + bookable intent | Title, date, traveler count and category. Useful category links: Music, Food, Walking, History, On the water. Start with concise copy rather than a tall hero. |
| 2 | Experience results | Three-column desktop grid. Cards: image, title, operator/provider, duration, departure area, sourced rating/count if available, current from-price with currency and per-person/per-group unit. Actions: View tour and Save. |
| 3 | Featured experience | One wide editorial feature after the first results, chosen through a documented editorial rule; sponsorship labeled. |
| 4 | Compare by interest | Category tiles and accessible options where verified. Do not infer physical accessibility from a category. |
| 5 | Fit it into your trip | Show a suggested day grouping; add chosen tour to an itinerary with a reminder that saving is not booking. |

**Mobile order:** Search/date summary → Filters → single-column experience cards → feature → categories → trip prompt. Show duration and price unit without opening a card.

**Detail / conversion flow:** Tour detail: title and gallery → highlights/duration → date/travelers selector → actual options and availability → inclusions/exclusions → meeting point → accessibility and cancellation terms → provider booking handoff. Sticky Check availability until an option is selected; then Continue to provider with known price/terms. Example cross-link: a venue guide can offer a Ryman tour only if a real provider product exists.

**Required data:** Provider product ID; title; operator; duration; images/license; departure location; supported dates/options; price/currency/unit; cancellation terms; accessibility facts; booking URL; freshness timestamp.

**Empty / error state:** For sold-out dates, offer available alternate dates only if supplied by the provider. On API failure, keep editorial content and a truthful provider link; no invented bookable inventory.

## 3. Neighborhoods

Proposed route: `/neighborhoods`. H1: **Find your corner.**

Support: Different neighborhoods. A closer Nashville.

Primary action: **Explore neighborhoods**. Filters: Food, Music, Shopping, Arts, Browse all.

| Order | Module | Layout and behavior |
|---|---|---|
| 1 | Neighborhood finder | Concise introduction and visible name search. Interest shortcuts filter recommendations. Optional city map opens on demand using verified geography. |
| 2 | Neighborhood directory | Three-column landscape card grid with real neighborhood photography, name, two or three descriptive tags and one sentence on character. All neighborhoods remain accessible through a full directory. |
| 3 | Featured half-day | Wide image plus a short neighborhood route: eat, explore, see a show. It is a curated suggestion, not a timed reservation. |
| 4 | Choose your base | Compare atmosphere and practical transport considerations; link to the hotels page with the neighborhood selected. Distances/travel estimates require sourced locations. |
| 5 | Keep exploring | Adjacent-neighborhood links and suggested guides, then Add a neighborhood to your trip. |

**Mobile order:** Finder → optional map button → full-width neighborhood cards → featured half-day → choose-your-base comparison → onward guides. No swipe-only directory.

**Detail / conversion flow:** Neighborhood detail: title, signature image and short introduction → Eat / Do / Shop / Stay anchors → curated places → events in the neighborhood → half-day itinerary → getting there → nearby areas. Save individual places as well as the guide.

**Required data:** Stable neighborhood slug; verified boundaries or representative location; original description; licensed photos; tags; linked venues/restaurants/hotels/tours; reviewed transport information.

**Empty / error state:** If a category has no verified items, omit that section with a useful link to the wider city directory. Do not populate missing places with generic invented listings.

## 4. Things to do

Proposed route: `/things-to-do`. H1: **Make a day of it.**

Support: Find something that fits your kind of Nashville.

Primary action: **Explore things to do**. Filters: Interest, Neighborhood, Indoor / outdoor, Price, Family-friendly.

| Order | Module | Layout and behavior |
|---|---|---|
| 1 | Discovery shortcuts | Search plus visible intent links: Free things, With kids, Rainy day, First visit. These must map to verified content tags. |
| 2 | Browse activities | A mixed three-column grid of evergreen places, activities and attractions. Label type clearly: Attraction, Guide, Tour or Event. Cards show name, location, useful time commitment and View details / Save. |
| 3 | One good day | A curated morning/afternoon/evening route that can be copied into the planner. Clearly distinguish suggested order from booked times. |
| 4 | Do more of what you love | Music, food, art, outdoors and shopping collections with concise editorial context. |
| 5 | Happening during your trip | A small date-driven event module linked to Events; bookable experiences link to Tours. Avoid duplicating entire catalogs. |

**Mobile order:** Search and intent links → filters → single-column mixed activity cards → one-day plan → interest collections → dated events.

**Detail / conversion flow:** Activity detail: title/type → photo → why go → practical details (address, hours, cost, accessibility where verified) → Save to trip → official site or relevant tour/ticket link → nearby places. Editorial guide detail uses a readable story layout with embedded linked place cards.

**Required data:** Content type; title; stable ID; verified location; tags; operating hours/review date; cost basis; time commitment source/editorial estimate; official/booking link; original editorial content.

**Empty / error state:** No activity matches: keep choices visible and suggest broader interests. Unknown hours must say Check official hours, not Open now.

## 5. Events

Proposed route: `/events`. H1: **Be there.**

Support: The shows, nights and moments worth going out for.

Primary action: **Find events**. Filters: Tonight, This weekend, Choose dates, Genre, Venue.

| Order | Module | Layout and behavior |
|---|---|---|
| 1 | Date-first search | Search artist/event/venue with Tonight, This weekend and date range shortcuts. Compute local dates in America/Chicago. Make active date range visible. |
| 2 | Chronological event list | Desktop uses full-width date-grouped rows with image, title, date/time, venue and sourced price/status; View event is primary and Save separate. Sort soonest by default; retain explicit sort when changed. |
| 3 | Venue discovery | Compact venue cards, each linking to upcoming events at that venue. Include relevant venue tours as separate experiences rather than event tickets. |
| 4 | Plan a night | Curated dinner + show + nearby stop links. Preserve the selected event when opening the planner. |
| 5 | Weekly edit | Optional email signup after useful results, never an entry popup. |

**Mobile order:** Search → date shortcuts → Filters → chronological rows grouped by day → venues → plan-a-night prompt. Calendar is optional; a cramped month grid is not the default.

**Detail / conversion flow:** Event detail: title, date/time, status and venue → ticket CTA + Save → image → event description → venue/access information → nearby restaurants/hotels → related events. Contextual bottom ticket bar replaces bottom navigation while the main CTA is offscreen. Show cancellation/postponement prominently.

**Required data:** Provider event ID; event title; actual start/end/timezone; venue and address; images; category; ticket URL; price/currency when sourced; status; provider refresh time.

**Empty / error state:** No events on chosen dates: suggest nearby dates without silently changing filters. Tickets unavailable: show status and alternatives; do not display Buy tickets as if inventory is confirmed.

## 6. Hotels

Proposed route: `/hotels`. H1: **Stay somewhere good.**

Support: Find the right base for your Nashville trip.

Primary action: **Check stays**. Filters: Check-in, Check-out, Rooms / guests, Neighborhood, Amenities.

| Order | Module | Layout and behavior |
|---|---|---|
| 1 | Stay search | Destination is Nashville; ask check-in/check-out and rooms/guests. Allow neighborhood/name refinement. The form sits above imagery and long destination copy. |
| 2 | Hotel results + map | Desktop list/map split; each hotel row has photo, name, neighborhood, verified amenities, review source if used and View stay. With live dates/inventory, show transparent nightly/total price basis and taxes/fees status; without live rates, use Check rates. |
| 3 | Choose your neighborhood | Compact comparison of where to stay, linked to Neighborhoods. Do not invent walking distances. |
| 4 | Stay by style | Boutique, family, extended stay and other collections supported by actual hotel attributes. |
| 5 | Build around your stay | Send selected lodging location and travel dates into the planner. A saved hotel is not a confirmed room. |

**Mobile order:** Dates/guest summary → Edit search → Filter / Map toggle → single-column hotel cards → neighborhoods → stay styles → plan prompt. Fullscreen map on request; selected card returns to the same list position.

**Detail / conversion flow:** Hotel detail: title/location → gallery → date/guest summary → rooms/rates from provider if connected → amenities → location → terms and property policies → provider handoff. Sticky Check rates or Continue to provider according to actual capability. Never invent an internal booking checkout.

**Required data:** Provider/property ID; official name; verified address; photos/rights; amenities; room/guest limits; check-in/out dates; room/rate option; currency; tax/fee inclusions; cancellation terms; booking link; freshness timestamp.

**Empty / error state:** Missing dates: browse hotels with Check rates. No availability: allow changed dates or nearby areas. Provider error: show an explicit rate-check failure and preserve selections.

## 7. Shop

Proposed route: `/shop`. H1: **Good here. Good anywhere.**

Support: Nashville, worn your way.

Primary action: **Shop the collection**. Filters: All, Headwear, Tees, Layers, Accessories.

| Order | Module | Layout and behavior |
|---|---|---|
| 1 | Collection introduction | Short title plus a restrained campaign image. On mobile, keep the first product row close to the top. Do not lead with a full-screen fashion video. |
| 2 | Product collection | Four columns desktop, two mobile where readable. Card: accurate product photograph, name, price/currency and available colors; link to product. Quick add only when variant requirements can be handled accessibly. |
| 3 | Brand story | A short editorial image/copy module after the first product group. Link back to culture content only where relevant. |
| 4 | Fit and confidence | Clear links to size guide, materials/care, shipping, returns and contact. Verified policies, no invented delivery promises. |
| 5 | New releases | Opt-in signup and footer. No fake scarcity, countdown timers or unverified bestseller tags. |

**Mobile order:** Compact campaign/title → category controls → two-column products (one at enlarged text if needed) → brand story → shopping support. Persistent bag count in header; Shop tab active.

**Detail / conversion flow:** Product detail: gallery with count/controls → name/price → available color and size → size guide → Add to bag → materials/fit/care → shipping/returns → related products. Sticky Choose size until valid selection; then Add to bag. Cart shows quantity, subtotal and fee explanation before provider checkout.

**Required data:** Commerce product/variant IDs; accurate price/currency; real inventory; actual color/size options; product photos; materials/fit/care; size guide; shipping/return policies.

**Empty / error state:** Unavailable variants disabled and named clearly. Empty collection offers valid other collections. Cart failure preserves choices and announces the error; no false added-to-bag confirmation.

## 8. Plan your trip

Proposed route: `/plan`. H1: **One good plan changes everything.**

Support: **Tell us who is coming. We’ll build the trip around you.**

Primary action: **Build our trip**. Governing specification: GROUP-TRIP-PLANNER.md.

| Order | Module | Layout and behavior |
|---|---|---|
| 1 | Your group | Occasion tiles: Bachelorette, Bachelor, Friends, Family, Couples, Corporate retreat, Other. Headcount, age ranges and dates. |
| 2 | Your style | Budget with scope, stay location, transport, interests, pace, must-dos and needs. Conditional questions by occasion; corporate meeting blocks differ from celebration preferences. |
| 3 | Your tailored plan | Generate a day-by-day draft that checks timing, group capacity, travel, prices and availability. Explain why each stop fits. Unknown facts remain visibly unverified. |
| 4 | Refine | Keep this stop, Swap, Lower the budget, Make it more relaxed, Rebuild this day. Preserve locked commitments. |
| 5 | Review/save/share | Known costs and exclusions, unresolved checks, booking links and persistence. Saving is not reserving. |

**Desktop:** short editorial introduction, substantial group-profile form; generated-result view uses context, schedule and alternatives columns.

**Mobile:** one short step at a time, then group recap and single-day timeline. Photos support the flow; never push the group form below a tall hero. Alternative suggestions and map open separately.

**Data and error states:** follow GROUP-TRIP-PLANNER.md. Explain infeasible schedules and missing availability rather than invent suitable stops. Respect ages and explicit requirements without stereotyping the group.

## Implementation acceptance
- Build all eight category templates, their relevant detail states and the shared shell. Wire to existing integrations; do not assume permission to replace a provider or deploy.
- Capture all eight pages at 390px and 1440px; inspect 320px and 430px for reflow. Review keyboard/focus, larger text, safe areas and modal/keyboard overlap.
- Test each primary journey: restaurant website/reservation handoff; tour date/option handoff; neighborhood-to-place; activity-to-plan; event ticket handoff; hotel date/rate handoff; product variant/cart/test checkout; itinerary save/reload/share when supported.
- Verify Back navigation, applied filter URL, provider failure and missing-data handling for every search-led page. Never label an outbound click as a completed booking.
- Preserve SEO/content routes and individual entity canonicals. Avoid indexing arbitrary filter combinations. No duplicated full entity pages across categories.
- Report which integrations actually work and which are blocked. Do not claim screenshot approval establishes functional readiness.

## Trip planner scope correction
GROUP-TRIP-PLANNER.md governs the planner. It creates an optimized itinerary from group occasion (including bachelorette or corporate retreat), headcount, age ranges, budget, dates, preferences and constraints. Earlier saved-list-first descriptions are superseded; saving and editing support the generated plan.
