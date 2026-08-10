import Link from 'next/link';
import { redirect } from 'next/navigation';
import { hasAdminSession, isAdminAuthConfigured } from '@/lib/admin-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Place Curation | Nashroam Admin',
  robots: { index: false, follow: false },
};

type CandidateRow = {
  fsq_place_id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  locality: string | null;
  region: string | null;
  postcode: string | null;
  website: string | null;
  tel: string | null;
  date_refreshed: string | null;
  category_labels: string[] | null;
  unresolved_flags: string[] | null;
  suggested_types: string[] | null;
  data_quality_score: number | null;
  has_blocking_flag: boolean;
};

type NeighborhoodRow = { id: string; name: string; slug: string };
type PlaceRow = { id: string; name: string; slug: string };

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function date(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00Z`));
}

const CATEGORY_OPTIONS = [
  'restaurant',
  'bar-nightlife',
  'coffee',
  'attraction',
  'live-music',
  'outdoor',
  'shopping',
  'lodging',
];

export default async function PlaceCurationPage({
  searchParams,
}: {
  searchParams?: { promoted?: string; ignored?: string; error?: string; id?: string };
}) {
  if (!isAdminAuthConfigured()) redirect('/admin/login?error=not-configured');
  if (!hasAdminSession()) redirect('/admin/login');

  const client = getSupabaseServiceClient();
  if (!client) redirect('/admin/login?error=not-configured');

  const [candidateResult, neighborhoodResult, placeResult, pendingCountResult, promotedCountResult] = await Promise.all([
    client
      .from('fsq_os_place_candidate_queue')
      .select('fsq_place_id,name,latitude,longitude,address,locality,region,postcode,website,tel,date_refreshed,category_labels,unresolved_flags,suggested_types,data_quality_score,has_blocking_flag,candidate_status')
      .eq('candidate_status', 'pending')
      .eq('has_blocking_flag', false)
      .order('data_quality_score', { ascending: false })
      .order('date_refreshed', { ascending: false })
      .limit(100),
    client.from('neighborhoods').select('id,name,slug').order('sort_order', { ascending: true }),
    client.from('places').select('id,name,slug').limit(1000),
    client.from('fsq_os_place_candidates').select('fsq_place_id', { count: 'exact', head: true }).eq('candidate_status', 'pending'),
    client.from('fsq_os_place_candidates').select('fsq_place_id', { count: 'exact', head: true }).eq('candidate_status', 'promoted'),
  ]);

  const candidates = (candidateResult.data ?? []) as CandidateRow[];
  const neighborhoods = (neighborhoodResult.data ?? []) as NeighborhoodRow[];
  const places = (placeResult.data ?? []) as PlaceRow[];
  const placesByName = new Map(places.map((p) => [normalizeName(p.name), p]));

  const notice = searchParams?.promoted
    ? 'FSQ candidate promoted into the canonical place system.'
    : searchParams?.ignored
      ? 'FSQ candidate ignored.'
      : searchParams?.error
        ? `Action failed: ${searchParams.error}`
        : undefined;

  return (
    <main className="shell pb-20 pt-10">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-paper-edge pb-6">
        <div>
          <p className="eyebrow">Internal · Places</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-navy md:text-4xl">Place curation</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">
            Foursquare OS data lands here first. Promotion creates or links a canonical Nashroam place, but it remains unverified and unpublished until editorial/operational review is complete.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
            <Link href="/admin/experiences" className="text-navy underline-offset-4 hover:text-clay hover:underline">Experience queue</Link>
            <span className="text-ink-faint">Place queue</span>
          </div>
        </div>
        <form action="/api/admin/session" method="post">
          <input type="hidden" name="action" value="logout" />
          <button type="submit" className="min-h-[40px] rounded-lg border border-paper-edge bg-white px-4 text-sm font-semibold text-navy hover:bg-paper">Sign out</button>
        </form>
      </div>

      {notice ? (
        <div className={`mt-6 rounded-lg border px-4 py-3 text-sm ${searchParams?.error ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'}`}>{notice}</div>
      ) : null}

      <section className="mt-7 grid gap-3 md:grid-cols-3">
        <div className="rounded-card border border-paper-edge bg-paper-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Pending FSQ candidates</p>
          <p className="mt-2 text-3xl font-bold text-navy">{pendingCountResult.count ?? 0}</p>
        </div>
        <div className="rounded-card border border-paper-edge bg-paper-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Promoted</p>
          <p className="mt-2 text-3xl font-bold text-navy">{promotedCountResult.count ?? 0}</p>
        </div>
        <div className="rounded-card border border-paper-edge bg-paper-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Showing now</p>
          <p className="mt-2 text-3xl font-bold text-navy">{candidates.length}</p>
        </div>
      </section>

      {candidates.length === 0 ? (
        <section className="mt-8 rounded-card border border-paper-edge bg-paper-card p-7 shadow-card">
          <h2 className="font-sans text-xl font-bold text-navy">Waiting for the first FSQ OS import</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            The staging schema and importer are ready. Use the Foursquare Places Portal export workflow in <code className="font-mono">docs/data-platform/FOURSQUARE.md</code>, then run <code className="font-mono">npm run import:fsq-os</code>. Imported rows will appear here automatically.
          </p>
        </section>
      ) : (
        <section className="mt-9 space-y-5">
          {candidates.map((item) => {
            const exactMatch = placesByName.get(normalizeName(item.name));
            const suggested = item.suggested_types ?? [];
            const labels = item.category_labels ?? [];
            return (
              <article key={item.fsq_place_id} className="rounded-card border border-paper-edge bg-paper-card p-5 shadow-card md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-clay">Data quality {item.data_quality_score ?? '—'} · {item.fsq_place_id}</p>
                    <h2 className="mt-1 font-sans text-xl font-bold text-navy">{item.name}</h2>
                    <p className="mt-1 text-sm text-ink-soft">
                      {[item.address, item.locality, item.region, item.postcode].filter(Boolean).join(', ') || 'Address unavailable'}
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">FSQ refreshed {date(item.date_refreshed)}</p>
                  </div>
                  {item.website ? (
                    <a href={item.website} target="_blank" rel="noreferrer" className="text-sm font-semibold text-navy underline-offset-4 hover:text-clay hover:underline">Official/site URL ↗</a>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Suggested type</p>
                    <p className="mt-1 text-sm text-ink-soft">{suggested.join(', ') || 'Needs classification'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">FSQ categories</p>
                    <p className="mt-1 text-sm text-ink-soft">{labels.slice(0, 5).join(', ') || 'None'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Possible canonical match</p>
                    <p className="mt-1 text-sm text-ink-soft">{exactMatch ? `${exactMatch.name} (${exactMatch.slug})` : 'No exact-name match'}</p>
                  </div>
                </div>

                <details className="mt-5 rounded-lg border border-paper-edge bg-white p-4" open={searchParams?.id === item.fsq_place_id}>
                  <summary className="cursor-pointer font-semibold text-navy">Review / promote</summary>
                  <form action={`/api/admin/places/${encodeURIComponent(item.fsq_place_id)}/promote`} method="post" className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-semibold text-navy">Primary Nashroam category</label>
                      <select name="primaryCategory" required defaultValue="" className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge bg-white px-3">
                        <option value="" disabled>Select category</option>
                        {[...new Set([...suggested, ...CATEGORY_OPTIONS])].map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-navy">Neighborhood</label>
                      <select name="neighborhoodId" defaultValue="" className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge bg-white px-3">
                        <option value="">Not assigned yet</option>
                        {neighborhoods.map((hood) => <option key={hood.id} value={hood.id}>{hood.name}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-navy">Canonical identity</label>
                      <select name="existingPlaceId" defaultValue="" className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge bg-white px-3">
                        <option value="">Create a new canonical place</option>
                        {exactMatch ? <option value={exactMatch.id}>Attach to existing exact-name match: {exactMatch.name}</option> : null}
                      </select>
                      <p className="mt-1 text-xs text-ink-faint">Do not attach based on a near-name guess. Only use an existing record when you are confident it is the same physical place.</p>
                    </div>
                    <div className="md:col-span-2">
                      <button type="submit" className="btn-primary min-h-[44px]">Promote to canonical places</button>
                    </div>
                  </form>

                  <form action={`/api/admin/places/${encodeURIComponent(item.fsq_place_id)}/ignore`} method="post" className="mt-5 border-t border-paper-edge pt-4">
                    <label className="text-sm font-semibold text-navy">Ignore candidate</label>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input name="reviewNotes" required placeholder="Why this does not belong in the Nashroam corpus" className="min-h-[42px] flex-1 rounded-lg border border-paper-edge px-3" />
                      <button type="submit" className="min-h-[42px] rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800 hover:bg-red-100">Ignore</button>
                    </div>
                  </form>
                </details>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
