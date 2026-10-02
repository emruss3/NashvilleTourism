const DEFAULT_API_VERSION = '2026-07';

export class ShopifyConfigurationError extends Error {
  constructor(message = 'Shopify storefront environment variables are not configured.') {
    super(message);
    this.name = 'ShopifyConfigurationError';
  }
}

export class ShopifyRequestError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, options?: { status?: number; details?: unknown }) {
    super(message);
    this.name = 'ShopifyRequestError';
    this.status = options?.status;
    this.details = options?.details;
  }
}

function normalizeStoreDomain(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');
}

export function getShopifyConfig() {
  const rawDomain = process.env.SHOPIFY_STORE_DOMAIN || '';
  const privateToken = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN || '';
  const apiVersion = process.env.SHOPIFY_STOREFRONT_API_VERSION || DEFAULT_API_VERSION;

  if (!rawDomain || !privateToken) {
    throw new ShopifyConfigurationError();
  }

  const storeDomain = normalizeStoreDomain(rawDomain);
  if (!storeDomain || storeDomain.includes('/')) {
    throw new ShopifyConfigurationError(
      'SHOPIFY_STORE_DOMAIN must be a hostname such as nashroam.myshopify.com.',
    );
  }

  return {
    storeDomain,
    privateToken,
    apiVersion,
    endpoint: `https://${storeDomain}/api/${apiVersion}/graphql.json`,
  };
}

export function isShopifyConfigured(): boolean {
  try {
    getShopifyConfig();
    return true;
  } catch {
    return false;
  }
}

type ShopifyGraphQLError = {
  message?: string;
  extensions?: Record<string, unknown>;
};

interface ShopifyResponse<T> {
  data?: T;
  errors?: ShopifyGraphQLError[];
}

export async function shopifyFetch<T>({
  query,
  variables,
  buyerIp,
  revalidate = 300,
}: {
  query: string;
  variables?: Record<string, unknown>;
  buyerIp?: string;
  /** Use 0 for cart and other buyer-specific operations. */
  revalidate?: number;
}): Promise<T> {
  const config = getShopifyConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Shopify-Storefront-Private-Token': config.privateToken,
  };

  if (buyerIp) {
    headers['Shopify-Storefront-Buyer-IP'] = buyerIp;
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables: variables ?? {} }),
    ...(revalidate === 0
      ? { cache: 'no-store' as const }
      : { next: { revalidate } }),
  });

  let payload: ShopifyResponse<T>;
  try {
    payload = (await response.json()) as ShopifyResponse<T>;
  } catch {
    throw new ShopifyRequestError('Shopify returned an unreadable response.', {
      status: response.status,
    });
  }

  if (!response.ok) {
    throw new ShopifyRequestError(`Shopify request failed with status ${response.status}.`, {
      status: response.status,
      details: payload,
    });
  }

  if (payload.errors?.length) {
    throw new ShopifyRequestError(
      payload.errors.map((error) => error.message || 'Unknown Shopify error').join('; '),
      { status: response.status, details: payload.errors },
    );
  }

  if (!payload.data) {
    throw new ShopifyRequestError('Shopify returned no data.', {
      status: response.status,
      details: payload,
    });
  }

  return payload.data;
}
