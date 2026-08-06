'use client';

import { useMemo, useState } from 'react';
import type { ProductOption, ProductVariant } from '@/lib/shopify/types';
import { useCart } from './CartProvider';
import Money from './Money';

function selectionMap(variant: ProductVariant | undefined): Record<string, string> {
  return Object.fromEntries((variant?.selectedOptions || []).map((option) => [option.name, option.value]));
}

export default function ProductPurchase({
  options,
  variants,
}: {
  options: ProductOption[];
  variants: ProductVariant[];
}) {
  const firstVariant = variants.find((variant) => variant.availableForSale) || variants[0];
  const [selected, setSelected] = useState<Record<string, string>>(() => selectionMap(firstVariant));
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { addItem, pending } = useCart();

  const selectedVariant = useMemo(
    () =>
      variants.find((variant) =>
        variant.selectedOptions.every((option) => selected[option.name] === option.value),
      ),
    [selected, variants],
  );

  function optionIsAvailable(optionName: string, value: string): boolean {
    return variants.some((variant) => {
      if (!variant.availableForSale) return false;
      return variant.selectedOptions.every((option) => {
        if (option.name === optionName) return option.value === value;
        const selectedValue = selected[option.name];
        return !selectedValue || option.value === selectedValue;
      });
    });
  }

  async function handleAdd() {
    if (!selectedVariant?.availableForSale) return;
    setAdding(true);
    setLocalError(null);
    try {
      await addItem(selectedVariant.id, quantity);
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : 'Could not add this item.');
    } finally {
      setAdding(false);
    }
  }

  const visibleOptions = options.filter(
    (option) => !(option.name === 'Title' && option.optionValues.length === 1),
  );

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-3">
        {selectedVariant ? (
          <>
            <Money value={selectedVariant.price} className="text-2xl font-bold text-ink" />
            {selectedVariant.compareAtPrice &&
              Number(selectedVariant.compareAtPrice.amount) > Number(selectedVariant.price.amount) && (
                <Money
                  value={selectedVariant.compareAtPrice}
                  className="text-base text-ink-faint line-through"
                />
              )}
          </>
        ) : (
          <span className="text-lg font-semibold text-ink-faint">Select options</span>
        )}
      </div>

      <div className="mt-7 space-y-6">
        {visibleOptions.map((option) => (
          <fieldset key={option.id}>
            <legend className="mb-2 text-sm font-bold text-ink">
              {option.name}
              {selected[option.name] && (
                <span className="ml-2 font-normal text-ink-faint">{selected[option.name]}</span>
              )}
            </legend>
            <div className="flex flex-wrap gap-2">
              {option.optionValues.map((value) => {
                const active = selected[option.name] === value.name;
                const available = optionIsAvailable(option.name, value.name);
                return (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => setSelected((current) => ({ ...current, [option.name]: value.name }))}
                    aria-pressed={active}
                    className={`min-h-11 rounded border px-4 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? 'border-ink bg-ink text-paper-card'
                        : available
                          ? 'border-paper-edge bg-paper-card text-ink hover:border-clay hover:text-clay'
                          : 'border-paper-edge bg-paper text-ink-faint line-through opacity-60'
                    }`}
                  >
                    {value.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div>
          <label htmlFor="product-quantity" className="mb-2 block text-sm font-bold text-ink">
            Quantity
          </label>
          <select
            id="product-quantity"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="field-input max-w-28"
          >
            {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-7" aria-live="polite">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!selectedVariant?.availableForSale || adding || pending}
          className="btn-primary w-full py-3.5 text-base disabled:cursor-not-allowed disabled:border-paper-edge disabled:bg-paper-edge disabled:text-ink-faint"
        >
          {adding
            ? 'Adding…'
            : selectedVariant?.availableForSale
              ? 'Add to bag'
              : 'Currently unavailable'}
        </button>
        {selectedVariant?.currentlyNotInStock && selectedVariant.availableForSale && (
          <p className="mt-2 text-sm text-ink-faint">Available to order and ships when restocked.</p>
        )}
        {localError && (
          <p className="mt-3 rounded border border-clay/30 bg-clay-wash/35 px-3 py-2 text-sm text-ink" role="alert">
            {localError}
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-paper-edge pt-5 text-sm leading-relaxed text-ink-soft">
        <p>Made to order. Production and delivery timing appears at secure checkout.</p>
        <p className="mt-2">White-label fulfillment by our production partner; customer support stays with NashRoam.</p>
      </div>
    </div>
  );
}
