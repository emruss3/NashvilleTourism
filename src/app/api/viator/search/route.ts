import { searchNashvilleProducts } from '@/lib/feeds/viator';

export const dynamic = 'force-dynamic';

/**
 * Every request here becomes a paid Viator API call, so the inputs that can
 * multiply cost are bounded: `start` is capped, `sort` is an allowlist, and
 * the affiliate campaign is fixed server-side rather than taken from the
 * caller. Per-IP rate limiting still needs to be added in front of this.
 */
const MAX_START = 500;
const SORTS = new Set(['DEFAULT', 'TRAVELER_RATING', 'PRICE', 'ITINERARY_DURATION', 'DATE_ADDED']);
const CAMPAIGN = 'tours-marketplace';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get('q') || undefined;

  const rawStart = Number(url.searchParams.get('start')) || 1;
  if (rawStart > MAX_START) {
    return Response.json({ error: `start must be ${MAX_START} or less` }, { status: 400 });
  }
  const rawSort = url.searchParams.get('sort');
  const sort = rawSort && SORTS.has(rawSort) ? rawSort : query ? 'TRAVELER_RATING' : 'DEFAULT';

  const result = await searchNashvilleProducts({
    query,
    startDate: url.searchParams.get('startDate') || undefined,
    endDate: url.searchParams.get('endDate') || undefined,
    count: Math.min(Number(url.searchParams.get('count')) || 24, 50),
    start: Math.max(rawStart, 1),
    sort,
    campaign: CAMPAIGN,
  });

  return Response.json(
    {
      configured: result.configured,
      live: result.live,
      totalCount: result.totalCount,
      environment: result.environment,
      destinationId: '799',
      products: result.products.map((p) => ({
        productCode: p.productCode,
        title: p.title,
        productUrl: p.productUrl,
        imageUrl: p.imageUrl,
        rating: p.rating,
        reviewCount: p.reviewCount,
        fromPrice: p.fromPrice,
        durationLabel: p.durationLabel,
        freeCancellation: p.freeCancellation,
        flags: p.flags,
        categories: p.categories,
      })),
      error: result.error,
      fetchedAt: result.fetchedAt,
    },
    {
      status: result.configured ? 200 : 503,
      headers: { 'Cache-Control': 'private, max-age=60' },
    },
  );
}
