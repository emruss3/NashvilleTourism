import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type EventRow = {
  id: string;
  name: string;
  event_type: string;
  starts_at: string;
  time_tbd: boolean;
  venue_name: string | null;
  ticket_url: string | null;
  impact_level: number | null;
  planner_priority: number | null;
  short_description: string | null;
  neighborhoods: { slug: string; name: string } | null;
};

function nashvilleDate(iso: string): { date: string; time?: string } {
  const value = new Date(iso);
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: string) => dateParts.find((p) => p.type === type)?.value || '';
  const date = `${part('year')}-${part('month')}-${part('day')}`;
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Chicago',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(value);
  return { date, time };
}

/** Date-relevant canonical events for Plan Your Trip. Never invents events. */
export async function GET(req: Request) {
  const client = getSupabaseServiceClient();
  if (!client) return Response.json({ events: [], configured: false });

  const url = new URL(req.url);
  const startDate = url.searchParams.get('startDate') || new Date().toISOString().slice(0, 10);
  const endDate =
    url.searchParams.get('endDate') ||
    new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 40, 1), 100);

  const queryStart = new Date(`${startDate}T00:00:00Z`);
  queryStart.setUTCDate(queryStart.getUTCDate() - 1);
  const queryEnd = new Date(`${endDate}T23:59:59Z`);
  queryEnd.setUTCDate(queryEnd.getUTCDate() + 1);

  const { data, error } = await client
    .from('events')
    .select(`
      id,name,event_type,starts_at,time_tbd,venue_name,ticket_url,impact_level,planner_priority,short_description,
      neighborhoods ( slug,name )
    `)
    .eq('is_published', true)
    .in('status', ['scheduled', 'postponed'])
    .gte('starts_at', queryStart.toISOString())
    .lte('starts_at', queryEnd.toISOString())
    .order('impact_level', { ascending: false })
    .order('planner_priority', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return Response.json({ events: [], configured: true, error: 'Events unavailable' });
  }

  const events = (data as unknown as EventRow[])
    .map((row) => {
      const local = nashvilleDate(row.starts_at);
      if (local.date < startDate || local.date > endDate) return null;
      return {
        id: row.id,
        name: row.name,
        startsAt: row.starts_at,
        date: local.date,
        time: row.time_tbd ? undefined : local.time,
        venue: row.venue_name || undefined,
        category: row.event_type,
        impactLevel: row.impact_level ?? 50,
        plannerPriority: row.planner_priority ?? 50,
        ticketUrl: row.ticket_url || undefined,
        neighborhood: row.neighborhoods?.slug ?? null,
        guidance: row.short_description || undefined,
      };
    })
    .filter(Boolean);

  return Response.json({ events, configured: true });
}
