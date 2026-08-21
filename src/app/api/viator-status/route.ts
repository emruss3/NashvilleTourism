import {
  VIATOR_NASHVILLE_DESTINATION_ID,
  VIATOR_NASHVILLE_LOOKUP_ID,
} from '@/lib/feeds/viator';
import { invokeEdgeFunction, isSupabaseConfigured } from '@/lib/supabase/server';

/**
 * Safe configuration snapshot. This route deliberately does NOT make a Viator
 * product-search request because /products/search is reserved for user-initiated
 * destination search in our certified real-time model.
 */
export const dynamic = 'force-dynamic';

type HealthEnvelope = {
  ok?: boolean;
  configured?: boolean;
  environment?: string;
  baseUrl?: string;
  endpointModel?: string;
  providerRequestMade?: boolean;
  supported?: string[];
  error?: string;
};

export async function GET() {
  const supabaseConfigured = isSupabaseConfigured();
  const health = supabaseConfigured
    ? await invokeEdgeFunction<HealthEnvelope>('viator-live', { mode: 'health' })
    : null;
  const productionConfigured = Boolean(health?.ok && health.data?.ok);

  return Response.json(
    {
      configured: supabaseConfigured && productionConfigured,
      supabaseConfigured,
      productionConfigured,
      productionAuthenticated: null,
      integrationBoundary: 'supabase-edge-function:viator-live',
      endpointModel: health?.data?.endpointModel ?? 'real-time-search',
      destinationId: VIATOR_NASHVILLE_DESTINATION_ID,
      lookupId: VIATOR_NASHVILLE_LOOKUP_ID,
      environment: health?.data?.environment ?? 'production',
      baseUrl: health?.data?.baseUrl ?? 'https://api.viator.com/partner',
      providerRequestMade: health?.data?.providerRequestMade ?? false,
      supported: health?.data?.supported ?? [
        'search_products',
        'search_freetext',
        'get_product',
      ],
      fetchedAt: new Date().toISOString(),
      blocker: !supabaseConfigured
        ? 'Set SUPABASE_SERVICE_ROLE_KEY on Vercel (server-only). Viator credentials stay in Supabase.'
        : !productionConfigured
          ? 'Add the approved production Viator key to the NashRoam Supabase project as VIATOR_PRODUCTION_API_KEY.'
          : null,
      notes: [
        'NashRoam uses Viator real-time search only; Viator catalog/availability ingestion is disabled.',
        'Health checks never call /products/search, because that endpoint is reserved for user-initiated search.',
        'Public browse uses /products/search; user text search uses /search/freetext; selected product pages use /products/{product-code}.',
        'Selected-product availability uses /availability/schedules/{product-code}; /availability/check is called only after date + passenger mix selection.',
        'No Viator booking, payment, cancellation, recommendations, reviews, exchange-rate, attractions, or bulk endpoints are used.',
        'VIATOR_PRODUCTION_API_KEY belongs in Supabase Edge Function secrets only — never Vercel or browser code.',
        'Nashville destination id is 799.',
        'Affiliate productUrl is used exactly as returned by Viator; checkout remains on Viator.',
      ],
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
