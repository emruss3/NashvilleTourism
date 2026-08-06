# NashRoam merchandise launch checklist

## Brand and assortment

- [ ] Initial collection limited to 8–12 approved products
- [ ] Every garment fits the elevated 25–45 customer direction
- [ ] No novelty souvenir products or unapproved city marks
- [ ] Color palette limited and coordinated across the collection
- [ ] Product names rewritten in the NashRoam voice
- [ ] Printful supplier/model names removed from customer copy

## Samples and product quality

- [ ] Physical sample ordered for every garment blank
- [ ] Every print treatment washed at least three times
- [ ] Embroidery density, placement, backing, and thread colors approved
- [ ] Sizing verified against the published size chart
- [ ] Product photography approved on desktop and mobile
- [ ] Packaging and packing slip reviewed through a real sample order

## Shopify

- [ ] Headless storefront created
- [ ] Products and collection published to the Headless channel
- [ ] Shopify Payments or payment provider active
- [ ] Taxes configured
- [ ] Shipping zones and rates configured
- [ ] Discount-code behavior tested
- [ ] Refund, privacy, shipping, and terms policies published
- [ ] `checkout.nashroam.com` verified
- [ ] Checkout branding matches NashRoam

## Printful

- [ ] Shopify app connected
- [ ] Every Shopify variant synced to the correct Printful variant
- [ ] Printful fulfillment location assigned
- [ ] Billing method active
- [ ] Automatic import/confirmation setting chosen deliberately
- [ ] NashRoam logo and support details on packing slips
- [ ] Default branding preset assigned
- [ ] Custom packaging and pack-in compatibility checked per product

## Vercel

- [ ] `SHOPIFY_STORE_DOMAIN` set
- [ ] `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` set as Sensitive
- [ ] `SHOPIFY_STOREFRONT_API_VERSION=2026-07`
- [ ] `SHOPIFY_COLLECTION_HANDLE` matches Shopify
- [ ] Production redeployed after variables were saved
- [ ] `/shop/`, `/shop/[handle]/`, `/cart/`, and cart API tested

## End-to-end testing

- [ ] Add each size/color combination to the bag
- [ ] Bag persists after refresh and navigation
- [ ] Quantity update and removal work
- [ ] Sold-out variants cannot be purchased
- [ ] Checkout uses the branded domain
- [ ] Test payment succeeds
- [ ] Correct order reaches Printful
- [ ] Printful receives the correct SKU/variant
- [ ] Fulfillment and tracking flow back to Shopify
- [ ] Confirmation and shipping emails show NashRoam branding
- [ ] Real sample order delivered and inspected
