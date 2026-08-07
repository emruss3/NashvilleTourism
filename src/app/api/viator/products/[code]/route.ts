import { getViatorProduct } from '@/lib/feeds/viator';
import { viatorProvenance } from '@/lib/feeds/provider-provenance';

export const revalidate = 3600;

export async function GET(
  _request: Request,
  context: { params: { code: string } },
) {
  const code = decodeURIComponent(context.params.code || '');
  const result = await getViatorProduct(code);
  const fetchedAt = new Date().toISOString();

  return Response.json(
    {
      ...result,
      provenance: result.product ? viatorProvenance(result.product.productCode, fetchedAt) : null,
    },
    {
      status: result.live ? 200 : result.configured ? 404 : 503,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
      },
    },
  );
}
