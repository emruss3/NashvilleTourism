import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { site } from '@/lib/site';
import { BUDGET_RANGES, formatBriefDate } from '@/lib/private-events';
import { detailsUrl, replyUrl } from './magic-link';
import { eventsEnv, pushToLeadSystem, sendEmail, type NotifyResult } from './notify';
import { addBusinessHours, formatNashville } from './sla';
import type { EventVenue, Need, Occasion } from './types';
import { listVenues } from './venues';
import { suggestVenues } from './venue-rank';

/**
 * Inquiry intake: one event_inquiries row, one event_leads row per venue,
 * routing to each venue by its lead system, and the desk, group-hotels and
 * planner emails. Email failures are logged to notify_log and returned as
 * warnings; they never fail the intake.
 */

export interface IntakeInput {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  eventType: string;
  occasion?: Occasion;
  guests?: number;
  preferredDate?: string;
  flexibleDates: boolean;
  startTimeBand?: string;
  budget?: string;
  neighborhoods?: string[];
  needs?: Need[];
  details?: string;
  needHotelRooms: boolean;
  /** Venue slugs the planner shortlisted; empty means "let Nashville.com suggest". */
  venueSlugs?: string[];
  suggest?: boolean;
  howHeard?: string;
  sourcePath?: string;
  userAgent?: string;
  utm?: Record<string, string>;
  clientReference?: string;
}

export interface IntakeResult {
  id: string;
  reference: string;
  venues: Array<{ slug: string; name: string; slaHours: number; deadline: string }>;
  warnings: string[];
}

const OCCASION_LABEL: Record<string, string> = {
  corporate: 'Corporate event',
  holiday: 'Holiday party',
  convention: 'Convention reception',
  celebration: 'Private celebration',
  bachelorette: 'Bachelorette weekend',
  rehearsal_dinner: 'Rehearsal dinner',
  welcome_party: 'Welcome party',
  other: 'Private event',
};

const NEED_LABEL: Record<string, string> = { food: 'Food and drink', music: 'Live music', av: 'AV', outdoor: 'Outdoor space', accessible: 'Step-free access', rooms: 'Hotel rooms' };

/** NSH-XXXXXX from the inquiry id: short, unambiguous, no vowels that spell things. */
export function referenceFromId(id: string): string {
  const alphabet = 'BCDFGHJKLMNPQRSTVWXZ23456789';
  const hex = id.replace(/-/g, '').slice(0, 12);
  let n = Number.parseInt(hex, 16);
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out = alphabet[n % alphabet.length] + out;
    n = Math.floor(n / alphabet.length);
  }
  return `NSH-${out}`;
}

export function occasionLabel(occasion?: string, eventType?: string): string {
  return OCCASION_LABEL[occasion ?? ''] ?? OCCASION_LABEL[eventType ?? ''] ?? 'Private event';
}

export function briefText(input: IntakeInput, reference: string): string {
  const budget = BUDGET_RANGES.find((b) => b.value === input.budget)?.label;
  const lines = [
    `Reference: ${reference}`,
    `Occasion: ${occasionLabel(input.occasion, input.eventType)}`,
    `Guests: ${input.guests ?? 'not given'}`,
    `Date: ${formatBriefDate(input.preferredDate, input.flexibleDates)}${input.startTimeBand ? `, ${input.startTimeBand}` : ''}`,
    `Budget: ${budget ?? 'not given'}`,
    input.neighborhoods?.length ? `Neighborhoods: ${input.neighborhoods.join(', ')}` : '',
    input.needs?.length ? `Needs: ${input.needs.map((n) => NEED_LABEL[n] ?? n).join(', ')}` : '',
    input.needHotelRooms ? 'Hotel rooms: yes, the planner needs a room block' : '',
    '',
    `Planner: ${input.name}${input.company ? `, ${input.company}` : ''}`,
    `Email: ${input.email}`,
    input.phone ? `Phone: ${input.phone}` : '',
    input.howHeard ? `Heard about us: ${input.howHeard}` : '',
    '',
    input.details ? `Notes from the planner:\n${input.details}` : 'No notes from the planner.',
  ];
  return lines.filter((l) => l !== '').join('\n');
}

export async function submitInquiry(input: IntakeInput): Promise<{ ok: true; result: IntakeResult } | { ok: false; error: 'not_configured' | 'storage'; detail?: string }> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { ok: false, error: 'not_configured' };
  const env = eventsEnv();
  const warnings: string[] = [];

  // 1. Which venues. Shortlist by slug, else suggestions ranked by the brief. Published venues only, ever.
  const published = await listVenues({ includeUnpublished: false, withContacts: true });
  let venues: EventVenue[] = [];
  if (input.venueSlugs?.length) {
    const wanted = new Set(input.venueSlugs);
    venues = published.filter((v) => wanted.has(v.slug)).slice(0, 5);
  }
  if (!venues.length && input.suggest !== false) {
    venues = suggestVenues(published, { guests: input.guests, budgetRange: input.budget, occasion: input.occasion ?? input.eventType, neighborhoods: input.neighborhoods, needs: input.needs }, { limit: 5 }).map((r) => r.venue);
  }

  // 2. The inquiry row.
  const { data: inquiry, error } = await supabase
    .from('event_inquiries')
    .insert({
      name: input.name,
      email: input.email,
      company: input.company ?? null,
      event_type: input.eventType,
      occasion: input.occasion ?? null,
      guests: input.guests ?? null,
      preferred_date: input.preferredDate ?? null,
      flexible_dates: input.flexibleDates,
      start_time_band: input.startTimeBand ?? null,
      budget_range: input.budget ?? null,
      neighborhood_pref: input.neighborhoods ?? [],
      needs: input.needs ?? [],
      details: input.details ?? null,
      need_hotel_rooms: input.needHotelRooms,
      shortlist_venue_ids: venues.map((v) => v.id),
      planner_org: input.company ?? null,
      planner_phone: input.phone ?? null,
      how_heard: input.howHeard ?? null,
      source_path: input.sourcePath ?? null,
      user_agent: input.userAgent ?? null,
      utm: input.utm ?? null,
      client_reference: input.clientReference ?? null,
      status: venues.length ? 'routed' : 'new',
      routed_at: venues.length ? new Date().toISOString() : null,
    })
    .select('id')
    .single();
  if (error || !inquiry) return { ok: false, error: 'storage', detail: error?.message };

  const id = String(inquiry.id);
  const reference = referenceFromId(id);
  await supabase.from('event_inquiries').update({ reference }).eq('id', id);

  // 3. One lead per venue, then route it.
  const now = new Date();
  const contacted: IntakeResult['venues'] = [];
  const brief = briefText(input, reference);
  const subjectDate = formatBriefDate(input.preferredDate, input.flexibleDates);
  const subject = `New event inquiry via Nashville.com — ${occasionLabel(input.occasion, input.eventType)}, ${input.guests ?? '?'} guests, ${subjectDate}`;

  for (const venue of venues) {
    const deadline = addBusinessHours(now, venue.slaHours);
    const { data: lead, error: leadError } = await supabase
      .from('event_leads')
      .insert({ inquiry_id: id, venue_id: venue.id, status: 'routed', routed_at: now.toISOString(), sla_deadline_at: deadline.toISOString() })
      .select('id')
      .single();
    if (leadError || !lead) {
      warnings.push(`lead for ${venue.slug} not created: ${leadError?.message ?? 'unknown'}`);
      continue;
    }
    const leadId = String(lead.id);
    const log: NotifyResult[] = [];
    const reply = replyUrl(site.url, leadId);
    if (!reply) warnings.push('EVENTS_MAGIC_LINK_SECRET not set; venue emails carry no reply link');

    if ((venue.leadSystem === 'tripleseat' || venue.leadSystem === 'perfect_venue' || venue.leadSystem === 'other') && venue.leadSystemEndpoint) {
      log.push(await pushToLeadSystem(venue.leadSystem, venue.leadSystemEndpoint, { name: input.name, email: input.email, phone: input.phone, org: input.company, occasion: occasionLabel(input.occasion, input.eventType), guests: input.guests, date: input.preferredDate, flexible: input.flexibleDates, budget: BUDGET_RANGES.find((b) => b.value === input.budget)?.label, notes: input.details, reference }));
    }
    if (venue.salesContactEmail) {
      const text = [
        `A planner has asked ${venue.name} about a private event through Nashville.com.`,
        '',
        brief,
        '',
        `Please reply within ${venue.slaHours} business hours (by ${formatNashville(deadline)} Nashville time). Replying to this email reaches the planner directly.`,
        reply ? `Log your reply here so we can stop the clock: ${reply}` : '',
        '',
        `Nashville.com is paid by the venue only if this event books: ${venue.feePct ?? 5}% of contracted spend, $250 minimum, per the referral terms. The planner confirms everything with you directly.`,
      ].filter((l) => l !== null).join('\n');
      log.push(await sendEmail({ to: venue.salesContactEmail, replyTo: input.email, subject, text, tags: { kind: 'venue_lead', reference } }, 'venue_lead'));
    } else {
      log.push({ at: new Date().toISOString(), channel: 'email', to: '', kind: 'venue_lead', ok: false, skipped: true, error: 'venue has no sales contact email' });
    }
    await supabase.from('event_leads').update({ notify_log: log }).eq('id', leadId);
    for (const entry of log) if (!entry.ok && !entry.skipped) warnings.push(`${entry.kind} to ${venue.slug}: ${entry.error}`);
    contacted.push({ slug: venue.slug, name: venue.name, slaHours: venue.slaHours, deadline: deadline.toISOString() });
  }

  // 4. Desk, group hotels and planner.
  const deskLog: NotifyResult[] = [];
  const venueList = contacted.length ? contacted.map((v) => `- ${v.name} (reply due ${formatNashville(new Date(v.deadline))})`).join('\n') : '- none; no published venue matched, the desk should place this by hand';
  if (env.desk) {
    deskLog.push(await sendEmail({ to: env.desk, replyTo: input.email, subject: `[desk] ${subject}`, text: `${brief}\n\nRouted to:\n${venueList}${warnings.length ? `\n\nWarnings:\n- ${warnings.join('\n- ')}` : ''}`, tags: { kind: 'desk', reference } }, 'desk'));
  } else {
    warnings.push('EVENTS_DESK_EMAIL not set');
  }
  if (input.needHotelRooms) {
    if (env.groupHotels) {
      deskLog.push(await sendEmail({ to: env.groupHotels, replyTo: input.email, subject: `[group rooms] ${subject}`, text: `${brief}\n\nThe planner needs hotel rooms for this event. The LiteAPI group-rate path is manual for now: quote through the booking site and reply to the planner directly.`, tags: { kind: 'group_hotels', reference } }, 'group_hotels'));
    } else {
      warnings.push('GROUP_HOTELS_EMAIL not set');
    }
  }
  const details = detailsUrl(site.url, id);
  deskLog.push(
    await sendEmail(
      {
        to: input.email,
        subject: `Your Nashville event brief is with ${contacted.length ? `${contacted.length} ${contacted.length === 1 ? 'venue' : 'venues'}` : 'our events desk'} (${reference})`,
        text: [
          `Hi ${input.name.split(' ')[0]},`,
          '',
          contacted.length
            ? `Your brief went to these venues. Each has promised a reply within 24 business hours:\n${contacted.map((v) => `- ${v.name}`).join('\n')}`
            : 'Our events desk has your brief and will match you by hand within one business day, with spaces that fit.',
          '',
          `Your reference is ${reference}. Keep it for any follow-up.`,
          details ? `\nWant to add a budget, neighborhoods, what you need or notes? Add detail here any time: ${details}` : '',
          '',
          'How this works: the venues reply to you directly and you confirm everything with them. Nashville.com is paid by the venue only if your event books, and that never changes which venues we suggest. Submitting a brief does not confirm availability or a booking.',
          '',
          'Your brief:',
          brief,
        ].join('\n'),
        tags: { kind: 'planner_confirmation', reference },
      },
      'planner_confirmation',
    ),
  );
  for (const entry of deskLog) if (!entry.ok && !entry.skipped) warnings.push(`${entry.kind}: ${entry.error}`);
  // The desk-side log rides on the inquiry too, so an inquiry with no leads still shows what was sent.
  await supabase.from('event_inquiries').update({ utm: { ...(input.utm ?? {}), notify_log: deskLog } }).eq('id', id);

  return { ok: true, result: { id, reference, venues: contacted, warnings } };
}
