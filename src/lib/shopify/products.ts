import { shopifyFetch } from './client';
import {
  COLLECTION_PRODUCTS_QUERY,
  PRODUCTS_QUERY,
  PRODUCT_QUERY,
} from './queries';
import type { Product, ProductCard } from './types';

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
      return collectionData.collection.products.nodes;
    }
  }

  const data = await shopifyFetch<ProductsResponse>({
    query: PRODUCTS_QUERY,
    variables: { first },
    revalidate: 300,
  });

  return data.products.nodes;
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  const data = await shopifyFetch<ProductResponse>({
    query: PRODUCT_QUERY,
    variables: { handle },
    revalidate: 300,
  });

  return data.product ?? null;
}
