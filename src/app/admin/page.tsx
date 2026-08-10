import Link from 'next/link';
import { redirect } from 'next/navigation';
import { hasAdminSession, isAdminAuthConfigured } from '@/lib/admin-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Nashroam Data Console | Admin',
  robots: { index: false, follow: false },
};

function dateTime(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  }).format(new Date(value));
}

export default async function AdminHomePage() {
  if (!isAdminAuthConfigured()) redirect('/admin/login?error=not-configured');
  if (!hasAdminSession()) redirect('/admin/login');
  const client = getSupabaseServiceClient();
  if (!client) redirect('/admin/login?error=not-configured');

  const [
    expTotal,
    expApproved,
    expPublished,
    placeTotal,
    placeApproved,
    placePublished,
    discovery,
    events,
    contexts,
    verification,
    viatorSource,
    tmSource,
    overtureSource,
    schedules,
    eligibleRestaurants,
    eligibleAttractions,
    eligibleVenues,
  ] = await Promise.all([
    client.from('experiences').select('id', { count: 'exact', head: true }),
    client.from('experiences').select('id', { count: 'exact', head: true }).eq('curation_status', 'approved'),
    client.from('experiences').select('id', { count: 'exact', head: true }).eq('is_published', true).eq('curation_status', 'approved'),
    client.from('places').select('id', { count: 'exact', head: true }),
    client.from('places').select('id', { count: 'exact', head: true }).eq('curation_status', 'approved'),
    client.from('places').select('id', { count: 'exact', head: true }).eq('is_published', true),
    client.from('place_discovery_candidates').select('id', { count: 'exact', head: true }).eq('tourism_relevant', true),
    client.from('events').select('id', { count: 'exact', head: true }),
    client.from('planner_context').select('id', { count: 'exact', head: true }).eq('is_active', true),
    client.from('verification_queue').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_review']),
    client.from('data_sources').select('active,name').eq('provider_key', 'viator').maybeSingle(),
    client.from('data_sources').select('active,name').eq('provider_key', 'ticketmaster').maybeSingle(),
    client.from('data_sources').select('active,name').eq('provider_key', 'overture_maps').maybeSingle(),
    client.from('ingestion_schedules').select('job_key,enabled,last_run_at,cadence').order('priority', { ascending: false }),
    client.from('places').select('id', { count: 'exact', head: true }).eq('curation_status', 'approved').eq('is_published', true).eq('status', 'active').eq('primary_category', 'restaurant'),
    client.from('places').select('id', { count: 'exact', head: true }).eq('curation_status', 'approved').eq('is_published', true).eq('status', 'active').in('primary_category', ['attraction', 'park', 'outdoor']),
    client.from('places').select('id', { count: 'exact', head: true }).eq('curation_status', 'approved').eq('is_published', true).eq('status', 'active').in('primary_category', ['venue', 'live-music', 'bar-nightlife']),
  ]);

  const lastViator = (schedules.data ?? []).find((s) => String(s.job_key).includes('viator'))?.last_run_at ?? null;
  const lastTm = (schedules.data ?? []).find((s) => String(s.job_key).includes('ticketmaster'))?.last_run_at ?? null;

  return (
    <main className="shell pb-20 pt-10">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-paper-edge pb-6">
        <div>
          <p className="eyebrow">Internal · Operations</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-navy md:text-4xl">Data platform console</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">
            Live counts for what users can see. Approval is the publication boundary — ingestion never auto-publishes.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
            <Link href="/admin/experiences?view=shortlist" className="text-clay hover:underline">Approve experiences</Link>
            <Link href="/admin/places/canonical" className="text-navy hover:text-clay">Approve places</Link>
            <Link href="/admin/places" className="text-navy hover:text-clay">Discovery</Link>
            <Link href="/admin/sources" className="text-navy hover:text-clay">Sources</Link>
            <a href="/api/data-platform-status" className="text-navy hover:text-clay">Status JSON</a>
          </div>
        </div>
        <form action="/api/admin/session" method="post">
          <input type="hidden" name="action" value="logout" />
          <button type="submit" className="min-h-[40px] rounded-lg border border-paper-edge bg-white px-4 text-sm font-semibold text-navy">Sign out</button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="rounded-card border border-paper-edge bg-paper-card p-6 shadow-card">
          <h2 className="font-sans text-xl font-bold text-navy">Viator</h2>
          <p className="mt-1 text-sm text-ink-soft">{viatorSource.data?.active ? 'Source active' : 'Source inactive'} · last sync {dateTime(lastViator)}</p>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div><dt className="text-xs uppercase text-ink-faint">Total</dt><dd className="mt-1 text-2xl font-bold text-navy">{expTotal.count ?? 0}</dd></div>
            <div><dt className="text-xs uppercase text-ink-faint">Approved</dt><dd className="mt-1 text-2xl font-bold text-navy">{expApproved.count ?? 0}</dd></div>
            <div><dt className="text-xs uppercase text-ink-faint">Published</dt><dd className="mt-1 text-2xl font-bold text-navy">{expPublished.count ?? 0}</dd></div>
          </dl>
          {(expPublished.count ?? 0) === 0 ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              /tours is empty until you approve experiences. Start with the launch shortlist.
            </p>
          ) : null}
        </article>

        <article className="rounded-card border border-paper-edge bg-paper-card p-6 shadow-card">
          <h2 className="font-sans text-xl font-bold text-navy">Places</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Overture {overtureSource.data?.active ? 'active' : 'inactive'} · discovery candidates {discovery.count ?? 0}
          </p>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div><dt className="text-xs uppercase text-ink-faint">Canonical</dt><dd className="mt-1 text-2xl font-bold text-navy">{placeTotal.count ?? 0}</dd></div>
            <div><dt className="text-xs uppercase text-ink-faint">Approved</dt><dd className="mt-1 text-2xl font-bold text-navy">{placeApproved.count ?? 0}</dd></div>
            <div><dt className="text-xs uppercase text-ink-faint">Published</dt><dd className="mt-1 text-2xl font-bold text-navy">{placePublished.count ?? 0}</dd></div>
          </dl>
        </article>

        <article className="rounded-card border border-paper-edge bg-paper-card p-6 shadow-card">
          <h2 className="font-sans text-xl font-bold text-navy">Events</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Ticketmaster Supabase {tmSource.data?.active ? 'active' : 'inactive'} · last schedule {dateTime(lastTm)}
          </p>
          <p className="mt-4 text-3xl font-bold text-navy">{events.count ?? 0} <span className="text-base font-semibold text-ink-soft">canonical</span></p>
          {(events.count ?? 0) === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">Public calendar may still use the legacy direct Ticketmaster adapter until Supabase sync is verified.</p>
          ) : null}
        </article>

        <article className="rounded-card border border-paper-edge bg-paper-card p-6 shadow-card">
          <h2 className="font-sans text-xl font-bold text-navy">Planner eligibility</h2>
          <p className="mt-1 text-sm text-ink-soft">{contexts.count ?? 0} active context rules · {verification.count ?? 0} open verification items</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
            <div><dt className="text-xs uppercase text-ink-faint">Restaurants</dt><dd className="mt-1 text-2xl font-bold text-navy">{eligibleRestaurants.count ?? 0}</dd></div>
            <div><dt className="text-xs uppercase text-ink-faint">Attractions</dt><dd className="mt-1 text-2xl font-bold text-navy">{eligibleAttractions.count ?? 0}</dd></div>
            <div><dt className="text-xs uppercase text-ink-faint">Venues</dt><dd className="mt-1 text-2xl font-bold text-navy">{eligibleVenues.count ?? 0}</dd></div>
            <div><dt className="text-xs uppercase text-ink-faint">Experiences</dt><dd className="mt-1 text-2xl font-bold text-navy">{expPublished.count ?? 0}</dd></div>
          </dl>
        </article>
      </section>

      <section className="mt-8 rounded-card border border-paper-edge bg-paper-card p-6 shadow-card">
        <h2 className="font-sans text-lg font-bold text-navy">Ingestion schedules</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(schedules.data ?? []).map((job) => (
            <div key={job.job_key} className="rounded-lg border border-paper-edge bg-white p-4 text-sm">
              <p className="font-semibold text-navy">{job.job_key}</p>
              <p className="mt-1 text-ink-soft">{job.enabled ? job.cadence : 'Disabled'}</p>
              <p className="mt-2 text-xs text-ink-faint">Last: {dateTime(job.last_run_at)}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
