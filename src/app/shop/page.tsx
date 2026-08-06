import ProductCard from '@/components/commerce/ProductCard';
import { Breadcrumbs } from '@/components/Ui';
import { isShopifyConfigured } from '@/lib/shopify/client';
import { getProducts } from '@/lib/shopify/products';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 300;

export const metadata = buildMetadata({
  title: 'NashRoam Goods',
  description: 'Elevated Nashville apparel and goods designed for locals and visitors.',
  path: '/shop/',
  noindex: !isShopifyConfigured(),
});

export default async function ShopPage() {
  const configured = isShopifyConfigured();
  let products = [] as Awaited<ReturnType<typeof getProducts>>;
  let loadError = false;

  if (configured) {
    try {
      products = await getProducts(24);
    } catch (error) {
      console.error('Could not load Shopify products', error);
      loadError = true;
    }
  }

  return (
    <div className="pb-20">
      <div className="shell">
        <Breadcrumbs trail={[{ name: 'Shop', href: '/shop/' }]} />
      </div>

      <section className="border-y border-paper-edge bg-paper-card">
        <div className="shell grid gap-8 py-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:py-16">
          <div>
            <p className="eyebrow text-clay">NashRoam Goods</p>
            <h1 className="mt-2 max-w-3xl font-sans text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              Nashville, without the souvenir-shop look.
            </h1>
          </div>
          <p className="max-w-xl text-base leading-relaxed text-ink-soft lg:justify-self-end">
            Premium, wearable pieces for people who live here, come back often, or want something
            better than a novelty T-shirt. Produced on demand and fulfilled under the NashRoam brand.
          </p>
        </div>
      </section>

      <section className="shell py-12 lg:py-16">
        {!configured ? (
          <SetupState />
        ) : loadError ? (
          <UnavailableState />
        ) : products.length === 0 ? (
          <EmptyCatalogState />
        ) : (
          <>
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">The first collection</p>
                <h2 className="mt-1 font-sans text-2xl font-bold text-ink">Shop all</h2>
              </div>
              <p className="text-sm text-ink-faint">{products.length} products</p>
            </div>
            <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SetupState() {
  return (
    <div className="mx-auto max-w-2xl rounded-card border border-paper-edge bg-paper-card p-8 text-center">
      <p className="eyebrow text-clay">Store setup in progress</p>
      <h2 className="mt-2 font-sans text-2xl font-bold text-ink">NashRoam Goods is almost ready.</h2>
      <p className="mt-3 text-ink-soft">
        The storefront is installed. Products will appear here as soon as the Shopify Headless
        credentials are added in Vercel and the collection is published to the custom storefront.
      </p>
    </div>
  );
}

function UnavailableState() {
  return (
    <div className="mx-auto max-w-2xl rounded-card border border-paper-edge bg-paper-card p-8 text-center">
      <h2 className="font-sans text-2xl font-bold text-ink">The shop is temporarily unavailable.</h2>
      <p className="mt-3 text-ink-soft">Please check back shortly. The rest of NashRoam is still open.</p>
    </div>
  );
}

function EmptyCatalogState() {
  return (
    <div className="mx-auto max-w-2xl rounded-card border border-paper-edge bg-paper-card p-8 text-center">
      <h2 className="font-sans text-2xl font-bold text-ink">The collection is being prepared.</h2>
      <p className="mt-3 text-ink-soft">
        Shopify is connected, but no products are published to this storefront yet.
      </p>
    </div>
  );
}
