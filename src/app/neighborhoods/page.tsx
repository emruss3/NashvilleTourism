import Link from 'next/link';
import { SmartImage } from '@/components/Media';
import SaveButton from '@/components/SaveButton';
import { Breadcrumbs, JsonLd } from '@/components/Ui';
import PageIntro from '@/components/hub/PageIntro';
import SearchField from '@/components/hub/SearchField';
import SectionHead from '@/components/hub/SectionHead';
import { neighborhoods } from '@/lib/content';
import { neighborhoodImageKey } from '@/lib/media-placements';
import { buildMetadata, itemListSchema } from '@/lib/seo';
import type { Neighborhood } from '@/lib/types';

type Params = Record<string, string | string[] | undefined>;

const INTERESTS = [
  { value: 'food', label: 'Food', test: /food|brunch|coffee|restaurant|dining|barbecue|meat-and-three|lunch|dinner/i },
  { value: 'music', label: 'Music', test: /music|honky|venue|show|songwriter|opry|ryman/i },
  { value: 'shopping', label: 'Shopping', test: /boutique|shop|retail|mall|vintage|browse/i },
  { value: 'arts', label: 'Arts', test: /art|galler|museum|mural|maker|studio/i },
] as const;

function one(params: Params, key: string): string | undefined {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

function blob(n: Neighborhood): string {
  return [n.name, n.summary, ...n.knownFor, ...n.bestFor, ...n.landmarks, ...n.overview].join(' ');
}

export async function generateMetadata(props: { searchParams?: Promise<Params> }) {
  const params = (await props.searchParams) ?? {};
  const filtered = Boolean(one(params, 'q') || one(params, 'interest'));
  return buildMetadata({
    title: 'Nashville Neighborhoods',
    description:
      'A field guide to Nashville neighborhoods: Downtown, the Gulch, East Nashville, Germantown, 12 South, Wedgewood-Houston and more, with what each one is known for and who it suits.',
    path: '/neighborhoods/',
    noindex: filtered,
  });
}

/** The numbered index beside the opener: the five places most first trips choose between. */
const INDEX_SLUGS = ['east-nashville', 'germantown', 'wedgewood-houston', 'the-gulch', '12-south'] as const;
const FEATURED_HALF_DAY = 'germantown';

/**
 * Neighborhoods: a city field guide (page-designs/README.md §03).
 * Signature street image beside a numbered index, then the photographic
 * directory, a real half-day route from the neighborhood record, and the
 * hand-off to hotels. No decorative maps: the map link lives on each guide.
 */
export default async function NeighborhoodsIndex(props: { searchParams?: Promise<Params> }) {
  const params = (await props.searchParams) ?? {};
  const q = one(params, 'q')?.slice(0, 80);
  const interestValue = one(params, 'interest');
  const interest = INTERESTS.find((i) => i.value === interestValue);
  const filtered = Boolean(q || interest);

  const directory = neighborhoods.filter((n) => {
    if (interest && !interest.test.test(blob(n))) return false;
    if (q && !blob(n).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const index = INDEX_SLUGS.map((slug) => neighborhoods.find((n) => n.slug === slug)).filter((n): n is Neighborhood => Boolean(n));
  const halfDay = neighborhoods.find((n) => n.slug === FEATURED_HALF_DAY);

  return (
    <>
      <JsonLd
        data={itemListSchema(
          neighborhoods.map((n) => ({ name: n.name, url: `/neighborhoods/${n.slug}/`, description: n.summary })),
          'Nashville Neighborhoods',
        )}
      />
      <div className="shell">
        <Breadcrumbs trail={[{ name: 'Neighborhoods', href: '/neighborhoods/' }]} />
      </div>

      <PageIntro
        layout="over"
        eyebrow="Neighborhoods"
        title={
          <>
            Find your
            <br />
            corner.
          </>
        }
        support="Different neighborhoods. A closer Nashville."
        media={<SmartImage imageKey="concept/street-cafe" ratio="h-full" sizes="100vw" priority />}
        aside={
          <ol className="divide-y divide-paper-edge" aria-label="Neighborhood index">
            {index.map((n, i) => (
              <li key={n.slug}>
                <Link href={`/neighborhoods/${n.slug}/`} className="group grid grid-cols-[2.5rem_5rem_1fr_auto] items-center gap-3 px-5 py-3 hover:bg-paper-sunk lg:px-6">
                  <span className="font-display text-[1.5rem] font-extrabold tracking-[-0.03em] text-ink">{String(i + 1).padStart(2, '0')}</span>
                  <span className="overflow-hidden rounded-card bg-ink">
                    <SmartImage imageKey={neighborhoodImageKey(n.slug)} ratio="aspect-[4/3]" sizes="80px" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-sans text-[16px] font-bold leading-snug text-ink">{n.name}</span>
                    <span className="mt-0.5 block truncate text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">{n.knownFor.slice(0, 1).join(' · ')}</span>
                  </span>
                  <span aria-hidden="true" className="text-ink transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        }
      >
        <SearchField
          action="/neighborhoods/"
          label="Search neighborhoods, food, music or vibes"
          placeholder="Search neighborhoods, food, music or vibes"
          defaultValue={q}
          hidden={{ interest: interest?.value }}
          tone="ink"
          buttonLabel="Explore neighborhoods"
        />
        <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          {INTERESTS.map((i) => (
            <li key={i.value}>
              <Link
                href={`/neighborhoods/?interest=${i.value}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                aria-current={interest?.value === i.value ? 'true' : undefined}
                className={`inline-flex min-h-11 items-center text-[15px] font-semibold text-paper underline-offset-[0.2em] ${interest?.value === i.value ? 'underline' : 'hover:underline'}`}
              >
                {i.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/neighborhoods/#directory" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-paper/85 underline-offset-[0.2em] hover:underline">
              Browse all
            </Link>
          </li>
        </ul>
      </PageIntro>

      <section id="directory" className="shell section scroll-mt-20" aria-labelledby="directory-title">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
          <div>
            <p className="eyebrow">{filtered ? 'Results' : 'A closer look'}</p>
            <h2 id="directory-title" className="mt-1 text-[2rem] sm:text-[2.5rem] lg:text-[3rem]">
              {filtered ? (
                <>
                  {directory.length} {directory.length === 1 ? 'neighborhood' : 'neighborhoods'}
                </>
              ) : (
                <>
                  Neighborhood life,
                  <br />
                  in focus.
                </>
              )}
            </h2>
            <p className="mt-3 max-w-sm text-[16px] text-ink-soft">
              {filtered
                ? [interest?.label, q ? `“${q}”` : null].filter(Boolean).join(' · ')
                : `${neighborhoods.length} distinct neighborhoods, one city. Explore the people, places and moments that make Nashville home.`}
            </p>
            {filtered ? (
              <Link href="/neighborhoods/" className="mt-4 inline-flex min-h-11 items-center text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline">
                Show all neighborhoods
              </Link>
            ) : (
              <Link href="/guides/nashville-neighborhood-guide/" className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline">
                Read the neighborhood guide <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>

          {directory.length === 0 ? (
            <div className="rounded-card border border-dashed border-paper-edge p-8 text-center">
              <p className="text-[17px] font-semibold">No neighborhood matches that search.</p>
              <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-soft">Try a broader word, or pick an interest above.</p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {directory.map((n, i) => (
                <li key={n.slug} className={!filtered && i % 5 === 0 ? 'sm:col-span-2 lg:col-span-1 lg:row-span-2' : ''}>
                  <MosaicTile n={n} tall={!filtered && i % 5 === 0} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {halfDay ? (
        <section className="border-y border-paper-edge bg-paper-sunk" aria-labelledby="halfday-title">
          <div className="shell section">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
              <div>
                <p className="eyebrow">A perfect afternoon</p>
                <h2 id="halfday-title" className="mt-1 text-[2rem] sm:text-[2.5rem] lg:text-[3rem]">
                  An afternoon in {halfDay.name}.
                </h2>
                <p className="mt-3 max-w-sm text-[16px] text-ink-soft">{halfDay.summary}</p>
                <p className="mt-2 text-sm text-ink-soft">A suggested order, not timed reservations. Check hours before you go.</p>
                <Link href={`/neighborhoods/${halfDay.slug}/#plan-your-day`} className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline">
                  See more in {halfDay.name} <span aria-hidden="true">→</span>
                </Link>
              </div>
              <div>
                <div className="overflow-hidden rounded-card bg-ink">
                  <SmartImage imageKey={neighborhoodImageKey(halfDay.slug)} ratio="aspect-[21/9]" sizes="(max-width: 1023px) 100vw, 66vw" />
                </div>
                <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {halfDay.halfDayItinerary.map((step, i) => (
                    <li key={step.time} className="border-t border-ink/20 pt-3">
                      <span className="font-display text-[1.5rem] font-extrabold tracking-[-0.03em]">{String(i + 1).padStart(2, '0')}</span>
                      <p className="mt-1 text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">{step.time}</p>
                      <p className="mt-1 font-sans text-[16px] font-bold leading-snug">{step.activity}</p>
                      <p className="mt-1 text-sm text-ink-soft">{step.note}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-ink text-paper" aria-labelledby="base-title">
        <div className="shell section grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_auto] lg:items-center lg:gap-10">
          <div>
            <p className="eyebrow text-paper/75">Hotels</p>
            <h2 id="base-title" className="mt-1 text-[2rem] text-paper sm:text-[2.5rem] lg:text-[3rem]">
              Where will you make yourself at home?
            </h2>
            <p className="mt-3 max-w-md text-[16px] text-paper/80">
              The neighborhood you sleep in shapes the whole trip. Compare walkability, noise and typical rates, then check hotels with your dates.
            </p>
          </div>
          <div className="overflow-hidden rounded-card bg-paper/10 lg:order-none">
            <SmartImage imageKey="concept/hotel-room-skyline" ratio="aspect-[16/9]" sizes="(max-width: 1023px) 100vw, 33vw" />
          </div>
          <Link href="/hotels/" className="btn-reverse justify-self-start lg:justify-self-end">
            Find hotels
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}

function MosaicTile({ n, tall }: { n: Neighborhood; tall: boolean }) {
  return (
    <article className="group relative h-full overflow-hidden rounded-card bg-ink text-paper">
      <SmartImage imageKey={neighborhoodImageKey(n.slug)} ratio={tall ? 'aspect-[4/3] h-full lg:aspect-auto lg:min-h-[420px]' : 'aspect-[4/3] h-full'} sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4">
        <div className="min-w-0">
          <p className="truncate text-2xs font-semibold uppercase tracking-[0.14em] text-paper/85">{n.knownFor.slice(0, 2).join(' · ')}</p>
          <h3 className="mt-0.5 text-[1.375rem] font-bold leading-tight tracking-[-0.03em] text-paper">
            <Link href={`/neighborhoods/${n.slug}/`} className="after:absolute after:inset-0">
              {n.name}
            </Link>
          </h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-paper/85">{n.bestFor.slice(0, 2).join(', ')}</p>
        </div>
        <SaveButton
          variant="icon"
          tone="paper"
          className="relative z-10"
          item={{ id: `neighborhood:${n.slug}`, kind: 'neighborhood', title: n.name, href: `/neighborhoods/${n.slug}/`, meta: n.knownFor.slice(0, 2).join(' · ') }}
        />
      </div>
    </article>
  );
}
