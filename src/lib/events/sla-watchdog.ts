import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { site } from '@/lib/site';
import { replyUrl } from './magic-link';
import { eventsEnv, sendEmail, type NotifyResult } from './notify';
import { addBusinessHours, formatNashville } from './sla';
import { listVenues } from './venues';
import { suggestVenues } from './venue-rank';

/**
 * Hourly SLA watchdog. For every lead with no first reply:
 *  - past its deadline and not yet reminded: mark sla_met = false, remind the
 *    venue, alert the desk (`sla_reminder`);
 *  - past deadline + 24 more business hours and not yet handled: email the
 *    planner an apology with two alternative venues from venue-rank
 *    (`alternatives_sent`). When every alternative is BPH-owned that is
 *    logged as `alternatives_all_house: true` so it can be watched.
 * Each step writes to notify_log and runs at most once per lead.
 */

export interface WatchdogReport {
  checked: number;
  reminded: number;
  alternatives: number;
  allHouse: number;
  warnings: string[];
}

type LeadRow = {
  id: string;
  inquiry_id: string;
  venue_id: string;
  routed_at: string;
  sla_deadline_at: string;
  notify_log: NotifyResult[] | null;
  event_inquiries: { id: string; reference: string | null; name: string; email: string; guests: number | null; budget_range: string | null; occasion: string | null; event_type: string; neighborhood_pref: string[] | null; needs: string[] | null; preferred_date: string | null; shortlist_venue_ids: string[] | null } | null;
};

export async function runSlaWatchdog(now = new Date()): Promise<WatchdogReport> {
  const report: WatchdogReport = { checked: 0, reminded: 0, alternatives: 0, allHouse: 0, warnings: [] };
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    report.warnings.push('Supabase not configured');
    return report;
  }
  const env = eventsEnv();
  const { data, error } = await supabase
    .from('event_leads')
    .select('id,inquiry_id,venue_id,routed_at,sla_deadline_at,notify_log,event_inquiries(id,reference,name,email,guests,budget_range,occasion,event_type,neighborhood_pref,needs,preferred_date,shortlist_venue_ids)')
    .is('first_reply_at', null)
    .in('status', ['new', 'routed'])
    .lt('sla_deadline_at', now.toISOString())
    .limit(200);
  if (error) {
    report.warnings.push(`query failed: ${error.message}`);
    return report;
  }
  const leads = ((data ?? []) as unknown as Array<Omit<LeadRow, 'event_inquiries'> & { event_inquiries: LeadRow['event_inquiries'] | LeadRow['event_inquiries'][] }>).map((row) => ({
    ...row,
    event_inquiries: Array.isArray(row.event_inquiries) ? row.event_inquiries[0] ?? null : row.event_inquiries,
  })) as LeadRow[];
  report.checked = leads.length;
  if (!leads.length) return report;

  const venues = await listVenues({ includeUnpublished: false, withContacts: true });
  const venueById = new Map(venues.map((v) => [v.id, v]));

  for (const lead of leads) {
    const venue = venueById.get(lead.venue_id);
    const inquiry = lead.event_inquiries;
    const log: NotifyResult[] = Array.isArray(lead.notify_log) ? [...lead.notify_log] : [];
    const has = (kind: string) => log.some((e) => e.kind === kind);
    if (!venue || !inquiry) continue;
    const reference = inquiry.reference ?? lead.inquiry_id.slice(0, 8);
    const patch: Record<string, unknown> = {};

    if (!has('sla_reminder')) {
      patch.sla_met = false;
      const reply = replyUrl(site.url, lead.id);
      if (venue.salesContactEmail) {
        log.push(await sendEmail({ to: venue.salesContactEmail, replyTo: inquiry.email, subject: `Reminder: a Nashville.com planner is waiting on ${venue.name} (${reference})`, text: [`The inquiry from ${inquiry.name} routed ${formatNashville(new Date(lead.routed_at))} has passed its ${venue.slaHours}-business-hour reply window.`, '', 'Please reply to the planner today. Replying to this email reaches them directly.', reply ? `Log your reply here: ${reply}` : '', '', 'If the date is unavailable, say so; a quick no keeps the planner moving and keeps the listing in good standing.'].filter(Boolean).join('\n'), tags: { kind: 'sla_reminder', reference } }, 'sla_reminder'));
      } else {
        log.push({ at: now.toISOString(), channel: 'email', to: '', kind: 'sla_reminder', ok: false, skipped: true, error: 'venue has no sales contact email' });
      }
      if (env.desk) {
        log.push(await sendEmail({ to: env.desk, subject: `[desk] SLA missed: ${venue.name} on ${reference}`, text: `${venue.name} has not replied to ${inquiry.name} (${inquiry.email}) since ${formatNashville(new Date(lead.routed_at))}. A reminder went to ${venue.salesContactEmail ?? 'no address on file'}.`, tags: { kind: 'sla_desk', reference } }, 'sla_desk'));
      }
      report.reminded += 1;
    }

    const secondMiss = addBusinessHours(new Date(lead.sla_deadline_at), 24);
    if (now >= secondMiss && !has('alternatives_sent')) {
      const exclude = new Set([lead.venue_id, ...(inquiry.shortlist_venue_ids ?? [])]);
      const picks = suggestVenues(venues, { guests: inquiry.guests ?? undefined, budgetRange: inquiry.budget_range ?? undefined, occasion: inquiry.occasion ?? inquiry.event_type, neighborhoods: inquiry.neighborhood_pref ?? [], needs: (inquiry.needs ?? []) as never }, { limit: 2, excludeIds: [...exclude] });
      const allHouse = picks.length > 0 && picks.every((p) => p.venue.ownedByBph);
      if (allHouse) report.allHouse += 1;
      const text = [
        `Hi ${inquiry.name.split(' ')[0]},`,
        '',
        `We are sorry: ${venue.name} has not replied to your brief (${reference}) inside the window we promise. We have chased them and told our events desk.`,
        '',
        picks.length
          ? `Two other places that fit your brief:\n${picks.map((p) => `- ${p.venue.name}: ${site.url}/private-events/venues/${p.venue.slug}/`).join('\n')}\n\nReply to this email and we will send your brief to either or both.`
          : 'Our events desk is finding you an alternative by hand and will write separately.',
        '',
        'Nashville.com is paid by the venue only if your event books; that never changes which venues we suggest.',
      ].join('\n');
      const sent = await sendEmail({ to: inquiry.email, subject: `An update on your Nashville event brief (${reference})`, text, tags: { kind: 'alternatives_sent', reference } }, 'alternatives_sent');
      log.push({ ...sent, error: sent.error ?? (allHouse ? 'alternatives_all_house' : undefined) });
      if (allHouse) log.push({ at: now.toISOString(), channel: 'email', to: inquiry.email, kind: 'alternatives_all_house', ok: true, skipped: true, error: `both alternatives are BPH-owned: ${picks.map((p) => p.venue.slug).join(', ')}` });
      if (env.desk) log.push(await sendEmail({ to: env.desk, subject: `[desk] 48h miss: ${venue.name} on ${reference}${allHouse ? ' (alternatives were all house venues)' : ''}`, text: `Planner ${inquiry.name} (${inquiry.email}) was sent alternatives: ${picks.map((p) => p.venue.name).join(', ') || 'none available'}.`, tags: { kind: 'sla_desk_48h', reference } }, 'sla_desk_48h'));
      report.alternatives += 1;
    }

    if (Object.keys(patch).length || log.length !== (lead.notify_log?.length ?? 0)) {
      const { error: updateError } = await supabase.from('event_leads').update({ ...patch, notify_log: log, updated_at: now.toISOString() }).eq('id', lead.id);
      if (updateError) report.warnings.push(`lead ${lead.id}: ${updateError.message}`);
    }
  }
  return report;
}
