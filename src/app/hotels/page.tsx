import Link from 'next/link';
import { JsonLd, Breadcrumbs, PageHeader, SectionHeader } from '@/components/Ui';
import { HotelCard } from '@/components/Cards';
import { AffiliateDisclosure, HowWeChooseCallout } from '@/components/Trust';
import { hotels, guides, neighborhoods } from '@/lib/content';
import { buildMetadata, isIndexableRecord, itemListSchema } from '@/lib/seo';

// Deliberately distinct from the /guides/where-to-stay-nashville/ title so the
// index and the guide do not compete for the same query.
export const metadata = buildMetadata({
  title: 'Nashville Hotels by Neighborhood',
  description:
    'Nashville hotels by neighborhood, with honest notes on noise, walkability, and who each area suits. Independent recommendations.',
  path: '/hotels/',
});

export default function HotelsIndex() {
  const hotelGuides = guides.filter((g) => g.cluster === 'Hotels');
  const byHood = neighborhoods.filter((n) => hotels.some((h) => h.neighborhood === n.slug));

  return (
    <div className="shell pb-16">
      <JsonLd
        data={itemListSchema(
          hotels
            .filter(isIndexableRecord)
            .map((x) => ({ name: x.title, url: `/hotels/${x.slug}/`, description: x.summary })),
          'Nashville Hotels',
        )}
      />
      <Breadcrumbs trail={[{ name: 'Hotels', href: '/hotels/' }]} />
      <PageHeader
        eyebrow="Where to stay"
        title="Nashville Hotels"
        intro="The neighborhood matters more than the property here. Downtown puts you inside the noise, and the districts just outside it trade a short drive for a night's sleep."
      />

      <div className="py-6">
        <AffiliateDisclosure />
      </div>

      <section className="py-6">
        <SectionHeader title="All hotels" description={`${hotels.length} listings`} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {hotels.map((h) => (
            <HotelCard key={h.slug} item={h} />
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

      {hotelGuides.length > 0 && (
        <section className="py-8">
          <SectionHeader title="Hotel guides" href="/guides/" linkLabel="All guides" />
          <ul className="grid gap-3 sm:grid-cols-2">
            {hotelGuides.map((g) => (
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
