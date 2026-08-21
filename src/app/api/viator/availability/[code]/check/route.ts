import { invokeEdgeFunction, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type AvailabilityEnvelope = {
  ok?: boolean;
  availability?: unknown;
  fullAccessRequired?: boolean;
  error?: string;
  environment?: string;
  rateLimitRemaining?: string | null;
  retryAfter?: string | null;
};

export async function POST(
  request: Request,
  context: { params: { code: string } },
) {
  const code = decodeURIComponent(context.params.code || '').trim();
  if (!code) {
    return Response.json(
      { configured: false, live: false, error: 'product code required' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  if (!isSupabaseConfigured()) {
    return Response.json(
      { configured: false, live: false, error: 'Supabase not configured' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    return Response.json(
      { configured: true, live: false, error: 'Invalid JSON request' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const result = await invokeEdgeFunction<AvailabilityEnvelope>(
    'viator-availability',
    {
      mode: 'check_availability',
      productCode: code,
      productOptionCode: body.productOptionCode,
      travelDate: body.travelDate,
      startTime: body.startTime,
      currency: body.currency,
      paxMix: body.paxMix,
    },
    { timeoutMs: 120_000 },
  );

  const live = Boolean(result.ok && result.data?.ok && result.data?.availability);
  const fullAccessRequired = Boolean(result.data?.fullAccessRequired || result.status === 403);

  return Response.json(
    {
      configured: true,
      live,
      fullAccessRequired,
      productCode: code,
      availability: result.data?.availability ?? null,
      environment: result.data?.environment,
      rateLimitRemaining: result.data?.rateLimitRemaining,
      retryAfter: result.data?.retryAfter,
      error: live
        ? null
        : result.data?.error || `viator-availability check failed (${result.status})`,
    },
    {
      status: live ? 200 : fullAccessRequired ? 403 : result.status || 502,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
