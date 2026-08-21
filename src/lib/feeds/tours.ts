/**
 * Tours facade.
 *
 * Viator marketplace inventory follows one certified model only: real-time
 * search. We do not fall back to an ingested Viator catalog when the provider
 * is unavailable. NashRoam editorial/planner content remains separately gated.
 */

import { TOUR_EDITORIAL, type TourEditorialRecommendation } from '@/lib/content/tour-editorial';
import { getExperienceCatalog, type ExperienceCard } from '@/lib/feeds/experiences';
import { rankMarketplaceBrowse } from '@/lib/feeds/tour-marketplace-rank';
import { filterKnownTourIntent } from '@/lib/feeds/tour-intent-filter';
import {
  getViatorProduct,
  searchNashvilleProducts,
  type ViatorProductDetail,
  type ViatorProductSummary,
  type ViatorSearchParams,
} from '@/lib/feeds/viator';

export interface ToursCatalog {
  configured: boolean;
  live: boolean;
  products: ViatorProductSummary[];
  /** Approved NashRoam catalog only; never used as Viator marketplace fallback. */
  experiences: ExperienceCard[];
  totalCount?: number;
  fetchedAt: string;
  error?: string;
  httpStatus?: number;
  environment?: string;
  source: 'viator' | 'none';
  editorial: TourEditorialRecommendation[];
  attribution: string;
}

export async function getToursCatalog(params: ViatorSearchParams = {}): Promise<ToursCatalog> {
  const requestedCount = Math.min(Math.max(params.count ?? 24, 1), 50);
  const usesProductBrowse = !params.query?.trim();
  const isGenericBrowse =
    usesProductBrowse && !params.startDate?.trim() && !params.endDate?.trim();

  const [provider, approved] = await Promise.all([
    searchNashvilleProducts({
      ...params,
      count: requestedCount,
      sort: params.sort ?? (usesProductBrowse ? 'DEFAULT' : undefined),
      campaign: params.campaign ?? (params.query ? 'tours-search' : 'tours-marketplace'),
    }),
    getExperienceCatalog({
      query: params.query,
      startDate: params.startDate,
      endDate: params.endDate,
      count: requestedCount,
    }),
  ]);

  // A successful provider request remains live when a narrow filter has zero
  // matches. Zero results must not be mistaken for an integration outage.
  if (provider.live) {
    const intent = filterKnownTourIntent(provider.products, params.query);
    const products = isGenericBrowse
      ? rankMarketplaceBrowse(intent.products, requestedCount)
      : intent.products.slice(0, requestedCount);

    return {
      configured: true,
      live: true,
      products,
      experiences: approved.experiences,
      totalCount: intent.constrained
        ? products.length
        : provider.totalCount ?? provider.products.length,
      fetchedAt: provider.fetchedAt,
      httpStatus: provider.httpStatus,
      environment: provider.environment,
      source: 'viator',
      editorial: TOUR_EDITORIAL,
      attribution: isGenericBrowse
        ? 'Live product details, aggregate ratings, prices, photos, and booking links supplied by Viator. Browse order starts with Viator results, then NashRoam applies local-relevance and variety safeguards. Marketplace listings are provider inventory, not NashRoam editorial endorsements.'
        : 'Live product details, aggregate ratings, prices, photos, and booking links supplied by Viator. Marketplace listings are provider inventory, not NashRoam editorial endorsements.',
    };
  }

  return {
    configured: provider.configured,
    live: false,
    products: [],
    experiences: approved.experiences,
    totalCount: 0,
    fetchedAt: provider.fetchedAt || approved.fetchedAt,
    error: provider.error,
    httpStatus: provider.httpStatus,
    environment: provider.environment,
    source: 'none',
    editorial: TOUR_EDITORIAL,
    attribution:
      'Viator marketplace inventory is unavailable. NashRoam does not substitute cached or sample Viator products for the real-time provider response.',
  };
}

/**
 * Public product detail is retrieved in real time for one product selected from
 * search. It does not imply a NashRoam editorial recommendation.
 */
export async function getTourProduct(productCode: string): Promise<{
  configured: boolean;
  live: boolean;
  product?: ViatorProductDetail;
  error?: string;
  attribution: string;
  environment?: string;
}> {
  const result = await getViatorProduct(productCode);
  return {
    ...result,
    attribution:
      'Product details, aggregate ratings, prices, photos, and booking are supplied by Viator. This marketplace listing is not, by itself, a NashRoam editorial recommendation.',
  };
}

export function productsForEditorialHint(
  products: ViatorProductSummary[],
  hint: string,
  limit = 3,
): ViatorProductSummary[] {
  const tokens = hint.toLowerCase().split(/\s+/).filter(Boolean);
  return products
    .map((product) => {
      const title = product.title.toLowerCase();
      const cats = (product.categories ?? []).join(' ').toLowerCase();
      const description = product.description?.toLowerCase() ?? '';
      const score = tokens.reduce(
        (acc, token) =>
          acc + (title.includes(token) || cats.includes(token) || description.includes(token) ? 1 : 0),
        0,
      );
      return { product, score };
    })
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.product.rating || 0) - (a.product.rating || 0) ||
        (b.product.reviewCount || 0) - (a.product.reviewCount || 0),
    )
    .slice(0, limit)
    .map((item) => item.product);
}
