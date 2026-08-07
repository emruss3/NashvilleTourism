import { getViatorAvailabilitySchedules } from '@/lib/feeds/viator';

/** Availability schedules when the account tier permits (often 403 on Basic). */
export const revalidate = 300;

export async function GET(
  _request: Request,
  context: { params: { code: string } },
) {
  const code = decodeURIComponent(context.params.code || '');
  const result = await getViatorAvailabilitySchedules(code);

  return Response.json(result, {
    status: result.live ? 200 : result.httpStatus === 403 ? 403 : result.configured ? 502 : 503,
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    },
  });
}
