import { verifyReplyToken } from '@/lib/events/magic-link';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * The venue's one-click reply. A plain HTML form on the magic-link page posts
 * here; the token names the lead. Writes first_reply_at (once), venue_notes
 * and an optional status, then redirects back to the page with the outcome.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const token = String(form?.get('token') ?? '');
  const back = (state: string) => Response.redirect(new URL(`/private-events/reply/${encodeURIComponent(token || '-')}/?${state}`, req.url), 303);
  const verified = verifyReplyToken(token);
  if ('error' in verified) return back(`error=${verified.error}`);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return back('error=not_configured');

  const notes = String(form?.get('notes') ?? '').trim().slice(0, 4000);
  const outcome = String(form?.get('outcome') ?? 'replied');
  const status = outcome === 'unavailable' ? 'lost' : outcome === 'proposal' ? 'proposal' : 'replied';
  const now = new Date().toISOString();

  const { data: lead } = await supabase.from('event_leads').select('id,first_reply_at,sla_deadline_at,status').eq('id', verified.leadId).single();
  if (!lead) return back('error=missing');

  const patch: Record<string, unknown> = { venue_notes: notes || null, status, updated_at: now };
  if (!lead.first_reply_at) {
    patch.first_reply_at = now;
    patch.sla_met = new Date(now) <= new Date(String(lead.sla_deadline_at));
  }
  if (status === 'proposal') patch.proposal_at = now;
  if (status === 'lost') {
    patch.outcome_at = now;
    patch.lost_reason = 'Venue reported the date unavailable';
  }
  const { error } = await supabase.from('event_leads').update(patch).eq('id', verified.leadId);
  if (error) return back('error=storage');
  return back('done=1');
}
