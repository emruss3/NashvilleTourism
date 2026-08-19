import Link from 'next/link';
import { JsonLd, Breadcrumbs, PageHeader, SectionHeader } from '@/components/Ui';
import { RestaurantCard } from '@/components/Cards';
import HubLead from '@/components/HubLead';
import { HowWeChooseCallout } from '@/components/Trust';
import { restaurants, guides, neighborhoods } from '@/lib/content';
import { buildMetadata, isIndexableRecord, itemListSchema } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Nashville Restaurants',
  description:
    'Where to eat in Nashville, organized by neighborhood and occasion. Independent recommendations with the practical details you need to book.',
  path: '/restaurants/',
});

export default function RestaurantsIndex() {
  const foodGuides = guides.filter((g) => g.cluster === 'Restaurants');
  const byHood = neighborhoods.filter((n) => restaurants.some((r) => r.neighborhood === n.slug));
  const indexable = restaurants.filter(isIndexableRecord);
  const listSchema = itemListSchema(
    indexable.map((x) => ({ name: x.title, url: `/restaurants/${x.slug}/`, description: x.summary })),
    'Nashville Restaurants',
  );

  return (
    <div className="shell pb-16">
      {listSchema ? <JsonLd data={listSchema} /> : null}
      <Breadcrumbs trail={[{ name: 'Restaurants', href: '/restaurants/' }]} />
      <PageHeader
        eyebrow="Eat and drink"
        title="Nashville Restaurants"
        intro="Nashville's food scene spreads across neighborhoods rather than concentrating downtown. Where you eat usually depends on where you are willing to drive."
      />
      <HubLead imageKey="guide/best-restaurants" />

      <section className="max-w-3xl space-y-4 py-8 text-[15px] leading-relaxed text-ink-soft">
        <p>
          Use this hub to browse restaurants by neighborhood, then cross-check a shortlist against a{' '}
          <Link href="/guides/" className="text-clay underline underline-offset-2 hover:text-clay-deep">
            food guide
          </Link>
          , a{' '}
          <Link href="/neighborhoods/" className="text-clay underline underline-offset-2 hover:text-clay-deep">
            neighborhood guide
          </Link>
          , or a day plan in the{' '}
          <Link href="/plan/" className="text-clay underline underline-offset-2 hover:text-clay-deep">
            trip planner
          </Link>
          . Reservations matter more for dinner than brunch; same-day walk-ins are realistic at many
          counter spots and harder at destination rooms on weekend nights.
        </p>
        <p>
          If you are still deciding where to base the trip, start with{' '}
          <Link
            href="/neighborhoods/downtown-broadway/"
            className="text-clay underline underline-offset-2 hover:text-clay-deep"
          >
            Downtown &amp; Broadway
          </Link>
          ,{' '}
          <Link
            href="/neighborhoods/the-gulch/"
            className="text-clay underline underline-offset-2 hover:text-clay-deep"
          >
            the Gulch
          </Link>
          ,{' '}
          <Link
            href="/neighborhoods/east-nashville/"
            className="text-clay underline underline-offset-2 hover:text-clay-deep"
          >
            East Nashville
          </Link>
          , or{' '}
          <Link
            href="/neighborhoods/germantown/"
            className="text-clay underline underline-offset-2 hover:text-clay-deep"
          >
            Germantown
          </Link>
          —then pick restaurants within a short drive of where you sleep.
        </p>
      </section>

      <section className="py-10">
        <SectionHeader title="All restaurants" description={`${restaurants.length} listings`} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => (
            <RestaurantCard key={r.slug} item={r} />
          ))}
        </div>
      </section>

      <section className="py-8">
        <SectionHeader title="Browse by neighborhood" />
        <div className="flex flex-wrap gap-2">
          {byHood.map((n) => (
            <Link
              key={n.slug}
              href={`/neighborhoods/${n.slug}/`}
              className="rounded-full border border-paper-edge bg-white px-4 py-1.5 text-sm text-ink-soft transition-colors hover:border-clay hover:text-clay"
            >
              {n.name}
            </Link>
          ))}
        </div>
      </section>

      {foodGuides.length > 0 && (
        <section className="py-8">
          <SectionHeader title="Restaurant guides" href="/guides/" linkLabel="All guides" />
          <ul className="grid gap-3 sm:grid-cols-2">
            {foodGuides.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/guides/${g.slug}/`}
                  className="block rounded-card border border-paper-edge bg-white p-4 transition-shadow hover:shadow-lift"
                >
                  <span className="font-sans text-lg font-bold">{g.title}</span>
                  <span className="mt-1 block text-[15px] text-ink-soft">{g.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="py-8">
        <HowWeChooseCallout />
      </div>
    </div>
  );
}
