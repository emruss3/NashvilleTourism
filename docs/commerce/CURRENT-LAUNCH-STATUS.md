# NSVL shop — October 1, 2026

This branch adapts the existing Shopify storefront draft to the current NSVL site. It adds Shopify product browsing, product details, variant selection, a persistent bag, quantity/removal controls and hosted-checkout handoff. The existing Paper White/Charcoal direction and navigation are preserved.

## Verified merchant state

- Connected store: `1st1aa-w4.myshopify.com`, Basic plan, USD.
- All 17 current products are DRAFT; all report zero inventory. Many are tagged `printful-pending`.
- US is the configured shipping country; the API did not expose verification of rates or payment-provider activation.
- App installation inspection is denied to the connected Shopify app. Printful installation/mapping cannot be verified through that connection.
- The older draft PR #3 has not been merged and conflicts with the current main branch.

## Finish the merchant setup

1. Configure the existing Headless storefront's private token in Vercel as `SHOPIFY_STOREFRONT_PRIVATE_TOKEN`; domain `1st1aa-w4.myshopify.com`; API `2026-07`. Enable it for both preview and production. Never put a private token in `NEXT_PUBLIC_*` or commit it.
2. Use the `nashroam` launch collection and publish approved products to the matching Headless sales channel. A missing configured collection now returns no products rather than exposing the whole catalog.
3. Reconcile the current older NSH catalog with the approved NSVL designs. Exclude the rejected Neighborhoods Map Print. Concept images are not supplier-ready artwork.
4. Verify each variant's supplier/Printful mapping, production artwork, costs, shipping and fulfillment billing. Do not invent inventory or enable overselling to bypass this step.
5. Verify Shopify Payments or the selected gateway is active; shipping rates, support contact and refund policies are ready; checkout domain/branding are correct.
6. In test mode, check variants, bag persistence, quantity/remove, checkout totals, shipping/tax and order creation; verify the order reaches Printful. Do not place a paid/sample order without an approved spending limit.
7. Obtain approval before publishing this branch publicly, consistent with the conversation's publishing restriction.

## Security and behavior

- Cart's full Shopify ID is held in an HttpOnly/SameSite cookie, not local storage or query-string URLs. Cart responses are private and uncached.
- Private Storefront credentials stay on the server.
- Cart mutations reject cross-origin requests and validate quantities.
- Fresh checkout URL and nonempty bag are checked before handoff.
- Missing credentials/catalog and provider outages show unavailable states; prices and availability are sourced from Shopify.
