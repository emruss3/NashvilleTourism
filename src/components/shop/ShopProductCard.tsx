'use client';

import { useMemo, useState } from 'react';
import type { LogoOverlay, ShopVariant } from '@/lib/shopCatalog';

export type ShopProductCardProps = {
  title: string;
  priceLabel: string;
  type: string;
  collection: string;
  image: string;
  description: string;
  variants: ShopVariant[];
  isLive: boolean;
  storeDomain: string;
  logoOverlay?: LogoOverlay;
};

export function ShopProductCard({
  title,
  priceLabel,
  type,
  collection,
  image,
  description,
  variants,
  isLive,
  storeDomain,
  logoOverlay,
}: ShopProductCardProps) {
  const firstAvailableVariant = variants[0]?.id ?? '';
  const [variantId, setVariantId] = useState(firstAvailableVariant);

  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === variantId) ?? variants[0],
    [variantId, variants],
  );

  const goToCart = () => {
    if (!isLive || !selectedVariant) return;
    window.location.assign(
      `https://${storeDomain}/cart/${selectedVariant.id}:1`,
    );
  };

  return (
    <article className="group flex h-full flex-col">
      <div className="relative overflow-hidden rounded-card border border-paper-edge bg-paper-card">
        <div className="relative aspect-[4/5] overflow-hidden bg-paper">
          <img
            src={image}
            alt={`${title} from the NASHVILLE / NSH collection`}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.015]"
          />
          {logoOverlay ? (
            <img
              src="/brand/nsh.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute h-auto object-contain"
              style={{
                left: logoOverlay.left,
                top: logoOverlay.top,
                width: logoOverlay.width,
                opacity: logoOverlay.opacity ?? 1,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ) : null}
          <span className="absolute left-3 top-3 rounded-full bg-paper-card px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink shadow-sm">
            {collection}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl leading-tight text-ink">{title}</h3>
          <p className="mt-1 text-xs uppercase tracking-wide text-ink-soft">{type}</p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-ink">{priceLabel}</p>
      </div>

      <p className="mt-2 flex-1 text-sm leading-6 text-ink-soft">{description}</p>

      {variants.length > 1 ? (
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Select option
          <select
            value={variantId}
            onChange={(event) => setVariantId(event.target.value)}
            className="mt-2 w-full rounded-full border border-paper-edge bg-paper-card px-4 py-3 text-sm normal-case tracking-normal text-ink outline-none focus:border-clay"
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.title} · {variant.price}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <button
        type="button"
        onClick={goToCart}
        disabled={!isLive}
        className={
          isLive
            ? 'btn-primary mt-4 inline-flex w-full justify-center'
            : 'mt-4 inline-flex w-full cursor-not-allowed items-center justify-center rounded-full border border-paper-edge px-4 py-3 text-sm font-semibold text-ink-soft opacity-75'
        }
      >
        {isLive ? `Add ${selectedVariant?.title ?? ''} to cart` : 'Sample approval pending'}
      </button>
    </article>
  );
}
