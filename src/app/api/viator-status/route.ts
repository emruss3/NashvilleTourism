import { probeViatorAccess, searchNashvilleProducts, VIATOR_NASHVILLE_DESTINATION_ID } from '@/lib/feeds/viator';

/** Safe health snapshot for Viator; never returns the API key. */
export const dynamic = 'force-dynamic';

export async function GET() {
  const probe = await probeViatorAccess();
  const sampleSearch = probe.configured
    ? await searchNashvilleProducts({ count: 3, sort: 'TRAVELER_RATING' })
    : null;

  return Response.json(
    {
      configured: probe.configured,
      destinationId: VIATOR_NASHVILLE_DESTINATION_ID,
      inferredTier: probe.inferredTier,
      sampleProductCode: probe.sampleProductCode,
      probes: probe.probes.map((p) => ({
        endpoint: p.endpoint,
        method: p.method,
        httpStatus: p.httpStatus,
        ok: p.ok,
        clue: p.clue,
      })),
      sampleSearch: sampleSearch
        ? {
            live: sampleSearch.live,
            httpStatus: sampleSearch.httpStatus,
            productCount: sampleSearch.products.length,
            products: sampleSearch.products.map((p) => ({
              productCode: p.productCode,
              title: p.title,
              hasImage: Boolean(p.imageUrl),
              hasRating: p.rating != null,
              hasPrice: Boolean(p.fromPrice),
              hasProductUrl: Boolean(p.productUrl),
            })),
            error: sampleSearch.error,
          }
        : null,
      fetchedAt: probe.fetchedAt,
      notes: [
        'VIATOR_API_KEY is server-only and is never returned.',
        'Tier inference is heuristic from 200 vs 403 on gated endpoints.',
        'Basic Affiliate: /products/search + /products/{code} typically 200; /products/modified-since often 403.',
        'Full Access: modified-since / reviews / richer availability often 200.',
        'Full Access + Booking: /bookings/cart/* typically allowed.',
        'Merchant: /bookings/hold and merchant booking endpoints typically allowed.',
      ],
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
