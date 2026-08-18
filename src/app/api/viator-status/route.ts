import {
  probeViatorAccess,
  searchNashvilleProducts,
  VIATOR_NASHVILLE_DESTINATION_ID,
  VIATOR_NASHVILLE_LOOKUP_ID,
} from '@/lib/feeds/viator';
import { isSupabaseConfigured } from '@/lib/supabase/server';

/** Safe production health snapshot; never returns API keys. */
export const dynamic = 'force-dynamic';

export async function GET() {
  const probe = await probeViatorAccess();
  const sampleSearch = probe.configured && probe.probes[0]?.ok
    ? await searchNashvilleProducts({ count: 10, sort: 'TRAVELER_RATING' })
    : null;
  const supabaseConfigured = isSupabaseConfigured();
  const productionAuthenticated = Boolean(probe.probes[0]?.ok);

  return Response.json(
    {
      configured: probe.configured,
      supabaseConfigured,
      productionAuthenticated,
      integrationBoundary: 'supabase-edge-function:viator-live',
      destinationId: VIATOR_NASHVILLE_DESTINATION_ID,
      lookupId: VIATOR_NASHVILLE_LOOKUP_ID,
      environment: probe.environment ?? 'production',
      baseUrl: probe.baseUrl ?? 'https://api.viator.com/partner',
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
      blocker: !supabaseConfigured
        ? 'Set SUPABASE_SERVICE_ROLE_KEY on Vercel (server-only). Viator credentials stay in Supabase.'
        : !productionAuthenticated
          ? 'Viator production is not authenticated. Add the production key to the Nashroam Supabase project as VIATOR_PRODUCTION_API_KEY. Keep the existing sandbox key in VIATOR_API_KEY for ingestion/testing.'
          : null,
      notes: [
        'Viator powers /tours experiences; Ticketmaster separately powers /events and live music.',
        'Public marketplace traffic uses viator-live -> https://api.viator.com/partner.',
        'VIATOR_PRODUCTION_API_KEY belongs in Supabase Edge Function secrets only — never Vercel or browser code.',
        'The existing viator-sync ingestion pipeline can keep its sandbox VIATOR_API_KEY.',
        'Nashville destination id is 799.',
        'Affiliate productUrl is used exactly as returned by Viator.',
        'Raw marketplace inventory is not automatically treated as a NashRoam editorial recommendation or planner candidate.',
      ],
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
