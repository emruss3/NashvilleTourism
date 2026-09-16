# Mobile-first design specification — v1.1

## Governing decision
The owner expects 60% of traffic to be mobile. Treat this as a planning assumption, not verified analytics. Design and approve mobile journeys first, then expand to desktop. This document overrides conflicting mobile hierarchy and interaction guidance elsewhere in this package. The existing desktop references remain brand references, not mobile layout templates. No live site changes are included in this handoff.

Keep the exact approved NSVL mark, Paper White #F5F3ED and Charcoal Ink #1F2421. Preserve the existing approved homepage H1 and trip-planning headline. Mobile must retain the same editorial photography, confident typography and apparel identity.

## Homepage: mobile order
1. Compact 64px header: menu, authentic NSVL logo linked home, bag with real count. Search is a visible field below, not another tiny header icon.
2. Compact introduction: “Get into Nashville.” and one short supporting sentence. No full-screen splash or giant desktop masthead.
3. Search field: “Shows, places, neighborhoods”. Visible quick date links: Tonight / This weekend / Choose dates. Search and quick links should be reachable in the first viewport at 390×844 with default text size; allow natural reflow for larger text and shorter devices.
4. One art-directed Nashville photograph, approximately 200–240px tall at a 390px viewport. Preserve faces and important subjects; no autoplay hero video. Search comes before the photo in reading order.
5. “On the calendar”: three compact event rows with thumbnail, date, title, venue and time; then “See all events”. Use real current data or an honest empty state. Selected homepage dates must carry into results.
6. “Good here. Good anywhere.”: one strong apparel campaign image, concise copy and Shop NSVL link. The shop should not be buried after a long neighborhood catalog.
7. “Find your corner”: three compact neighborhood cards and a browse-all link. Use normal vertical flow; do not require swiping to discover essential content.
8. Trip starter: “One good plan changes everything.”, dates, people, Build a trip. Ask further interests on the next step. Persistent Plan navigation also gives immediate access without scrolling here.
9. Newsletter and compact footer.

Render each module once. Reorder through a mobile-first document structure or purposeful layout changes without duplicate interactive content or mismatched visual/keyboard order. Desktop may group modules into wider regions.

## Navigation and overlays
Under 768px, use a bottom navigation bar with four labeled destinations: Explore, Events, Shop, Plan. Use icons plus visible labels; logo returns home. Active state is not color alone. Keep the menu for Neighborhoods, Eat & Drink, Journal, About and other secondary links. Plan includes saved items; do not add a fifth competing tab.

Base bar height 64px plus device safe-area inset. Reserve equivalent content padding so footer links and controls remain visible. On event and product detail pages, replace the bottom navigation with the purchase action bar when the main action scrolls out of view; never stack both bars. Header/menu still provides navigation. Hide custom bottom bars while a modal or on-screen keyboard would cause overlap. Checkout uses the commerce provider's own UI.

Filters open in an accessible sheet or full-screen dialog: clear heading, labeled controls, Close, Reset and Apply. Draft edits do not alter the results until Apply. Close discards unapplied changes. Applied values live in the URL. Preserve scroll and filters on return from details. Focus stays in the modal, Escape closes it, and focus returns to the invoking control. Native date controls or an existing accessible picker are preferable to a custom calendar without keyboard support.

## Journey requirements
| Journey | Mobile layout and behavior |
|---|---|
| Event discovery | Search, date shortcuts, filter button with active count, results count, single-column compact rows. Real links for pagination. Map loads only when requested. |
| Event detail | Title, date/time, venue and ticket action before long descriptions. Sticky “Get tickets” action only when original CTA is offscreen. Show price only when sourced; identify outbound provider. Save is separate from booking. |
| Shop collection | Short campaign introduction; two product columns where titles and prices fit; one column at narrow widths or enlarged text if needed. Filter sheet only when useful. |
| Product detail | Swipeable gallery with visible controls and image count, then title, price, variant controls, size guide and add-to-bag. Sticky action says “Choose size” and opens/focuses the required selector until a valid variant is selected. Never silently pick a size. Show stock and errors accurately. |
| Cart/checkout | Editable quantity, remove, subtotal, shipping/tax explanation and checkout. Preserve bag across navigation. Guest and wallet checkout only when the existing provider supports and enables them; verify in test mode. |
| Trip planning | One short step at a time, visible Back, preserved inputs. Day-by-day list is default. Reorder with accessible move controls as well as optional drag. Saved does not mean reserved. Only advertise sharing when backed by a durable working service. |
| Search landing/article | Deep links work independently of homepage. Useful content, event details or product information appear early. Avoid compulsory account creation before browsing or saving a local draft. |

## Type, touch and color
Use 20px page gutters (16px at the narrowest widths), approximately 16px body/form text, 14px supporting metadata and content-driven headings around 36–44px. No fixed-height text containers. Interactive hit areas are at least 44×44px; primary buttons 48px tall or larger. Allow 200% text resizing and reflow at 320px. No hover-only information or actions. Keep visible focus and accessible error announcements.

Use Charcoal Ink with Paper White for primary readable text and buttons. Use the same neutral palette for active states, with borders, underlines and labels to communicate meaning. Check every actual color pair before using it for essential text or controls. Never substitute an approximate font for the logo to make it fit.

## Loading and performance implementation targets
These are project acceptance targets, not measured results or guaranteed outcomes. Aim for LCP <=2.5s, INP <=200ms and CLS <=0.1 at the mobile 75th percentile after launch. Prelaunch use repeatable lab checks as proxies; report device/network settings and limitations, not invented field scores.

Ship appropriately sized responsive images with reserved dimensions, prioritize only the actual likely LCP image, and lazy-load below-fold media. Avoid downloading desktop-sized images to small screens. Load maps, booking widgets and video players on demand. Subset/self-host fonts when licensing allows; avoid unnecessary font weights. Reuse existing integrations and inspect bundle cost before adding UI libraries. Do not sacrifice useful text or indexable content to chase a single score.

## Mobile acceptance before desktop sign-off
- Check 320, 360, 390 and 430px widths, portrait and landscape; then tablet and desktop. Include a 390×844 homepage screenshot.
- Verify real iOS Safari and Android Chrome when available; document if only emulation was possible.
- Complete event filter → detail → ticket-provider handoff → Back, preserving context.
- Complete product → required variant → bag → provider test checkout, including out-of-stock/error states.
- Complete dates → itinerary → save → reload; verify share from a second browser only if supported.
- Verify bottom safe area, keyboard-open forms, long titles, empty/error/loading states, slow image loads, larger text and modal focus.
- No overlap between bottom nav, sticky purchase action, consent UI, keyboard or focused fields. No horizontal page overflow.
- Track discovery searches, event-provider clicks, product views, add-to-bag, checkout starts, confirmed purchases where integration allows, and itinerary saves by device class. Outbound booking clicks are not completed bookings. Avoid personal or sensitive search content in analytics.

Approve the mobile homepage, event detail, product detail and planner screenshots plus their working journeys before judging the desktop redesign complete.
