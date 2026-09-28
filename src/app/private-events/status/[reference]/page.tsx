import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Ui';
import EventsDisclosure from '@/components/private-events/EventsDisclosure';
import { occasionLabel } from '@/lib/events/intake';
import { LEAD_VIEW_LABEL, leadView, replyDueLine, type LeadView } from '@/lib/events/status';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { formatBriefDate } from '@/lib/private-events';
import { buildMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ reference: string }> }) {
  const { reference } = await props.params;
  return buildMetadata({ title: `Brief ${reference.toUpperCase()}: replies`, description: 'Which venues have replied to a Nashville.com private event brief.', path: '/private-events/', noindex: true });
}

const REFERENCE = /^NSH-[BCDFGHJKLMNPQRSTVWXZ2-9]{6}$/;

type LeadRow = { id: string; status: string; first_reply_at: string | null; sla_deadline_at: string; routed_at: string; proposal_at: string | null; event_venues: { name: string; slug: string } | { name: string; slug: string }[] | null };

const DOT: Record<LeadView, string> = {
  waiting: 'border-ink bg-paper',
  overdue: 'border-ink bg-paper-sunk',
  replied: 'border-ink bg-ink',
  proposal: 'border-ink bg-ink',
  unavailable: 'border-ink-soft bg-paper',
  booked: 'border-ink bg-ink',
};

/**
 * The planner's countdown: every venue the brief went to, whether it has
 * replied, and the time it promised to reply by. Looked up by reference
 * only, so it shows venue names and statuses and never the planner's own
 * contact details. Rendered fresh on every request.
 */
export default async function StatusPage(props: { params: Promise<{ reference: string }> }) {
  const { reference: raw } = await props.params;
  const reference = raw.toUpperCase();
  if (!REFERENCE.test(reference)) notFound();
  const supabase = getSupabaseServiceClient();
  if (!supabase) notFound();

  const { data: inquiry } = await supabase.from('event_inquiries').select('id,reference,occasion,event_type,guests,preferred_date,flexible_dates,created_at,status').eq('reference', reference).single();
  if (!inquiry) notFound();
  const { data: leadRows } = await supabase.from('event_leads').select('id,status,first_reply_at,sla_deadline_at,routed_at,proposal_at,event_venues(name,slug)').eq('inquiry_id', inquiry.id).order('routed_at');
  const now = new Date();
  const leads = ((leadRows ?? []) as unknown as LeadRow[]).map((l) => {
    const venue = Array.isArray(l.event_venues) ? l.event_venues[0] : l.event_venues;
    return { ...l, venue, view: leadView(l, now), due: replyDueLine(l.sla_deadline_at, now) };
  });
  const replied = leads.filter((l) => l.view === 'replied' || l.view === 'proposal' || l.view === 'booked').length;

  return (
    <>
      <div className="shell">
        <Breadcrumbs trail={[{ name: 'Private events', href: '/private-events/' }, { name: reference, href: `/private-events/status/${reference}/` }]} />
      </div>
      <div className="shell max-w-3xl pb-24 pt-4">
        <p className="eyebrow">Your brief · {reference}</p>
        <h1 className="mt-2 text-[2rem] sm:text-[2.5rem]">
          {leads.length ? `${replied} of ${leads.length} ${leads.length === 1 ? 'venue has' : 'venues have'} replied.` : 'With our events desk.'}
        </h1>
        <p className="mt-3 max-w-prose text-[16px] text-ink-soft">
          {occasionLabel((inquiry.occasion as string | null) ?? undefined, String(inquiry.event_type))}
          {inquiry.guests ? ` for ${Number(inquiry.guests).toLocaleString('en-US')} guests` : ''}, {formatBriefDate((inquiry.preferred_date as string | null) ?? undefined, Boolean(inquiry.flexible_dates))}. Sent {new Date(String(inquiry.created_at)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' })}.
          {leads.length ? ' Venues reply to your email directly; this page shows who has and who is still on the clock.' : ' No venue is on this brief yet: our events desk is matching you by hand and will reply to your email within one business day.'}
        </p>

        {leads.length ? (
          <ol className="mt-8 divide-y divide-paper-edge border-y border-paper-edge">
            {leads.map((l) => (
              <li key={l.id} className="grid gap-1 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 ${DOT[l.view]}`} aria-hidden="true" />
                  <div>
                    <p className="font-sans text-[17px] font-bold text-ink">
                      {l.venue ? (
                        <Link href={`/private-events/venues/${l.venue.slug}/`} className="underline-offset-[0.2em] hover:underline">
                          {l.venue.name}
                        </Link>
                      ) : (
                        'Venue'
                      )}
                    </p>
                    <p className="text-[15px] text-ink">{LEAD_VIEW_LABEL[l.view]}</p>
                  </div>
                </div>
                <p className="pl-6 text-sm text-ink-soft sm:pl-0 sm:text-right">
                  {l.view === 'waiting' ? (
                    <>
                      Replies by <span className="font-semibold text-ink">{l.due.by}</span>
                      <br />
                      {l.due.countdown}
                    </>
                  ) : l.view === 'overdue' ? (
                    <>
                      Was due {l.due.by}
                      <br />
                      {l.due.countdown}
                    </>
                  ) : l.first_reply_at ? (
                    <>Replied {replyDueLine(l.first_reply_at, now).by}</>
                  ) : null}
                </p>
              </li>
            ))}
          </ol>
        ) : null}

        <p className="mt-6 max-w-prose text-[15px] text-ink-soft">
          Nothing to do here: replies land in your inbox. If a venue goes quiet past its time, our desk chases it and, after another business day, sends you two alternatives.{' '}
          <Link href="/private-events/" className="font-semibold text-ink underline underline-offset-[0.2em]">
            Browse more venues
          </Link>
        </p>
        <div className="mt-8">
          <EventsDisclosure compact />
        </div>
      </div>
    </>
  );
}
