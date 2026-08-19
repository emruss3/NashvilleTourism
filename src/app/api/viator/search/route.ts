import { searchNashvilleProducts } from '@/lib/feeds/viator';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get('q') || undefined;
  const result = await searchNashvilleProducts({
    query,
    startDate: url.searchParams.get('startDate') || undefined,
    endDate: url.searchParams.get('endDate') || undefined,
    count: Math.min(Number(url.searchParams.get('count')) || 24, 50),
    start: Number(url.searchParams.get('start')) || 1,
    sort: url.searchParams.get('sort') || (query ? 'TRAVELER_RATING' : 'DEFAULT'),
    campaign: url.searchParams.get('campaign') || 'tours-marketplace',
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
