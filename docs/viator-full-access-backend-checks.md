# Viator Affiliate API with full access - back-end checks

Prepared for NashRoam. Endpoint plan: **real-time search model only**.

## General questions

**1. What is your company name?**  
NashRoam.

**2. Is this a B2B or B2C implementation, or both?**  
B2C.

**3. Is this implementation for desktop, mobile, or app?**  
Responsive web for desktop and mobile. No native app is currently included.

**4. How many destinations do you support? Which destinations do you exclude, if any, and why?**  
One destination: Nashville, Tennessee, USA (Viator destination ID 799). We exclude all other destinations because NashRoam is a Nashville-specific travel guide and trip-planning product.

**5. How many products do you support? If you filter out some products, what criteria is it based on? Are you going to add more products post launch?**  
We do not maintain or ingest a fixed Viator product catalog. We support active Nashville products returned by Viator's real-time search endpoints. Search pages request and display up to 50 products per page. Additional pages are requested only after the customer explicitly asks to see more results. We filter to Nashville, exclude inactive/unusable results or results without the Viator affiliate product URL, and may apply presentation-only local-relevance/intent safeguards to avoid clearly unrelated matches. Additional Nashville products can appear automatically as Viator's live search inventory changes; we do not add them through a background ingestion process.

## Endpoint usage

| Endpoint | Ingestion | Real-time | Additional notes |
|---|---|---|---|
| `/products/modified-since` | Not used | Not used | NashRoam does not ingest Viator product content. |
| `/products/bulk` | Not used | Not used | Not part of the current workflow. |
| `/products/{product-code}` | Not used | Yes | Called only for one product selected by the customer from search results. Product pages are cached/revalidated for no more than 1 hour. |
| `/availability/schedules/modified-since` | Not used | Not used | NashRoam does not ingest availability/pricing schedules. |
| `/availability/schedules/bulk` | Not used | Not used | Not part of the current workflow. |
| `/availability/schedules/{product-code}` | Not used | Yes | Called only for one product selected by the customer. Used to populate valid dates/options/times and Viator age-band pricing. Cached for 5 minutes, never more than 1 hour. |
| `/products/search` | Not used | Yes | User-initiated Nashville destination browse only. `count` is capped at 50. First page uses `start: 1`; subsequent calls use `start: 51`, `101`, etc. Additional calls occur only when the customer selects More results. Search responses are cached/revalidated for no more than 1 hour. |
| `/search/freetext` | Not used | Yes | User-initiated text search only. Product search type, Nashville destination filter, maximum 50 products/call, and the same explicit customer-driven pagination rules as `/products/search`. Cached/revalidated for no more than 1 hour. |
| `/products/tags` | Not used | Not used | Not required by the current implementation. |
| `/products/booking-questions` | Not used | Not used | Checkout remains on Viator. |
| `/locations/bulk` | Not used | Not used | NashRoam does not use this endpoint in the current implementation. |
| `/exchange-rates` | Not used | Not used | Current implementation requests/displays USD and does not use Viator exchange-rate data. |
| `/reviews/product` | Not used | Not used | NashRoam does not retrieve or display individual review text from this endpoint. |
| `/suppliers/search/product-codes` | Not used | Not used | Not required by the current implementation. |
| `/destinations` | Not used | Not used | Nashville destination ID 799 is fixed in the application; no destination catalog refresh is required. |
| `/attractions/search` | Not used | Not used | Attraction API data is not used. |
| `/attractions/{attraction-id}` | Not used | Not used | Attraction API data is not used. |
| `/products/recommendations` | Not used | Not used | NashRoam uses user-initiated Viator search rather than this endpoint. |
| `/availability/check` | Not used | Yes | Called only after the customer has selected a specific product, travel date, product option/start time where applicable, and a passenger mix using Viator age bands. Never used for ingestion. Response is not cached. If the returned live price differs from the previous schedule estimate, the new price is shown/applied before the customer continues to Viator. |

NashRoam is an Affiliate implementation. We do **not** use Viator booking, payment, hold, cancellation, or booking-status endpoints. Final checkout and customer payment are completed on Viator using the exact affiliate `productUrl` returned by Viator.

## Product search

**7. Do you provide search results to customers that are returned by our search endpoint or do you return search results directly from your database?**  
Search results are returned directly from Viator's real-time `/products/search` or `/search/freetext` response. We do not serve a stored/ingested Viator product catalog from our database as a search-results source.

**8. If you're using the search endpoint(s), can you confirm that pagination has been applied and you're not requesting more than 50 products at a time, and making additional requests only when the customer wants to see more products?**  
Yes. We cap each search request at 50 products. The first page uses `start: 1`, and additional pages use `start: 51`, `101`, etc. A new search API request is made only after the customer explicitly chooses to view more results. We do not automatically pull all Nashville products when a search is initiated.

## Attractions

**9. Do you use attraction data from the API? If so, could you confirm that it's not indexed?**  
No. We do not use Viator attraction API data in the current implementation.

## Reviews

**10. Do you display Viator or Tripadvisor reviews from the API? If so, could you confirm that this data is not indexed?**  
We do not retrieve or display individual review text. We display only the aggregate overall rating and total review count included in Viator product search/detail responses. Viator marketplace/search and product-detail pages are explicitly `noindex`, so this provider review-scoring content is not indexed.

**11. If the reviews or review scoring from the API are used on your site, do you indicate the provider of the reviews (Viator/Tripadvisor)?**  
Yes. Where aggregate rating/review count is displayed, NashRoam visibly attributes it to Viator and Tripadvisor. Product detail pages use the wording: "Total review count and overall rating based on Viator and Tripadvisor reviews."

## Exchange rates

**12. Do you use the Viator exchange rates from the `/exchange-rates` endpoint?**  
No. The current implementation requests and displays USD and does not call `/exchange-rates`.

## Locations

**13. Do you have access to Google Places API to retrieve details of Google locations using the `providerReference` from the `/locations/bulk` response?**  
No. `/locations/bulk` is not used in the current Viator integration, so Google `providerReference` location enrichment is not part of this implementation.

## Recommendations

**14. Do you use the `/products/recommendations` endpoint? If so, could you explain how it's used?**  
No. This endpoint is not used.

**15. Which product content endpoint do you use to retrieve product content details for products returned in the `/products/recommendations` response? How many products do you request information for when generating a single recommendation?**  
Not applicable because `/products/recommendations` is not used.

**16. Which availability endpoint do you use to retrieve availability or pricing details for products returned in the `/products/recommendations` response? How many products do you request information for when generating a single recommendation?**  
Not applicable because `/products/recommendations` is not used.

## Real-time availability and pricing

**17. Do you conduct availability and pricing checks in real-time prior to booking? If so, at what stage of the booking flow and what endpoint do you use?**  
Yes. On a product selected from search, NashRoam first uses `/availability/schedules/{product-code}` to show available dates/options/times and age bands. After the customer selects a specific date and passenger mix, NashRoam calls `/availability/check` in real time to confirm the current availability and price before the customer continues to Viator for checkout.

**18. Can you confirm that the `/availability/check` endpoint is used when a specific date and passenger mix (age bands) are selected?**  
Yes. The application does not call `/availability/check` until a specific product, travel date, and at least one valid Viator age-band passenger count have been selected. Product option and start time are also included when required by the schedule.

**19. In case of pricing differences between previously quoted price and the new price from the `/availability/check` response, do you apply the new price?**  
Yes. The live `/availability/check` response supersedes any earlier schedule estimate. The new price is displayed to the customer before the Viator handoff.

## Timeout

**Have you implemented a timeout for API services on your end? If so, how long is it?**  
Yes. Viator provider requests and the server-to-Edge-function boundary use a 120-second timeout.

## Additional implementation controls

- No Viator product or availability ingestion jobs are scheduled.
- The legacy `viator-sync` ingestion Edge Function is fail-closed and returns HTTP 410.
- The public health/status endpoint does not call Viator search endpoints; `/products/search` remains reserved for customer-initiated search.
- Search/product marketplace pages are noindex to prevent Viator review-scoring/provider marketplace content from being indexed.
- Viator API keys are stored only in Supabase Edge Function secrets and never exposed to browser code.
