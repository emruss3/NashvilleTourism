# NSH Shopify Storefront

## Current state

- Store: `nashroam.myshopify.com`
- Nine NSH products exist as Shopify **drafts** with concept media attached.
- Existing Shopify collections organize the assortment: Nashville Collection, Tees, Hats, Accessories, Two-Tone Blue, and The Neighborhoods.
- `/shop` renders the nine-product concept assortment from repository-controlled product data and Shopify-hosted media.
- The page checks Shopify's public product JSON endpoint every five minutes. A draft returns no public product; a published product returns live variants.
- When a product becomes public, its variant selector and direct Shopify cart link enable automatically. No Storefront API token is required.

## Why tokenless checkout

Storefront access-token creation is not automated. The storefront uses public product endpoints and Shopify cart permalinks instead. This keeps checkout, taxes, shipping, fraud controls, and payment processing inside Shopify while allowing the tourism site to own the merchandising experience.

## Publish workflow

1. Approve the blank, art scale, thread/ink colors, and physical sample.
2. Map the product to Printful or the contract fulfillment workflow.
3. Confirm inventory and shipping settings.
4. Set the Shopify product from Draft to Active and publish it to the Online Store sales channel.
5. Within five minutes, `/shop` detects the product and enables its real variant selector and Shopify cart button.

## Product-media workflow

Concept images are hosted in Shopify Files and attached to the draft products. Products that use the NSH mark also carry the official `public/brand/nsh.png` asset as supporting media; the mark is never redrawn. The website overlays that official asset on the blank concept mockups where placement needs to be visible.

## Production gates

- The map remains concept artwork until the Cumberland River, arterial geometry, and labels are checked against an approved GIS/Mapbox base.
- The Weekender stays draft until the physical blank and hardware are approved.
- Embroidery vendors need the official AI/SVG source, not a reconstructed wordmark.
