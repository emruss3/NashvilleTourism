# NSVL page designs — visual redesign

These nine desktop/mobile concept boards replace the previous generic wireframe atlas as the visual direction. Use PAGE-LAYOUTS.md for data requirements, failure states and interaction behavior, but follow these boards for composition, photography, hierarchy and overall design. Where they differ, the notes below govern placement. Do not copy illustrative listings into live data.

## Shared system
Paper White #F5F3ED and Charcoal Ink #1F2421, with neutral supporting tones only. Natural photographic colors are allowed. Use the authentic approved NSVL master in implementation; generated logos in boards are reference approximations. Mobile represents the primary audience (60% expected traffic), with compact header, visible search/task entry and Explore / Events / Shop / Plan navigation. Preserve actual existing routes and integrations. Rebuild as real HTML/components, not flattened page images.

## Page-by-page composition

### 00 — Homepage: the shared city destination
An asymmetric introduction combines search and social photography. Events and apparel share the first major desktop content row, followed by neighborhoods, the group planner, and tours/hotels. On mobile search comes first, events and apparel precede longer discovery, and the compact group-planner starter sits before neighborhoods. HOMEPAGE.md governs order and interactions. The full group questionnaire lives on Plan your trip.

### 01 — Restaurants: a dining editorial
Lead with a compact typographic introduction and asymmetric dining photography: a shared-table food photograph paired with an intimate interior. Make cuisine, neighborhood, occasion and price filters immediately accessible. A featured restaurant receives an editorial image/text split; the broader directory uses compact rows. End with dinner-before-the-show pairings and long-lunch collections. Optional map is a secondary view, not the main layout. Mobile elevates search and occasion filters above the editorial spread, followed by readable restaurant rows.

### 02 — Tours: an experience marketplace
Pair a behind-the-scenes experience photograph with a practical date/traveler panel. Use a short category rail followed by horizontal experience cards: photo, title/duration/departure information, then availability action. A featured music-venue experience gets a full editorial section. Finish with a suggested day around the experience. Mobile dates and traveler inputs precede large images; each card keeps duration and booking action visible. Venue tours require actual provider products.

### 03 — Neighborhoods: a city field guide
A signature street image sits beside a numbered neighborhood index. Below, an uneven photographic mosaic communicates different neighborhood identities. A half-day itinerary is a deliberate editorial feature with stop numbers and captions. End with choosing where to stay. Mobile replaces the desktop mosaic with a numbered directory and full-width neighborhood features. Do not use decorative invented maps.

### 04 — Things to do: a culture magazine
Lead with intent: what kind of day? Useful choices precede an asymmetric selection of activities. Make a suggested day a visual story across morning, afternoon and evening. Follow with searchable attractions and saved-plan actions. Keep evergreen discovery distinct from tour inventory and event dates. Mobile prioritizes intent controls and one strong feature, then compact activity rows.

### 05 — Events: a live calendar
Use a controlled charcoal music feature above a genuinely useful date-led schedule. Oversized day/date markers organize dense, clear rows; each row exposes venue/time and ticket-detail actions. A narrow desktop venue feature supports discovery without competing with the schedule. Mobile reduces the feature and prioritizes date shortcuts and event rows. No fabricated dates, celebrity appearances, availability or live prices.

### 06 — Hotels: an editorial shortlist
Pair a restrained room photograph with the primary stay search. Below, use wide hotel rows with substantial photography and legible stay information, not a dense tile grid. Neighborhood comparisons support the decision. Maps are secondary/on request. Mobile brings date/guest editing ahead of every large photo and makes Check rates easy to reach. Live rate totals and policies require provider data.

### 07 — Shop: a fashion storefront
Use an asymmetric campaign combining a person wearing NSVL with a product still-life. Follow quickly with category navigation and an exact product grid: four columns desktop, two mobile when readable. A materials/embroidery story gives the brand depth lower down. Mobile reduces campaign height so products are visible early. Accurate product photography, real price/inventory and variant selection govern the live storefront.

### 08 — Plan your trip: a group-optimized planner
Start with occasion tiles: Bachelorette, Bachelor, Friends, Family, Couples, Corporate retreat. Follow with headcount, age ranges, dates, budget and location. Ask tailored follow-ups, then generate a feasible itinerary around the group's needs. The output shows day-by-day recommendations with reasons, travel, cost and availability checks; users can lock stops, swap options and rebuild a day. Mobile uses progressive questions and one day at a time. GROUP-TRIP-PLANNER.md is the governing functional specification. The earlier generic saved-list planner board is superseded and excluded from this package.

## Implementation priorities
1. Build the mobile page hierarchy first, then desktop composition.
2. Use purposeful image crops and real licensed Nashville photographs; never publish generated geography, venues or products as documentary content.
3. Preserve a shared type scale, navigation, form controls and save interactions; variation comes from composition rather than unrelated UI systems.
4. Retain the existing specifications for failure/empty states, URLs, accessibility and provider handoffs.
5. Validate all eight mobile pages and key detail/conversion flows. These are art-direction concepts, not verified functional pages or production-ready photo assets.

Generation method: built-in image generation, with selected-source.png as the identity reference. Each board was requested as a distinct full desktop layout with a large responsive mobile counterpart; neutral palette, no colored brand accents, photo-led editorial detail and page-specific actions.

## Production corrections to illustrative boards
Use the same approved primary navigation on every page and retain the mobile bottom navigation specified in MOBILE-FIRST.md even where a rendering omits or duplicates a label. The planner headline remains “One good plan changes everything.” on mobile too. Make dates dynamic; none of the June dates in these boards are production defaults. All venue names, locations, menus, prices, group suitability and photographs shown are illustrative and must be verified/replaced. The final planner must include Other group type, mixed-age groups and budget scope as specified in GROUP-TRIP-PLANNER.md, even where space in the concept only shows a shorter selection.

Homepage board clarification: production mobile must include Things to do and Hotels in the six-link category navigation even where the concept condenses that row; use two rows. Keep the complete approved planner headline in the mobile module instead of the shorter illustrative “Plan together.” caption. Follow HOMEPAGE.md for exact written copy and mobile order.
