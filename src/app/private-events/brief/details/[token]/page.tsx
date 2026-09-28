import Link from 'next/link';
import { verifyDetailsToken } from '@/lib/events/magic-link';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { neighborhoods } from '@/lib/content/neighborhoods';
import { BUDGET_RANGES, NEEDS, START_TIME_BANDS } from '@/lib/private-events';
import { buildMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Add detail to your event brief',
  description: 'Add a budget, neighborhoods, needs and notes to a Nashville.com private event brief.',
  path: '/private-events/brief/',
  noindex: true,
});

/**
 * The planner's optional fields, reached from the signed link in the
 * confirmation email. A plain form, no login. Prefilled with whatever is on
 * the inquiry already so a second visit edits rather than overwrites blind.
 */
export default async function BriefDetailsPage(props: { params: Promise<{ token: string }>; searchParams?: Promise<Record<string, string | undefined>> }) {
  const { token } = await props.params;
  const query = (await props.searchParams) ?? {};
  const verified = verifyDetailsToken(token);
  const supabase = getSupabaseServiceClient();
  const inquiry =
    'inquiryId' in verified && supabase
      ? (await supabase.from('event_inquiries').select('reference,name,budget_range,neighborhood_pref,needs,start_time_band,planner_phone,planner_org,details').eq('id', verified.inquiryId).single()).data
      : null;

  const problem =
    'error' in verified
      ? verified.error === 'expired'
        ? 'This link has expired. Reply to your confirmation email and the events desk will add the detail for you.'
        : 'This link is not valid. Reply to your confirmation email and the events desk will add the detail for you.'
      : !supabase
        ? 'This page is not connected right now. Reply to your confirmation email instead.'
        : !inquiry
          ? 'We could not find this brief. Reply to your confirmation email instead.'
          : query.error
            ? 'Your detail was not saved. Reply to your confirmation email and we will add it by hand.'
            : undefined;

  const hoods = new Set((inquiry?.neighborhood_pref as string[] | null) ?? []);
  const needs = new Set((inquiry?.needs as string[] | null) ?? []);
  const chip = 'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded border border-paper-edge bg-paper px-3 text-sm text-ink has-[:checked]:border-ink has-[:checked]:bg-paper-sunk has-[:checked]:font-semibold';

  return (
    <div className="shell max-w-3xl pb-16 pt-8">
      <p className="eyebrow">Nashville.com private events</p>
      <h1 className="mt-2 text-[2rem] sm:text-[2.5rem]">{inquiry ? `Add detail, ${String(inquiry.name).split(' ')[0]}` : 'Add detail to your brief'}</h1>
      {problem ? (
        <p className="mt-4 max-w-prose text-[16px] text-ink-soft">{problem}</p>
      ) : query.done ? (
        <div role="status" className="mt-6 rounded-card border border-ink bg-paper p-6">
          <p className="text-[1.25rem] font-bold text-ink">Saved. Thank you.</p>
          <p className="mt-2 max-w-prose text-[15px] text-ink-soft">The events desk has the extra detail on {String(inquiry!.reference ?? 'your brief')} and passes on anything the venues need. You can come back to this link and change it.</p>
        </div>
      ) : (
        <>
          <p className="mt-3 max-w-prose text-[16px] text-ink-soft">
            Everything here is optional and helps the venues answer with the right space and price. Reference {String(inquiry!.reference ?? '')}.
          </p>
          <form method="post" action="/api/private-events/details/" className="mt-6 grid gap-6">
            <input type="hidden" name="token" value={token} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="d-budget" className="field-label">
                  Budget range
                </label>
                <select id="d-budget" name="budget" defaultValue={(inquiry!.budget_range as string | null) ?? ''} className="field-input">
                  <option value="">Select a range</option>
                  {BUDGET_RANGES.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="d-start" className="field-label">
                  Start time
                </label>
                <select id="d-start" name="startTimeBand" defaultValue={(inquiry!.start_time_band as string | null) ?? ''} className="field-input">
                  <option value="">Not sure yet</option>
                  {START_TIME_BANDS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <fieldset>
              <legend className="field-label">Neighborhoods you would consider</legend>
              <ul className="mt-1 flex flex-wrap gap-2">
                {neighborhoods.map((n) => (
                  <li key={n.slug}>
                    <label className={chip}>
                      <input type="checkbox" name="neighborhoods" value={n.slug} defaultChecked={hoods.has(n.slug)} className="sr-only" />
                      {n.name}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
            <fieldset>
              <legend className="field-label">What you need</legend>
              <ul className="mt-1 flex flex-wrap gap-2">
                {NEEDS.map((n) => (
                  <li key={n.value}>
                    <label className={chip}>
                      <input type="checkbox" name="needs" value={n.value} defaultChecked={needs.has(n.value)} className="sr-only" />
                      {n.label}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="d-company" className="field-label">
                  Organization
                </label>
                <input id="d-company" name="company" defaultValue={(inquiry!.planner_org as string | null) ?? ''} maxLength={160} className="field-input" />
              </div>
              <div>
                <label htmlFor="d-phone" className="field-label">
                  Phone
                </label>
                <input id="d-phone" name="phone" type="tel" defaultValue={(inquiry!.planner_phone as string | null) ?? ''} maxLength={40} className="field-input" />
              </div>
            </div>
            <div>
              <label htmlFor="d-details" className="field-label">
                Notes for the venues
              </label>
              <textarea id="d-details" name="details" rows={5} maxLength={4000} defaultValue={(inquiry!.details as string | null) ?? ''} className="field-input min-h-[7rem] resize-y" />
            </div>
            <button type="submit" className="btn-primary sm:w-auto">
              Save detail
            </button>
          </form>
          <p className="mt-6 max-w-prose text-2xs text-ink-soft">
            Nashville.com is paid by the venue only if your event books; that never changes which venues we suggest.{' '}
            <Link href="/advertising/#disclosure" className="underline">
              How this works
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
