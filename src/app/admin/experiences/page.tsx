import { redirect } from 'next/navigation';
import { hasAdminSession, isAdminAuthConfigured } from '@/lib/admin-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Experience Curation | Nashroam Admin',
  robots: { index: false, follow: false },
};

type QueueRow = {
  id: string;
  title: string;
  viator_product_code: string | null;
  viator_product_url: string | null;
  image_url: string | null;
  discovery_score: number | null;
  discovery_bucket: string | null;
  suggested_categories: string[] | null;
  suggested_traveler_types: string[] | null;
  curation_flags: string[] | null;
  rating_value: number | null;
  review_count: number | null;
  from_price: number | null;
  currency: string | null;
};

type ScheduleRow = {
  job_key: string;
  cadence: string;
  enabled: boolean;
  last_run_at: string | null;
  next_run_after: string | null;
};

function money(amount: number | null, currency: string | null) {
  if (amount == null) return 'Price unavailable';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function dateTime(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
    timeZoneName: 'short',
  }).format(new Date(value));
}

export default async function ExperienceCurationPage({
  searchParams,
}: {
  searchParams?: { approved?: string; rejected?: string; error?: string; id?: string };
}) {
  if (!isAdminAuthConfigured()) redirect('/admin/login?error=not-configured');
  if (!hasAdminSession()) redirect('/admin/login');

  const client = getSupabaseServiceClient();
  if (!client) redirect('/admin/login?error=not-configured');

  const [queueResult, scheduleResult, approvedResult, publishedResult] = await Promise.all([
    client
      .from('experience_auto_curation')
      .select(
        'id,title,viator_product_code,viator_product_url,image_url,discovery_score,discovery_bucket,suggested_categories,suggested_traveler_types,curation_flags,rating_value,review_count,from_price,currency,curation_status',
      )
      .eq('curation_status', 'pending')
      .eq('discovery_bucket', 'priority-review')
      .order('discovery_score', { ascending: false })
      .order('review_count', { ascending: false })
      .limit(75),
    client
      .from('ingestion_schedules')
      .select('job_key,cadence,enabled,last_run_at,next_run_after')
      .order('priority', { ascending: false }),
    client.from('experiences').select('id', { count: 'exact', head: true }).eq('curation_status', 'approved'),
    client.from('experiences').select('id', { count: 'exact', head: true }).eq('is_published', true),
  ]);

  const queue = (queueResult.data ?? []) as QueueRow[];
  const schedules = (scheduleResult.data ?? []) as ScheduleRow[];

  const notice = searchParams?.approved
    ? 'Experience approved and published.'
    : searchParams?.rejected
      ? 'Experience rejected and removed from the review queue.'
      : searchParams?.error
        ? `Action failed: ${searchParams.error}`
        : undefined;

  return (
    <main className="shell pb-20 pt-10">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-paper-edge pb-6">
        <div>
          <p className="eyebrow">Internal · Editorial</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-navy md:text-4xl">
            Experience curation
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">
            Machine scoring only decides what deserves review. Publishing requires a human Nashroam score, planner priority, local note, and explicit approval.
          </p>
        </div>
        <form action="/api/admin/session" method="post">
          <input type="hidden" name="action" value="logout" />
          <button type="submit" className="min-h-[40px] rounded-lg border border-paper-edge bg-white px-4 text-sm font-semibold text-navy hover:bg-paper">
            Sign out
          </button>
        </form>
      </div>

      {notice ? (
        <div className={`mt-6 rounded-lg border px-4 py-3 text-sm ${searchParams?.error ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'}`}>
          {notice}
        </div>
      ) : null}

      <section className="mt-7 grid gap-3 md:grid-cols-3">
        <div className="rounded-card border border-paper-edge bg-paper-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Priority review</p>
          <p className="mt-2 text-3xl font-bold text-navy">{queue.length}</p>
        </div>
        <div className="rounded-card border border-paper-edge bg-paper-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Approved</p>
          <p className="mt-2 text-3xl font-bold text-navy">{approvedResult.count ?? 0}</p>
        </div>
        <div className="rounded-card border border-paper-edge bg-paper-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Published</p>
          <p className="mt-2 text-3xl font-bold text-navy">{publishedResult.count ?? 0}</p>
        </div>
      </section>

      <section className="mt-7 rounded-card border border-paper-edge bg-paper-card p-5 shadow-card">
        <h2 className="font-sans text-lg font-bold text-navy">Ingestion health</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {schedules.map((job) => (
            <div key={job.job_key} className="rounded-lg border border-paper-edge bg-white p-4 text-sm">
              <p className="font-semibold text-navy">{job.job_key}</p>
              <p className="mt-1 text-ink-soft">{job.enabled ? job.cadence : 'Disabled'}</p>
              <p className="mt-2 text-xs text-ink-faint">Last: {dateTime(job.last_run_at)}</p>
              <p className="text-xs text-ink-faint">Next: {dateTime(job.next_run_after)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Priority queue</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-navy">Review the strongest candidates first</h2>
          </div>
          <p className="text-sm text-ink-faint">{queue.length} pending</p>
        </div>

        <div className="mt-5 space-y-5">
          {queue.map((item) => {
            const categories = item.suggested_categories ?? [];
            const travelers = item.suggested_traveler_types ?? [];
            const flags = item.curation_flags ?? [];
            return (
              <article key={item.id} className="overflow-hidden rounded-card border border-paper-edge bg-paper-card shadow-card">
                <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="bg-paper">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt="" className="h-full min-h-[180px] w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="flex h-full min-h-[180px] items-center justify-center p-6 text-center text-sm text-ink-faint">
                        No provider image
                      </div>
                    )}
                  </div>

                  <div className="p-5 md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-clay">
                          Discovery score {item.discovery_score ?? '—'} · {item.viator_product_code}
                        </p>
                        <h3 className="mt-1 font-sans text-xl font-bold leading-snug text-navy">{item.title}</h3>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
                          <span>{item.rating_value != null ? `${Number(item.rating_value).toFixed(1)} ★` : 'No rating'}</span>
                          <span>{(item.review_count ?? 0).toLocaleString()} reviews</span>
                          <span>{money(item.from_price, item.currency)}</span>
                        </div>
                      </div>
                      {item.viator_product_url ? (
                        <a href={item.viator_product_url} target="_blank" rel="noreferrer nofollow sponsored" className="text-sm font-semibold text-navy underline-offset-4 hover:text-clay hover:underline">
                          Inspect on Viator ↗
                        </a>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Machine category suggestions</p>
                        <p className="mt-1 text-sm text-ink-soft">{categories.join(', ') || 'None'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Traveler suggestions</p>
                        <p className="mt-1 text-sm text-ink-soft">{travelers.join(', ') || 'None'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Review flags</p>
                        <p className="mt-1 text-sm text-ink-soft">{flags.join(', ') || 'None'}</p>
                      </div>
                    </div>

                    <details className="mt-5 rounded-lg border border-paper-edge bg-white p-4" open={searchParams?.id === item.id}>
                      <summary className="cursor-pointer font-semibold text-navy">Editorial review</summary>
                      <form action={`/api/admin/experiences/${item.id}/approve`} method="post" className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div>
                          <label className="text-sm font-semibold text-navy">Nashroam score (0–100)</label>
                          <input name="nashroamScore" type="number" min="0" max="100" step="1" required className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge px-3" />
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-navy">Planner priority (0–100)</label>
                          <input name="plannerPriority" type="number" min="0" max="100" step="1" defaultValue="70" required className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge px-3" />
                        </div>
                        <div className="lg:col-span-2">
                          <label className="text-sm font-semibold text-navy">Nashroam local note</label>
                          <textarea name="localNote" rows={3} required placeholder="Why should a Nashville visitor actually choose this? Include the tradeoff/caveat." className="mt-1 w-full rounded-lg border border-paper-edge p-3" />
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-navy">Best for <span className="font-normal text-ink-faint">(edit machine suggestion)</span></label>
                          <input name="bestFor" defaultValue={categories.join(', ')} className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge px-3" />
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-navy">Traveler types <span className="font-normal text-ink-faint">(edit machine suggestion)</span></label>
                          <input name="travelerTypes" defaultValue={travelers.join(', ')} className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge px-3" />
                        </div>
                        <div className="lg:col-span-2">
                          <label className="text-sm font-semibold text-navy">Internal curation notes</label>
                          <textarea name="curationNotes" rows={2} placeholder="Internal only: reason for approval, caveats, follow-up verification." className="mt-1 w-full rounded-lg border border-paper-edge p-3" />
                        </div>
                        <div className="lg:col-span-2">
                          <button type="submit" className="btn-primary min-h-[44px]">Approve + publish</button>
                        </div>
                      </form>

                      <form action={`/api/admin/experiences/${item.id}/reject`} method="post" className="mt-5 border-t border-paper-edge pt-4">
                        <label className="text-sm font-semibold text-navy">Reject / exclude</label>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <input name="curationNotes" required placeholder="Why this does not belong in Nashroam" className="min-h-[42px] flex-1 rounded-lg border border-paper-edge px-3" />
                          <button type="submit" className="min-h-[42px] rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800 hover:bg-red-100">
                            Reject
                          </button>
                        </div>
                      </form>
                    </details>
                  </div>
                </div>
              </article>
            );
          })}

          {queue.length === 0 ? (
            <div className="rounded-card border border-paper-edge bg-paper-card p-8 text-center text-ink-soft">
              No priority-review experiences are waiting for curation.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
