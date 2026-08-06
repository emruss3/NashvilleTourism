import Link from 'next/link';
import type { ProductCard as ProductCardType } from '@/lib/shopify/types';
import Money from './Money';

export default function ProductCard({ product }: { product: ProductCardType }) {
  return (
    <article className="group">
      <Link href={`/shop/${product.handle}/`} className="block focus-visible:outline-2 focus-visible:outline-offset-4">
        <div className="aspect-[4/5] overflow-hidden rounded-card bg-paper-card">
          {product.featuredImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.featuredImage.url}
              alt={product.featuredImage.altText || product.title}
              width={product.featuredImage.width || 1200}
              height={product.featuredImage.height || 1500}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="photo-slot h-full w-full" role="img" aria-label={`Product image coming soon for ${product.title}`} />
          )}
        </div>
        <div className="pt-3">
          {product.productType && <p className="eyebrow mb-1">{product.productType}</p>}
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-sans text-base font-bold text-ink transition-colors group-hover:text-clay">
              {product.title}
            </h2>
            <Money value={product.priceRange.minVariantPrice} className="shrink-0 text-sm font-semibold text-ink" />
          </div>
          {!product.availableForSale && (
            <p className="mt-1 text-sm font-medium text-ink-faint">Currently unavailable</p>
          )}
        </div>
      </Link>
    </article>
  );
}
