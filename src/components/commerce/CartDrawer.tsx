'use client';

import { useEffect, useRef } from 'react';
import { useCart } from './CartProvider';
import CartContents from './CartContents';

export default function CartDrawer() {
  const { drawerOpen, closeCart, itemCount } = useCart();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeCart();
      if (event.key === 'Tab') {
        const elements = dialogRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),select,input,[tabindex="0"]');
        if (!elements?.length) return;
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [closeCart, drawerOpen]);

  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        className="absolute inset-0 h-full w-full bg-ink/45"
        onClick={closeCart}
        aria-label="Close shopping bag"
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-paper shadow-lift"
      >
        <div className="flex items-center justify-between border-b border-paper-edge px-5 py-4">
          <div>
            <p className="eyebrow">NSVL goods</p>
            <h2 id="cart-drawer-title" className="font-sans text-xl font-bold text-ink">
              Shopping bag {itemCount > 0 ? `(${itemCount})` : ''}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={closeCart}
            className="inline-flex h-10 w-10 items-center justify-center rounded text-ink hover:bg-sky/60 hover:text-ink"
            aria-label="Close shopping bag"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <CartContents compact onNavigate={closeCart} />
        </div>
      </section>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
