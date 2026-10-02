import { shopifyFetch } from './client';
import {
  COLLECTION_PRODUCTS_QUERY,
  PRODUCTS_QUERY,
  PRODUCT_QUERY,
} from './queries';
import type { Product, ProductCard } from './types';

const EXCLUDED_HANDLES = new Set(['the-neighborhoods-map-print']);
const launchProducts = (products: ProductCard[]) => products.filter(product => !EXCLUDED_HANDLES.has(product.handle));

interface ProductsResponse {
  products: {
    nodes: ProductCard[];
  };
}

interface CollectionProductsResponse {
  collection?: {
    id: string;
    title: string;
    description: string;
    products: {
      nodes: ProductCard[];
    };
  } | null;
}

interface ProductResponse {
  product?: Product | null;
}

export async function getProducts(first = 24): Promise<ProductCard[]> {
  const collectionHandle = process.env.SHOPIFY_COLLECTION_HANDLE?.trim();

  if (collectionHandle) {
    const collectionData = await shopifyFetch<CollectionProductsResponse>({
      query: COLLECTION_PRODUCTS_QUERY,
      variables: { handle: collectionHandle, first },
      revalidate: 300,
    });

    if (collectionData.collection) {
      return launchProducts(collectionData.collection.products.nodes);
    }
    return [];
  }

  const data = await shopifyFetch<ProductsResponse>({
    query: PRODUCTS_QUERY,
    variables: { first },
    revalidate: 300,
  });

  return launchProducts(data.products.nodes);
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  if (EXCLUDED_HANDLES.has(handle)) return null;
  const data = await shopifyFetch<ProductResponse>({
    query: PRODUCT_QUERY,
    variables: { handle },
    revalidate: 300,
  });

  return data.product ?? null;
}
