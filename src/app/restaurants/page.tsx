import Link from 'next/link';
import { ForkIcon, PinIcon } from '@/components/Icons';
import { SmartImage } from '@/components/Media';
import SaveButton from '@/components/SaveButton';
import { HowWeChooseCallout } from '@/components/Trust';
import { Breadcrumbs, JsonLd } from '@/components/Ui';
import FilterBar from '@/components/hub/FilterBar';
import PageIntro, { MediaPair } from '@/components/hub/PageIntro';
import SearchField from '@/components/hub/SearchField';
import SectionHead from '@/components/hub/SectionHead';
import { guides } from '@/lib/content';
import { OCCASIONS, diningNeighborhoods, featuredDining, filterDining, isOccasion, type DiningPlace } from '@/lib/content/dining';
import { neighborhoodName, neighborhoods } from '@/lib/content/neighborhoods';
import { buildMetadata, itemListSchema } from '@/lib/seo';

type Params = Record<string, string | string[] | undefined>;

function one(params: Params, key: string): string | undefined {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

function parse(params: Params) {
  const neighborhood = one(params, 'neighborhood');
  const occasion = one(params, 'occasion');
  return {
    neighborhood: neighborhoods.some((n) => n.slug === neighborhood) ? neighborhood : undefined,
    occasion: isOccasion(occasion) ? occasion : undefined,
    q: one(params, 'q')?.slice(0, 80),
  };
}

function href(query: { neighborhood?: string; occasion?: string; q?: string }): string {
  const params = new URLSearchParams();
  if (query.neighborhood) params.set('neighborhood', query.neighborhood);
  if (query.occasion) params.set('occasion', query.occasion);
  if (query.q) params.set('q', query.q);
  const qs = params.toString();
  return qs ? `/restaurants/?${qs}` : '/restaurants/';
}

export async function generateMetadata(props: { searchParams?: Promise<Params> }) {
  const query = parse((await props.searchParams) ?? {});
  const filtered = Boolean(query.neighborhood || query.occasion || query.q);
  return buildMetadata({
    title: 'Nashville Restaurants',
    description:
      'Where to eat in Nashville by neighborhood and occasion: editor-picked restaurants with the practical details you need, from brunch to dinner before the show.',
    path: '/restaurants/',
    noindex: filtered,
  });
}

const QUICK: { value: string; label: string }[] = [
  { value: 'brunch', label: 'Brunch' },
  { value: 'date-night', label: 'Date night' },
  { value: 'with-a-group', label: 'With a group' },
  { value: 'late-night', label: 'Late night' },
];

/**
 * Restaurants: a dining editorial (page-designs/README.md §01).
 * Search and occasion filters first, then the featured restaurant, compact
 * rows for the rest of the directory, collections, neighborhoods and a plan
 * prompt. Reservation inputs are intentionally absent: no reservation
 * provider is connected, so every row hands off to the verified website.
 */
export default async function RestaurantsIndex(props: { searchParams?: Promise<Params> }) {
  const query = parse((await props.searchParams) ?? {});
  const filtered = Boolean(query.neighborhood || query.occasion || query.q);
  const results = filterDining(query);
  const featured = !filtered ? featuredDining : undefined;
  const rows = featured ? results.filter((p) => p.id !== featured.id) : results;
  const foodGuides = guides.filter((g) => g.cluster === 'Restaurants');
  const hoods = diningNeighborhoods();

  const summary = [
    query.occasion ? OCCASIONS.find((o) => o.value === query.occasion)?.label : null,
    query.neighborhood ? neighborhoodName(query.neighborhood) : 'All Nashville',
    query.q ? `“${query.q}”` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <JsonLd
        data={itemListSchema(
          results.map((p) => ({ name: p.title, url: p.externalHref ?? p.guideHref, description: p.bestFor })),
          'Nashville Restaurants',
        )}
      />
      <div className="shell">
        <Breadcrumbs trail={[{ name: 'Restaurants', href: '/restaurants/' }]} />
      </div>

      <PageIntro
        eyebrow="Eat & drink"
        title={
          <>
            A good table.
            <br />A better night.
          </>
        }
        support="Find your next meal by neighborhood, cuisine or occasion."
        media={
          <MediaPair
            primary={<SmartImage imageKey="concept/dining-table" ratio="aspect-[4/3] lg:aspect-auto lg:h-[380px]" sizes="(max-width: 1023px) 60vw, 40vw" priority />}
            secondary={<SmartImage imageKey="concept/dining-bar" ratio="aspect-[3/4] lg:aspect-auto lg:h-[380px]" sizes="(max-width: 1023px) 40vw, 25vw" priority />}
          />
        }
      >
        <SearchField
          action="/restaurants/"
          label="Search restaurants, cuisine or neighborhood"
          placeholder="Search restaurants, cuisine or neighborhood"
          defaultValue={query.q}
          hidden={{ neighborhood: query.neighborhood, occasion: query.occasion }}
          buttonLabel="Find restaurants"
        />
        <ul className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-0">
          <li className="eyebrow">Quick</li>
          {QUICK.map((item) => (
            <li key={item.value}>
              <Link
                href={href({ ...query, occasion: item.value })}
                aria-current={query.occasion === item.value ? 'true' : undefined}
                className={`inline-flex min-h-11 items-center text-[15px] font-semibold text-ink underline-offset-[0.2em] ${
                  query.occasion === item.value ? 'underline' : 'hover:underline'
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </PageIntro>

      <div className="shell">
        <FilterBar
          action="/restaurants/"
          resetHref="/restaurants/"
          hidden={{ q: query.q }}
          fields={[
            {
              name: 'neighborhood',
              label: 'Neighborhood',
              icon: <PinIcon />,
              anyLabel: 'All neighborhoods',
              value: query.neighborhood,
              options: hoods.map((h) => ({ value: h.value, label: h.label })),
            },
            {
              name: 'occasion',
              label: 'Occasion',
              icon: <ForkIcon />,
              anyLabel: 'Any occasion',
              value: query.occasion,
              options: OCCASIONS.map((o) => ({ value: o.value, label: o.label })),
            },
          ]}
        />
      </div>

      {featured ? (
        <section className="shell section pb-0" aria-labelledby="featured-title">
          <p className="eyebrow">Featured restaurant</p>
          <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-10">
            <div className="overflow-hidden rounded-card bg-ink">
              <SmartImage imageKey={featured.imageKey} ratio="aspect-[16/10]" sizes="(max-width: 1023px) 100vw, 58vw" />
            </div>
            <div>
              <p className="eyebrow">{neighborhoodName(featured.neighborhood)}</p>
              <h2 id="featured-title" className="mt-1 text-[2rem] sm:text-[2.5rem] lg:text-[3rem]">
                {featured.title}
              </h2>
              <p className="mt-2 text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">{featured.bestFor}</p>
              <p className="mt-3 max-w-prose text-[17px] leading-relaxed text-ink">{featured.body}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {[featured.category, ...featured.occasions.map((o) => OCCASIONS.find((x) => x.value === o)?.label)]
                  .filter(Boolean)
                  .slice(0, 3)
                  .map((chip) => (
                    <li key={chip} className="rounded border border-paper-edge px-2.5 py-1 text-sm text-ink-soft">
                      {chip}
                    </li>
                  ))}
              </ul>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <PlaceLink place={featured} primary />
                <SaveButton item={{ id: featured.id, kind: 'restaurant', title: featured.title, href: featured.externalHref ?? featured.guideHref, meta: neighborhoodName(featured.neighborhood) }} />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="shell section" aria-labelledby="rows-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">{filtered ? 'Results' : 'More great restaurants'}</p>
            <h2 id="rows-title" className="mt-1 text-[1.625rem] sm:text-[2rem]">
              {filtered ? (
                <>
                  <strong className="font-extrabold">{results.length}</strong> {results.length === 1 ? 'place' : 'places'}{' '}
                  <span className="font-normal text-ink-soft">· {summary}</span>
                </>
              ) : (
                'Editor-picked, neighborhood by neighborhood.'
              )}
            </h2>
          </div>
          {filtered ? (
            <Link href="/restaurants/" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline">
              Clear filters
            </Link>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <div className="mt-6 rounded-card border border-dashed border-paper-edge p-8 text-center">
            <p className="text-[17px] font-semibold text-ink">No restaurants match those filters yet.</p>
            <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-soft">
              Try a nearby neighborhood, or clear the occasion and browse everything we have checked.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link href="/restaurants/" className="btn-secondary">
                Clear filters
              </Link>
              {hoods.slice(0, 3).map((h) => (
                <Link key={h.value} href={href({ neighborhood: h.value })} className="btn-tertiary">
                  {h.label}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <ul className="mt-5 grid gap-x-8 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((place) => (
              <li key={place.id} className="border-t border-paper-edge">
                <PlaceRow place={place} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-y border-paper-edge bg-paper-sunk" aria-labelledby="collections-title">
        <div className="shell section">
          <SectionHead id="collections-title" eyebrow="Collections" title="Same city. More to savor." size="md" />
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CollectionCard
              eyebrow="Before the show"
              title="Great dinner. A legendary night."
              body="Restaurants near Nashville's live music venues, timed for the set."
              href={href({ occasion: 'before-the-show' })}
              imageKey="concept/live-music-night"
            />
            <CollectionCard
              eyebrow="Long lunches"
              title="Daytime dining, brighter days."
              body="Neighborhood rooms and patios worth lingering in."
              href={href({ occasion: 'long-lunch' })}
              imageKey="concept/lunch-wine"
            />
            <CollectionCard
              eyebrow="A table for everyone"
              title="Rooms that seat the whole group."
              body="Places where six or more can eat together without a two-hour wait."
              href={href({ occasion: 'with-a-group' })}
              imageKey="concept/dining-room-evening"
            />
          </ul>
          {foodGuides.length > 0 ? (
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {foodGuides.map((g) => (
                <li key={g.slug}>
                  <Link href={`/guides/${g.slug}/`} className="card flex min-h-12 items-center justify-between gap-4 px-4 py-3">
                    <span>
                      <span className="block text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Guide</span>
                      <span className="font-sans text-[17px] font-bold">{g.title}</span>
                    </span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section className="shell section" aria-labelledby="hoods-title">
        <SectionHead id="hoods-title" eyebrow="Eat by neighborhood" title="Where the good tables are." size="md" href="/neighborhoods/" linkLabel="All neighborhoods" />
        <ul className="mt-5 flex flex-wrap gap-2">
          {hoods.map((h) => (
            <li key={h.value}>
              <Link href={`/neighborhoods/${h.value}/#eat`} className="inline-flex min-h-11 items-center gap-2 rounded border border-paper-edge px-4 text-[15px] font-semibold text-ink hover:border-ink">
                {h.label}
                <span className="text-sm font-normal text-ink-soft">{h.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-ink text-paper" aria-labelledby="evening-title">
        <div className="shell section grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_auto] lg:items-center lg:gap-10">
          <div>
            <p className="eyebrow text-paper/75">Build the evening</p>
            <h2 id="evening-title" className="mt-1 text-[2rem] text-paper sm:text-[2.5rem] lg:text-[3rem]">
              Dinner, then a show.
            </h2>
            <p className="mt-2 max-w-xl text-[16px] text-paper/80">
              Save a restaurant, find what is on nearby that night, and put both in one plan. Saving is not a reservation; book on the restaurant&apos;s own site.
            </p>
          </div>
          <div className="overflow-hidden rounded-card bg-paper/10">
            <SmartImage imageKey="concept/dining-bar" ratio="aspect-[16/9]" sizes="(max-width: 1023px) 100vw, 33vw" />
          </div>
          <div className="flex flex-wrap gap-3 lg:flex-col">
            <Link href="/events/?when=tonight" className="btn-reverse">
              What&apos;s on tonight
            </Link>
            <Link href="/plan/" className="btn border-paper text-paper hover:bg-paper/10">
              Build a trip
            </Link>
          </div>
        </div>
      </section>

      <div className="shell py-10">
        <HowWeChooseCallout />
      </div>
    </>
  );
}

function PlaceLink({ place, primary = false }: { place: DiningPlace; primary?: boolean }) {
  if (place.externalHref) {
    return (
      <a href={place.externalHref} target="_blank" rel="noopener noreferrer" className={primary ? 'btn-primary' : 'inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline'}>
        Visit website
        <span aria-hidden="true">↗</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={place.guideHref} className={primary ? 'btn-primary' : 'inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline'}>
      Read in the guide
      <span aria-hidden="true">→</span>
    </Link>
  );
}

function PlaceRow({ place }: { place: DiningPlace }) {
  return (
    <article className="flex gap-4 py-4">
      {place.imageKey ? (
        <div className="w-24 shrink-0 overflow-hidden rounded-card bg-ink sm:w-28">
          <SmartImage imageKey={place.imageKey} ratio="aspect-square" sizes="112px" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <h3 className="font-sans text-[17px] font-bold leading-snug">{place.title}</h3>
        <p className="mt-0.5 text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
          {[neighborhoodName(place.neighborhood), place.category].filter(Boolean).join(' · ')}
        </p>
        <p className="mt-1.5 text-[15px] text-ink-soft">{place.bestFor}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4">
          <PlaceLink place={place} />
          {place.externalHref ? (
            <Link href={place.guideHref} className="inline-flex min-h-11 items-center text-sm text-ink-soft underline-offset-[0.2em] hover:underline">
              In the guide
            </Link>
          ) : null}
          <SaveButton item={{ id: place.id, kind: 'restaurant', title: place.title, href: place.externalHref ?? place.guideHref, meta: neighborhoodName(place.neighborhood) }} className="-ml-2" />
        </div>
      </div>
    </article>
  );
}

function CollectionCard({
  eyebrow,
  title,
  body,
  href,
  imageKey,
}: {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  imageKey: Parameters<typeof SmartImage>[0]['imageKey'];
}) {
  return (
    <li>
      <Link href={href} className="group grid h-full min-w-0 grid-cols-[minmax(0,1fr)_120px] gap-4 rounded-card border border-paper-edge bg-paper p-4 hover:border-ink lg:grid-cols-[minmax(0,1fr)_140px]">
        <span className="flex min-w-0 flex-col">
          <span className="eyebrow">{eyebrow}</span>
          <span className="mt-1 font-display text-[1.375rem] font-extrabold leading-tight tracking-[-0.03em]">{title}</span>
          <span className="mt-1.5 text-sm text-ink-soft">{body}</span>
          <span className="mt-auto pt-3 text-[15px] font-semibold underline-offset-[0.2em] group-hover:underline">
            Explore <span aria-hidden="true">→</span>
          </span>
        </span>
        <span className="min-w-0 overflow-hidden rounded-card bg-ink">
          <SmartImage imageKey={imageKey} ratio="h-full min-h-[150px] w-full" sizes="140px" />
        </span>
      </Link>
    </li>
  );
}
