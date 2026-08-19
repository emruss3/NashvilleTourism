import Link from 'next/link';
import BookingLink from '@/components/BookingLink';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import type { ViatorProductSummary } from '@/lib/feeds/viator';

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating * 10) / 10;
  return (
    <span className="font-semibold text-navy">
      {rounded.toFixed(1)}
      <span className="sr-only"> out of 5</span>
    </span>
  );
}

export function TourProductCard({
  product,
  category,
}: {
  product: ViatorProductSummary;
  category?: string;
}) {
  const href = `/tours/${encodeURIComponent(product.productCode)}/`;

  return (
    <article className="card flex h-full flex-col overflow-hidden">
      <Link href={href} className="relative block aspect-[3/2] bg-sky/40">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-faint">No photo</div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        {category ? (
          <p className="text-2xs font-bold uppercase tracking-wider text-ink-faint">{category}</p>
        ) : null}
        <h3 className="mt-1 font-sans text-lg font-bold leading-snug text-navy">
          <Link href={href} className="hover:text-clay">
            {product.title}
          </Link>
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
          {product.rating != null ? (
            <p>
              <Stars rating={product.rating} />
              {product.reviewCount != null ? (
                <span className="text-ink-faint"> ({product.reviewCount.toLocaleString()} reviews)</span>
              ) : null}
            </p>
          ) : (
            <p className="text-ink-faint">New on Viator</p>
          )}
          {product.durationLabel ? <p>{product.durationLabel}</p> : null}
        </div>

        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
          {product.fromPrice ? (
            <p className="text-base font-semibold text-navy">
              From {product.fromPrice.formatted}
              <span className="ml-1 text-xs font-medium text-ink-faint">starting price</span>
            </p>
          ) : (
            <p className="text-sm text-ink-faint">See price on Viator</p>
          )}
          {product.freeCancellation ? (
            <p className="text-2xs font-bold uppercase tracking-wider text-navy">Free cancellation</p>
          ) : null}
        </div>

        <div className="mt-auto grid gap-2 pt-5">
          <Link href={href} className="btn-secondary min-h-[44px] w-full text-center">
            View details
          </Link>
          <BookingLink
            url={product.productUrl}
            label="Check dates on Viator"
            name={product.title}
            slug={product.productCode}
            event={ANALYTICS_EVENTS.ACTIVITY_AFFILIATE_CLICKED}
            partner="Viator"
            placement="affiliate"
          />
        </div>
      </div>
    </article>
  );
}
