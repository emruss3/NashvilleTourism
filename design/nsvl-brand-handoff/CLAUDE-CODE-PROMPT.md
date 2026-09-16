# Paste this into Claude Code

Implement the NSVL redesign for Nashville.com using this handoff. Read README.md, BRAND-GUIDE.md, SITE-LAYOUT.md, MOBILE-FIRST.md, CONTENT-AND-DATA.md, ACCEPTANCE-CHECKLIST.md and design-tokens.css before editing.

First inspect the existing repository, framework, routing, content sources, commerce, analytics and booking integrations. Follow existing repository instructions. Give a short implementation plan, then proceed with the authorized local implementation. Keep working integrations and stable URLs. Do not assume a framework, install a new backend, change domain/DNS or deploy solely because this design brief exists.

Visual source of truth:
1. Exact NSVL mark from references/selected-source.png. Do not draw a different logo or type NSVL in an approximate font. Use an existing authentic vector if the repo has one. If no production logo exists, explicitly record that asset gap and build the remaining UI; never silently present an approximation as final.
2. references/headline-edited.png documents the requested headline edit and composition.
3. design-tokens.css controls production colors: #F5F3ED and #1F2421. The screenshot retains its older black/cream palette only as a visual reference.
4. MOBILE-FIRST.md governs mobile hierarchy and behavior; SITE-LAYOUT.md governs remaining layout guidance. Design mobile first using the expected 60% mobile traffic mix.

Required copy: keep “Get into Nashville.” as the homepage H1. Replace every user-facing occurrence of “Your weekend starts here.” in the redesigned trip module with “One good plan changes everything.” Preserve the sentence in accessible text as well. The .com belongs in URLs/metadata/footer; it is not required in the logo.

Build semantic reusable components: SiteHeader, SiteFooter, Hero, DiscoveryForm, NeighborhoodCard, EventList/EventCard, ShopFeature, TripStarter, NewsletterForm, ProductCard, FilterPanel and appropriate page templates. Adapt names to repository conventions. Implement desktop/tablet/mobile using content-driven heights, not a screenshot-sized fixed canvas.

Start with the mobile homepage and shared tokens. Implement the four-destination mobile bottom navigation and mutually exclusive detail-page action bar specified in MOBILE-FIRST.md. Validate mobile journeys before expanding to desktop. Then implement events, neighborhood, shop, planner and journal templates against existing data. Every button must perform its stated action. Wire supplied integrations; if credentials or data are missing, provide an honest unavailable/empty state and document the dependency. Keep mock fixtures in development only. Do not deploy generated photos, fake concert dates, invented prices, false social proof or unlicensed assets.

Preserve existing SEO routes and content. If a route must move, prepare a one-to-one redirect map. Preserve working metadata/canonicals and structured data, verify them against the actual page data, and do not index arbitrary combinations of filters. Separate Nashville.com domain migration from visual redesign if the current host is Nashroam.com. Prepare migration instructions; do not make the domain change without its own authorization.

No provider secrets in browser code. No breaking changes to checkout, authentication or saved customer data. Reuse the existing stack and fetch boundaries. Make any newly introduced integration explicitly configurable and document it.

Verify at 320, 360, 390, 430, 768 and 1440px plus keyboard navigation. Follow the device, keyboard, safe-area, performance and journey checks in MOBILE-FIRST.md. Run existing build/lint/type checks and meaningful flow tests. Check filters, outbound tickets, product selection/cart, plan persistence and signup failure/success using real integrations or controlled test adapters. Capture screenshots and compare to the supplied reference. Confirm that the main headline change is exact. Report completed files, checks run, outstanding asset/integration dependencies and any flows that are not yet production-ready.

Deliver working repository changes, responsive screenshots and a concise implementation note. Do not claim completion merely because the homepage looks correct; confirm the actual routes and actions work.

Logo update: inspect logos/README.md. Provisional raster reconstructions are available. Use the charcoal silhouette with CSS masking for consistent flat-color web prototypes as shown in logos/logo-preview.html. Never deploy the paper-white review PNGs. Final vector and small favicon remain explicit dependencies.

Palette correction: use Paper White #F5F3ED and Charcoal Ink #1F2421 only as brand colors. Do not introduce a third accent. Keep logos, buttons, labels and packaging neutral; use borders, underlines and explicit text for interaction states.
