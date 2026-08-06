'use client';

import { useCart } from './CartProvider';

export default function CartButton() {
  const { itemCount, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={openCart}
      className="relative inline-flex items-center justify-center rounded p-2.5 text-ink transition-colors hover:bg-sky/60 hover:text-clay"
      aria-label={`Open shopping bag${itemCount ? ` with ${itemCount} item${itemCount === 1 ? '' : 's'}` : ''}`}
    >
      <BagIcon />
      {itemCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-bold leading-none text-paper-card">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </button>
  );
}

function BagIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4.5 7.5h11l-.6 9H5.1l-.6-9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
