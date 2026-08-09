import {
  probeViatorAccess,
  searchNashvilleProducts,
  VIATOR_NASHVILLE_DESTINATION_ID,
  VIATOR_NASHVILLE_LOOKUP_ID,
} from '@/lib/feeds/viator';
import { isSupabaseConfigured } from '@/lib/supabase/server';

/** Safe health snapshot; never returns API keys. */
export const dynamic = 'force-dynamic';

export async function GET() {
  const probe = await probeViatorAccess();
  const sampleSearch = probe.configured
    ? await searchNashvilleProducts({ count: 10, sort: 'TRAVELER_RATING' })
    : null;

  return Response.json(
    {
      configured: probe.configured,
      supabaseConfigured: isSupabaseConfigured(),
      integrationBoundary: 'supabase-edge-function:viator-sync',
      destinationId: VIATOR_NASHVILLE_DESTINATION_ID,
      lookupId: VIATOR_NASHVILLE_LOOKUP_ID,
      environment: probe.environment ?? null,
      baseUrl: probe.baseUrl ?? null,
      inferredTier: probe.inferredTier,
      sampleProductCode: probe.sampleProductCode,
      rateLimitRemaining: probe.rateLimitRemaining ?? null,
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
            products: sampleSearch.products.slice(0, 10).map((p) => ({
              productCode: p.productCode,
              title: p.title,
              hasImage: Boolean(p.imageUrl),
              hasRating: p.rating != null,
              hasPrice: Boolean(p.fromPrice),
              hasProductUrl: Boolean(p.productUrl),
              productUrlLength: p.productUrl.length,
            })),
            error: sampleSearch.error,
            environment: sampleSearch.environment,
          }
        : null,
      fetchedAt: probe.fetchedAt,
      blocker: !isSupabaseConfigured()
        ? 'Set SUPABASE_SERVICE_ROLE_KEY on Vercel (server-only). Do not set VIATOR_API_KEY on Vercel — it stays in Supabase Edge Function secrets.'
        : null,
      notes: [
        'Viator powers /tours experiences — not /events (Ticketmaster).',
        'VIATOR_API_KEY lives in Supabase Edge Function secrets — not Vercel, never browser.',
        'Next.js calls only Supabase; Edge Function calls Viator sandbox by default.',
        'Do not call api.viator.com (production) with the sandbox key.',
        'Nashville destination id is 799. Basic Access endpoints only.',
        'Affiliate productUrl must be stored and used exactly as returned.',
      ],
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
