# Copy, assets, data and measurement

## Copy deck
| Module | Text |
|---|---|
| Hero eyebrow | MUSIC. PEOPLE. PLACES. |
| Hero H1 | Get into Nashville. |
| Hero support | Great music. Good food. Better company. |
| Hero CTA | Explore the city |
| Discovery CTA | Find your plans |
| Neighborhood H2 | Find your corner. |
| Neighborhood support | Different neighborhoods. A closer Nashville. |
| Neighborhood link | Explore all neighborhoods |
| Events H2 | On the calendar. |
| Events link | See all events |
| Shop H2 | Good here. Good anywhere. |
| Shop support | Nashville, worn your way. |
| Shop CTA | Shop NSVL |
| Trip eyebrow | PLAN YOUR TRIP |
| Trip H2 | One good plan changes everything. |
| Trip support | Find the shows, tables and places that make the trip yours. |
| Trip CTA | Build a trip |
| Signup H2 | Your next good plan. |
| Signup support | A weekly edit of Nashville shows, places and new releases. |
| Signup CTA | Send me the edit |
| Events empty | No events match those filters. Try another date or neighborhood. |
| Events error | We couldn’t load events. Please try again. |
| Plan local-save notice | Saved on this device. |

## Minimum data contracts (adapt to existing schemas)
- Event: stable ID, slug, title, description, start/end timestamps with timezone, venue ID/address, category, neighborhood, image/alt/rights, source URL, ticket URL, status, optional price/currency, last-verified timestamp. Render event times in America/Chicago; preserve timezone-aware values.
- Place: ID, slug, name, category, neighborhood, address, coordinates, verified opening hours if available, source, last-reviewed date, image rights, editorial description. Unknown hours stay unknown.
- Product: commerce provider ID, slug, title, description, image variants, variants/options, currency/price, availability, size guide, shipping/return information. Provider is authoritative for price and inventory.
- Guide: slug, title, author, publication/update date, original body, related place/event IDs, media/captions/rights and metadata.
- Itinerary: ID when persisted, dates, party size, ordered day/items referencing real records, optional notes, ownership and visibility. Do not store personal travel details in analytics payloads.

## Required assets
| Asset | Desired delivery | Status |
|---|---|---|
| Exact logo master | SVG plus editable source | Needed; raster reference supplied |
| Small-size brand mark | Approved SVG + favicon set | Needed; no derivative approved |
| Hero | Licensed wide image plus mobile crop | Needed; concept is illustrative |
| Three neighborhoods | Licensed real-location landscape photographs | Needed |
| Events | Source-authorized thumbnails | Integrate with event inventory |
| Apparel | Accurate product photography + variants | Needed from actual catalog |
| Fonts | Licensed WOFF2 files | Proposed family selection |
| Social share | 1200×630 template with verified assets | Create after logo approval |

Each asset record should include filename, creator/source, license or permission, subject/location verification, alt text, focal position, intended dimensions and expiry if applicable. Decorative assets use empty alt text. Avoid text-in-image for functional UI.

## Performance targets for implementation
These are design targets, not measured results: LCP <=2.5s, INP <=200ms and CLS <=0.1 at the 75th percentile after launch. Before launch inspect representative mobile lab results. Use explicit media dimensions, responsive sizes, AVIF/WebP where supported, lazy loading below the fold and early priority for the actual hero. Avoid loading all booking/shop widgets on every route. Keep nonessential scripts deferred. Start with a homepage compressed image budget around 1MB, then measure and adjust.

## Search and growth
Ten million annual visits is an ambition, not an expected result of this redesign. It is approximately 833,333 visits/month. The content/product system should support multiple repeatable reasons to visit: updated event pages, original neighborhood guides, useful weekly plans, local reporting and product releases.

Build indexable original destination pages with useful internal links, XML sitemaps and accurate canonical URLs. Generate Event/Product/Article structured data only when fields match visible verified content. Keep canceled/expired events accurate; provide alternatives rather than silently republishing old dates. Do not create thousands of thin AI-generated location pages. Use crawlable links for core content. For the Nashroam-to-Nashville.com move, explicitly plan redirects, canonical changes, sitemap host updates and search-console validation as a separate migration.

Suggested editorial cadence is a planning proposal: weekly city edit and event verification; monthly neighborhood reviews; product launches aligned with actual supply. Assign named content owners before promising that cadence.

## Measurement plan
Implement through the current consent-aware analytics system. Event names are proposed and should map to existing conventions:
- discovery_submit: category, neighborhood, date-window type; no raw personal inputs.
- event_view; ticket_outbound_click: event ID and provider.
- neighborhood_view; place_save: content IDs.
- product_view; add_to_cart; checkout_start; purchase: provider-approved commerce schema.
- plan_start; plan_item_add; plan_save; plan_share: IDs/counts, never private itinerary notes.
- newsletter_submit; newsletter_success: never include the email address.

Track total visits separately from unique users. Evaluate event-click conversion, product conversion, revenue per session, plan completion, signup conversion and repeat visits by landing page/device/channel. Establish a baseline before asserting uplift. Avoid rewarding page-view volume that produces no useful action.

## AI image direction update
AI-IMAGERY.md supersedes the earlier requirement to source replacement photography for every slot. Use the owner-approved AI pictures, producing individual assets from the supplied boards. Keep actual provider/entity facts separate from illustrative visual content.
