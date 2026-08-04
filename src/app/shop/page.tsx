import { Breadcrumbs, PageHeader } from '@/components/Ui';
import { NshMark, WordmarkCampaign } from '@/components/Wordmark';
import { buildMetadata } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'NASHVILLE Shop',
  description: 'Original Nashville apparel, gifts, and neighborhood collections.',
  path: '/shop/',
  noindex: true,
});

export default function ShopPage() {
  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Shop', href: '/shop/' }]} />
      <PageHeader
        eyebrow="NASHVILLE Shop"
        title="Original Nashville apparel, gifts, and neighborhood collections."
        intro="Clean, wearable pieces for locals and visitors — more lifestyle brand than souvenir shop. Collections launch here as they are ready."
      />
      <div className="mt-10 rounded-card border border-dashed border-paper-edge bg-paper-card px-6 py-14 text-center">
        <div className="mx-auto mb-6 flex justify-center">
          <NshMark size={88} />
        </div>
        <h2 className="font-display text-xl text-ink">Shop opening soon</h2>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-soft">
          Join {site.newsletter.name} for release dates, neighborhood collections, and limited drops.
        </p>
        <div className="mx-auto mt-8 max-w-xs">
          <WordmarkCampaign variant="horizontal" className="mx-auto max-w-[240px]" />
        </div>
        <a href="/newsletter/" className="btn-primary mt-8 inline-flex">
          Join the Newsletter
        </a>
      </div>
    </div>
  );
}
