import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const PLANNER_HOOD: Record<string, string> = {
  downtown: 'downtown-broadway',
  '12-south': '12-south',
  'the-gulch': 'the-gulch',
  'east-nashville': 'east-nashville',
  germantown: 'germantown',
  'wedgewood-houston': 'wedgewood-houston',
  midtown: 'midtown',
  'hillsboro-village': 'hillsboro-village',
  'sylvan-park': 'sylvan-park',
  'green-hills': 'green-hills',
};

type Row = {
  id: string;
  context_type: string;
  title: string;
  body: string | null;
  planner_instruction: string;
  traveler_types: string[] | null;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  rules: Record<string, unknown> | null;
  neighborhoods: { slug: string; name: string } | null;
};

export async function GET(req: Request) {
  const client = getSupabaseServiceClient();
  if (!client) {
    return Response.json({ contexts: [], configured: false }, { status: 200 });
  }

  const url = new URL(req.url);
  const tripType = url.searchParams.get('tripType')?.trim() || '';
  const startDate = url.searchParams.get('startDate')?.trim() || '';
  const endDate = url.searchParams.get('endDate')?.trim() || '';

  const { data, error } = await client
    .from('planner_context')
    .select(`
      id,context_type,title,body,planner_instruction,traveler_types,priority,
      starts_at,ends_at,rules,
      neighborhoods ( slug,name )
    `)
    .eq('is_active', true)
    .in('context_type', ['neighborhood', 'audience', 'editorial', 'season'])
    .order('priority', { ascending: false })
    .limit(50);

  if (error || !data) {
    return Response.json({ contexts: [], configured: true, error: 'Planner context unavailable' }, { status: 200 });
  }

  const tripStart = startDate ? Date.parse(`${startDate}T00:00:00Z`) : null;
  const tripEnd = endDate ? Date.parse(`${endDate}T23:59:59Z`) : tripStart;

  const contexts = (data as unknown as Row[])
    .filter((row) => {
      const travelers = row.traveler_types ?? [];
      if (travelers.length > 0 && tripType && !travelers.includes(tripType)) return false;
      if (tripEnd != null && row.starts_at && Date.parse(row.starts_at) > tripEnd) return false;
      if (tripStart != null && row.ends_at && Date.parse(row.ends_at) < tripStart) return false;
      return true;
    })
    .slice(0, 20)
    .map((row) => ({
      id: row.id,
      type: row.context_type,
      title: row.title,
      guidance: row.body || row.planner_instruction,
      instruction: row.planner_instruction,
      neighborhood: row.neighborhoods?.slug ? PLANNER_HOOD[row.neighborhoods.slug] ?? null : null,
      priority: row.priority,
      rules: row.rules ?? {},
    }));

  return Response.json({ contexts, configured: true });
}
