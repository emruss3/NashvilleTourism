import Link from 'next/link';
import DiscoveryForm from '@/components/home/DiscoveryForm';
import CategoryLinks from '@/components/home/CategoryLinks';
import { ContentImage, SmartImage } from '@/components/Media';
import PageIntro from '@/components/hub/PageIntro';
import { Breadcrumbs } from '@/components/Ui';
import { getCalendar } from '@/lib/feeds/calendar';
import {
  EXPLORE_PAGE_SIZE,
  exploreEvents,
  exploreHref,
  explorePlaces,
  formatDay,
  hasFilters,
  parseExploreQuery,
  resolveWindow,
  INTERESTS,
  type ExploreItem,
} from '@/lib/explore';
import { neighborhoodName } from '@/lib/content/neighborhoods';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 1800;

type Params = Record<string, string | string[] | undefined>;


export async function generateMetadata(props: { searchParams?: Promise<Params> }) {
  const query = parseExploreQuery((await props.searchParams) ?? {});
  const filtered = hasFilters(query);
  return buildMetadata({
    title: 'Explore Nashville',
    description:
      'Find events and places in Nashville by neighborhood, interest, and date: live music, restaurants, museums, parks, and what is on tonight or this weekend.',
    path: '/explore/',
    // Only the unfiltered index is indexable; filter combinations are not.
    noindex: filtered,
  });
}

/**
 * Explore / event index (SITE-LAYOUT.md §Secondary page templates). Filters
 * are URL-addressable, results are paginated with real links, and editorial
 * recommendations stay distinguishable from sponsored placements.
 */
export default async function ExplorePage(props: { searchParams?: Promise<Params> }) {
  const query = parseExploreQuery((await props.searchParams) ?? {});
  const calendar = await getCalendar({ size: 300 });
  const window = resolveWindow(query);

  const eventItems = calendar.live ? exploreEvents(calendar.events, query) : [];
  const placeItems = explorePlaces(query);
  const all: ExploreItem[] = [...eventItems, ...placeItems];

  const total = all.length;
  const pages = Math.max(1, Math.ceil(total / EXPLORE_PAGE_SIZE));
  const page = Math.min(query.page, pages);
  const start = (page - 1) * EXPLORE_PAGE_SIZE;
  const items = all.slice(start, start + EXPLORE_PAGE_SIZE);

  const summary = [
    query.interest ? INTERESTS.find((i) => i.value === query.interest)?.label : null,
    query.neighborhood ? neighborhoodName(query.neighborhood) : 'All Nashville',
    window.label ?? null,
    query.q ? `“${query.q}”` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <div className="shell">
        <Breadcrumbs trail={[{ name: 'Explore', href: '/explore/' }]} />
      </div>

      <PageIntro
        eyebrow="Explore"
        title="Find your plans."
        support="Events and places across Nashville, filtered by neighborhood, interest and date."
        media={
          <div className="overflow-hidden rounded-card bg-ink">
            <SmartImage imageKey="concept/home-social" ratio="aspect-[16/9] lg:aspect-auto lg:h-[360px]" sizes="(max-width: 1023px) 100vw, 58vw" priority />
          </div>
        }
      />

      <div className="border-y border-paper-edge bg-paper-sunk">
        <div className="shell py-5 md:py-6">
          <DiscoveryForm variant="explore" initial={query} />
        </div>
      </div>

      <CategoryLinks />

    <div className="shell pb-16">
      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-3 border-b border-paper-edge pb-3">
        <p className="text-[15px] text-ink" aria-live="polite">
          <strong className="font-semibold">{total}</strong> {total === 1 ? 'result' : 'results'}
          <span className="text-ink-soft"> · {summary}</span>
        </p>
        {hasFilters(query) ? (
          <Link href="/explore/" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink underline-offset-[0.2em] hover:underline">
            Clear filters
          </Link>
        ) : null}
      </div>

      {!calendar.live && (window.label || query.when) ? (
        <p className="mt-4 rounded-card border border-paper-edge p-4 text-[15px] text-ink-soft">
          No dated listings for that window yet. Places are shown for every date; for tonight&rsquo;s music,
          start with the <Link href="/music/" className="font-semibold text-ink underline-offset-[0.2em] hover:underline">venue guide</Link>.
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="mt-10 rounded-card border border-dashed border-paper-edge p-8 text-center">
          <p className="text-[17px] font-semibold text-ink">No events match those filters. Try another date or neighborhood.</p>
          <Link href="/explore/" className="btn-secondary mt-5">
            Show everything
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {items.map((item) => (
            <li key={item.id}>
              <ExploreCard item={item} />
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <nav aria-label="Result pages" className="mt-10 flex items-center justify-between gap-4 border-t border-paper-edge pt-5">
          <div>
            {page > 1 ? (
              <Link href={exploreHref({ ...query, page: page - 1 })} className="btn-secondary">
                Previous
              </Link>
            ) : null}
          </div>
          <p className="text-sm text-ink-soft">
            Page {page} of {pages}
          </p>
          <div>
            {page < pages ? (
              <Link href={exploreHref({ ...query, page: page + 1 })} className="btn-secondary">
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
    </>
  );
}

function ExploreCard({ item }: { item: ExploreItem }) {
  const titleClass = 'after:absolute after:inset-0 underline-offset-[0.2em] hover:underline';
  return (
    <article className="card group relative flex h-full flex-col overflow-hidden">
      {item.image?.src ? (
        <ContentImage image={item.image} ratio="aspect-[3/2]" sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw" />
      ) : null}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
          {item.kind === 'event' && item.date ? `${formatDay(item.date)}${item.time ? ` · ${formatClock(item.time)}` : ''} · ` : ''}
          {item.meta}
        </p>
        <h2 className="font-sans text-[17px] font-bold leading-snug text-ink">
          {item.external ? (
            <a href={item.href} target="_blank" rel="noopener noreferrer" className={titleClass}>
              {item.title}
              <span className="sr-only"> (opens the ticket provider in a new tab)</span>
            </a>
          ) : (
            <Link href={item.href} className={titleClass}>
              {item.title}
            </Link>
          )}
        </h2>
        {item.summary ? <p className="line-clamp-3 text-[15px] text-ink-soft">{item.summary}</p> : null}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-2xs font-medium text-ink-soft">
          {item.price ? <span>{item.price}</span> : null}
          {item.kind === 'event' ? <span>Tickets via Ticketmaster</span> : null}
          {item.sponsored ? <span className="rounded border border-paper-edge px-1.5 py-0.5 uppercase tracking-wider">Sponsored</span> : null}
        </div>
      </div>
    </article>
  );
}

function formatClock(value: string) {
  const [h, m = '00'] = value.split(':');
  const hour = Number(h);
  if (!Number.isFinite(hour)) return value;
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}
