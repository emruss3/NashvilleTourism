# NashRoam white-label commerce setup

This repository now provides the customer-facing storefront at:

- `https://www.nashroam.com/shop/`
- `https://www.nashroam.com/shop/[product-handle]/`
- `https://www.nashroam.com/cart/`

Shopify is the private commerce backend. Printful receives paid Shopify orders and fulfills the products without exposing a Printful storefront to the customer.

## Architecture

```text
NashRoam on Vercel
  ├─ Product and collection pages
  ├─ Variant selection
  ├─ Persistent cart and cart drawer
  └─ Server-only Storefront API requests
          ↓
Shopify Headless storefront
  ├─ Catalog
  ├─ Pricing and inventory
  ├─ Discounts, tax, shipping, payments
  └─ Hosted checkout
          ↓
Printful Shopify app
  ├─ Product production
  ├─ White-label packing slips
  └─ Shipping and tracking
```

## 1. Create the Shopify store

1. Create the Shopify store and retain the permanent `*.myshopify.com` domain.
2. Set the store name and sender email to NashRoam.
3. Configure Shopify Payments or another supported payment provider.
4. Configure US shipping zones, tax settings, refund policy, privacy policy, terms, and contact information.
5. Keep the default Online Store password enabled until the headless storefront has been tested.

The code needs the permanent Shopify hostname, not a custom marketing domain. Example:

```text
nashroam.myshopify.com
```

## 2. Install the Shopify Headless sales channel

1. In Shopify Admin, install and pin the **Headless** sales channel.
2. Open **Sales channels → Headless**.
3. Click **Add storefront**.
4. Name it `NashRoam Vercel`.
5. Under Storefront API permissions, enable the minimum permissions needed to read product listings. Cart creation and updates are also used by the site.
6. Copy the **private Storefront API token** once it is shown.

Never paste that private token into source control or a variable beginning with `NEXT_PUBLIC_`.

## 3. Add Vercel environment variables

In Vercel, open:

**nashville-tourism → Settings → Environment Variables**

Add these to Production and Preview:

```text
SHOPIFY_STORE_DOMAIN=nashroam.myshopify.com
SHOPIFY_STOREFRONT_PRIVATE_TOKEN=<private token from Headless channel>
SHOPIFY_STOREFRONT_API_VERSION=2026-07
SHOPIFY_COLLECTION_HANDLE=nashroam
```

The collection handle is optional. If it is blank, the site shows every product published to the Headless storefront.

Existing domain variables should remain:

```text
NEXT_PUBLIC_SITE_URL=https://www.nashroam.com
NEXT_PUBLIC_BASE_PATH=
NEXT_PUBLIC_ALLOW_INDEXING=false
```

Redeploy after adding or changing environment variables.

## 4. Create the NashRoam collection

1. In Shopify Admin, create a collection named `NashRoam`.
2. Confirm its URL handle is `nashroam`, or change `SHOPIFY_COLLECTION_HANDLE` to match.
3. Publish the collection and every product to the `NashRoam Vercel` Headless sales channel.
4. Keep products as drafts until their samples, descriptions, pricing, images, and size charts are approved.

Recommended initial assortment:

- Premium heavyweight T-shirt
- Soft everyday T-shirt
- Embroidered crewneck
- Premium hoodie
- Embroidered dad hat
- Structured cap
- Canvas tote
- One children’s piece
- One art print
- One small impulse product

## 5. Connect Printful to Shopify

1. Install **Printful: Print on Demand** from the Shopify App Store.
2. Sign in to the NashRoam Printful account.
3. Connect the Shopify store.
4. Create products in Printful, order samples, and publish approved products to Shopify.
5. Confirm each Shopify variant lists Printful as its fulfillment/inventory location.
6. Publish the resulting Shopify products to the Headless sales channel as well as any channel required by Printful.

The website does not call the Printful API. The native Shopify integration is responsible for fulfillment.

## 6. Configure automatic fulfillment

Choose the operating model deliberately.

For automatic production after payment:

1. In Shopify Admin, go to **Settings → General → Order processing**.
2. Under **After an order has been paid**, enable automatic fulfillment of line items.
3. In Printful, confirm synced orders are imported and automatically confirmed for fulfillment.
4. Add a valid Printful billing method. Shopify collects customer payment; Printful separately charges the store for production and shipping.

For the first test orders, manual review is safer. Switch to automatic fulfillment only after product mapping, addresses, taxes, shipping, and billing are confirmed.

## 7. Configure white-label branding

In Printful:

1. Go to **Settings → Store settings → Branding**.
2. Upload the NashRoam logo for packing slips and shipping labels.
3. Add NashRoam customer-support details and a short packing-slip message.
4. Create a default branding preset for the store.
5. For supported products, submit custom mailers and pack-ins for approval, then ship inventory to the relevant fulfillment facilities.

Printful standard shipments omit Printful branding. Custom mailers and pack-ins are not supported for every product or fulfillment location, so product selection should account for those limits.

## 8. Configure branded checkout

The Storefront API returns Shopify’s hosted checkout URL. To keep the experience under the NashRoam domain family:

1. In Shopify Admin, go to **Settings → Domains**.
2. Choose **Add custom checkout domain**.
3. Enter:

```text
checkout.nashroam.com
```

4. Shopify will display the exact DNS record required.
5. Add that record in Namecheap, where the NashRoam DNS zone is currently managed.
6. Return to Shopify and verify the domain.
7. Use Shopify’s checkout editor to apply the NashRoam logo, colors, typography, policies, and support information.

Do not invent an A or CNAME value; use the value Shopify provides for this store.

## 9. Test the complete order flow

Before publishing:

1. Publish one test product to the Headless storefront.
2. Open the Vercel preview deployment.
3. Verify product images, options, sold-out states, price, compare-at price, and mobile layout.
4. Add each variant to the cart.
5. Refresh the browser and confirm the cart persists.
6. Change quantities and remove items.
7. Continue to checkout and verify the checkout hostname and branding.
8. Place a Shopify test order.
9. Verify the order appears in Printful with the correct product and variant.
10. Confirm the fulfillment location, packing slip, tracking update, tax, and shipping charge.
11. Place one real sample order before opening the shop publicly.

## 10. Go-live gates

- Shopify catalog and Headless publication complete
- Printful products synced variant-for-variant
- Physical samples approved
- Product photography and size charts approved
- Checkout domain verified
- Return, privacy, shipping, and terms reviewed
- Customer-support inbox operating
- Test order fulfilled successfully
- Vercel Production environment variables added
- Vercel production redeployed
- `/shop/`, product pages, cart, and checkout tested on mobile

Keep `NEXT_PUBLIC_ALLOW_INDEXING=false` until the main Nashville content and business identity launch gates are also complete.
