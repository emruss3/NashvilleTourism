import Link from 'next/link';
import { redirect } from 'next/navigation';
import { hasAdminSession, isAdminAuthConfigured } from '@/lib/admin-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Source Health | Nashroam Admin',
  robots: { index: false, follow: false },
};

type SourceRow = {
  id: string;
  provider_key: string;
  name: string;
  source_type: string;
  active: boolean;
  default_ttl_minutes: number | null;
  notes: string | null;
};

type ScheduleRow = {
  source_id: string;
  job_key: string;
  cadence: string;
  enabled: boolean;
  last_run_at: string | null;
  next_run_after: string | null;
};

type RunRow = {
  source_id: string | null;
  job_type: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  records_fetched: number;
  records_upserted: number;
  error_message: string | null;
};

function dateTime(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: 'America/Chicago', timeZoneName: 'short',
  }).format(new Date(value));
}

function ttl(value: number | null) {
  if (value == null) return 'Provider-specific';
  if (value % 1440 === 0) return `${value / 1440}d`;
  if (value % 60 === 0) return `${value / 60}h`;
  return `${value}m`;
}

export default async function SourceHealthPage() {
  if (!isAdminAuthConfigured()) redirect('/admin/login?error=not-configured');
  if (!hasAdminSession()) redirect('/admin/login');
  const client = getSupabaseServiceClient();
  if (!client) redirect('/admin/login?error=not-configured');

  const [sourceResult, scheduleResult, runResult] = await Promise.all([
    client
      .from('data_sources')
      .select('id,provider_key,name,source_type,active,default_ttl_minutes,notes')
      .order('source_type')
      .order('name'),
    client
      .from('ingestion_schedules')
      .select('source_id,job_key,cadence,enabled,last_run_at,next_run_after')
      .order('priority', { ascending: false }),
    client
      .from('ingestion_runs')
      .select('source_id,job_type,started_at,completed_at,status,records_fetched,records_upserted,error_message')
      .order('started_at', { ascending: false })
      .limit(200),
  ]);

  const sources = (sourceResult.data ?? []) as SourceRow[];
  const schedules = (scheduleResult.data ?? []) as ScheduleRow[];
  const runs = (runResult.data ?? []) as RunRow[];
  const schedulesBySource = new Map<string, ScheduleRow[]>();
  for (const row of schedules) {
    const list = schedulesBySource.get(row.source_id) ?? [];
    list.push(row);
    schedulesBySource.set(row.source_id, list);
  }
  const latestRun = new Map<string, RunRow>();
  for (const row of runs) {
    if (row.source_id && !latestRun.has(row.source_id)) latestRun.set(row.source_id, row);
  }

  return (
    <main className="shell pb-20 pt-10">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-paper-edge pb-6">
        <div>
          <p className="eyebrow">Internal · Operations</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-navy md:text-4xl">Source health</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">
            Registry, refresh cadence and most recent ingestion result. “Active” means the provider has successfully supplied data; it is not a substitute for checking contractual/licensing status.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
            <Link href="/admin/experiences" className="text-navy underline-offset-4 hover:text-clay hover:underline">Experiences</Link>
            <Link href="/admin/places" className="text-navy underline-offset-4 hover:text-clay hover:underline">Places</Link>
            <span className="text-ink-faint">Sources</span>
          </div>
        </div>
        <form action="/api/admin/session" method="post">
          <input type="hidden" name="action" value="logout" />
          <button type="submit" className="min-h-[40px] rounded-lg border border-paper-edge bg-white px-4 text-sm font-semibold text-navy hover:bg-paper">Sign out</button>
        </form>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-paper-edge bg-paper-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Registered sources</p>
          <p className="mt-2 text-3xl font-bold text-navy">{sources.length}</p>
        </div>
        <div className="rounded-card border border-paper-edge bg-paper-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Active</p>
          <p className="mt-2 text-3xl font-bold text-navy">{sources.filter((s) => s.active).length}</p>
        </div>
        <div className="rounded-card border border-paper-edge bg-paper-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Enabled schedules</p>
          <p className="mt-2 text-3xl font-bold text-navy">{schedules.filter((s) => s.enabled).length}</p>
        </div>
      </section>

      <section className="mt-8 overflow-x-auto rounded-card border border-paper-edge bg-paper-card shadow-card">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="border-b border-paper-edge bg-paper">
            <tr>
              <th className="px-4 py-3 font-semibold text-navy">Source</th>
              <th className="px-4 py-3 font-semibold text-navy">Status</th>
              <th className="px-4 py-3 font-semibold text-navy">TTL</th>
              <th className="px-4 py-3 font-semibold text-navy">Schedule</th>
              <th className="px-4 py-3 font-semibold text-navy">Latest run</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => {
              const sourceSchedules = schedulesBySource.get(source.id) ?? [];
              const run = latestRun.get(source.id);
              return (
                <tr key={source.id} className="border-b border-paper-edge/70 align-top last:border-0">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-navy">{source.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-ink-faint">{source.provider_key}</p>
                    <p className="mt-2 max-w-md text-xs leading-relaxed text-ink-soft">{source.notes || '—'}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${source.active ? 'bg-green-50 text-green-800' : 'bg-paper text-ink-soft'}`}>
                      {source.active ? 'Active' : 'Inactive'}
                    </span>
                    <p className="mt-2 text-xs text-ink-faint">{source.source_type}</p>
                  </td>
                  <td className="px-4 py-4 text-ink-soft">{ttl(source.default_ttl_minutes)}</td>
                  <td className="px-4 py-4">
                    {sourceSchedules.length ? sourceSchedules.map((job) => (
                      <div key={job.job_key} className="mb-2 last:mb-0">
                        <p className="font-medium text-navy">{job.enabled ? job.cadence : `Disabled · ${job.cadence}`}</p>
                        <p className="text-xs text-ink-faint">{job.job_key}</p>
                        <p className="text-xs text-ink-faint">Last {dateTime(job.last_run_at)} · Next {dateTime(job.next_run_after)}</p>
                      </div>
                    )) : <span className="text-ink-faint">No schedule</span>}
                  </td>
                  <td className="px-4 py-4">
                    {run ? (
                      <>
                        <p className={`font-semibold ${run.status === 'succeeded' ? 'text-green-800' : run.status === 'failed' ? 'text-red-800' : 'text-navy'}`}>{run.status}</p>
                        <p className="text-xs text-ink-faint">{run.job_type}</p>
                        <p className="mt-1 text-xs text-ink-faint">{dateTime(run.completed_at || run.started_at)}</p>
                        <p className="text-xs text-ink-faint">{run.records_upserted.toLocaleString()} upserted / {run.records_fetched.toLocaleString()} fetched</p>
                        {run.error_message ? <p className="mt-1 max-w-xs text-xs text-red-700">{run.error_message}</p> : null}
                      </>
                    ) : <span className="text-ink-faint">No run yet</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
