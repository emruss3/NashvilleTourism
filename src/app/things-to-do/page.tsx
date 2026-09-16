import Link from 'next/link';
import { BuildingIcon, DollarIcon, KidsIcon, MusicIcon, PaletteIcon, TreeIcon, UmbrellaIcon } from '@/components/Icons';
import { ContentImage, SmartImage } from '@/components/Media';
import SaveButton from '@/components/SaveButton';
import { HowWeChooseCallout } from '@/components/Trust';
import { Breadcrumbs, JsonLd } from '@/components/Ui';
import PageIntro from '@/components/hub/PageIntro';
import SearchField from '@/components/hub/SearchField';
import SectionHead from '@/components/hub/SectionHead';
import { attractions, guides } from '@/lib/content';
import { neighborhoodName } from '@/lib/content/neighborhoods';
import { getCalendar } from '@/lib/feeds/calendar';
import { formatDay } from '@/lib/explore';
import { buildMetadata, isIndexableRecord, itemListSchema } from '@/lib/seo';
import type { Attraction } from '@/lib/types';

export const revalidate = 1800;

type Params = Record<string, string | string[] | undefined>;

/**
 * Intent shortcuts map to verified record fields (indoor, familyFriendly,
 * category, price note), never to guessed tags.
 */
const KINDS = [
  { value: 'outdoors', label: 'Outdoors', icon: TreeIcon, test: (a: Attraction) => !a.indoor || ['Park', 'Garden'].includes(a.category) },
  { value: 'music', label: 'Music', icon: MusicIcon, test: (a: Attraction) => /music|ryman|opry/i.test([a.title, ...a.bestFor].join(' ')) },
  { value: 'kids', label: 'With kids', icon: KidsIcon, test: (a: Attraction) => a.familyFriendly },
  { value: 'free', label: 'Free things', icon: DollarIcon, test: (a: Attraction) => /^free\b|grounds are free|free to enter/i.test(a.priceNote) },
  { value: 'rainy', label: 'Rainy day', icon: UmbrellaIcon, test: (a: Attraction) => a.indoor },
  { value: 'arts', label: 'Arts & culture', icon: PaletteIcon, test: (a: Attraction) => ['Museum', 'Landmark'].includes(a.category) },
  { value: 'history', label: 'History', icon: BuildingIcon, test: (a: Attraction) => ['Museum', 'Tour', 'Landmark'].includes(a.category) },
] as const;

type Kind = (typeof KINDS)[number]['value'];

function one(params: Params, key: string): string | undefined {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

function href(kind?: string, q?: string): string {
  const params = new URLSearchParams();
  if (kind) params.set('kind', kind);
  if (q) params.set('q', q);
  const qs = params.toString();
  return qs ? `/things-to-do/?${qs}#browse` : '/things-to-do/#browse';
}

export async function generateMetadata(props: { searchParams?: Promise<Params> }) {
  const params = (await props.searchParams) ?? {};
  const filtered = Boolean(one(params, 'q') || one(params, 'kind'));
  return buildMetadata({
    title: 'Things to Do in Nashville',
    description:
      'Museums, parks, tours and landmarks in Nashville, with time needed, cost guidance and who each one suits. Find something that fits your kind of Nashville.',
    path: '/things-to-do/',
    noindex: filtered,
  });
}

/**
 * Things to do: a culture magazine (page-designs/README.md §04).
 * Intent first, then one strong feature, a suggested day, the searchable
 * attractions grid with Save, dated events from the live calendar, and the
 * guides. Evergreen places stay distinct from tour inventory and event dates.
 */
export default async function ThingsToDoIndex(props: { searchParams?: Promise<Params> }) {
  const params = (await props.searchParams) ?? {};
  const q = one(params, 'q')?.slice(0, 80);
  const kindValue = one(params, 'kind');
  const kind = KINDS.find((k) => k.value === kindValue);
  const filtered = Boolean(q || kind);

  const list = attractions.filter(isIndexableRecord).filter((a) => {
    if (kind && !kind.test(a)) return false;
    if (q) {
      const blob = [a.title, a.summary, a.category, ...a.bestFor, neighborhoodName(a.neighborhood)].join(' ').toLowerCase();
      if (!blob.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const calendar = await getCalendar({ size: 60 });
  const upcoming = calendar.live ? calendar.events.slice(0, 3) : [];
  const activityGuides = guides.filter((g) => g.cluster === 'Things to Do');
  const frist = attractions.find((a) => a.slug === 'frist-art-museum');
  const hallOfFame = attractions.find((a) => a.slug === 'country-music-hall-of-fame');

  return (
    <>
      <JsonLd
        data={itemListSchema(
          attractions.filter(isIndexableRecord).map((x) => ({ name: x.title, url: `/things-to-do/${x.slug}/`, description: x.summary })),
          'Things to Do in Nashville',
        )}
      />
      <div className="shell">
        <Breadcrumbs trail={[{ name: 'Things to Do', href: '/things-to-do/' }]} />
      </div>

      <PageIntro
        layout="over"
        eyebrow="Things to do"
        title="Make a day of it."
        support="Music. Art. Parks. Food. Neighborhoods. Find something that fits your kind of Nashville."
        media={<SmartImage imageKey="editorial/parthenon-west-end" ratio="h-full" sizes="100vw" priority />}
        aside={
          <div className="grid sm:grid-cols-2 lg:grid-cols-1">
            {[
              { eyebrow: 'Arts & culture', title: 'World-class creativity.', body: 'From the Frist to independent galleries.', item: frist },
              { eyebrow: 'Music history', title: 'Dig deeper.', body: 'The story behind the songs, a block from Broadway.', item: hallOfFame },
            ].map((tile) =>
              tile.item ? (
                <Link key={tile.title} href={`/things-to-do/${tile.item.slug}/`} className="group relative block overflow-hidden bg-ink text-paper">
                  {tile.item.image ? <ContentImage image={tile.item.image} ratio="aspect-[16/9] lg:aspect-[4/3]" sizes="(max-width: 1023px) 50vw, 360px" /> : <div className="aspect-[16/9] lg:aspect-[4/3]" />}
                  <span className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" aria-hidden="true" />
                  <span className="absolute inset-x-0 bottom-0 p-4">
                    <span className="block text-2xs font-semibold uppercase tracking-[0.14em] text-paper/80">{tile.eyebrow}</span>
                    <span className="mt-0.5 block font-display text-[1.375rem] font-extrabold leading-tight tracking-[-0.03em]">{tile.title}</span>
                    <span className="mt-0.5 block text-sm text-paper/85">{tile.body}</span>
                    <span className="mt-1 block text-[15px] font-semibold underline-offset-[0.2em] group-hover:underline">
                      {tile.item.title} <span aria-hidden="true">→</span>
                    </span>
                  </span>
                </Link>
              ) : null,
            )}
          </div>
        }
      >
        <SearchField
          action="/things-to-do/"
          label="Search things to do, neighborhoods or interests"
          placeholder="Search things to do, neighborhoods or interests"
          defaultValue={q}
          hidden={{ kind: kind?.value }}
          tone="ink"
          buttonLabel="Explore things to do"
        />
        <p className="mt-4 text-[15px] font-semibold text-paper">What kind of day?</p>
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {KINDS.slice(0, 5).map((k) => {
            const Icon = k.icon;
            const active = kind?.value === k.value;
            return (
              <li key={k.value}>
                <Link
                  href={href(k.value, q)}
                  aria-current={active ? 'true' : undefined}
                  className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded border px-4 text-[15px] font-semibold sm:w-auto ${
                    active ? 'border-paper bg-paper text-ink' : 'border-paper/60 text-paper hover:border-paper'
                  }`}
                >
                  <Icon size={18} />
                  {k.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </PageIntro>

      <section className="shell section" aria-labelledby="day-title">
        <SectionHead id="day-title" eyebrow="A Nashville day" title={<>Three moments.<br />Endless possibility.</>} support="From morning light to late-night sounds, here is one way to do it." href="/plan/" linkLabel="Copy this day into the planner" />
        <ul className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            { time: 'Morning', title: 'Coffee, parks and fresh air.', body: 'Easy energy to start your day right.', href: href('outdoors'), image: 'attractions/shelby-bottoms-greenway' as const },
            { time: 'Afternoon', title: 'Explore, create, make it yours.', body: 'Museums, neighborhoods and local flavor.', href: href('arts'), image: 'attractions/frist-art-museum' as const },
            { time: 'After dark', title: 'Live music changes everything.', body: 'From intimate stages to iconic nights.', href: '/live-music-tonight/', image: 'editorial/live-music-crowd' as const },
          ].map((moment) => (
            <li key={moment.time}>
              <Link href={moment.href} className="group relative block overflow-hidden rounded-card bg-ink text-paper">
                <SmartImage imageKey={moment.image} ratio="aspect-[16/10]" sizes="(max-width: 767px) 100vw, 33vw" />
                <span className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" aria-hidden="true" />
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
                  <span>
                    <span className="block text-2xs font-semibold uppercase tracking-[0.14em] text-paper/80">{moment.time}</span>
                    <span className="mt-0.5 block font-display text-[1.375rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[1.5rem]">{moment.title}</span>
                    <span className="mt-0.5 block text-sm text-paper/85">{moment.body}</span>
                  </span>
                  <span aria-hidden="true" className="text-xl transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="browse" className="shell section scroll-mt-20 pt-0" aria-labelledby="browse-title">
        <div className="grid gap-4 border-t border-paper-edge pt-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end">
          <div>
            <p className="eyebrow">Top things to do</p>
            <h2 id="browse-title" className="mt-1 text-[2rem] sm:text-[2.5rem] lg:text-[3rem]">
              Iconic spots and
              <br />
              hidden gems.
            </h2>
          </div>
          <div>
            <p className="text-[16px] text-ink-soft">Browse by interest, neighborhood or see it all.</p>
            <ul className="mt-2 flex flex-wrap gap-x-1 gap-y-0">
              <li>
                <Link href="/things-to-do/#browse" aria-current={!kind ? 'true' : undefined} className={`inline-flex min-h-11 items-center border-b-2 px-2 text-[15px] font-semibold ${!kind ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}>
                  All
                </Link>
              </li>
              {KINDS.map((k) => (
                <li key={k.value}>
                  <Link href={href(k.value, q)} aria-current={kind?.value === k.value ? 'true' : undefined} className={`inline-flex min-h-11 items-center border-b-2 px-2 text-[15px] font-semibold ${kind?.value === k.value ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}>
                    {k.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-4 text-[15px] text-ink" aria-live="polite">
          <strong className="font-semibold">{list.length}</strong> {list.length === 1 ? 'place' : 'places'}
          {filtered ? <span className="text-ink-soft"> · {[kind?.label, q ? `“${q}”` : null].filter(Boolean).join(' · ')}</span> : null}
          {filtered ? (
            <>
              {' '}
              <Link href="/things-to-do/#browse" className="ml-2 font-semibold underline-offset-[0.2em] hover:underline">
                Clear
              </Link>
            </>
          ) : null}
        </p>

        {list.length === 0 ? (
          <div className="mt-6 rounded-card border border-dashed border-paper-edge p-8 text-center">
            <p className="text-[17px] font-semibold">Nothing matches that combination yet.</p>
            <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-soft">Keep your choices and try a broader interest, or see everything we have checked.</p>
            <Link href="/things-to-do/#browse" className="btn-secondary mt-5">
              Show all
            </Link>
          </div>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((a) => (
              <li key={a.slug}>
                <ActivityCard item={a} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {upcoming.length > 0 ? (
        <section className="border-y border-paper-edge bg-paper-sunk" aria-labelledby="events-title">
          <div className="shell section">
            <SectionHead id="events-title" eyebrow="Happening during your trip" title="On the calendar." size="md" href="/events/" linkLabel="All events" />
            <ul className="mt-5 divide-y divide-ink/15 border-y border-ink/15">
              {upcoming.map((e) => (
                <li key={`${e.source}-${e.id}`} className="flex items-center gap-4 py-3">
                  <span className="w-16 shrink-0 text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">{formatDay(e.date)}</span>
                  <span className="min-w-0 flex-1">
                    <a href={e.ticketUrl} target="_blank" rel="noopener noreferrer" className="font-sans text-[16px] font-bold leading-snug text-ink underline-offset-[0.2em] hover:underline">
                      {e.name}
                      <span className="sr-only"> (opens the ticket provider in a new tab)</span>
                    </a>
                    <span className="block text-sm text-ink-soft">{e.venue}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-2xs text-ink-soft">Event listings supplied by Ticketmaster. Bookable experiences are on the tours page.</p>
          </div>
        </section>
      ) : null}

      {activityGuides.length > 0 ? (
        <section className="shell section" aria-labelledby="guides-title">
          <SectionHead id="guides-title" eyebrow="Do more of what you love" title="Guides from the desk." size="md" href="/guides/" linkLabel="All guides" />
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {activityGuides.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}/`} className="card flex h-full items-center justify-between gap-4 px-4 py-4">
                  <span>
                    <span className="block text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">{g.readingTimeMinutes} min read</span>
                    <span className="mt-0.5 block font-sans text-[17px] font-bold">{g.title}</span>
                    <span className="mt-1 block text-[15px] text-ink-soft">{g.summary}</span>
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="shell pb-10">
        <HowWeChooseCallout />
      </div>
    </>
  );
}

function ActivityCard({ item }: { item: Attraction }) {
  const type = item.category === 'Tour' ? 'Tour' : 'Attraction';
  return (
    <article className="group relative flex h-full flex-col">
      {item.image ? (
        <div className="overflow-hidden rounded-card bg-ink">
          <ContentImage image={item.image} ratio="aspect-[4/3]" sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw" />
        </div>
      ) : null}
      <div className="flex flex-1 items-start justify-between gap-2 pt-3">
        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
            {type} · {neighborhoodName(item.neighborhood)}
          </p>
          <h3 className="mt-0.5 font-sans text-[17px] font-bold leading-snug">
            <Link href={`/things-to-do/${item.slug}/`} className="after:absolute after:inset-0 underline-offset-[0.2em] hover:underline">
              {item.title}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-ink-soft">{item.timeNeeded}</p>
        </div>
        <SaveButton
          variant="icon"
          className="relative z-10 -mr-2 -mt-1"
          item={{ id: `activity:${item.slug}`, kind: 'activity', title: item.title, href: `/things-to-do/${item.slug}/`, meta: `${type} · ${neighborhoodName(item.neighborhood)}` }}
        />
      </div>
    </article>
  );
}
