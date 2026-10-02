import { NextRequest, NextResponse } from 'next/server';
import {
  addCartLine,
  createCart,
  getCart,
  removeCartLine,
  updateCartLine,
} from '@/lib/shopify/cart';
import {
  ShopifyConfigurationError,
  ShopifyRequestError,
} from '@/lib/shopify/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COOKIE = 'nsvl_cart';
function cartResponse(cart: NonNullable<Awaited<ReturnType<typeof getCart>>>) {
  const response = NextResponse.json({ cart: { ...cart, id: 'current' } });
  response.headers.set('Cache-Control', 'private, no-store');
  response.cookies.set(COOKIE, cart.id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 10 });
  return response;
}
function buyerIp(request: NextRequest): string | undefined {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 8 && value.length < 500;
}

function validQuantity(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 20;
}

function errorResponse(error: unknown) {
  if (error instanceof ShopifyConfigurationError) {
    return NextResponse.json(
      { error: 'The NashRoam shop is not connected yet.' },
      { status: 503 },
    );
  }

  if (error instanceof ShopifyRequestError) {
    return NextResponse.json(
      { error: 'We could not update your bag. Please try again.' },
      { status: error.status && error.status >= 400 ? error.status : 400 },
    );
  }

  console.error('Shopify cart route failed');
  return NextResponse.json(
    { error: 'We could not update your bag. Please try again.' },
    { status: 500 },
  );
}

export async function GET(request: NextRequest) {
  const cartId = request.cookies.get(COOKIE)?.value;
  if (!cartId) {
    return NextResponse.json({ error: 'A valid cart ID is required.' }, { status: 404 });
  }

  try {
    const cart = await getCart(cartId, buyerIp(request));
    if (!cart) {
      return NextResponse.json({ error: 'Cart not found.' }, { status: 404 });
    }
    return cartResponse(cart);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      cartId?: unknown;
      merchandiseId?: unknown;
      quantity?: unknown;
    };

    if (!validId(body.merchandiseId) || !validQuantity(body.quantity)) {
      return NextResponse.json(
        { error: 'A valid variant and quantity are required.' },
        { status: 400 },
      );
    }

    const ip = buyerIp(request);
    const cart = request.cookies.get(COOKIE)?.value
      ? await addCartLine(request.cookies.get(COOKIE)!.value, body.merchandiseId, body.quantity, ip)
      : await createCart(body.merchandiseId, body.quantity, ip);

    return cartResponse(cart);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      cartId?: unknown;
      lineId?: unknown;
      quantity?: unknown;
    };
    const quantity = typeof body.quantity === 'number' ? body.quantity : Number.NaN;

    if (!request.cookies.get(COOKIE)?.value || !validId(body.lineId)) {
      return NextResponse.json(
        { error: 'A valid cart and line are required.' },
        { status: 400 },
      );
    }

    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 20) {
      return NextResponse.json(
        { error: 'Quantity must be between 0 and 20.' },
        { status: 400 },
      );
    }

    const ip = buyerIp(request);
    const cart = quantity === 0
      ? await removeCartLine(request.cookies.get(COOKIE)!.value, body.lineId, ip)
      : await updateCartLine(request.cookies.get(COOKIE)!.value, body.lineId, quantity, ip);

    return cartResponse(cart);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      cartId?: unknown;
      lineId?: unknown;
    };

    if (!request.cookies.get(COOKIE)?.value || !validId(body.lineId)) {
      return NextResponse.json(
        { error: 'A valid cart and line are required.' },
        { status: 400 },
      );
    }

    const cart = await removeCartLine(request.cookies.get(COOKIE)!.value, body.lineId, buyerIp(request));
    return cartResponse(cart);
  } catch (error) {
    return errorResponse(error);
  }
}
