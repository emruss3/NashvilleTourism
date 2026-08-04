import { Breadcrumbs, PageHeader, SectionHeader } from '@/components/Ui';
import { GuideCard } from '@/components/Cards';
import { HowWeChooseCallout } from '@/components/Trust';
import { guides } from '@/lib/content';
import type { GuideCluster } from '@/lib/types';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Nashville Guides',
  description:
    'Nashville guides on restaurants, hotels, live music, neighborhoods, and trip planning. Written by local editors and dated so you know how current they are.',
  path: '/guides/',
});

const ORDER: GuideCluster[] = ['Trip Planning', 'Restaurants', 'Hotels', 'Things to Do', 'Music', 'Events'];

export default function GuidesIndex() {
  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Guides', href: '/guides/' }]} />
      <PageHeader
        eyebrow="Read first"
        title="Nashville Guides"
        intro="Longer pieces that answer a whole question rather than listing a category. Each one opens with a short answer so you can stop reading once you have what you need."
      />

      {ORDER.map((cluster) => {
        const items = guides.filter((g) => g.cluster === cluster);
        if (items.length === 0) return null;
        return (
          <section key={cluster} className="py-8">
            <SectionHeader title={cluster} />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((g) => (
                <GuideCard key={g.slug} item={g} />
              ))}
            </div>
          </section>
        );
      })}

      <div className="py-8">
        <HowWeChooseCallout />
      </div>
    </div>
  );
}
