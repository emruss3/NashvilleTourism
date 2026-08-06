import { ShopifyRequestError, shopifyFetch } from './client';
import {
  CART_CREATE_MUTATION,
  CART_LINES_ADD_MUTATION,
  CART_LINES_REMOVE_MUTATION,
  CART_LINES_UPDATE_MUTATION,
  CART_QUERY,
} from './queries';
import type { Cart, CartMutationPayload } from './types';

function unwrapCartPayload(payload: CartMutationPayload): Cart {
  if (payload.userErrors.length > 0) {
    throw new ShopifyRequestError(
      payload.userErrors.map((error) => error.message).join('; '),
      { details: payload.userErrors },
    );
  }

  if (!payload.cart) {
    throw new ShopifyRequestError('Shopify did not return a cart.');
  }

  return payload.cart;
}

export async function getCart(cartId: string, buyerIp?: string): Promise<Cart | null> {
  const data = await shopifyFetch<{ cart?: Cart | null }>({
    query: CART_QUERY,
    variables: { cartId },
    buyerIp,
    revalidate: 0,
  });

  return data.cart ?? null;
}

export async function createCart(
  merchandiseId: string,
  quantity: number,
  buyerIp?: string,
): Promise<Cart> {
  const data = await shopifyFetch<{ cartCreate: CartMutationPayload }>({
    query: CART_CREATE_MUTATION,
    variables: {
      input: {
        lines: [{ merchandiseId, quantity }],
      },
    },
    buyerIp,
    revalidate: 0,
  });

  return unwrapCartPayload(data.cartCreate);
}

export async function addCartLine(
  cartId: string,
  merchandiseId: string,
  quantity: number,
  buyerIp?: string,
): Promise<Cart> {
  const data = await shopifyFetch<{ cartLinesAdd: CartMutationPayload }>({
    query: CART_LINES_ADD_MUTATION,
    variables: {
      cartId,
      lines: [{ merchandiseId, quantity }],
    },
    buyerIp,
    revalidate: 0,
  });

  return unwrapCartPayload(data.cartLinesAdd);
}

export async function updateCartLine(
  cartId: string,
  lineId: string,
  quantity: number,
  buyerIp?: string,
): Promise<Cart> {
  const data = await shopifyFetch<{ cartLinesUpdate: CartMutationPayload }>({
    query: CART_LINES_UPDATE_MUTATION,
    variables: {
      cartId,
      lines: [{ id: lineId, quantity }],
    },
    buyerIp,
    revalidate: 0,
  });

  return unwrapCartPayload(data.cartLinesUpdate);
}

export async function removeCartLine(
  cartId: string,
  lineId: string,
  buyerIp?: string,
): Promise<Cart> {
  const data = await shopifyFetch<{ cartLinesRemove: CartMutationPayload }>({
    query: CART_LINES_REMOVE_MUTATION,
    variables: {
      cartId,
      lineIds: [lineId],
    },
    buyerIp,
    revalidate: 0,
  });

  return unwrapCartPayload(data.cartLinesRemove);
}
