import Link from 'next/link';
import { JsonLd, Breadcrumbs, PageHeader, SectionHeader } from '@/components/Ui';
import { AttractionCard } from '@/components/Cards';
import { HowWeChooseCallout } from '@/components/Trust';
import { attractions, guides } from '@/lib/content';
import { buildMetadata, isIndexableRecord, itemListSchema } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Things to Do in Nashville',
  description:
    'Museums, parks, tours, and landmarks in Nashville, with time needed, cost guidance, and who each one suits.',
  path: '/things-to-do/',
});

export default function ThingsToDoIndex() {
  const activityGuides = guides.filter((g) => g.cluster === 'Things to Do');
  const indoor = attractions.filter((a) => a.indoor);
  const family = attractions.filter((a) => a.familyFriendly);

  return (
    <div className="shell pb-16">
      <JsonLd
        data={itemListSchema(
          attractions
            .filter(isIndexableRecord)
            .map((x) => ({ name: x.title, url: `/things-to-do/${x.slug}/`, description: x.summary })),
          'Things to Do in Nashville',
        )}
      />
      <Breadcrumbs trail={[{ name: 'Things to Do', href: '/things-to-do/' }]} />
      <PageHeader
        eyebrow="Explore"
        title="Things to Do in Nashville"
        intro="Museums, parks, tours, and landmarks. Most of these take half a day or less, which makes them easy to slot around a dinner reservation or a show."
      />

      <section className="py-10">
        <SectionHeader title="All attractions" description={`${attractions.length} listings`} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {attractions.map((a) => (
            <AttractionCard key={a.slug} item={a} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 py-6 sm:grid-cols-2">
        <div className="rounded-card border border-paper-edge bg-white p-5">
          <h2 className="font-display text-xl">If it rains</h2>
          <ul className="mt-3 space-y-1.5 text-[15px] text-ink-soft">
            {indoor.slice(0, 5).map((a) => (
              <li key={a.slug}>
                <Link href={`/things-to-do/${a.slug}/`} className="hover:text-clay hover:underline">
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card border border-paper-edge bg-white p-5">
          <h2 className="font-display text-xl">With kids</h2>
          <ul className="mt-3 space-y-1.5 text-[15px] text-ink-soft">
            {family.slice(0, 5).map((a) => (
              <li key={a.slug}>
                <Link href={`/things-to-do/${a.slug}/`} className="hover:text-clay hover:underline">
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {activityGuides.length > 0 && (
        <section className="py-8">
          <SectionHeader title="Related guides" href="/guides/" linkLabel="All guides" />
          <ul className="grid gap-3 sm:grid-cols-2">
            {activityGuides.map((g) => (
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
