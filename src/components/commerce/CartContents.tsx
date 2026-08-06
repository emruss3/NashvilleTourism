'use client';

import Link from 'next/link';
import { useCart } from './CartProvider';
import Money from './Money';

export default function CartContents({
  compact = false,
  onNavigate,
}: {
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const { cart, pending, error, updateItem, removeItem, checkout } = useCart();
  const lines = cart?.lines.nodes || [];

  if (!cart || lines.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
        <p className="font-sans text-xl font-bold text-ink">Your bag is empty.</p>
        <p className="mt-2 max-w-xs text-sm text-ink-soft">
          Nashville goods designed to be worn long after the trip.
        </p>
        <Link href="/shop/" className="btn-primary mt-5" onClick={onNavigate}>
          Shop NashRoam
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className={`flex-1 divide-y divide-paper-edge overflow-y-auto ${compact ? '' : 'border-y border-paper-edge'}`}>
        {lines.map((line) => {
          const image = line.merchandise.image;
          const options = line.merchandise.selectedOptions
            .filter((option) => option.value !== 'Default Title')
            .map((option) => option.value)
            .join(' · ');

          return (
            <div key={line.id} className="flex gap-4 py-5 first:pt-0 last:pb-0">
              <Link
                href={`/shop/${line.merchandise.product.handle}/`}
                className="h-28 w-24 shrink-0 overflow-hidden rounded bg-paper"
                onClick={onNavigate}
              >
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image.url}
                    alt={image.altText || line.merchandise.product.title}
                    width={image.width || 400}
                    height={image.height || 500}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="photo-slot h-full w-full" />
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/shop/${line.merchandise.product.handle}/`}
                      className="font-sans text-sm font-bold text-ink hover:text-clay"
                      onClick={onNavigate}
                    >
                      {line.merchandise.product.title}
                    </Link>
                    {options && <p className="mt-1 text-xs text-ink-faint">{options}</p>}
                  </div>
                  <Money value={line.cost.totalAmount} className="text-sm font-semibold text-ink" />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center rounded border border-paper-edge bg-paper-card">
                    <button
                      type="button"
                      className="h-9 w-9 text-lg text-ink hover:text-clay disabled:opacity-40"
                      onClick={() => updateItem(line.id, Math.max(0, line.quantity - 1))}
                      disabled={pending}
                      aria-label={`Decrease quantity of ${line.merchandise.product.title}`}
                    >
                      −
                    </button>
                    <span className="min-w-8 text-center text-sm font-semibold text-ink" aria-live="polite">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      className="h-9 w-9 text-lg text-ink hover:text-clay disabled:opacity-40"
                      onClick={() => updateItem(line.id, Math.min(20, line.quantity + 1))}
                      disabled={pending || line.quantity >= 20}
                      aria-label={`Increase quantity of ${line.merchandise.product.title}`}
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    className="text-xs font-semibold text-ink-faint underline underline-offset-2 hover:text-clay disabled:opacity-40"
                    onClick={() => removeItem(line.id)}
                    disabled={pending}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-paper-edge pt-5">
        {error && (
          <p className="mb-3 rounded border border-clay/30 bg-clay-wash/35 px-3 py-2 text-sm text-ink" role="alert">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between gap-4">
          <span className="font-semibold text-ink">Subtotal</span>
          <Money value={cart.cost.subtotalAmount} className="text-lg font-bold text-ink" />
        </div>
        <p className="mt-1 text-xs text-ink-faint">Shipping and taxes are calculated at checkout.</p>
        <button
          type="button"
          onClick={checkout}
          disabled={pending}
          className="btn-primary mt-4 w-full py-3 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? 'Updating…' : 'Secure checkout'}
        </button>
      </div>
    </div>
  );
}
