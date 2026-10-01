'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { useState } from 'react';
import { explainDbError, spaceProblems, venueProblems } from '@/lib/events/publish-check';
import type { VenueData } from './Dashboard';
import { spaceView } from './rows';

/**
 * The publish gate in plain language. First publish needs the desk's
 * approval (a request here, approval in /admin/events/); after that the
 * venue publishes and unpublishes itself. The database triggers remain the
 * guard; any refusal they raise is shown in the same words.
 */
export default function PublishPanel({ supabase, data, onChanged }: { supabase: SupabaseClient; data: VenueData; onChanged: () => Promise<void> }) {
  const { venue, spaces } = data;
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const problems = venueProblems({
    name: venue.name,
    summary: venue.summary,
    description: venue.description,
    address: venue.address,
    salesContactName: venue.sales_contact_name,
    salesContactEmail: venue.sales_contact_email,
    hoursNote: venue.hours_note,
    approvedAt: venue.approved_at,
  });
  const contentProblems = problems.filter((p) => !p.startsWith('The events desk'));
  const publishedSpaces = spaces.filter((s) => s.published);
  const spaceIssues = spaces.map((s) => ({ space: s, problems: spaceProblems(spaceView(s)) }));
  const readyForApproval = contentProblems.length === 0 && spaceIssues.some((x) => x.problems.length === 0);

  async function run(patch: Record<string, unknown>) {
    setState('busy');
    const { error } = await supabase.from('event_venues').update(patch).eq('id', venue.id);
    if (error) {
      setMessage(explainDbError(error.message));
      setState('error');
      return;
    }
    setState('idle');
    await onChanged();
  }

  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : '');

  return (
    <div className="grid gap-6">
      <section className="rounded-card border border-paper-edge bg-paper p-5">
        <h2 className="font-sans text-[17px] font-bold text-ink">Venue</h2>
        {contentProblems.length ? (
          <ul className="mt-2 grid gap-1 text-[15px] text-ink" aria-label="Before the venue can be published">
            {contentProblems.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[15px] text-ink-soft">Venue details are complete.</p>
        )}
        {!publishedSpaces.length ? <p className="mt-2 text-[15px] text-ink">• At least one space should be published so planners see capacities and a price band. {spaceIssues.some((x) => x.problems.length === 0) ? 'One is ready; publish it from the Spaces tab.' : 'None is ready yet; see the Spaces tab.'}</p> : null}
      </section>

      <section className="rounded-card border border-paper-edge bg-paper p-5">
        <h2 className="font-sans text-[17px] font-bold text-ink">Spaces</h2>
        {spaces.length ? (
          <ul className="mt-2 grid gap-2 text-[15px]">
            {spaceIssues.map(({ space, problems: ps }) => (
              <li key={space.id} className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-semibold text-ink">{space.name}</span>
                <span className="text-ink-soft">{space.published ? 'published' : ps.length ? `not ready: ${ps.join('; ').toLowerCase()}` : 'ready to publish'}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[15px] text-ink-soft">No spaces yet.</p>
        )}
      </section>

      <section className="rounded-card border-2 border-ink bg-paper p-5">
        {venue.published ? (
          <>
            <h2 className="font-sans text-[17px] font-bold text-ink">Your listing is live.</h2>
            <p className="mt-1 text-[15px] text-ink-soft">Edits save straight to the page. Unpublishing hides the venue and every space at once; briefs already sent keep their leads.</p>
            <button type="button" onClick={() => run({ published: false })} className="btn-secondary mt-4 sm:w-auto" disabled={state === 'busy'}>
              Unpublish venue
            </button>
          </>
        ) : venue.approved_at ? (
          <>
            <h2 className="font-sans text-[17px] font-bold text-ink">Approved by the events desk {when(venue.approved_at)}.</h2>
            <p className="mt-1 text-[15px] text-ink-soft">Publish when the details above are complete. From here on, publishing is yours.</p>
            <button type="button" onClick={() => run({ published: true })} className="btn-primary mt-4 sm:w-auto" disabled={state === 'busy' || contentProblems.length > 0}>
              Publish venue
            </button>
          </>
        ) : venue.publish_requested_at ? (
          <>
            <h2 className="font-sans text-[17px] font-bold text-ink">Approval requested {when(venue.publish_requested_at)}.</h2>
            <p className="mt-1 text-[15px] text-ink-soft">The events desk reviews the first publish of every venue, usually within one business day, and publishes it for you or writes back with what to change. You can keep editing meanwhile.</p>
          </>
        ) : (
          <>
            <h2 className="font-sans text-[17px] font-bold text-ink">Ready? Ask the events desk to approve your first publish.</h2>
            <p className="mt-1 text-[15px] text-ink-soft">One review, once. After approval you publish and edit on your own.</p>
            <button type="button" onClick={() => run({ publish_requested_at: new Date().toISOString() })} className="btn-primary mt-4 sm:w-auto" disabled={state === 'busy' || !readyForApproval}>
              Request approval
            </button>
            {!readyForApproval ? <p className="mt-2 text-sm text-ink-soft">Complete the venue details and at least one space first.</p> : null}
          </>
        )}
        {state === 'error' ? (
          <p role="alert" className="mt-3 text-sm text-ink">
            {message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
