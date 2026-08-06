'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Cart } from '@/lib/shopify/types';

const STORAGE_KEY = 'nashroam_shopify_cart_id';
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

interface CartContextValue {
  cart: Cart | null;
  itemCount: number;
  pending: boolean;
  error: string | null;
  drawerOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  clearError: () => void;
  addItem: (merchandiseId: string, quantity?: number) => Promise<void>;
  updateItem: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  checkout: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

async function apiRequest(
  path: string,
  init?: RequestInit,
): Promise<{ cart: Cart }> {
  const response = await fetch(`${BASE_PATH}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const body = (await response.json().catch(() => ({}))) as {
    cart?: Cart;
    error?: string;
  };

  if (!response.ok || !body.cart) {
    const error = new Error(body.error || 'We could not update your bag.');
    Object.assign(error, { status: response.status });
    throw error;
  }

  return { cart: body.cart };
}

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const persist = useCallback((nextCart: Cart) => {
    setCart(nextCart);
    window.localStorage.setItem(STORAGE_KEY, nextCart.id);
  }, []);

  const forgetCart = useCallback(() => {
    setCart(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const refresh = useCallback(
    async (cartId: string): Promise<Cart | null> => {
      try {
        const result = await apiRequest(
          `/api/shopify/cart/?cartId=${encodeURIComponent(cartId)}`,
          { cache: 'no-store' },
        );
        persist(result.cart);
        return result.cart;
      } catch (caught) {
        const status = (caught as Error & { status?: number }).status;
        if (status === 404) {
          forgetCart();
          return null;
        }
        throw caught;
      }
    },
    [forgetCart, persist],
  );

  useEffect(() => {
    const cartId = window.localStorage.getItem(STORAGE_KEY);
    if (!cartId) return;

    setPending(true);
    refresh(cartId)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load your bag.'))
      .finally(() => setPending(false));
  }, [refresh]);

  const addItem = useCallback(
    async (merchandiseId: string, quantity = 1) => {
      setPending(true);
      setError(null);
      try {
        const result = await apiRequest('/api/shopify/cart/', {
          method: 'POST',
          body: JSON.stringify({
            cartId: cart?.id,
            merchandiseId,
            quantity,
          }),
        });
        persist(result.cart);
        setDrawerOpen(true);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not add this item.');
        throw caught;
      } finally {
        setPending(false);
      }
    },
    [cart?.id, persist],
  );

  const updateItem = useCallback(
    async (lineId: string, quantity: number) => {
      if (!cart?.id) return;
      setPending(true);
      setError(null);
      try {
        const result = await apiRequest('/api/shopify/cart/', {
          method: 'PATCH',
          body: JSON.stringify({ cartId: cart.id, lineId, quantity }),
        });
        persist(result.cart);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not update this item.');
      } finally {
        setPending(false);
      }
    },
    [cart?.id, persist],
  );

  const removeItem = useCallback(
    async (lineId: string) => {
      if (!cart?.id) return;
      setPending(true);
      setError(null);
      try {
        const result = await apiRequest('/api/shopify/cart/', {
          method: 'DELETE',
          body: JSON.stringify({ cartId: cart.id, lineId }),
        });
        persist(result.cart);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not remove this item.');
      } finally {
        setPending(false);
      }
    },
    [cart?.id, persist],
  );

  const checkout = useCallback(async () => {
    if (!cart?.id) return;
    setPending(true);
    setError(null);
    try {
      const latest = await refresh(cart.id);
      if (!latest?.checkoutUrl) {
        throw new Error('Checkout is not available yet.');
      }
      window.location.assign(latest.checkoutUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open checkout.');
      setPending(false);
    }
  }, [cart?.id, refresh]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      itemCount: cart?.totalQuantity || 0,
      pending,
      error,
      drawerOpen,
      openCart: () => setDrawerOpen(true),
      closeCart: () => setDrawerOpen(false),
      clearError: () => setError(null),
      addItem,
      updateItem,
      removeItem,
      checkout,
    }),
    [addItem, cart, checkout, drawerOpen, error, pending, removeItem, updateItem],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider.');
  }
  return context;
}
