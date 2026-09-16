import Link from 'next/link';
import { SmartImage } from '@/components/Media';
import { Breadcrumbs } from '@/components/Ui';
import { buildMetadata } from '@/lib/seo';
import { site } from '@/lib/site';
import SavedList from './SavedList';

export const metadata = buildMetadata({
  title: 'Your bag',
  description: 'Your NSVL bag and the places you have saved for the trip.',
  path: '/bag/',
  noindex: true,
});

/**
 * Bag page, the target of the header bag icon.
 *
 * INTEGRATION STATUS: no commerce provider is connected, so the bag holds no
 * products, shows no prices and has no checkout. It says so plainly and
 * points to the collection. Below that it lists the places saved to the
 * trip in this browser, which is the one "keep this" state the site has
 * today. When a cart provider is wired, its line items render here first.
 */
export default function BagPage() {
  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Bag', href: '/bag/' }]} />
      <header className="pb-6">
        <p className="eyebrow">Your bag</p>
        <h1 className="mt-2 text-[2.5rem] leading-[0.98] sm:text-[3.25rem]">Nothing in the bag yet.</h1>
        <p className="mt-3 max-w-prose text-[17px] text-ink-soft sm:text-lead">
          The {site.name} store is not open for orders yet, so there is nothing to check out. The first three pieces are on the shop page; prices and sizes appear once the store connects.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/shop/" className="btn-primary">
            Shop the collection
            <span aria-hidden="true">→</span>
          </Link>
          <Link href="/newsletter/" className="btn-secondary">
            Hear when it opens
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {(['concept/product-cap', 'concept/product-paper-tee', 'concept/product-heavyweight-tee'] as const).map((key) => (
          <Link key={key} href="/shop/#collection" className="block overflow-hidden rounded-card bg-paper-sunk">
            <SmartImage imageKey={key} ratio="aspect-[4/3]" sizes="(max-width: 639px) 100vw, 33vw" />
          </Link>
        ))}
      </div>

      <section className="mt-12 border-t border-paper-edge pt-8" aria-labelledby="saved-title">
        <p className="eyebrow">Saved for the trip</p>
        <h2 id="saved-title" className="mt-1 text-[1.625rem] sm:text-[2rem]">
          Places you have kept.
        </h2>
        <p className="mt-2 max-w-prose text-[15px] text-ink-soft">
          Saved on this device only. Saving is not a reservation or a ticket; the planner uses these as must-dos.
        </p>
        <div className="mt-5">
          <SavedList />
        </div>
      </section>
    </div>
  );
}
