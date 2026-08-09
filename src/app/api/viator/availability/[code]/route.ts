import { invokeEdgeFunction, isSupabaseConfigured } from '@/lib/supabase/server';

/** Basic Access: GET /availability/schedules/{product-code} via Edge Function. */
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: { code: string } },
) {
  const code = decodeURIComponent(context.params.code || '').trim();
  if (!code) {
    return Response.json({ configured: false, live: false, error: 'product code required' }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return Response.json(
      { configured: false, live: false, error: 'Supabase not configured' },
      { status: 503 },
    );
  }

  const result = await invokeEdgeFunction<{
    ok?: boolean;
    schedules?: unknown;
    error?: string;
    environment?: string;
  }>('viator-sync', { mode: 'get_schedules', productCode: code });

  return Response.json(
    {
      configured: true,
      live: Boolean(result.ok && result.data?.ok),
      productCode: code,
      schedules: result.data?.schedules ?? null,
      environment: result.data?.environment,
      error: result.data?.error,
    },
    {
      status: result.ok && result.data?.ok ? 200 : result.status || 502,
      headers: { 'Cache-Control': 'private, max-age=300' },
    },
  );
}
