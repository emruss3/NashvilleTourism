import Link from 'next/link';
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
  curation_status: string | null;
};

type ViewMode = 'priority' | 'shortlist' | 'all';
type SortMode = 'score' | 'reviews' | 'rating' | 'price' | 'category';
type FilterMode =
  | 'sightseeing'
  | 'music'
  | 'food'
  | 'whiskey'
  | 'museums'
  | 'outdoor'
  | 'group'
  | 'family'
  | 'all';

const VIEWS: ViewMode[] = ['priority', 'shortlist', 'all'];
const SORTS: SortMode[] = ['score', 'reviews', 'rating', 'price', 'category'];
const FILTERS: FilterMode[] = [
  'all',
  'sightseeing',
  'music',
  'food',
  'whiskey',
  'museums',
  'outdoor',
  'group',
  'family',
];

const OFF_MARKET_TITLE =
  /day trip to|memphis|gatlinburg|pigeon forge|louisville|atlanta|chattanooga/i;
const BAD_FLAGS = new Set([
  'outside-nashville-core',
  'transport-oriented',
  'low-rating',
  'low-review-count',
]);

function money(amount: number | null, currency: string | null) {
  if (amount == null) return 'Price unavailable';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function clampPriority(score: number | null): number {
  if (score == null || !Number.isFinite(score)) return 55;
  return Math.min(85, Math.max(40, Math.round(score)));
}

function parseView(value: string | undefined): ViewMode {
  return VIEWS.includes(value as ViewMode) ? (value as ViewMode) : 'shortlist';
}
function parseSort(value: string | undefined): SortMode {
  return SORTS.includes(value as SortMode) ? (value as SortMode) : 'score';
}
function parseFilter(value: string | undefined): FilterMode {
  return FILTERS.includes(value as FilterMode) ? (value as FilterMode) : 'all';
}

function isShortlistCandidate(item: QueueRow): boolean {
  if (!item.viator_product_url) return false;
  if ((item.rating_value ?? 0) < 4.4) return false;
  if ((item.review_count ?? 0) < 40) return false;
  const scoreOk = (item.discovery_score ?? 0) >= 55 || item.discovery_bucket === 'priority-review';
  if (!scoreOk) return false;
  if (OFF_MARKET_TITLE.test(item.title)) return false;
  const flags = item.curation_flags ?? [];
  if (flags.some((f) => BAD_FLAGS.has(f))) return false;
  return true;
}

function matchesFilter(item: QueueRow, filter: FilterMode): boolean {
  if (filter === 'all') return true;
  const cats = (item.suggested_categories ?? []).map((c) => c.toLowerCase());
  const travelers = (item.suggested_traveler_types ?? []).map((t) => t.toLowerCase());
  const flags = (item.curation_flags ?? []).map((f) => f.toLowerCase());
  const title = item.title.toLowerCase();

  switch (filter) {
    case 'sightseeing':
      return cats.some((c) => c.includes('sightseeing') || c.includes('city'));
    case 'music':
      return cats.some((c) => c.includes('music')) || travelers.some((t) => t.includes('music'));
    case 'food':
      return cats.some((c) => c.includes('food')) || travelers.some((t) => t.includes('food'));
    case 'whiskey':
      return (
        /whiskey|whisky|distillery|jack daniel/.test(title) ||
        flags.includes('alcohol-centric') ||
        cats.some((c) => c.includes('food') && /whiskey|whisky|distillery/.test(title))
      );
    case 'museums':
      return cats.some((c) => c.includes('museum') || c.includes('attraction'));
    case 'outdoor':
      return cats.some((c) => c.includes('outdoor') || c.includes('water')) || travelers.some((t) => t.includes('outdoor'));
    case 'group':
      return travelers.some((t) => t.includes('group') || t.includes('friends'));
    case 'family':
      return travelers.some((t) => t.includes('famil'));
    default:
      return true;
  }
}

function sortRows(rows: QueueRow[], sort: SortMode): QueueRow[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (sort) {
      case 'reviews':
        return (b.review_count ?? 0) - (a.review_count ?? 0);
      case 'rating':
        return (b.rating_value ?? 0) - (a.rating_value ?? 0);
      case 'price':
        return (a.from_price ?? Number.POSITIVE_INFINITY) - (b.from_price ?? Number.POSITIVE_INFINITY);
      case 'category': {
        const ac = (a.suggested_categories ?? [])[0] ?? 'zzz';
        const bc = (b.suggested_categories ?? [])[0] ?? 'zzz';
        return ac.localeCompare(bc) || (b.discovery_score ?? 0) - (a.discovery_score ?? 0);
      }
      case 'score':
      default:
        return (b.discovery_score ?? 0) - (a.discovery_score ?? 0);
    }
  });
  return copy;
}

function hrefFor(params: {
  view: ViewMode;
  sort: SortMode;
  filter: FilterMode;
  bucket?: string;
  id?: string;
}) {
  const q = new URLSearchParams();
  q.set('view', params.view);
  q.set('sort', params.sort);
  q.set('filter', params.filter);
  if (params.bucket) q.set('bucket', params.bucket);
  if (params.id) q.set('id', params.id);
  return `/admin/experiences?${q.toString()}`;
}

export default async function ExperienceCurationPage({
  searchParams,
}: {
  searchParams?: {
    approved?: string;
    rejected?: string;
    error?: string;
    id?: string;
    view?: string;
    sort?: string;
    filter?: string;
    bucket?: string;
  };
}) {
  if (!isAdminAuthConfigured()) redirect('/admin/login?error=not-configured');
  if (!hasAdminSession()) redirect('/admin/login');

  const client = getSupabaseServiceClient();
  if (!client) redirect('/admin/login?error=not-configured');

  const view = parseView(searchParams?.view);
  const sort = parseSort(searchParams?.sort);
  const filter = parseFilter(searchParams?.filter);
  const bucket = searchParams?.bucket?.trim() || undefined;
  const focusId = searchParams?.id;

  const selectCols =
    'id,title,viator_product_code,viator_product_url,image_url,discovery_score,discovery_bucket,suggested_categories,suggested_traveler_types,curation_flags,rating_value,review_count,from_price,currency,curation_status';

  const [pendingResult, approvedResult, publishedResult, priorityCountResult] = await Promise.all([
    client
      .from('experience_auto_curation')
      .select(selectCols)
      .eq('curation_status', 'pending')
      .order('discovery_score', { ascending: false })
      .order('review_count', { ascending: false })
      .limit(250),
    client.from('experiences').select('id', { count: 'exact', head: true }).eq('curation_status', 'approved'),
    client.from('experiences').select('id', { count: 'exact', head: true }).eq('is_published', true),
    client
      .from('experience_auto_curation')
      .select('id', { count: 'exact', head: true })
      .eq('curation_status', 'pending')
      .eq('discovery_bucket', 'priority-review'),
  ]);

  const pending = (pendingResult.data ?? []) as QueueRow[];
  const shortlistAll = pending.filter(isShortlistCandidate);
  const shortlistCount = shortlistAll.length;

  let queue = pending;
  if (view === 'priority') {
    queue = pending.filter((r) => r.discovery_bucket === 'priority-review');
  } else if (view === 'shortlist') {
    queue = shortlistAll;
  }
  if (bucket) queue = queue.filter((r) => r.discovery_bucket === bucket);
  queue = sortRows(queue.filter((r) => matchesFilter(r, filter)), sort).slice(0, 75);

  const openId = focusId && queue.some((r) => r.id === focusId) ? focusId : queue[0]?.id;
  const openIndex = openId ? queue.findIndex((r) => r.id === openId) : -1;
  const nextId = openIndex >= 0 && openIndex < queue.length - 1 ? queue[openIndex + 1]?.id : undefined;

  const notice = searchParams?.approved
    ? 'Experience approved and published.'
    : searchParams?.rejected
      ? 'Experience rejected and removed from the review queue.'
      : searchParams?.error
        ? `Action failed: ${searchParams.error}`
        : undefined;

  const base = { view, sort, filter, bucket };

  return (
    <main className="shell pb-20 pt-10">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-paper-edge pb-6">
        <div>
          <p className="eyebrow">Internal · Editorial</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-navy md:text-4xl">
            Experience curation
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">
            Launch shortlist surfaces objective evidence only. Publishing still requires a human Nashroam score,
            planner priority, local note, and explicit approval — never auto-approve from Viator ratings.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
            <Link href="/admin" className="text-navy hover:text-clay">
              Console
            </Link>
            <span className="text-ink-faint">Experiences</span>
            <Link href="/admin/places/canonical" className="text-navy hover:text-clay">
              Canonical places
            </Link>
            <Link href="/admin/places" className="text-navy hover:text-clay">
              Discovery
            </Link>
            <Link href="/admin/sources" className="text-navy hover:text-clay">
              Sources
            </Link>
          </div>
        </div>
        <form action="/api/admin/session" method="post">
          <input type="hidden" name="action" value="logout" />
          <button
            type="submit"
            className="min-h-[40px] rounded-lg border border-paper-edge bg-white px-4 text-sm font-semibold text-navy hover:bg-paper"
          >
            Sign out
          </button>
        </form>
      </div>

      {notice ? (
        <div
          className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
            searchParams?.error
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-green-200 bg-green-50 text-green-800'
          }`}
        >
          {notice}
        </div>
      ) : null}

      <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-card border border-paper-edge bg-paper-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Priority pending</p>
          <p className="mt-2 text-3xl font-bold text-navy">{priorityCountResult.count ?? 0}</p>
        </div>
        <div className="rounded-card border border-paper-edge bg-paper-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Launch shortlist</p>
          <p className="mt-2 text-3xl font-bold text-navy">{shortlistCount}</p>
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

      <nav className="mt-7 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Link
            key={v}
            href={hrefFor({ ...base, view: v })}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
              view === v ? 'border-clay bg-clay text-white' : 'border-paper-edge bg-white text-ink-soft'
            }`}
          >
            {v === 'shortlist' ? 'Launch shortlist' : v === 'priority' ? 'Priority' : 'All pending'}
          </Link>
        ))}
      </nav>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="font-semibold text-navy">Sort:</span>
        {SORTS.map((s) => (
          <Link
            key={s}
            href={hrefFor({ ...base, sort: s })}
            className={sort === s ? 'font-semibold text-clay' : 'text-ink-soft hover:text-clay'}
          >
            {s}
          </Link>
        ))}
      </div>

      <nav className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={hrefFor({ ...base, filter: f })}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              filter === f ? 'border-clay bg-clay text-white' : 'border-paper-edge bg-white text-ink-soft'
            }`}
          >
            {f}
          </Link>
        ))}
      </nav>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{view === 'shortlist' ? 'Launch queue' : 'Review queue'}</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-navy">
              {view === 'shortlist'
                ? 'Strong local candidates with evidence'
                : view === 'priority'
                  ? 'Priority-review bucket'
                  : 'All pending experiences'}
            </h2>
          </div>
          <p className="text-sm text-ink-faint">{queue.length} showing</p>
        </div>

        <div className="mt-5 space-y-5">
          {queue.map((item, index) => {
            const categories = item.suggested_categories ?? [];
            const travelers = item.suggested_traveler_types ?? [];
            const flags = item.curation_flags ?? [];
            const isOpen = item.id === openId;
            const skipTarget = queue[index + 1]?.id;
            const formNextId = skipTarget ?? nextId;

            return (
              <article key={item.id} className="overflow-hidden rounded-card border border-paper-edge bg-paper-card shadow-card">
                <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="bg-paper">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt=""
                        className="h-full min-h-[180px] w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
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
                          Score {item.discovery_score ?? '—'} · {item.viator_product_code ?? 'no code'} ·{' '}
                          {item.discovery_bucket ?? 'unbucketed'}
                        </p>
                        <h3 className="mt-1 font-sans text-xl font-bold leading-snug text-navy">{item.title}</h3>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
                          <span>
                            {item.rating_value != null ? `${Number(item.rating_value).toFixed(1)} ★` : 'No rating'}
                          </span>
                          <span>{(item.review_count ?? 0).toLocaleString()} reviews</span>
                          <span>{money(item.from_price, item.currency)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-sm font-semibold">
                        {item.viator_product_url ? (
                          <a
                            href={item.viator_product_url}
                            target="_blank"
                            rel="noreferrer nofollow sponsored"
                            className="text-navy underline-offset-4 hover:text-clay hover:underline"
                          >
                            Inspect on Viator ↗
                          </a>
                        ) : null}
                        {skipTarget ? (
                          <Link href={hrefFor({ ...base, id: skipTarget })} className="text-ink-soft hover:text-clay">
                            Skip to next
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Categories</p>
                        <p className="mt-1 text-sm text-ink-soft">{categories.join(', ') || 'None'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Travelers</p>
                        <p className="mt-1 text-sm text-ink-soft">{travelers.join(', ') || 'None'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Flags</p>
                        <p className="mt-1 text-sm text-ink-soft">{flags.join(', ') || 'None'}</p>
                      </div>
                    </div>

                    <details className="mt-5 rounded-lg border border-paper-edge bg-white p-4" open={isOpen}>
                      <summary className="cursor-pointer font-semibold text-navy">Editorial review</summary>
                      <form
                        action={`/api/admin/experiences/${item.id}/approve`}
                        method="post"
                        className="mt-4 grid gap-4 lg:grid-cols-2"
                      >
                        {formNextId ? <input type="hidden" name="nextId" value={formNextId} /> : null}
                        <div>
                          <label className="text-sm font-semibold text-navy">Nashroam score (0–100)</label>
                          <input
                            name="nashroamScore"
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            required
                            placeholder="Required — set yourself"
                            className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge px-3"
                          />
                          <p className="mt-1 text-xs text-ink-faint">Never prefilled from Viator rating.</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-navy">Planner priority (0–100)</label>
                          <input
                            name="plannerPriority"
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            required
                            defaultValue={clampPriority(item.discovery_score)}
                            className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge px-3"
                          />
                        </div>
                        <div className="lg:col-span-2">
                          <label className="text-sm font-semibold text-navy">Nashroam local note</label>
                          <textarea
                            name="localNote"
                            rows={3}
                            required
                            placeholder="Why should a Nashville visitor choose this?"
                            className="mt-1 w-full rounded-lg border border-paper-edge p-3"
                          />
                          <p className="mt-1 text-xs text-ink-faint">
                            Example: Strong first-timer overview with live stops — skip if you already know Broadway.
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-navy">
                            Best for <span className="font-normal text-ink-faint">(editable)</span>
                          </label>
                          <input
                            name="bestFor"
                            defaultValue={categories.join(', ')}
                            placeholder="e.g. first-time visitors, couples"
                            className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge px-3"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-navy">
                            Traveler types <span className="font-normal text-ink-faint">(editable)</span>
                          </label>
                          <input
                            name="travelerTypes"
                            defaultValue={travelers.join(', ')}
                            placeholder="e.g. music-focused, families"
                            className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge px-3"
                          />
                        </div>
                        <div className="lg:col-span-2">
                          <label className="text-sm font-semibold text-navy">Internal curation notes</label>
                          <textarea
                            name="curationNotes"
                            rows={2}
                            placeholder="Internal only: reason for approval, caveats, follow-up."
                            className="mt-1 w-full rounded-lg border border-paper-edge p-3"
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-4 lg:col-span-2">
                          <button type="submit" className="btn-primary min-h-[44px]">
                            Approve + publish
                          </button>
                          {skipTarget ? (
                            <Link href={hrefFor({ ...base, id: skipTarget })} className="text-sm font-semibold text-navy hover:text-clay">
                              Skip to next
                            </Link>
                          ) : null}
                        </div>
                      </form>

                      <form
                        action={`/api/admin/experiences/${item.id}/reject`}
                        method="post"
                        className="mt-5 border-t border-paper-edge pt-4"
                      >
                        {formNextId ? <input type="hidden" name="nextId" value={formNextId} /> : null}
                        <label className="text-sm font-semibold text-navy">Reject / exclude</label>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <input
                            name="curationNotes"
                            required
                            placeholder="Why this does not belong in Nashroam"
                            className="min-h-[42px] flex-1 rounded-lg border border-paper-edge px-3"
                          />
                          <button
                            type="submit"
                            className="min-h-[42px] rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800 hover:bg-red-100"
                          >
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
              No experiences match this view and filter.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
