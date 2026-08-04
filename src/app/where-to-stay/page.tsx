import Link from 'next/link';
import { Breadcrumbs, PageHeader, ScrollableTable, SectionHeader } from '@/components/Ui';
import { HotelCard } from '@/components/Cards';
import { AffiliateDisclosure } from '@/components/Trust';
import BookingWidget from '@/components/BookingWidget';
import { hotels } from '@/lib/content';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Where to Stay in Nashville: Compare Areas & Book',
  description:
    'Compare Nashville neighborhoods side by side on walk time to Broadway, night noise, and typical rates, then jump straight to the stay that fits your trip.',
  path: '/where-to-stay/',
});

/**
 * Entry points into the six sub-hubs. Kept short on purpose: this page is a
 * router, not an article. Each card answers one question and hands off.
 */
const SITUATIONS: { slug: string; title: string; whoFor: string; cta: string }[] = [
  {
    slug: 'boutique-hotels-downtown',
    title: 'Boutique Hotels Downtown',
    whoFor: 'Couples and small groups who want design and a bar downstairs, not a 500-room tower.',
    cta: 'See boutique stays',
  },
  {
    slug: 'group-rentals-bachelor-bachelorette',
    title: 'Rentals for Bachelor & Bachelorette Groups',
    whoFor: 'Six to sixteen people who need one address, a kitchen, and somewhere to gather.',
    cta: 'See group rentals',
  },
  {
    slug: 'luxury-resorts-opryland',
    title: 'Luxury Resorts near Opryland',
    whoFor: 'Trips that want a resort campus, a pool, and a car instead of a walkable downtown.',
    cta: 'See resort options',
  },
  {
    slug: 'walkable-to-broadway',
    title: 'Hotels Walkable to Broadway',
    whoFor: 'First-time visitors who plan to end every night on the honky-tonk strip.',
    cta: 'See walkable hotels',
  },
  {
    slug: 'hotels-with-pools',
    title: 'Hotels with Pools',
    whoFor: 'Summer trips, families, and anyone who wants an afternoon off their feet.',
    cta: 'See hotels with pools',
  },
  {
    slug: 'value-stays-midtown',
    title: 'Value Stays in Midtown',
    whoFor: 'Travelers who want a short ride to Broadway without downtown pricing.',
    cta: 'See value stays',
  },
];

interface AreaRow {
  area: string;
  href?: string;
  bestFor: string;
  walk: string;
  noise: string;
  rate: string;
}

/**
 * Planning-level orientation only. Walk times are measured across the district,
 * not from any one property, and rate bands are broad ranges rather than quotes.
 */
const AREAS: AreaRow[] = [
  {
    area: 'Downtown / Broadway',
    href: '/neighborhoods/downtown-broadway/',
    bestFor: 'First trips, groups, walking to everything',
    walk: 'You are on it',
    noise: 'Loud until close, every night',
    rate: '$250-$500+',
  },
  {
    area: 'The Gulch',
    href: '/neighborhoods/the-gulch/',
    bestFor: 'Groups who want dinner and nightlife on foot',
    walk: '15-20 min',
    noise: 'Moderate, quieter than Broadway',
    rate: '$220-$450',
  },
  {
    area: 'Germantown',
    href: '/neighborhoods/germantown/',
    bestFor: 'Food-focused trips, couples, sleeping well',
    walk: '20-25 min',
    noise: 'Low on residential blocks',
    rate: '$200-$400',
  },
  {
    area: 'Midtown',
    href: '/neighborhoods/midtown/',
    bestFor: 'Value, business travel, college-area bars',
    walk: 'Not walkable; 8-12 min ride',
    noise: 'Moderate near the bar strip',
    rate: '$140-$280',
  },
  {
    area: 'East Nashville',
    href: '/neighborhoods/east-nashville/',
    bestFor: 'Repeat visitors, longer stays, local bars',
    walk: 'Not walkable; 10-15 min ride',
    noise: 'Low, residential',
    rate: '$150-$300',
  },
  {
    area: '12 South',
    href: '/neighborhoods/12-south/',
    bestFor: 'Couples, shopping, slow mornings',
    walk: 'Not walkable; 12-18 min ride',
    noise: 'Low, residential',
    rate: '$180-$350',
  },
  {
    area: 'Green Hills',
    href: '/neighborhoods/green-hills/',
    bestFor: 'Families, suites, shopping, free parking',
    walk: 'Not walkable; 15-20 min ride',
    noise: 'Low',
    rate: '$140-$260',
  },
  {
    area: 'Music Valley / Opryland',
    bestFor: 'Resort stays, conventions, driving trips',
    walk: 'Not walkable; 20-30 min drive',
    noise: 'Low',
    rate: '$200-$450',
  },
];

export default function WhereToStayHub() {
  const featured = hotels.slice(0, 6);

  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Where to Stay', href: '/where-to-stay/' }]} />

      <PageHeader
        eyebrow="Decide, then book"
        title="Where to Stay in Nashville"
        intro="Pick the area first. In Nashville the block you sleep on decides how loud your night is and how far you walk, far more than which brand is on the door."
      />

      <section className="py-6">
        <h2 className="sr-only">Check rates and availability</h2>
        <BookingWidget />
      </section>

      <section className="py-6">
        <SectionHeader
          eyebrow="Start here"
          title="Pick your situation"
          description="Six routes into the right stay. Choose the one that matches your trip and skip the rest."
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SITUATIONS.map((s) => (
            <li key={s.slug}>
              <article className="card group relative flex h-full flex-col gap-2 p-5">
                <h3 className="font-sans text-lg font-bold leading-snug">
                  <Link
                    href={`/where-to-stay/${s.slug}/`}
                    className="after:absolute after:inset-0 hover:text-clay"
                  >
                    {s.title}
                  </Link>
                </h3>
                <p className="flex-1 text-[15px] leading-relaxed text-ink-soft">{s.whoFor}</p>
                <span className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-clay underline underline-offset-4">
                  {s.cta}
                </span>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section className="py-6">
        <SectionHeader
          eyebrow="Side by side"
          title="Compare the areas"
          description="Walk times are across the district, not from one address. Rate bands are planning estimates only."
        />
        <ScrollableTable label="Nashville lodging areas compared side by side">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <caption className="sr-only">
              Nashville lodging areas compared by who they suit, walk time to Lower Broadway, night
              noise, and typical nightly rate band.
            </caption>
            <thead className="bg-paper-sunk">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  Neighborhood
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  Best for
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  Walk to Broadway
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  Noise at night
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  Typical nightly rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-edge">
              {AREAS.map((a) => (
                <tr key={a.area}>
                  <th scope="row" className="px-4 py-3 text-left font-semibold text-ink">
                    {a.href ? (
                      <Link href={a.href} className="underline decoration-paper-edge underline-offset-4 hover:text-clay">
                        {a.area}
                      </Link>
                    ) : (
                      a.area
                    )}
                  </th>
                  <td className="px-4 py-3 text-ink-soft">{a.bestFor}</td>
                  <td className="px-4 py-3 text-ink-soft">{a.walk}</td>
                  <td className="px-4 py-3 text-ink-soft">{a.noise}</td>
                  <td className="px-4 py-3 text-ink-soft">{a.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTable>
        <p className="mt-3 max-w-prose text-sm text-ink-faint">
          Rate bands are broad planning ranges for a standard room, not quotes. Nashville pricing
          swings hard around festivals, football weekends, and big arena shows. Check current rates
          for your dates before you decide.
        </p>
      </section>

      <div className="py-6">
        <AffiliateDisclosure />
      </div>

      <section className="py-6">
        <SectionHeader
          eyebrow="Our listings"
          title="Hotels we cover"
          href="/hotels/"
          linkLabel="All hotels"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((h) => (
            <HotelCard key={h.slug} item={h} />
          ))}
        </div>
      </section>

      <section className="py-6">
        <h2 className="text-2xl sm:text-[28px]">Still deciding?</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/guides/where-to-stay-nashville/" className="btn-secondary min-h-[44px]">
            Read the full stay guide
          </Link>
          <Link href="/neighborhoods/" className="btn-secondary min-h-[44px]">
            Browse neighborhoods
          </Link>
          <Link href="/plan/" className="btn-primary min-h-[44px]">
            Build a trip plan
          </Link>
        </div>
      </section>
    </div>
  );
}
