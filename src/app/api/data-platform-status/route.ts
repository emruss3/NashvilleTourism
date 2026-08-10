import { getSupabaseServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Operator health — booleans and counts only. Never returns credentials.
 * Safe to call from production to verify the site is connected to Supabase.
 */
export async function GET() {
  const supabaseConfigured = isSupabaseConfigured();
  const client = getSupabaseServiceClient();

  const empty = {
    supabaseConfigured,
    viatorConfigured: false,
    viatorSourceActive: false,
    viatorExperienceCount: 0,
    viatorApprovedCount: 0,
    viatorPublishedCount: 0,
    placeCount: 0,
    approvedPlaceCount: 0,
    publishedPlaceCount: 0,
    plannerContextCount: 0,
    ticketmasterSupabaseActive: false,
    ticketmasterLegacyConfigured: Boolean(process.env.TICKETMASTER_API_KEY?.trim()),
    canonicalEventCount: 0,
    overtureCandidateCount: 0,
    lastViatorSyncAt: null as string | null,
    lastOvertureSyncAt: null as string | null,
    lastTicketmasterSyncAt: null as string | null,
    plannerEligible: {
      restaurants: 0,
      attractions: 0,
      venues: 0,
      experiences: 0,
    },
    verificationOpenCount: 0,
    checkedAt: new Date().toISOString(),
  };

  if (!client) {
    return Response.json(empty, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const [
    viatorSource,
    tmSource,
    experiences,
    approvedExp,
    publishedExp,
    places,
    approvedPlaces,
    publishedPlaces,
    contexts,
    events,
    overture,
    verification,
    viatorSchedule,
    overtureCandidatesSeen,
    eligibleRestaurants,
    eligibleAttractions,
    eligibleVenues,
  ] = await Promise.all([
    client.from('data_sources').select('active').eq('provider_key', 'viator').maybeSingle(),
    client.from('data_sources').select('active').eq('provider_key', 'ticketmaster').maybeSingle(),
    client.from('experiences').select('id', { count: 'exact', head: true }),
    client.from('experiences').select('id', { count: 'exact', head: true }).eq('curation_status', 'approved'),
    client.from('experiences').select('id', { count: 'exact', head: true }).eq('is_published', true).eq('curation_status', 'approved'),
    client.from('places').select('id', { count: 'exact', head: true }),
    client.from('places').select('id', { count: 'exact', head: true }).eq('curation_status', 'approved'),
    client.from('places').select('id', { count: 'exact', head: true }).eq('is_published', true).eq('curation_status', 'approved'),
    client.from('planner_context').select('id', { count: 'exact', head: true }).eq('is_active', true),
    client.from('events').select('id', { count: 'exact', head: true }),
    client.from('place_discovery_candidates').select('id', { count: 'exact', head: true }).eq('tourism_relevant', true),
    client.from('verification_queue').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_review']),
    client
      .from('ingestion_schedules')
      .select('last_run_at,job_key')
      .ilike('job_key', '%viator%')
      .order('last_run_at', { ascending: false })
      .limit(5),
    client
      .from('place_discovery_candidates')
      .select('last_seen_at')
      .order('last_seen_at', { ascending: false })
      .limit(1),
    client
      .from('places')
      .select('id', { count: 'exact', head: true })
      .eq('curation_status', 'approved')
      .eq('is_published', true)
      .eq('status', 'active')
      .eq('primary_category', 'restaurant'),
    client
      .from('places')
      .select('id', { count: 'exact', head: true })
      .eq('curation_status', 'approved')
      .eq('is_published', true)
      .eq('status', 'active')
      .in('primary_category', ['attraction', 'park', 'outdoor']),
    client
      .from('places')
      .select('id', { count: 'exact', head: true })
      .eq('curation_status', 'approved')
      .eq('is_published', true)
      .eq('status', 'active')
      .in('primary_category', ['venue', 'live-music', 'bar-nightlife']),
  ]);

  const lastViatorSyncAt =
    (viatorSchedule.data ?? []).find((r) => r.last_run_at)?.last_run_at ?? null;
  const lastOvertureSyncAt = overtureCandidatesSeen.data?.[0]?.last_seen_at ?? null;

  const { data: tmRuns } = await client
    .from('ingestion_runs')
    .select('finished_at,started_at,status,data_sources!inner(provider_key)')
    .eq('data_sources.provider_key', 'ticketmaster')
    .order('started_at', { ascending: false })
    .limit(1);

  // Probe Edge Function health without leaking secrets.
  let viatorConfigured = false;
  try {
    const probe = await fetch(`${process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aeomrsutkhwmnscvvfur.supabase.co'}/functions/v1/viator-sync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode: 'health' }),
      cache: 'no-store',
    });
    if (probe.ok) {
      const body = (await probe.json().catch(() => ({}))) as { ok?: boolean; configured?: boolean };
      viatorConfigured = Boolean(body.ok || body.configured || probe.status === 200);
    }
  } catch {
    viatorConfigured = Boolean(viatorSource.data?.active);
  }

  return Response.json(
    {
      supabaseConfigured: true,
      viatorConfigured,
      viatorSourceActive: Boolean(viatorSource.data?.active),
      viatorExperienceCount: experiences.count ?? 0,
      viatorApprovedCount: approvedExp.count ?? 0,
      viatorPublishedCount: publishedExp.count ?? 0,
      placeCount: places.count ?? 0,
      approvedPlaceCount: approvedPlaces.count ?? 0,
      publishedPlaceCount: publishedPlaces.count ?? 0,
      plannerContextCount: contexts.count ?? 0,
      ticketmasterSupabaseActive: Boolean(tmSource.data?.active),
      ticketmasterLegacyConfigured: Boolean(process.env.TICKETMASTER_API_KEY?.trim()),
      canonicalEventCount: events.count ?? 0,
      overtureCandidateCount: overture.count ?? 0,
      lastViatorSyncAt,
      lastOvertureSyncAt,
      lastTicketmasterSyncAt: tmRuns?.[0]?.finished_at || tmRuns?.[0]?.started_at || null,
      plannerEligible: {
        restaurants: eligibleRestaurants.count ?? 0,
        attractions: eligibleAttractions.count ?? 0,
        venues: eligibleVenues.count ?? 0,
        experiences: publishedExp.count ?? 0,
      },
      verificationOpenCount: verification.count ?? 0,
      checkedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
