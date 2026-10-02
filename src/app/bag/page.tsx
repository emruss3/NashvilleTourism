import CartContents from '@/components/commerce/CartContents';
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
      <h1 className="mt-4 text-3xl">Your shopping bag</h1>
      <div className="mx-auto mt-8 max-w-3xl"><CartContents /></div>

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
