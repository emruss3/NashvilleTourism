import { Breadcrumbs, PageHeader } from '@/components/Ui';
import { ShopProductCard } from '@/components/shop/ShopProductCard';
import { buildMetadata } from '@/lib/seo';
import {
  shopifyStoreDomain,
  shopProducts,
  type ShopProduct,
} from '@/lib/shopCatalog';
import { getPublishedShopifyProduct } from '@/lib/shopifyPublic';

export const metadata = buildMetadata({
  title: 'NSH Shop | NASHVILLE',
  description:
    'Shop elevated Nashville tees, headwear, art, pet goods, and travel pieces designed without the souvenir-shop feel.',
  path: '/shop/',
});

export const revalidate = 300;

const collectionOrder: ShopProduct['collection'][] = [
  'Core',
  'Drop 001',
  'Graphic Seasonal',
  'Home & Lifestyle',
];

const collectionCopy: Record<ShopProduct['collection'], string> = {
  Core: 'Quiet city marks built for repeat wear.',
  'Drop 001': 'A limited Sunday-color capsule, expressed without licensed team graphics.',
  'Graphic Seasonal': 'One sharper graphic idea, kept well above souvenir grade.',
  'Home & Lifestyle': 'Nashville identity beyond the T-shirt rack.',
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export default async function ShopPage() {
  const liveProducts = await Promise.all(
    shopProducts.map(async (product) => ({
      handle: product.handle,
      product: await getPublishedShopifyProduct(product.handle),
    })),
  );

  const liveByHandle = new Map(
    liveProducts.map(({ handle, product }) => [handle, product]),
  );

  return (
    <div className="shell pb-20">
      <Breadcrumbs trail={[{ name: 'Shop', href: '/shop/' }]} />
      <PageHeader
        eyebrow="NSH / CITY GOODS"
        title="Nashville, without the souvenir-shop feel."
        intro="A restrained collection of heavyweight tees, headwear, art, pet goods, and travel pieces designed to stay in rotation after the trip is over."
      />

      <div className="mt-8 grid gap-4 rounded-card border border-paper-edge bg-paper-card px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Collection preview
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink">
            All nine products are connected to Shopify as drafts. Checkout switches on automatically for each product after its blank, decoration, and physical sample are approved and the Shopify product is published.
          </p>
        </div>
        <a href="/newsletter/" className="btn-secondary justify-self-start sm:justify-self-end">
          Get drop alerts
        </a>
      </div>

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Shop collections">
        {collectionOrder.map((collection) => (
          <a
            key={collection}
            href={`#${collection.toLowerCase().replaceAll(' ', '-').replaceAll('&', 'and')}`}
            className="rounded-full border border-paper-edge bg-paper-card px-4 py-2 text-sm font-semibold text-ink transition hover:border-clay hover:text-clay"
          >
            {collection}
          </a>
        ))}
      </nav>

      {collectionOrder.map((collection) => {
        const products = shopProducts.filter(
          (product) => product.collection === collection,
        );
        const sectionId = collection
          .toLowerCase()
          .replaceAll(' ', '-')
          .replaceAll('&', 'and');

        return (
          <section key={collection} id={sectionId} className="mt-14 scroll-mt-24">
            <div className="mb-6 flex flex-col gap-2 border-b border-paper-edge pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-clay">
                  NSH
                </p>
                <h2 className="mt-1 font-display text-3xl text-ink">{collection}</h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-ink-soft">
                {collectionCopy[collection]}
              </p>
            </div>

            <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => {
                const liveProduct = liveByHandle.get(product.handle);
                const liveVariants = liveProduct?.variants
                  .filter((variant) => variant.available)
                  .map((variant) => ({
                    id: String(variant.id),
                    title: variant.title,
                    price: formatPrice(variant.price),
                  }));
                const isLive = Boolean(liveVariants?.length);

                return (
                  <ShopProductCard
                    key={product.handle}
                    title={product.title}
                    priceLabel={product.priceLabel}
                    type={product.type}
                    collection={product.collection}
                    image={product.image}
                    description={product.description}
                    variants={liveVariants?.length ? liveVariants : product.variants}
                    isLive={isLive}
                    storeDomain={shopifyStoreDomain}
                    logoOverlay={product.logoOverlay}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="mt-20 overflow-hidden rounded-card border border-paper-edge bg-navy px-6 py-12 text-paper sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-wide text-paper">
          Down Friday. Home Sunday.
        </p>
        <h2 className="mt-2 max-w-2xl font-display text-3xl text-paper">
          A city collection should feel like a good local brand—not an airport gift shop.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-paper">
          We are sampling the first release now. Headwear and tees lead, Drop 001 follows, and the weekender launches only after the canvas, structure, hardware, and embroidery earn the $128 price.
        </p>
        <a href="/newsletter/" className="btn-primary mt-6 inline-flex">
          Join NASHVILLE Weekender
        </a>
      </section>
    </div>
  );
}
