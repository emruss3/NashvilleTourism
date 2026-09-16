# Homepage — mobile-first visual and implementation specification

Route: `/` on the existing site. Do not change domains as part of this layout work. The board is page-designs/00-homepage.png. This specification governs homepage behavior and order if the generated image differs.

## Purpose
The homepage connects daily city discovery, merchandise and group-based trip planning. Show a clear brand while giving visitors useful routes into all eight category pages. Plan is a personalized group optimizer, not simply a saved-place list.

## Composition
| Order | Desktop | Mobile |
|---|---|---|
| 1. Header | Authentic NSVL lockup; Explore, Events, Shop, Plan your trip; search/bag. Explore opens Restaurants, Tours, Neighborhoods, Things to do and Hotels. | Compact 64px header with menu, NSVL mark and bag. Bottom navigation Explore / Events / Shop / Plan. |
| 2. Intro + discovery | Asymmetric layout: paper-toned type/search block alongside a candid Nashville social photograph. H1 “Get into Nashville.” Support “Great music. Good food. Better company.” Search “Shows, places, neighborhoods” with Tonight / This weekend / Choose dates. | H1, short support, search and date shortcuts precede a short art-directed photo. At 390×844 search/date shortcuts are in the first viewport. No full-screen video or giant masthead. |
| 3. Category navigation | Compact links: Restaurants, Tours, Neighborhoods, Things to do, Events, Hotels. Shop/Plan remain in primary navigation and feature modules. | All six links wrap or form a two-row grid; do not hide essential links in a swipe-only rail. |
| 4. Events + apparel | Two complementary columns: three real event rows under “On the calendar.” and a large cap/tee campaign under “Good here. Good anywhere.” Events expose date/time/venue; shop links to an actual collection. | Events first, then the apparel feature. Use compact event rows and one strong product photograph. |
| 5. Neighborhoods | “Find your corner.” Three distinct landscape photographs for East Nashville, Germantown and Wedgewood-Houston; each has one concise description and guide link. | Move the compact group-planner starter ahead of this section. Use readable compact neighborhood rows or full-width cards, with a browse-all link. |
| 6. Group planner | A charcoal band: “One good plan changes everything.” Support “Tell us who is coming. We’ll build the trip around you.” Occasion selector, people and Build our trip. | Short headline and occasion/people entry, with Build our trip. Progressive questions continue on /plan; do not crowd the full optimizer questionnaire onto the homepage. |
| 7. Tours + hotels | Two editorial photo links into Tours and Hotels; concise purpose and explicit actions. | Two compact stacked links with images. All category routes are also directly accessible above. |
| 8. Weekly edit + footer | A slim email signup, then complete utility/legal/contact links and verified social accounts. | Short labeled form and compact link groups; reserve space for bottom navigation. |

## Group-planner starter
Offer Bachelorette, Bachelor, Corporate retreat, Family, Friends, Couples and Other through an accessible selector; if displaying only four shortcut chips, include a clearly visible All group types control. Preserve occasion and headcount on /plan. Ask dates, age ranges, budget/scope, stay location, transport and group-specific preferences there. Use GROUP-TRIP-PLANNER.md for the optimizer, eligibility and scheduling requirements.

## Interactions
- Global search routes to the existing search/discovery destination, preserving the query. Date shortcuts open Events with local America/Chicago boundaries computed at runtime. A date selector does not promise live lodging or restaurant availability.
- Category links lead to their real existing routes. The labels in this handoff are route intentions; inspect the repository before assigning slugs.
- An event title opens its detail page; Save is a separate control. Outbound tickets identify the provider. Real events only, with honest empty/error states.
- Shop NSVL opens a live collection. Campaign photography must represent actual merchandise before launch.
- Group-plan inputs persist into the wizard, and Back restores them. Saving an itinerary never creates a reservation.
- Newsletter success follows provider confirmation. No forced signup popup before browsing.

## Build requirements
Render semantic components with real text; never flatten the board as the webpage. Reuse shared SiteHeader, GlobalSearch, DateShortcuts, CategoryLinks, EventList, ShopFeature, NeighborhoodCard, GroupTripStarter and SiteFooter. Use a mobile-first document order and layout enhancement without duplicating interactive elements. Desktop pairings may use CSS grid; keyboard order must remain logical.

Use content-driven heights, appropriate image sizes, explicit image dimensions and restrained loading. Do not ship generated venue photography as real location documentation. Do not use the sample June dates, restaurants, prices or category claims as live data. Keep the authentic logo dependency explicit.

## Acceptance
Check homepage at 320, 360, 390, 430, 768 and 1440px. Verify all eight category destinations, search, dates, shop, planner starter and signup. Check larger text, slow images, safe areas and keyboard focus. Capture mobile and desktop screenshots; document actual integration gaps. This package is a design handoff, not completed production implementation.
