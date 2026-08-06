import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ProductGallery from '@/components/commerce/ProductGallery';
import ProductPurchase from '@/components/commerce/ProductPurchase';
import { Breadcrumbs } from '@/components/Ui';
import { isShopifyConfigured } from '@/lib/shopify/client';
import { getProductByHandle } from '@/lib/shopify/products';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: { handle: string };
}): Promise<Metadata> {
  if (!isShopifyConfigured()) {
    return buildMetadata({
      title: 'NashRoam Goods',
      description: 'NashRoam shop setup in progress.',
      path: `/shop/${params.handle}/`,
      noindex: true,
    });
  }

  try {
    const product = await getProductByHandle(params.handle);
    if (!product) {
      return buildMetadata({
        title: 'Product not found',
        description: 'This NashRoam product is not available.',
        path: `/shop/${params.handle}/`,
        noindex: true,
      });
    }

    return buildMetadata({
      title: product.title,
      description: product.description || 'NashRoam apparel and goods.',
      path: `/shop/${product.handle}/`,
      noindex: false,
    });
  } catch {
    return buildMetadata({
      title: 'NashRoam Goods',
      description: 'NashRoam apparel and goods.',
      path: `/shop/${params.handle}/`,
      noindex: true,
    });
  }
}

export default async function ProductPage({ params }: { params: { handle: string } }) {
  if (!isShopifyConfigured()) notFound();

  let product: Awaited<ReturnType<typeof getProductByHandle>>;
  try {
    product = await getProductByHandle(params.handle);
  } catch (error) {
    console.error('Could not load Shopify product', error);
    notFound();
  }

  if (!product) notFound();

  const images = product.images.nodes.length
    ? product.images.nodes
    : product.featuredImage
      ? [product.featuredImage]
      : [];

  return (
    <div className="shell pb-20">
      <Breadcrumbs
        trail={[
          { name: 'Shop', href: '/shop/' },
          { name: product.title, href: `/shop/${product.handle}/` },
        ]}
      />

      <div className="grid gap-10 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:py-12">
        <ProductGallery images={images} title={product.title} />

        <div className="lg:sticky lg:top-28 lg:self-start">
          {product.productType && <p className="eyebrow text-clay">{product.productType}</p>}
          <h1 className="mt-2 font-sans text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {product.title}
          </h1>
          {product.vendor && product.vendor.toLowerCase() !== 'nashroam' && (
            <p className="mt-2 text-sm text-ink-faint">By {product.vendor}</p>
          )}

          {product.description && (
            <p className="mt-5 text-base leading-relaxed text-ink-soft">{product.description}</p>
          )}

          <div className="mt-7">
            <ProductPurchase options={product.options} variants={product.variants.nodes} />
          </div>

          <div className="mt-8 border-t border-paper-edge pt-6">
            <h2 className="font-sans text-base font-bold text-ink">What to expect</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-soft">
              <li>Produced on demand to avoid excess inventory.</li>
              <li>Secure payment, tax, and shipping calculations through Shopify Checkout.</li>
              <li>Order production and delivery updates sent directly to your email.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
