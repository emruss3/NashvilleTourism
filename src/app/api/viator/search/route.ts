import { searchNashvilleProducts } from '@/lib/feeds/viator';
import { viatorProvenance } from '@/lib/feeds/provider-provenance';

/** Nashville Viator product search — server-only key. Cache ≤ 1 hour. */
export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || searchParams.get('query') || undefined;
  const startDate = searchParams.get('startDate') || searchParams.get('date') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const start = Number(searchParams.get('start') || '1');
  const count = Number(searchParams.get('count') || '24');

  const result = await searchNashvilleProducts({
    query,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    start: Number.isFinite(start) ? start : 1,
    count: Number.isFinite(count) ? count : 24,
  });

  return Response.json(
    {
      ...result,
      provenance: result.products.map((p) => viatorProvenance(p.productCode, result.fetchedAt)),
    },
    {
      status: result.configured ? 200 : 503,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
      },
    },
  );
}
