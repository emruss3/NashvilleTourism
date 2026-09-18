import Link from 'next/link';
import NewsletterForm from '@/components/NewsletterForm';
import { Breadcrumbs, JsonLd } from '@/components/Ui';
import { SmartImage } from '@/components/Media';
import { site } from '@/lib/site';
import { buildMetadata, productListSchema } from '@/lib/seo';

type Params = Record<string, string | string[] | undefined>;

export const metadata = buildMetadata({
  title: 'Shop NSVL',
  description:
    'NSVL apparel: a charcoal cap, a paper tee and a heavyweight charcoal tee carrying the Nashville mark. The first three pieces, made to be worn after the trip.',
  path: '/shop/',
});

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'headwear', label: 'Headwear' },
  { value: 'tees', label: 'Tees' },
  { value: 'layers', label: 'Layers' },
  { value: 'accessories', label: 'Accessories' },
] as const;

type Category = (typeof CATEGORIES)[number]['value'];

/**
 * Shop: a fashion storefront (page-designs/README.md §07, BRAND-GUIDE.md §8).
 *
 * INTEGRATION STATUS: no commerce provider is connected, so there is no bag,
 * no checkout and no prices; the provider is authoritative for price and
 * inventory and none exists yet. The three core products are listed
 * descriptively with an honest "not yet on sale" state. Campaign and product
 * imagery are the owner-approved concept illustrations from the brand boards
 * (labelled as illustrations in alt text) until product photography exists.
 */
const CORE_PRODUCTS = [
  { slug: 'charcoal-cap', name: 'Charcoal cap', category: 'headwear' as Category, detail: 'Paper embroidery on the front, 55–65mm wide.', ground: 'ink' as const, image: 'concept/product-cap' as const },
  { slug: 'paper-tee', name: 'Paper tee', category: 'tees' as Category, detail: 'Charcoal mark, left chest or centered.', ground: 'paper' as const, image: 'concept/product-paper-tee' as const },
  { slug: 'heavyweight-charcoal-tee', name: 'Heavyweight charcoal tee', category: 'tees' as Category, detail: 'Paper mark, centered chest.', ground: 'ink' as const, image: 'concept/product-heavyweight-tee' as const },
];

export default async function ShopPage(props: { searchParams?: Promise<Params> }) {
  const params = (await props.searchParams) ?? {};
  const raw = params.category;
  const requested = (Array.isArray(raw) ? raw[0] : raw) ?? 'all';
  const category: Category = CATEGORIES.some((c) => c.value === requested) ? (requested as Category) : 'all';
  const products = category === 'all' ? CORE_PRODUCTS : CORE_PRODUCTS.filter((p) => p.category === category);
  const available = new Set(CORE_PRODUCTS.map((p) => p.category));

  return (
    <>
      <JsonLd data={productListSchema(CORE_PRODUCTS.map((p) => ({ slug: p.slug, name: p.name, detail: p.detail, category: p.category, image: `/media/${p.image}.jpg` })))} />
      <div className="shell">
        <Breadcrumbs trail={[{ name: 'Shop', href: '/shop/' }]} />
      </div>

      <section className="shell grid gap-4 pb-8 pt-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,4fr)_minmax(0,5fr)] lg:items-stretch" aria-labelledby="shop-title">
        <div className="order-2 overflow-hidden rounded-card bg-ink lg:order-1">
          <SmartImage imageKey="concept/apparel-model" ratio="aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[460px]" sizes="(max-width: 1023px) 100vw, 25vw" priority />
        </div>
        <div className="order-1 flex flex-col justify-center lg:order-2 lg:px-6">
          <p className="eyebrow">NSVL apparel</p>
          <h1 id="shop-title" className="mt-2 text-[2.5rem] leading-[0.98] sm:text-[3.25rem] lg:text-[3.5rem]">
            Good here.
            <br />
            Good anywhere.
          </h1>
          <p className="mt-3 max-w-md text-[17px] text-ink-soft sm:text-lead">
            Nashville, worn your way. Three core pieces in Paper White and Charcoal Ink, named for what they are.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <a href="#collection" className="btn-primary">
              Shop the collection
              <span aria-hidden="true">→</span>
            </a>
            <span className="inline-flex min-h-11 items-center rounded border border-paper-edge px-3 text-sm font-semibold text-ink-soft">Not on sale yet</span>
          </div>
        </div>
        <div className="order-3 hidden overflow-hidden rounded-card bg-paper-sunk sm:block">
          <SmartImage imageKey="concept/apparel-cap-still" ratio="aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[460px]" sizes="(max-width: 1023px) 100vw, 42vw" priority />
        </div>
      </section>

      <nav aria-label="Shop by category" className="border-y border-paper-edge">
        <div className="shell flex items-center gap-4">
          <span className="hidden shrink-0 font-sans text-[15px] font-bold md:inline">Shop by category</span>
          <ul className="flex flex-1 gap-1 overflow-x-auto md:justify-center md:gap-4">
            {CATEGORIES.map((c) => {
              const active = c.value === category;
              return (
                <li key={c.value} className="shrink-0">
                  <Link
                    href={c.value === 'all' ? '/shop/#collection' : `/shop/?category=${c.value}#collection`}
                    aria-current={active ? 'true' : undefined}
                    className={`inline-flex min-h-12 items-center border-b-2 px-3 text-[15px] font-semibold text-ink ${active ? 'border-ink' : 'border-transparent hover:border-ink/40'}`}
                  >
                    {c.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <section id="collection" className="shell section scroll-mt-20" aria-labelledby="collection-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="collection-title" className="text-[1.625rem] sm:text-[2rem]">
            {category === 'all' ? 'The first three.' : CATEGORIES.find((c) => c.value === category)?.label}
          </h2>
          <p className="text-[15px] text-ink-soft">Prices, sizes and colours appear once the store is connected. No made-up prices, no countdowns.</p>
        </div>

        {products.length === 0 ? (
          <div className="mt-6 rounded-card border border-dashed border-paper-edge p-8 text-center">
            <p className="text-[17px] font-semibold">
              {CATEGORIES.find((c) => c.value === category)?.label} are not in the first release.
            </p>
            <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-soft">The first three pieces are a cap and two tees. Browse those, or hear about new releases first.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {[...available].map((c) => (
                <Link key={c} href={`/shop/?category=${c}#collection`} className="btn-secondary">
                  {CATEGORIES.find((x) => x.value === c)?.label}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <ul className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {products.map((product) => (
              <li key={product.slug}>
                <article className="flex h-full flex-col">
                  <div className={`overflow-hidden rounded-card ${product.ground === 'ink' ? 'bg-ink' : 'bg-paper-sunk'}`}>
                    <SmartImage imageKey={product.image} ratio="aspect-[4/3]" sizes="(max-width: 1023px) 50vw, 25vw" />
                  </div>
                  <h3 className="mt-3 font-sans text-[16px] font-bold sm:text-[17px]">{product.name}</h3>
                  <p className="mt-0.5 text-sm text-ink-soft">{product.detail}</p>
                  <p className="mt-auto pt-2 text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Not yet on sale</p>
                </article>
              </li>
            ))}
            {category === 'all' ? (
              <li className="col-span-2 lg:col-span-1">
                <div className="flex h-full flex-col justify-between rounded-card border border-paper-edge p-4">
                  <div>
                    <p className="eyebrow">New releases</p>
                    <h3 className="mt-1 text-[1.375rem]">Hear when it opens.</h3>
                    <p className="mt-1 text-sm text-ink-soft">{site.newsletter.name} carries the first release.</p>
                  </div>
                  <div className="mt-4">
                    <NewsletterForm location="shop" />
                  </div>
                </div>
              </li>
            ) : null}
          </ul>
        )}
      </section>

      <section className="bg-ink text-paper" aria-labelledby="story-title">
        <div className="shell section grid gap-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:items-center lg:gap-12">
          <div className="overflow-hidden rounded-card border border-paper/20">
            <SmartImage imageKey="concept/embroidery-detail" ratio="aspect-[16/9] lg:aspect-[4/3]" sizes="(max-width: 1023px) 100vw, 50vw" />
          </div>
          <div>
            <p className="eyebrow text-paper/75">Details</p>
            <h2 id="story-title" className="mt-1 text-[2rem] text-paper sm:text-[2.5rem] lg:text-[3rem]">
              Made to go with you.
            </h2>
            <p className="mt-3 max-w-md text-[16px] text-paper/80">Two colours, one mark, descriptive names. Everything else is left to the garment.</p>
            <dl className="mt-6 grid gap-5 sm:grid-cols-3">
              {[
                ['Two colours', 'Paper White and Charcoal Ink, inside and out, down to the woven label.'],
                ['Embroidered mark', 'Cap front 55–65mm. Tee left chest 70–90mm or centred chest 220–280mm.'],
                ['Honest names', 'No fake collaborations, no fake scarcity, no unverified bestseller tags.'],
              ].map(([term, detail]) => (
                <div key={term} className="border-t border-paper/25 pt-3">
                  <dt className="text-2xs font-semibold uppercase tracking-[0.14em] text-paper/75">{term}</dt>
                  <dd className="mt-1 text-sm text-paper/90">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="shell section" aria-labelledby="support-title">
        <h2 id="support-title" className="text-[1.625rem] sm:text-[2rem]">
          Fit and confidence.
        </h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            { title: 'Size guide', body: 'Measurements, materials and care arrive with the first release, checked against a sew-out at real embroidery scale.' },
            { title: 'Shipping and returns', body: 'Policies are published when the store connects. We will not promise delivery times we cannot keep.' },
            { title: 'Questions', body: 'Ask about the release, sizing or wholesale.', href: '/contact/', linkLabel: 'Contact us' },
          ].map((item) => (
            <li key={item.title} className="rounded-card border border-paper-edge p-4">
              <h3 className="font-sans text-[17px] font-bold">{item.title}</h3>
              <p className="mt-1 text-[15px] text-ink-soft">{item.body}</p>
              {item.href ? (
                <Link href={item.href} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline">
                  {item.linkLabel} <span aria-hidden="true">→</span>
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
