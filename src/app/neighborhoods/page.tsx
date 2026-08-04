import { Breadcrumbs, PageHeader, SectionHeader } from '@/components/Ui';
import { NeighborhoodCard } from '@/components/Cards';
import { neighborhoods } from '@/lib/content';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Nashville Neighborhoods',
  description:
    'A guide to Nashville neighborhoods: Downtown, 12 South, the Gulch, East Nashville, Germantown, and more, with who each area suits.',
  path: '/neighborhoods/',
});

export default function NeighborhoodsIndex() {
  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Neighborhoods', href: '/neighborhoods/' }]} />
      <PageHeader
        eyebrow="Get oriented"
        title="Nashville Neighborhoods"
        intro="Nashville spreads out. Choosing a base is the single decision that shapes the rest of a trip, because it determines how much time you spend in a car."
      />
      <section className="py-10">
        <SectionHeader title={`All ${neighborhoods.length} neighborhoods`} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {neighborhoods.map((n) => (
            <NeighborhoodCard key={n.slug} item={n} />
          ))}
        </div>
      </section>
    </div>
  );
}
