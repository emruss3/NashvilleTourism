import { getSupabaseServiceClient } from '@/lib/supabase/server';
import type { NeighborhoodSlug } from '@/lib/types';

export const dynamic = 'force-dynamic';

const HOOD_MAP: Record<string, NeighborhoodSlug | undefined> = {
  downtown: 'downtown-broadway',
  sobro: 'downtown-broadway',
  'the-gulch': 'the-gulch',
  germantown: 'germantown',
  'east-nashville': 'east-nashville',
  'five-points': 'east-nashville',
  '12-south': '12-south',
  'wedgewood-houston': 'wedgewood-houston',
  'music-row': 'midtown',
  midtown: 'midtown',
  'west-end': 'hillsboro-village',
  'hillsboro-village': 'hillsboro-village',
  belmont: 'hillsboro-village',
  'sylvan-park': 'sylvan-park',
  'green-hills': 'green-hills',
};

type Row = {
  id: string;
  slug: string;
  name: string;
  primary_category: string;
  cuisine: string[] | null;
  price_level: number | null;
  address_line1: string | null;
  city: string;
  state: string;
  website_url: string | null;
  reservation_url: string | null;
  neighborhoods: { slug: string; name: string } | null;
  place_editorial: {
    nashroam_score: number | null;
    summary: string | null;
    local_note: string | null;
    vibe: string[] | null;
    best_for: string[] | null;
    traveler_types: string[] | null;
    meal_periods: string[] | null;
    typical_duration_minutes: number | null;
    family_friendly: boolean | null;
    group_friendly: boolean | null;
    reservation_recommended: boolean | null;
    planner_priority: number | null;
  } | null;
  place_health: { confidence_score: number; needs_review: boolean } | null;
};

export async function GET(req: Request) {
  const client = getSupabaseServiceClient();
  if (!client) return Response.json({ places: [], configured: false });

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 120, 1), 250);

  const { data, error } = await client
    .from('places')
    .select(`
      id,slug,name,primary_category,cuisine,price_level,address_line1,city,state,website_url,reservation_url,
      neighborhoods ( slug,name ),
      place_editorial (
        nashroam_score,summary,local_note,vibe,best_for,traveler_types,meal_periods,
        typical_duration_minutes,family_friendly,group_friendly,reservation_recommended,planner_priority
      ),
      place_health ( confidence_score,needs_review )
    `)
    .eq('curation_status', 'approved')
    .eq('is_published', true)
    .eq('status', 'active')
    .limit(limit);

  if (error || !data) return Response.json({ places: [], configured: true, error: 'Place candidates unavailable' });

  const places = (data as unknown as Row[])
    .filter((row) => (row.place_health?.confidence_score ?? 0) >= 60 && !row.place_health?.needs_review)
    .map((row) => {
      const neighborhood = row.neighborhoods?.slug ? HOOD_MAP[row.neighborhoods.slug] : undefined;
      if (!neighborhood || !row.place_editorial?.summary) return null;
      return {
        id: row.id,
        slug: row.slug,
        title: row.name,
        category: row.primary_category,
        neighborhood,
        summary: row.place_editorial.summary,
        localNote: row.place_editorial.local_note || undefined,
        cuisine: row.cuisine ?? [],
        priceLevel: row.price_level ?? undefined,
        nashroamScore: row.place_editorial.nashroam_score ?? undefined,
        plannerPriority: row.place_editorial.planner_priority ?? 50,
        bestFor: row.place_editorial.best_for ?? [],
        travelerTypes: row.place_editorial.traveler_types ?? [],
        vibe: row.place_editorial.vibe ?? [],
        mealPeriods: row.place_editorial.meal_periods ?? [],
        typicalDurationMinutes: row.place_editorial.typical_duration_minutes ?? undefined,
        familyFriendly: row.place_editorial.family_friendly ?? undefined,
        groupFriendly: row.place_editorial.group_friendly ?? undefined,
        reservationRecommended: row.place_editorial.reservation_recommended ?? undefined,
        websiteUrl: row.website_url || undefined,
        reservationUrl: row.reservation_url || undefined,
        mapQuery: [row.name, row.address_line1, row.city, row.state].filter(Boolean).join(', '),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b!.plannerPriority - a!.plannerPriority) || ((b!.nashroamScore ?? 0) - (a!.nashroamScore ?? 0)));

  return Response.json({ places, configured: true });
}
