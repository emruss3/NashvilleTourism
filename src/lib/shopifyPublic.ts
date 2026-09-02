import { shopifyStoreDomain } from '@/lib/shopCatalog';

export type PublicShopifyVariant = {
  id: number;
  title: string;
  available: boolean;
  price: number;
};

export type PublicShopifyProduct = {
  id: number;
  handle: string;
  title: string;
  available: boolean;
  variants: PublicShopifyVariant[];
};

export async function getPublishedShopifyProduct(
  handle: string,
): Promise<PublicShopifyProduct | null> {
  try {
    const response = await fetch(
      `https://${shopifyStoreDomain}/products/${encodeURIComponent(handle)}.js`,
      {
        next: { revalidate: 300 },
        headers: { Accept: 'application/json' },
      },
    );

    if (!response.ok) return null;

    const product = (await response.json()) as PublicShopifyProduct;
    return product?.variants?.length ? product : null;
  } catch {
    // A product that is still draft is intentionally absent from the public
    // Shopify product endpoint. Keep the NSH concept card visible and disabled.
    return null;
  }
}
