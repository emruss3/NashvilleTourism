import { invokeEdgeFunction, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ScheduleEnvelope = {
  ok?: boolean;
  schedule?: unknown;
  error?: string;
  environment?: string;
  rateLimitRemaining?: string | null;
  retryAfter?: string | null;
};

export async function GET(
  _request: Request,
  context: { params: { code: string } },
) {
  const code = decodeURIComponent(context.params.code || '').trim();
  if (!code) {
    return Response.json(
      { configured: false, live: false, error: 'product code required' },
      { status: 400 },
    );
  }
  if (!isSupabaseConfigured()) {
    return Response.json(
      { configured: false, live: false, error: 'Supabase not configured' },
      { status: 503 },
    );
  }

  const result = await invokeEdgeFunction<ScheduleEnvelope>('viator-availability', {
    mode: 'get_schedules',
    productCode: code,
  });
  const live = Boolean(result.ok && result.data?.ok && result.data?.schedule);

  return Response.json(
    {
      configured: true,
      live,
      productCode: code,
      schedule: result.data?.schedule ?? null,
      environment: result.data?.environment,
      rateLimitRemaining: result.data?.rateLimitRemaining,
      retryAfter: result.data?.retryAfter,
      error: live
        ? null
        : result.data?.error || `viator-availability get_schedules failed (${result.status})`,
    },
    {
      status: live ? 200 : result.status || 502,
      headers: {
        'Cache-Control': live
          ? 'public, s-maxage=300, stale-while-revalidate=300'
          : 'no-store',
      },
    },
  );
}
