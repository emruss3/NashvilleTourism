import Link from 'next/link';
import { BuildingIcon, CalendarIcon, ForkIcon, MusicIcon, SearchIcon, WalkIcon, WaterIcon } from '@/components/Icons';
import { SmartImage } from '@/components/Media';
import { AffiliateDisclosure } from '@/components/Trust';
import { Breadcrumbs } from '@/components/Ui';
import PageIntro from '@/components/hub/PageIntro';
import SectionHead from '@/components/hub/SectionHead';
import { TourProductCard } from '@/components/tours/TourProductCard';
import { getToursCatalog } from '@/lib/feeds/tours';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: 'Nashville Tours & Experiences',
  description:
    'Browse live Nashville tours and experiences: music history, food tours, walking tours, whiskey tastings and boat trips, with current starting prices and booking through Viator.',
  path: '/tours/',
  // Viator marketplace content/review scoring is intentionally not indexed.
  // NSVL editorial guide pages remain the SEO surface.
  noindex: true,
});

// Viator permits no more than 50 search results per request. We use exactly 50
// so user-driven pagination advances 1 -> 51 -> 101 without overlapping calls.
const PAGE_SIZE = 50;

/** Category rail. Each entry runs a fresh search against live inventory. */
const CATEGORIES = [
  { label: 'Music', q: 'Music history tour', icon: MusicIcon },
  { label: 'Food', q: 'Food tour', icon: ForkIcon },
  { label: 'Walking', q: 'Walking tour', icon: WalkIcon },
  { label: 'History', q: 'History tour', icon: BuildingIcon },
  { label: 'On the water', q: 'Boat tour', icon: WaterIcon },
] as const;

function pageHref({ q, date, start }: { q?: string; date?: string; start: number }): string {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (date) params.set('date', date);
  if (start > 1) params.set('start', String(start));
  const query = params.toString();
  return query ? `/tours/?${query}` : '/tours/';
}

/**
 * Tours: an experience marketplace (page-designs/README.md §02).
 * Photograph beside a practical search panel, a category rail, live results
 * from Viator, the format guide, then a suggested day. Traveler counts,
 * exact times and checkout are confirmed in the product flow on Viator, so
 * the search here asks only what the search API can answer: words and a date.
 */
export default async function ToursHub(props: { searchParams?: Promise<{ q?: string; date?: string; start?: string }> }) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q?.trim() || undefined;
  const date = searchParams?.date?.trim() || undefined;
  const parsedStart = Number.parseInt(searchParams?.start || '1', 10);
  const start = Number.isFinite(parsedStart) && parsedStart > 0 ? parsedStart : 1;

  const catalog = await getToursCatalog({
    query: q,
    startDate: date,
    endDate: date,
    start,
    count: PAGE_SIZE,
    sort: 'DEFAULT',
  });
  const hasResults = catalog.live && catalog.products.length > 0;
  const liveNoResults = catalog.live && catalog.products.length === 0;
  const end = start + catalog.products.length - 1;
  const hasPrevious = start > 1;
  const hasNext = catalog.live && catalog.products.length === PAGE_SIZE && (catalog.totalCount == null || end < catalog.totalCount);
  const filtered = Boolean(q || date || start > 1);

  return (
    <>
      <div className="shell">
        <Breadcrumbs trail={[{ name: 'Tours', href: '/tours/' }]} />
      </div>

      <PageIntro
        eyebrow="Tours"
        title={
          <>
            Go beyond
            <br />
            the usual.
          </>
        }
        support="Find an experience worth making time for."
        mediaFirst
        media={
          <div className="overflow-hidden rounded-card bg-ink">
            <SmartImage imageKey="editorial/grand-ole-opry-house" ratio="aspect-[16/10] lg:aspect-auto lg:h-[460px]" sizes="(max-width: 1023px) 100vw, 58vw" priority />
          </div>
        }
      >
        <form action="/tours/" method="get" role="search" aria-label="Find tours" className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="relative">
              <label htmlFor="tour-q" className="sr-only">
                What do you want to do?
              </label>
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft">
                <SearchIcon size={18} />
              </span>
              <input id="tour-q" name="q" type="search" defaultValue={q ?? ''} placeholder="Food tour, whiskey, party bus…" autoComplete="off" className="field-input h-12 pl-11 md:h-14 md:text-base" />
            </div>
            <div className="relative">
              <label htmlFor="tour-date" className="sr-only">
                Date (optional)
              </label>
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft">
                <CalendarIcon size={18} />
              </span>
              <input id="tour-date" name="date" type="date" defaultValue={date ?? ''} className="field-input h-12 pl-11 md:h-14 md:text-base" aria-describedby="tour-date-note" />
            </div>
          </div>
          <button type="submit" className="btn-primary md:h-14 md:px-6">
            Find tours
            <span aria-hidden="true">→</span>
          </button>
          <p id="tour-date-note" className="text-2xs text-ink-soft sm:col-span-2">
            Party size, exact start times and final price are confirmed on the product page before checkout on Viator.
          </p>
        </form>
      </PageIntro>

      <nav aria-label="Tour categories" className="border-y border-paper-edge">
        <ul className="shell flex gap-1 overflow-x-auto py-1 md:justify-center md:gap-6">
          {CATEGORIES.map((c) => {
            const active = q?.toLowerCase() === c.q.toLowerCase();
            const Icon = c.icon;
            return (
              <li key={c.label} className="shrink-0">
                <Link
                  href={`/tours/?q=${encodeURIComponent(c.q)}`}
                  aria-current={active ? 'true' : undefined}
                  className={`inline-flex min-h-12 items-center gap-2 border-b-2 px-3 text-[15px] font-semibold text-ink ${active ? 'border-ink' : 'border-transparent hover:border-ink/40'}`}
                >
                  <Icon size={18} />
                  {c.label}
                </Link>
              </li>
            );
          })}
          {filtered ? (
            <li className="shrink-0 md:ml-4">
              <Link href="/tours/" className="inline-flex min-h-12 items-center px-3 text-[15px] font-semibold text-ink-soft underline-offset-[0.2em] hover:underline">
                Clear
              </Link>
            </li>
          ) : null}
        </ul>
      </nav>

      <section className="shell section" aria-labelledby="results-title">
        <SectionHead
          id="results-title"
          eyebrow={catalog.live ? 'Live from Viator' : 'Experiences'}
          title={q ? `Results for “${q}”` : date ? `Experiences for ${date}` : 'Unforgettable experiences.'}
          support={
            hasResults
              ? `${catalog.products.length} live matches shown. ${catalog.attribution}`
              : liveNoResults
                ? 'No current Nashville products matched these filters. Try a broader search or clear the date.'
                : 'Live search across Nashville tours is on its way. The format guide below covers what to book and what to watch for in the meantime.'
          }
        />
        <div className="mt-4">
          <AffiliateDisclosure compact />
        </div>

        {hasResults ? (
          <>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.products.map((product) => (
                <li key={product.productCode}>
                  <TourProductCard product={product} category={product.categories?.[0]} />
                </li>
              ))}
            </ul>

            {hasPrevious || hasNext ? (
              <nav aria-label="Tour search result pages" className="mt-8 flex items-center justify-between gap-4 border-t border-paper-edge pt-5">
                <div>
                  {hasPrevious ? (
                    <Link href={pageHref({ q, date, start: Math.max(1, start - PAGE_SIZE) })} className="btn-secondary">
                      Previous results
                    </Link>
                  ) : null}
                </div>
                <p className="text-sm text-ink-soft">
                  Showing {start}-{end}
                  {catalog.totalCount != null ? ` of ${catalog.totalCount}` : ''}
                </p>
                <div>
                  {hasNext ? (
                    <Link href={pageHref({ q, date, start: start + PAGE_SIZE })} className="btn-secondary">
                      More results
                    </Link>
                  ) : null}
                </div>
              </nav>
            ) : null}
          </>
        ) : liveNoResults ? (
          <div className="mt-6 rounded-card border border-dashed border-paper-edge p-8 text-center">
            <p className="text-[17px] font-semibold text-ink">No matching live experiences found.</p>
            <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-soft">
              Try a shorter phrase such as “party bus,” “food tour,” “whiskey,” or “sightseeing,” or remove the date filter.
            </p>
            <Link href="/tours/" className="btn-secondary mt-5">
              Show all Nashville experiences
            </Link>
          </div>
        ) : (
          <div className="mt-6 rounded-card border border-paper-edge bg-paper-sunk p-6 text-[15px] leading-relaxed text-ink-soft">
            <p className="font-semibold text-ink">Live tour search is coming soon.</p>
            <p className="mt-2">
              We only list real, bookable products, so nothing is shown until the live inventory is connected. Use the format guide below to decide what to book, then check back.
            </p>
          </div>
        )}
      </section>

      <section className="border-y border-paper-edge bg-paper-sunk" aria-labelledby="formats-title">
        <div className="shell section">
          <SectionHead
            id="formats-title"
            eyebrow="NSVL guide"
            title="Choose the right format."
            size="md"
            support="Planning notes from the desk. Each link runs a fresh search against live inventory rather than forcing an unrelated product match."
          />
          <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {catalog.editorial.map((tour) => (
              <li key={tour.slug}>
                <article className="card flex h-full flex-col bg-paper p-5">
                  <h3 className="font-sans text-[19px] font-bold leading-snug">{tour.name}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{tour.what}</p>
                  <dl className="mt-4 space-y-2 border-t border-paper-edge pt-4 text-sm">
                    {[
                      ['Group size', tour.groupSize],
                      ['Plan for', tour.priceGuidance],
                      ['Best for', tour.bestFor],
                      ['Watch out', tour.watchOut],
                    ].map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[6.5rem_1fr] gap-3">
                        <dt className="font-semibold text-ink">{label}</dt>
                        <dd className="text-ink-soft">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-auto pt-5">
                    <Link href={`/tours/?q=${encodeURIComponent(tour.searchHint)}`} className="btn-primary w-full">
                      Check availability
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="shell section" aria-labelledby="before-title">
        <h2 id="before-title" className="text-[1.625rem] sm:text-[2rem]">
          Before you book
        </h2>
        <ul className="mt-4 max-w-prose space-y-3">
          {[
            'The price shown on Nashville.com is Viator’s starting price. Some products price by person, while private boats, vehicles, or charters may price by the unit or group.',
            'A date filter narrows Viator’s product search. Exact start times, party-size pricing, and final availability are confirmed in the selected-product flow before checkout on Viator.',
            'Read the cancellation terms on the product page before you pay. Free cancellation is common but not universal.',
            'For private tours and charters, compare the total vehicle or group price rather than assuming the displayed starting price is a per-person rate.',
          ].map((note) => (
            <li key={note} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
              <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-prose text-sm text-ink-soft">{catalog.attribution}</p>
      </section>

      <section className="bg-ink text-paper" aria-labelledby="day-title">
        <div className="shell section grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-12">
          <div>
            <p className="eyebrow text-paper/75">Itineraries</p>
            <h2 id="day-title" className="mt-1 text-[2.5rem] text-paper sm:text-[3rem] lg:text-[3.5rem]">
              Make a day of it.
            </h2>
            <p className="mt-3 max-w-md text-[16px] text-paper/80">
              Tours pair well with a neighborhood morning and a show at night. Build your day, your way. Saving an experience adds it to your trip; booking happens on Viator.
            </p>
            <Link href="/plan/" className="btn-reverse mt-5">
              Build a day around it
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ul className="grid grid-cols-3 gap-3">
            {[
              { time: 'Morning', label: 'Coffee in East Nashville', href: '/neighborhoods/east-nashville/', image: 'neighborhood/east-nashville' as const },
              { time: 'Afternoon', label: 'Food tour', href: '/tours/?q=Food%20tour', image: 'editorial/nashville-food' as const },
              { time: 'Evening', label: 'Live music on Broadway', href: '/honky-tonk-highway/', image: 'editorial/broadway-nightlife' as const },
            ].map((stop) => (
              <li key={stop.label}>
                <Link href={stop.href} className="group block">
                  <span className="block overflow-hidden rounded-card bg-paper/10">
                    <SmartImage imageKey={stop.image} ratio="aspect-[4/3]" sizes="(max-width: 1023px) 33vw, 20vw" />
                  </span>
                  <span className="mt-2 block text-2xs font-semibold uppercase tracking-[0.14em] text-paper/70">{stop.time}</span>
                  <span className="block text-[15px] font-semibold text-paper underline-offset-[0.2em] group-hover:underline">{stop.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
