import Link from 'next/link';
import { briefText, occasionLabel } from '@/lib/events/intake';
import { verifyReplyToken } from '@/lib/events/magic-link';
import { formatNashville } from '@/lib/events/sla';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Reply to an event inquiry',
  description: 'Venue reply page for a Nashville.com private event inquiry.',
  path: '/private-events/reply/',
  noindex: true,
});

/**
 * The venue's reply page, reached from the signed link in the lead email.
 * Shows the brief and takes a one-click reply as a plain form, so it works
 * from any mail client with no login. Phase 2 replaces it with the dashboard.
 */
export default async function ReplyPage(props: { params: Promise<{ token: string }>; searchParams?: Promise<Record<string, string | undefined>> }) {
  const { token } = await props.params;
  const query = (await props.searchParams) ?? {};
  const verified = verifyReplyToken(token);
  const supabase = getSupabaseServiceClient();

  const lead = 'leadId' in verified && supabase
    ? (await supabase.from('event_leads').select('id,status,first_reply_at,sla_deadline_at,venue_notes,event_venues(name,sla_hours),event_inquiries(reference,name,email,company,event_type,occasion,guests,preferred_date,flexible_dates,budget_range,neighborhood_pref,needs,details,need_hotel_rooms,planner_phone)').eq('id', verified.leadId).single()).data
    : null;
  // A many-to-one join comes back as one object; guard against an array all the same.
  const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) ?? null : ((v as T) ?? null));
  const venue = one<{ name: string; sla_hours: number }>(lead?.event_venues);
  const inquiry = one<Record<string, unknown>>(lead?.event_inquiries);

  const problem =
    'error' in verified
      ? verified.error === 'expired'
        ? 'This link has expired. Reply to the inquiry email directly and the planner will still hear from you.'
        : 'This link is not valid. Reply to the inquiry email directly and the planner will still hear from you.'
      : !supabase
        ? 'The reply page is not connected right now. Reply to the inquiry email directly.'
        : !lead || !inquiry || !venue
          ? 'We could not find this inquiry. Reply to the inquiry email directly.'
          : query.error
            ? 'Your reply was not saved. Reply to the inquiry email directly and we will log it for you.'
            : undefined;

  return (
    <div className="shell max-w-3xl pb-16 pt-8">
      <p className="eyebrow">Nashville.com private events</p>
      <h1 className="mt-2 text-[2rem] sm:text-[2.5rem]">{venue ? `Reply to a planner, ${venue.name}` : 'Reply to an event inquiry'}</h1>

      {problem ? (
        <p className="mt-4 max-w-prose text-[16px] text-ink-soft">{problem}</p>
      ) : query.done ? (
        <div role="status" className="mt-6 rounded-card border border-ink bg-paper p-6">
          <p className="text-[1.25rem] font-bold text-ink">Thank you. The clock is stopped.</p>
          <p className="mt-2 max-w-prose text-[15px] text-ink-soft">
            The planner has your reply from the email you sent, and our desk can see you answered. Everything else, including the booking, happens directly between you and the planner.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-3 max-w-prose text-[16px] text-ink-soft">
            {lead!.first_reply_at
              ? `You logged a reply ${formatNashville(new Date(String(lead!.first_reply_at)))}. You can update your notes below.`
              : `Please reply by ${formatNashville(new Date(String(lead!.sla_deadline_at)))} Nashville time (${venue!.sla_hours} business hours from routing). Reply to the planner by email first, then log it here so we can stop the clock.`}
          </p>

          <section className="mt-6 rounded-card border border-paper-edge bg-paper-sunk p-5">
            <h2 className="font-sans text-[15px] font-bold">The brief · {String(inquiry!.reference ?? '')}</h2>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-ink">
              {briefText(
                {
                  name: String(inquiry!.name),
                  email: String(inquiry!.email),
                  company: (inquiry!.company as string | null) ?? undefined,
                  phone: (inquiry!.planner_phone as string | null) ?? undefined,
                  eventType: String(inquiry!.event_type),
                  occasion: (inquiry!.occasion as never) ?? undefined,
                  guests: (inquiry!.guests as number | null) ?? undefined,
                  preferredDate: (inquiry!.preferred_date as string | null) ?? undefined,
                  flexibleDates: Boolean(inquiry!.flexible_dates),
                  budget: (inquiry!.budget_range as string | null) ?? undefined,
                  neighborhoods: (inquiry!.neighborhood_pref as string[] | null) ?? [],
                  needs: ((inquiry!.needs as string[] | null) ?? []) as never,
                  details: (inquiry!.details as string | null) ?? undefined,
                  needHotelRooms: Boolean(inquiry!.need_hotel_rooms),
                },
                String(inquiry!.reference ?? ''),
              )}
            </pre>
            <p className="mt-3 text-sm text-ink-soft">
              Occasion: {occasionLabel((inquiry!.occasion as string | null) ?? undefined, String(inquiry!.event_type))}. Reply to the planner at{' '}
              <a href={`mailto:${String(inquiry!.email)}`} className="font-semibold text-ink underline underline-offset-[0.2em]">
                {String(inquiry!.email)}
              </a>
              .
            </p>
          </section>

          <form method="post" action="/api/private-events/reply/" className="mt-6 grid gap-4">
            <input type="hidden" name="token" value={token} />
            <fieldset className="grid gap-2">
              <legend className="field-label">What happened</legend>
              {[
                ['replied', 'I replied to the planner'],
                ['proposal', 'I sent a proposal or hold'],
                ['unavailable', 'The date is unavailable'],
              ].map(([value, label], i) => (
                <label key={value} className="flex min-h-11 items-center gap-3 text-[15px]">
                  <input type="radio" name="outcome" value={value} defaultChecked={i === 0} className="h-4 w-4" />
                  {label}
                </label>
              ))}
            </fieldset>
            <div>
              <label htmlFor="notes" className="field-label">
                Notes for our desk (optional)
              </label>
              <textarea id="notes" name="notes" rows={4} maxLength={4000} defaultValue={(lead!.venue_notes as string | null) ?? ''} className="field-input" placeholder="Anything we should know: holds, pricing sent, a better space for this group." />
            </div>
            <button type="submit" className="btn-primary sm:w-auto">
              Log my reply
            </button>
          </form>

          <p className="mt-6 max-w-prose text-2xs text-ink-soft">
            Nashville.com is paid by the venue only if the event books, at the referral rate in your agreement. The planner confirms everything with you.{' '}
            <Link href="/advertising/#disclosure" className="underline">
              How this works
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
