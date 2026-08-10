import Link from 'next/link';
import { redirect } from 'next/navigation';
import { hasAdminSession, isAdminAuthConfigured } from '@/lib/admin-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Place Discovery | Nashroam Admin',
  robots: { index: false, follow: false },
};

type DiscoveryRow = {
  id: string;
  provider_key: string;
  provider_name: string;
  external_id: string;
  name: string;
  basic_category: string | null;
  taxonomy_primary: string | null;
  taxonomy_hierarchy: string[] | null;
  alternate_categories: string[] | null;
  address_line1: string | null;
  locality: string | null;
  region: string | null;
  postal_code: string | null;
  website_url: string | null;
  operating_status: string | null;
  provider_confidence: number | null;
  suggested_category: string | null;
  candidate_score: number | null;
  match_status: string;
  match_confidence: number | null;
  match_method: string | null;
  canonical_place_id: string | null;
  canonical_place_name: string | null;
  canonical_place_slug: string | null;
  canonical_is_published: boolean | null;
  potentially_closed: boolean;
};

const CATEGORY_FILTERS = [
  { key: 'all', label: 'All tourism' },
  { key: 'restaurant', label: 'Restaurant' },
  { key: 'attraction', label: 'Attraction' },
  { key: 'venue', label: 'Venue / live music' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'coffee', label: 'Coffee' },
  { key: 'bar-nightlife', label: 'Nightlife' },
] as const;

const STATUS_FILTERS = [
  { key: 'exceptions', label: 'Exceptions' },
  { key: 'unmatched', label: 'Unmatched' },
  { key: 'ambiguous', label: 'Ambiguous' },
  { key: 'matched', label: 'Matched' },
  { key: 'auto_created', label: 'Promoted / auto-created' },
  { key: 'closed', label: 'Potentially closed' },
  { key: 'all', label: 'All statuses' },
] as const;

function qs(params: {
  provider?: string;
  category?: string;
  status?: string;
  minScore?: string;
}) {
  const next = new URLSearchParams();
  if (params.provider && params.provider !== 'all') next.set('provider', params.provider);
  if (params.category && params.category !== 'all') next.set('category', params.category);
  if (params.status && params.status !== 'exceptions') next.set('status', params.status);
  if (params.minScore) next.set('minScore', params.minScore);
  const s = next.toString();
  return s ? `?${s}` : '';
}

export default async function PlaceDiscoveryPage({
  searchParams,
}: {
  searchParams?: {
    provider?: string;
    category?: string;
    status?: string;
    minScore?: string;
    minConfidence?: string;
  };
}) {
  if (!isAdminAuthConfigured()) redirect('/admin/login?error=not-configured');
  if (!hasAdminSession()) redirect('/admin/login');

  const client = getSupabaseServiceClient();
  if (!client) redirect('/admin/login?error=not-configured');

  const provider = searchParams?.provider || 'all';
  const category = searchParams?.category || 'all';
  const status = searchParams?.status || 'exceptions';
  const minScore = Number(searchParams?.minScore || '0') || 0;
  const minConfidence = Number(searchParams?.minConfidence || '0') || 0;

  let query = client
    .from('place_discovery_queue')
    .select(
      'id,provider_key,provider_name,external_id,name,basic_category,taxonomy_primary,taxonomy_hierarchy,alternate_categories,address_line1,locality,region,postal_code,website_url,operating_status,provider_confidence,suggested_category,candidate_score,match_status,match_confidence,match_method,canonical_place_id,canonical_place_name,canonical_place_slug,canonical_is_published,potentially_closed',
    )
    .eq('tourism_relevant', true)
    .order('candidate_score', { ascending: false })
    .order('name')
    .limit(150);

  if (provider !== 'all') query = query.eq('provider_key', provider);
  if (category !== 'all') {
    if (category === 'venue') query = query.in('suggested_category', ['venue', 'live-music', 'attraction']);
    else query = query.eq('suggested_category', category);
  }
  if (status === 'exceptions') query = query.in('match_status', ['ambiguous', 'unmatched', 'closed']);
  else if (status === 'closed') query = query.or('match_status.eq.closed,potentially_closed.eq.true');
  else if (status !== 'all') query = query.eq('match_status', status);
  if (minScore > 0) query = query.gte('candidate_score', minScore);
  if (minConfidence > 0) query = query.gte('provider_confidence', minConfidence / 100);

  const [queueResult, providersResult, counts] = await Promise.all([
    query,
    client.from('data_sources').select('provider_key,name,active').in('provider_key', ['overture_maps', 'foursquare_os', 'google_places']),
    Promise.all([
      client.from('place_discovery_candidates').select('id', { count: 'exact', head: true }).eq('tourism_relevant', true),
      client.from('place_discovery_candidates').select('id', { count: 'exact', head: true }).eq('match_status', 'ambiguous'),
      client.from('place_discovery_candidates').select('id', { count: 'exact', head: true }).eq('match_status', 'auto_created'),
      client.from('place_discovery_candidates').select('id', { count: 'exact', head: true }).eq('match_status', 'matched'),
      client.from('places').select('id', { count: 'exact', head: true }).eq('curation_status', 'pending'),
    ]),
  ]);

  const rows = (queueResult.data ?? []) as DiscoveryRow[];
  const providers = providersResult.data ?? [];
  const [tourismCount, ambiguousCount, autoCreatedCount, matchedCount, pendingCanonical] = counts;

  return (
    <main className="shell pb-20 pt-10">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-paper-edge pb-6">
        <div>
          <p className="eyebrow">Internal · Places</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-navy md:text-4xl">Place discovery</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">
            Provider-agnostic discovery queue (`place_discovery_queue`). Automation owns identity and matching;
            humans work exceptions and publish via canonical review. Manual restaurant seeding is deprecated.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
            <Link href="/admin/experiences" className="text-navy underline-offset-4 hover:text-clay hover:underline">Experiences</Link>
            <span className="text-ink-faint">Discovery</span>
            <Link href="/admin/places/canonical" className="text-navy underline-offset-4 hover:text-clay hover:underline">Canonical review</Link>
            <Link href="/admin/places/fsq" className="text-navy underline-offset-4 hover:text-clay hover:underline">Legacy FSQ staging</Link>
          </div>
        </div>
        <form action="/api/admin/session" method="post">
          <input type="hidden" name="action" value="logout" />
          <button type="submit" className="min-h-[40px] rounded-lg border border-paper-edge bg-white px-4 text-sm font-semibold text-navy hover:bg-paper">Sign out</button>
        </form>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Tourism candidates', tourismCount.count ?? 0],
          ['Matched', matchedCount.count ?? 0],
          ['Auto-created', autoCreatedCount.count ?? 0],
          ['Ambiguous', ambiguousCount.count ?? 0],
          ['Pending publish', pendingCanonical.count ?? 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-card border border-paper-edge bg-paper-card p-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
            <p className="mt-2 text-3xl font-bold text-navy">{value}</p>
          </div>
        ))}
      </section>

      <nav className="mt-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((item) => (
          <Link
            key={item.key}
            href={`/admin/places${qs({ provider, category, status: item.key, minScore: String(minScore || '') })}`}
            className={`rounded-full border px-3 py-1.5 text-sm ${status === item.key ? 'border-clay bg-clay text-white' : 'border-paper-edge bg-white text-ink-soft'}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <nav className="mt-3 flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((item) => (
          <Link
            key={item.key}
            href={`/admin/places${qs({ provider, category: item.key, status, minScore: String(minScore || '') })}`}
            className={`rounded-full border px-3 py-1.5 text-sm ${category === item.key ? 'border-navy bg-navy text-white' : 'border-paper-edge bg-white text-ink-soft'}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <nav className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/admin/places${qs({ provider: 'all', category, status, minScore: String(minScore || '') })}`}
          className={`rounded-full border px-3 py-1.5 text-sm ${provider === 'all' ? 'border-navy bg-navy text-white' : 'border-paper-edge bg-white text-ink-soft'}`}
        >
          All providers
        </Link>
        {providers.map((p) => (
          <Link
            key={p.provider_key}
            href={`/admin/places${qs({ provider: p.provider_key, category, status, minScore: String(minScore || '') })}`}
            className={`rounded-full border px-3 py-1.5 text-sm ${provider === p.provider_key ? 'border-navy bg-navy text-white' : 'border-paper-edge bg-white text-ink-soft'}`}
          >
            {p.name}{p.active ? '' : ' (inactive)'}
          </Link>
        ))}
      </nav>

      <form className="mt-4 flex flex-wrap items-end gap-3" method="get">
        <input type="hidden" name="provider" value={provider} />
        <input type="hidden" name="category" value={category} />
        <input type="hidden" name="status" value={status} />
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Min candidate score</label>
          <input name="minScore" type="number" min={0} max={100} defaultValue={minScore || ''} className="mt-1 min-h-[40px] w-28 rounded-lg border border-paper-edge px-3" />
        </div>
        <button type="submit" className="btn-secondary min-h-[40px]">Apply</button>
      </form>

      {queueResult.error ? (
        <section className="mt-8 rounded-card border border-amber-200 bg-amber-50 p-7 shadow-card">
          <h2 className="font-sans text-xl font-bold text-navy">Discovery queue unavailable</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Apply migration <code className="font-mono">20260810160000_add_place_discovery_candidates_and_overture_v1.sql</code>,
            then run the weekly Overture sync. Error: {queueResult.error.message}
          </p>
        </section>
      ) : rows.length === 0 ? (
        <section className="mt-8 rounded-card border border-paper-edge bg-paper-card p-7 shadow-card">
          <h2 className="font-sans text-xl font-bold text-navy">No candidates for this filter</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Overture sync populates <code className="font-mono">place_discovery_candidates</code> automatically.
            Humans should not manually seed restaurants into this queue.
          </p>
        </section>
      ) : (
        <section className="mt-9 space-y-5">
          {rows.map((item) => {
            const hierarchy = item.taxonomy_hierarchy ?? [];
            return (
              <article key={item.id} className="rounded-card border border-paper-edge bg-paper-card p-5 shadow-card md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-clay">
                      {item.provider_key} · score {item.candidate_score ?? '—'} · conf {item.provider_confidence ?? '—'} · {item.match_status}
                    </p>
                    <h2 className="mt-1 font-sans text-xl font-bold text-navy">{item.name}</h2>
                    <p className="mt-1 text-sm text-ink-soft">
                      {[item.address_line1, item.locality, item.region, item.postal_code].filter(Boolean).join(', ') || 'Address unavailable'}
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">
                      {item.suggested_category || 'uncategorized'}
                      {item.operating_status ? ` · ${item.operating_status}` : ''}
                      {item.potentially_closed ? ' · potentially closed' : ''}
                      {item.match_method ? ` · match: ${item.match_method}` : ''}
                    </p>
                  </div>
                  {item.website_url ? (
                    <a href={item.website_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-navy underline-offset-4 hover:text-clay hover:underline">Website ↗</a>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Taxonomy</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {[item.basic_category, item.taxonomy_primary, ...hierarchy.slice(0, 4)].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Canonical match</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {item.canonical_place_name
                        ? `${item.canonical_place_name} (${item.canonical_place_slug})${item.canonical_is_published ? ' · published' : ' · unpublished'}`
                        : 'None yet'}
                      {item.match_confidence != null ? ` · ${item.match_confidence}%` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Provider ID</p>
                    <p className="mt-1 break-all font-mono text-xs text-ink-soft">{item.external_id}</p>
                  </div>
                </div>

                {item.canonical_place_id ? (
                  <p className="mt-4 text-sm">
                    <Link href={`/admin/places/canonical?id=${item.canonical_place_id}`} className="font-semibold text-navy underline-offset-4 hover:text-clay hover:underline">
                      Open in canonical review
                    </Link>
                  </p>
                ) : null}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
