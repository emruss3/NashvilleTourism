import Link from 'next/link';
import { Breadcrumbs } from '@/components/Ui';
import { NsvlMark } from '@/components/Wordmark';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Shop NSVL',
  description:
    'NSVL apparel: a charcoal cap, a paper tee and a heavyweight charcoal tee carrying the Nashville mark. The first three pieces, made to be worn after the trip.',
  path: '/shop/',
});

/**
 * Shop collection (SITE-LAYOUT.md §Shop, BRAND-GUIDE.md §8).
 *
 * INTEGRATION STATUS: no commerce provider is connected, so there is no
 * bag, no checkout, and no prices; the provider is authoritative for price
 * and inventory and none exists yet. The three core products are listed
 * descriptively with an honest "not yet on sale" state. No product
 * photography has been supplied; each card shows the mark on its garment
 * color instead of a generated mockup.
 */
const CORE_PRODUCTS = [
  {
    slug: 'charcoal-cap',
    name: 'Charcoal cap',
    detail: 'Paper embroidery on the front, 55–65mm wide.',
    ground: 'ink',
  },
  {
    slug: 'paper-tee',
    name: 'Paper tee',
    detail: 'Charcoal mark, left chest or centered.',
    ground: 'paper',
  },
  {
    slug: 'heavyweight-charcoal-tee',
    name: 'Heavyweight charcoal tee',
    detail: 'Paper mark, centered chest.',
    ground: 'ink',
  },
] as const;

export default function ShopPage() {
  return (
    <div className="shell pb-20">
      <Breadcrumbs trail={[{ name: 'Shop', href: '/shop/' }]} />
      <header className="pb-8">
        <p className="eyebrow">Shop NSVL</p>
        <h1 className="mt-2 text-[2.5rem] sm:text-[3rem]">Good here. Good anywhere.</h1>
        <p className="mt-3 max-w-prose text-lead text-ink-soft">
          Nashville, worn your way. Three core pieces in Paper White and Charcoal Ink, named for what they are.
        </p>
      </header>

      <div className="rounded-card border border-paper-edge bg-paper-sunk px-5 py-4">
        <p className="text-[15px] text-ink">
          <strong className="font-semibold">Not on sale yet.</strong> Prices and sizes appear once the store is
          connected. We do not show made-up prices or countdowns in the meantime.
        </p>
      </div>

      <section className="mt-10" aria-labelledby="shop-products-heading">
        <h2 id="shop-products-heading" className="text-[1.75rem]">
          The first three
        </h2>
        <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CORE_PRODUCTS.map((product) => (
            <li key={product.slug}>
              <article className="card flex h-full flex-col">
                <div
                  className={`flex aspect-[4/5] items-center justify-center rounded-t-card ${
                    product.ground === 'ink' ? 'bg-ink' : 'bg-paper-sunk'
                  }`}
                  aria-hidden="true"
                >
                  <NsvlMark tone={product.ground === 'ink' ? 'paper' : 'ink'} width="44%" decorative />
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  <h3 className="font-sans text-[17px] font-bold">{product.name}</h3>
                  <p className="text-sm text-ink-soft">{product.detail}</p>
                  <p className="mt-auto pt-3 text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                    Coming soon
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 grid gap-4 rounded-card border border-paper-edge p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
        <div>
          <h2 className="text-[1.75rem]">Hear when it opens.</h2>
          <p className="mt-2 max-w-prose text-[15px] text-ink-soft">
            The weekly edit will carry the first release. No mailing list exists yet; the signup page says so
            plainly.
          </p>
        </div>
        <Link href="/newsletter/" className="btn-primary">
          The weekly edit
        </Link>
      </section>
    </div>
  );
}
