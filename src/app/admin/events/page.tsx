import Link from 'next/link';
import { redirect } from 'next/navigation';
import { hasAdminSession, isAdminAuthConfigured } from '@/lib/admin-auth';
import { spaceProblems, venueProblems } from '@/lib/events/publish-check';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Private events venues | Nashroam Admin',
  robots: { index: false, follow: false },
};

type VenueRow = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  neighborhood_slug: string;
  address: string;
  summary: string;
  description: string | null;
  hours_note: string | null;
  sales_contact_name: string | null;
  sales_contact_email: string | null;
  owned_by_bph: boolean;
  published: boolean;
  publish_requested_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  verified_at: string | null;
  verified_by: string | null;
  updated_at: string;
};
type SpaceRow = { id: string; venue_id: string; name: string; summary: string | null; seated_capacity: number; standing_capacity: number; pricing_model: 'room_fee' | 'min_spend' | 'per_person' | 'buyout'; min_spend_cents: number | null; room_fee_cents: number | null; per_person_cents: number | null; buyout_from_cents: number | null; pricing_note: string | null; av_note: string | null; hours_note: string | null; blackout_note: string | null; published: boolean };
type MemberRow = { id: string; venue_id: string; email: string; role: string; user_id: string | null };

function when(iso: string | null) {
  return iso ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(new Date(iso)) : '—';
}

/**
 * The desk's view of every venue: who can edit it, what blocks publishing,
 * and the one approval each venue needs before its first publish.
 */
export default async function AdminEventsPage(props: { searchParams?: Promise<Record<string, string | undefined>> }) {
  if (!isAdminAuthConfigured()) redirect('/admin/login?error=not-configured');
  if (!(await hasAdminSession())) redirect('/admin/login');
  const client = getSupabaseServiceClient();
  if (!client) redirect('/admin/login?error=not-configured');
  const query = (await props.searchParams) ?? {};

  const [venuesRes, spacesRes, membersRes, inquiriesRes] = await Promise.all([
    client.from('event_venues').select('id,slug,name,kind,neighborhood_slug,address,summary,description,hours_note,sales_contact_name,sales_contact_email,owned_by_bph,published,publish_requested_at,approved_at,approved_by,verified_at,verified_by,updated_at').order('publish_requested_at', { ascending: false, nullsFirst: false }).order('name'),
    client.from('event_spaces').select('id,venue_id,name,summary,seated_capacity,standing_capacity,pricing_model,min_spend_cents,room_fee_cents,per_person_cents,buyout_from_cents,pricing_note,av_note,hours_note,blackout_note,published'),
    client.from('event_venue_users').select('id,venue_id,email,role,user_id'),
    client.from('event_inquiries').select('id', { count: 'exact', head: true }),
  ]);
  const venues = (venuesRes.data ?? []) as VenueRow[];
  const spaces = (spacesRes.data ?? []) as SpaceRow[];
  const members = (membersRes.data ?? []) as MemberRow[];
  const pending = venues.filter((v) => v.publish_requested_at && !v.approved_at);

  return (
    <main className="shell py-10">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-navy">Private events venues</h1>
      <p className="mt-2 text-sm text-ink-soft">
        {venues.length} venues · {venues.filter((v) => v.published).length} published · {pending.length} awaiting approval · {inquiriesRes.count ?? 0} inquiries.{' '}
        <Link href="/admin" className="text-navy underline">
          Console
        </Link>
      </p>
      {query.error ? (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {query.error}
        </p>
      ) : null}
      {query.ok ? (
        <p role="status" className="mt-4 rounded-lg border border-paper-edge bg-paper-sunk px-4 py-3 text-sm text-ink">
          {query.ok}
        </p>
      ) : null}

      <ul className="mt-8 grid gap-6">
        {venues.map((v) => {
          const vs = spaces.filter((s) => s.venue_id === v.id);
          const vm = members.filter((m) => m.venue_id === v.id);
          const problems = venueProblems({ name: v.name, summary: v.summary, description: v.description, address: v.address, salesContactName: v.sales_contact_name, salesContactEmail: v.sales_contact_email, hoursNote: v.hours_note, approvedAt: v.approved_at ?? '' }).filter((p) => !p.startsWith('The events desk'));
          const readySpaces = vs.filter((s) => spaceProblems({ ...s, seatedCapacity: s.seated_capacity, standingCapacity: s.standing_capacity, pricingModel: s.pricing_model, minSpendCents: s.min_spend_cents, roomFeeCents: s.room_fee_cents, perPersonCents: s.per_person_cents, buyoutFromCents: s.buyout_from_cents, pricingNote: s.pricing_note, avNote: s.av_note, hoursNote: s.hours_note, blackoutNote: s.blackout_note }).length === 0);
          const status = v.published ? 'Published' : v.approved_at ? 'Approved, not published' : v.publish_requested_at ? 'Awaiting approval' : 'Draft';
          return (
            <li key={v.id} className={`rounded-card border bg-paper p-5 ${v.publish_requested_at && !v.approved_at ? 'border-ink' : 'border-paper-edge'}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-sans text-[18px] font-bold text-ink">
                  {v.name} <span className="text-sm font-normal text-ink-soft">{v.kind.replace('_', ' ')} · {v.neighborhood_slug}{v.owned_by_bph ? ' · BPH-owned' : ''}</span>
                </h2>
                <span className={`rounded px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.14em] ${v.published ? 'bg-ink text-paper' : 'border border-paper-edge text-ink-soft'}`}>{status}</span>
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm text-ink-soft sm:grid-cols-3">
                <div>
                  <dt className="font-semibold text-ink">Requested</dt>
                  <dd>{when(v.publish_requested_at)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink">Approved</dt>
                  <dd>
                    {when(v.approved_at)}
                    {v.approved_by ? ` by ${v.approved_by}` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink">Verified</dt>
                  <dd>
                    {v.verified_at ? `${when(v.verified_at)}${v.verified_by ? ` by ${v.verified_by}` : ''}` : 'Not yet'}
                    <form method="post" action={`/api/admin/events/${v.id}/verify`} className="mt-1">
                      {v.verified_at ? <input type="hidden" name="clear" value="1" /> : null}
                      <button type="submit" className="text-sm underline underline-offset-[0.2em]">
                        {v.verified_at ? 'Clear verified badge' : 'Mark verified (after a visit or call)'}
                      </button>
                    </form>
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink">Spaces</dt>
                  <dd>
                    {vs.length} total · {vs.filter((s) => s.published).length} published · {readySpaces.length} ready
                  </dd>
                </div>
              </dl>
              {problems.length ? (
                <ul className="mt-3 grid gap-0.5 text-sm text-ink">
                  {problems.map((p) => (
                    <li key={p}>• {p}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink-soft">Venue details complete.</p>
              )}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <form method="post" action={`/api/admin/events/${v.id}/approve`} className="grid gap-2 rounded border border-paper-edge p-3">
                  <p className="text-sm font-semibold text-ink">Approval</p>
                  {v.approved_at ? (
                    <p className="text-sm text-ink-soft">Approved. The venue publishes itself from here.</p>
                  ) : (
                    <>
                      <label className="inline-flex items-center gap-2 text-sm text-ink">
                        <input type="checkbox" name="publish" value="1" defaultChecked className="h-4 w-4 accent-ink" />
                        Publish now as well (the publish check runs; refusals show here)
                      </label>
                      <button type="submit" className="btn-primary min-h-10 py-2 sm:w-auto" disabled={problems.length > 0 || readySpaces.length === 0}>
                        Approve {v.name}
                      </button>
                      {problems.length > 0 || readySpaces.length === 0 ? <p className="text-2xs text-ink-soft">Blocked until the venue details are complete and at least one space is ready.</p> : null}
                    </>
                  )}
                </form>
                <div className="grid gap-2 rounded border border-paper-edge p-3">
                  <p className="text-sm font-semibold text-ink">Who can edit</p>
                  <ul className="grid gap-1 text-sm text-ink">
                    {vm.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-2">
                        <span>
                          {m.email} <span className="text-ink-soft">({m.role}{m.user_id ? ', signed in' : ''})</span>
                        </span>
                        <form method="post" action={`/api/admin/events/${v.id}/members`}>
                          <input type="hidden" name="action" value="remove" />
                          <input type="hidden" name="memberId" value={m.id} />
                          <button type="submit" className="text-2xs text-ink-soft underline">
                            remove
                          </button>
                        </form>
                      </li>
                    ))}
                    {!vm.length ? <li className="text-ink-soft">Nobody yet.</li> : null}
                  </ul>
                  <form method="post" action={`/api/admin/events/${v.id}/members`} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="action" value="add" />
                    <div className="min-w-[14rem] flex-1">
                      <label htmlFor={`email-${v.id}`} className="field-label">
                        Add by email
                      </label>
                      <input id={`email-${v.id}`} name="email" type="email" required className="field-input min-h-10 py-1.5" placeholder="sales@venue.com" />
                    </div>
                    <select name="role" className="field-input min-h-10 w-auto py-1.5" defaultValue="sales" aria-label="Role">
                      <option value="sales">sales</option>
                      <option value="owner">owner</option>
                    </select>
                    <button type="submit" className="btn-secondary min-h-10 py-2">
                      Add
                    </button>
                  </form>
                </div>
              </div>
              <p className="mt-3 text-2xs text-ink-soft">
                <Link href={`/private-events/venues/${v.slug}/`} className="underline">
                  /private-events/venues/{v.slug}/
                </Link>{' '}
                · updated {when(v.updated_at)}
              </p>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
