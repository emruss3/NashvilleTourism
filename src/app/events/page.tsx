import Link from 'next/link';
import { CalendarIcon } from '@/components/Icons';
import { SmartImage } from '@/components/Media';
import { Breadcrumbs } from '@/components/Ui';
import EventSchedule from '@/components/events/EventSchedule';
import PageIntro from '@/components/hub/PageIntro';
import SearchField from '@/components/hub/SearchField';
import SectionHead from '@/components/hub/SectionHead';
import { venues } from '@/lib/content';
import { formatDay, isWhen, resolveWindow, type ExploreQuery } from '@/lib/explore';
import { getCalendar } from '@/lib/feeds/calendar';
import { musicVenues } from '@/lib/music-venues';
import { buildMetadata, isIndexableRecord } from '@/lib/seo';
import type { LiveEvent } from '@/lib/feeds/ticketmaster';

export const revalidate = 1800;

type Params = Record<string, string | string[] | undefined>;
const PAGE_SIZE = 40;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function one(params: Params, key: string): string | undefined {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

function parse(params: Params) {
  const when = one(params, 'when');
  const from = one(params, 'from');
  const to = one(params, 'to');
  const page = Number.parseInt(one(params, 'page') || '1', 10);
  return {
    q: one(params, 'q')?.slice(0, 80),
    category: one(params, 'category')?.slice(0, 40),
    when: isWhen(when) ? when : undefined,
    from: from && ISO_DAY.test(from) ? from : undefined,
    to: to && ISO_DAY.test(to) ? to : undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

type Query = ReturnType<typeof parse>;

function href(query: Partial<Query>): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.category) params.set('category', query.category);
  if (query.when) params.set('when', query.when);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  const qs = params.toString();
  return qs ? `/events/?${qs}` : '/events/';
}

function categoryOf(event: LiveEvent): string {
  return event.segment || event.genre || 'Other';
}

export async function generateMetadata(props: { searchParams?: Promise<Params> }) {
  const query = parse((await props.searchParams) ?? {});
  const filtered = Boolean(query.q || query.category || query.when || query.from || query.to || query.page > 1);
  return buildMetadata({
    title: query.category ? `Nashville ${query.category} Events` : 'Nashville Events',
    description:
      'Concerts, sports, theater and ticketed events at Nashville venues, soonest first, with current listings supplied by Ticketmaster. Tonight, this weekend or your dates.',
    path: '/events/',
    noindex: filtered,
  });
}

/**
 * Events: a live calendar (page-designs/README.md §05).
 * Charcoal feature with date-first search, then a chronological schedule
 * grouped by day, a narrow venue feature on desktop, the venue rail and a
 * plan-a-night hand-off. Dates resolve in America/Chicago; the active range
 * is always visible. No fabricated dates, prices or availability.
 */
export default async function EventsIndex(props: { searchParams?: Promise<Params> }) {
  const query = parse((await props.searchParams) ?? {});
  const window = resolveWindow({ ...query, page: 1 } as ExploreQuery);
  const calendar = await getCalendar({ size: 400, startDate: window.from, endDate: window.to });

  const categories = Array.from(new Set(calendar.events.map(categoryOf))).sort();
  const category = query.category && categories.includes(query.category) ? query.category : undefined;
  const q = query.q?.toLowerCase();
  const matches = calendar.events
    .filter((e) => !category || categoryOf(e) === category)
    .filter((e) => !q || e.name.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q));

  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(query.page, pages);
  const shown = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtered = Boolean(query.q || category || window.label);

  const featuredVenue = musicVenues.find((v) => v.slug === 'ryman-auditorium');
  const venueImage = venues.find((v) => v.slug === 'ryman-auditorium')?.image;
  const venueRail = venues.filter((v) => isIndexableRecord(v) && v.image && v.slug !== 'ryman-auditorium').slice(0, 5);
  const opry = musicVenues.find((v) => v.slug === 'grand-ole-opry');

  return (
    <>
      <div className="shell">
        <Breadcrumbs trail={[{ name: 'Events', href: '/events/' }]} />
      </div>

      <PageIntro
        tone="ink"
        eyebrow="Music lives here"
        title="Be there."
        support="The shows, nights and moments worth going out for."
        media={
          <div className="overflow-hidden rounded-card bg-paper/10">
            <SmartImage imageKey="hero/live-music-night" ratio="aspect-[16/10] lg:aspect-auto lg:h-[440px]" sizes="(max-width: 1023px) 100vw, 58vw" priority />
          </div>
        }
      >
        <SearchField
          action="/events/"
          label="Search events, artists or venues"
          placeholder="Search events, artists or venues"
          defaultValue={query.q}
          hidden={{ category, when: query.when, from: query.from, to: query.to }}
          tone="ink"
          buttonLabel="Find events"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[
            { value: 'tonight', label: 'Tonight' },
            { value: 'weekend', label: 'This weekend' },
          ].map((w) => {
            const active = query.when === w.value;
            return (
              <Link
                key={w.value}
                href={href({ q: query.q, category, when: active ? undefined : (w.value as Query['when']) })}
                aria-current={active ? 'true' : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded border px-4 text-[15px] font-semibold ${
                  active ? 'border-paper bg-paper text-ink' : 'border-paper/60 text-paper hover:border-paper'
                }`}
              >
                <CalendarIcon size={16} />
                {w.label}
              </Link>
            );
          })}
          <details className="group relative">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded border border-paper/60 px-4 text-[15px] font-semibold text-paper hover:border-paper [&::-webkit-details-marker]:hidden">
              <CalendarIcon size={16} />
              Choose dates
              <span aria-hidden="true" className="text-xs transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>
            <form action="/events/" method="get" className="mt-2 grid gap-2 rounded-card border border-paper/30 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
              {category ? <input type="hidden" name="category" value={category} /> : null}
              <div>
                <label htmlFor="events-from" className="mb-1 block text-2xs font-semibold uppercase tracking-[0.14em] text-paper/75">
                  From
                </label>
                <input id="events-from" name="from" type="date" defaultValue={query.from ?? ''} className="field-input border-paper/60 bg-transparent text-paper [color-scheme:dark] focus:border-paper" />
              </div>
              <div>
                <label htmlFor="events-to" className="mb-1 block text-2xs font-semibold uppercase tracking-[0.14em] text-paper/75">
                  To
                </label>
                <input id="events-to" name="to" type="date" defaultValue={query.to ?? ''} className="field-input border-paper/60 bg-transparent text-paper [color-scheme:dark] focus:border-paper" />
              </div>
              <button type="submit" className="btn-reverse">
                Apply
              </button>
            </form>
          </details>
        </div>
      </PageIntro>

      <div className="shell section">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
          <section aria-labelledby="schedule-title">
            <SectionHead
              id="schedule-title"
              eyebrow={window.label ? `Showing ${window.label}${window.from ? ` · ${window.from === window.to ? formatDay(window.from) : `${formatDay(window.from)} to ${formatDay(window.to!)}`}` : ''}` : 'Soonest first'}
              title={category ? `${category} events.` : 'Upcoming events.'}
              support={
                calendar.live
                  ? `${matches.length} ${matches.length === 1 ? 'event' : 'events'}${query.q ? ` matching “${query.q}”` : ''}. Listings supplied by Ticketmaster; confirm times and availability on the ticket page.`
                  : undefined
              }
              size="md"
              href={filtered ? '/events/' : undefined}
              linkLabel={filtered ? 'Clear filters' : undefined}
            />

            {calendar.live && categories.length > 1 ? (
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Event categories">
                <li>
                  <Link href={href({ ...query, category: undefined, page: 1 })} aria-current={!category ? 'true' : undefined} className={`inline-flex min-h-10 items-center rounded border px-3 text-sm font-semibold ${!category ? 'border-ink bg-ink text-paper' : 'border-paper-edge text-ink hover:border-ink'}`}>
                    All
                  </Link>
                </li>
                {categories.map((c) => (
                  <li key={c}>
                    <Link href={href({ ...query, category: c, page: 1 })} aria-current={category === c ? 'true' : undefined} className={`inline-flex min-h-10 items-center rounded border px-3 text-sm font-semibold ${category === c ? 'border-ink bg-ink text-paper' : 'border-paper-edge text-ink hover:border-ink'}`}>
                      {c}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}

            <div id="upcoming" className="mt-6 scroll-mt-24">
              {!calendar.live ? (
                <div className="rounded-card border border-dashed border-paper-edge p-8 text-center">
                  <p className="text-[17px] font-semibold">The live calendar is on its way.</p>
                  <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-soft">
                    We are connecting current ticketed events at Nashville venues. Until then, the venue guides and the honky-tonk highway cover what is on most nights.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <Link href="/music/" className="btn-secondary">
                      Browse venues
                    </Link>
                    <Link href="/honky-tonk-highway/" className="btn-tertiary">
                      Honky-tonk highway
                    </Link>
                  </div>
                </div>
              ) : shown.length === 0 ? (
                <div className="rounded-card border border-dashed border-paper-edge p-8 text-center">
                  <p className="text-[17px] font-semibold">No events {window.label ? window.label.toLowerCase() : 'match'}{query.q ? ` for “${query.q}”` : ''}.</p>
                  <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-soft">Your filters are kept. Try nearby dates, or clear the date to see everything coming up.</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {query.when !== 'weekend' ? (
                      <Link href={href({ ...query, when: 'weekend', from: undefined, to: undefined, page: 1 })} className="btn-secondary">
                        This weekend
                      </Link>
                    ) : null}
                    <Link href={href({ q: query.q, category })} className="btn-tertiary">
                      All upcoming dates
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <EventSchedule events={shown} />
                  {pages > 1 ? (
                    <nav aria-label="Event pages" className="mt-6 flex items-center justify-between gap-4 border-t border-paper-edge pt-5">
                      <div>{page > 1 ? <Link href={href({ ...query, category, page: page - 1 })} className="btn-secondary">Previous</Link> : null}</div>
                      <p className="text-sm text-ink-soft">
                        Page {page} of {pages}
                      </p>
                      <div>{page < pages ? <Link href={href({ ...query, category, page: page + 1 })} className="btn-secondary">Next</Link> : null}</div>
                    </nav>
                  ) : null}
                </>
              )}
            </div>
          </section>

          {featuredVenue ? (
            <aside aria-labelledby="venue-feature-title" className="lg:pt-2">
              <p className="eyebrow">Featured venue</p>
              <Link href={`/music/${featuredVenue.slug}/`} className="group mt-3 block overflow-hidden rounded-card bg-ink text-paper">
                <span className="relative block">
                  {venueImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={venueImage.src} srcSet={venueImage.srcSet} sizes="(max-width: 1023px) 100vw, 320px" alt={venueImage.alt} className="aspect-[4/3] w-full object-cover lg:aspect-[3/4]" loading="lazy" />
                  ) : null}
                  <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" aria-hidden="true" />
                  <span className="absolute inset-x-0 bottom-0 p-5">
                    <span className="block font-display text-[1.75rem] font-extrabold leading-tight tracking-[-0.03em]">{featuredVenue.name}</span>
                    <span className="mt-1 block text-sm text-paper/85">{featuredVenue.format} · {featuredVenue.area}</span>
                    <span className="mt-2 block text-[15px] font-semibold underline-offset-[0.2em] group-hover:underline">
                      Explore the Ryman <span aria-hidden="true">→</span>
                    </span>
                  </span>
                </span>
              </Link>
              <Link href={href({ q: featuredVenue.name })} className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline">
                Events at the Ryman <span aria-hidden="true">→</span>
              </Link>
            </aside>
          ) : null}
        </div>
      </div>

      <section className="border-y border-paper-edge bg-paper-sunk" aria-labelledby="venues-title">
        <div className="shell section">
          <SectionHead id="venues-title" eyebrow="Explore by venue" title="Rooms worth knowing." size="md" href="/music/" linkLabel="All venues" />
          <ul className="mt-5 flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-6">
            {venueRail.map((v) => (
              <li key={v.slug} className="w-[200px] shrink-0 md:w-auto">
                <Link href={href({ q: v.title })} className="group relative block overflow-hidden rounded-card bg-ink text-paper">
                  {v.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.image.src} srcSet={v.image.srcSet} sizes="(max-width: 767px) 200px, 16vw" alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                  ) : null}
                  <span className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-transparent" aria-hidden="true" />
                  <span className="absolute inset-x-0 bottom-0 p-3 text-[15px] font-semibold leading-snug">
                    {v.title} <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </li>
            ))}
            {opry?.imageKey ? (
              <li className="w-[200px] shrink-0 md:w-auto">
                <Link href={href({ q: opry.name })} className="group relative block overflow-hidden rounded-card bg-ink text-paper">
                  <SmartImage imageKey={opry.imageKey} ratio="aspect-[4/3]" sizes="(max-width: 767px) 200px, 16vw" />
                  <span className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-transparent" aria-hidden="true" />
                  <span className="absolute inset-x-0 bottom-0 p-3 text-[15px] font-semibold leading-snug">
                    {opry.name} <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </li>
            ) : null}
          </ul>
          <p className="mt-2 text-2xs text-ink-soft">Each venue opens its upcoming events. Venue tours are listed separately as experiences, not tickets.</p>
        </div>
      </section>

      <section className="bg-ink text-paper" aria-labelledby="night-title">
        <div className="shell section grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="eyebrow text-paper/75">Plan a night</p>
            <h2 id="night-title" className="mt-1 text-[2rem] text-paper sm:text-[2.5rem] lg:text-[3rem]">
              Dinner, the show, and one more stop.
            </h2>
            <p className="mt-2 max-w-xl text-[16px] text-paper/80">
              Save the show, then let the planner place dinner nearby and a last stop within a short walk. Tickets stay with the provider; saving is not a purchase.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={window.from ? `/plan/?start=${window.from}&end=${window.to ?? window.from}` : '/plan/'} className="btn-reverse">
              Build the night
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="/restaurants/?occasion=before-the-show" className="btn border-paper text-paper hover:bg-paper/10">
              Dinner before the show
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
