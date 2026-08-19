/**
 * Tours facade.
 *
 * Two lanes intentionally stay separate:
 * 1. Marketplace: live Viator production inventory can be displayed/booked as
 *    provider inventory without implying NashRoam editorial endorsement.
 * 2. Editorial/planner: only approved + published experiences from Supabase are
 *    allowed into NashRoam recommendations and itinerary logic.
 */

import { TOUR_EDITORIAL, type TourEditorialRecommendation } from '@/lib/content/tour-editorial';
import {
  experienceToProductSummary,
  getExperienceCatalog,
  type ExperienceCard,
} from '@/lib/feeds/experiences';
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
  /** Approved catalog only; retained for editorial/planner consumers. */
  experiences: ExperienceCard[];
  totalCount?: number;
  fetchedAt: string;
  error?: string;
  httpStatus?: number;
  environment?: string;
  source: 'viator' | 'supabase' | 'none';
  editorial: TourEditorialRecommendation[];
  attribution: string;
}

export async function getToursCatalog(params: ViatorSearchParams = {}): Promise<ToursCatalog> {
  const [provider, approved] = await Promise.all([
    searchNashvilleProducts({
      ...params,
      campaign: params.campaign ?? 'tours-marketplace',
    }),
    getExperienceCatalog({
      query: params.query,
      startDate: params.startDate,
      endDate: params.endDate,
      count: params.count ?? 24,
    }),
  ]);

  // A successful live provider request remains live when a narrow filter has no
  // matches. Zero results must not be mistaken for an integration outage.
  if (provider.live) {
    return {
      configured: true,
      live: true,
      products: provider.products,
      experiences: approved.experiences,
      totalCount: provider.totalCount ?? provider.products.length,
      fetchedAt: provider.fetchedAt,
      httpStatus: provider.httpStatus,
      environment: provider.environment,
      source: 'viator',
      editorial: TOUR_EDITORIAL,
      attribution:
        'Live product details, ratings, prices, photos, and booking links supplied by Viator. Marketplace listings are provider inventory, not NashRoam editorial endorsements.',
    };
  }

  if (approved.live && approved.experiences.length > 0) {
    return {
      configured: approved.configured || provider.configured,
      live: true,
      products: approved.experiences.map(experienceToProductSummary),
      experiences: approved.experiences,
      totalCount: approved.experiences.length,
      fetchedAt: approved.fetchedAt,
      error: provider.error,
      httpStatus: provider.httpStatus,
      environment: provider.environment,
      source: 'supabase',
      editorial: TOUR_EDITORIAL,
      attribution:
        'Showing NashRoam-approved cached Viator inventory because the live provider request is unavailable. Booking links remain Viator-attributed.',
    };
  }

  return {
    configured: provider.configured || approved.configured,
    live: false,
    products: [],
    experiences: [],
    totalCount: 0,
    fetchedAt: provider.fetchedAt || approved.fetchedAt,
    error: provider.error || approved.error,
    httpStatus: provider.httpStatus,
    environment: provider.environment,
    source: 'none',
    editorial: TOUR_EDITORIAL,
    attribution:
      'Viator marketplace inventory is unavailable. NashRoam does not substitute sample tours for live provider inventory.',
  };
}

/**
 * Public product detail is live provider inventory. This does not imply a
 * NashRoam recommendation; editorial/planner inclusion remains separately gated
 * in experiences.ts.
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
      'Product details, ratings, prices, photos, and booking supplied by Viator. This marketplace listing is not, by itself, a NashRoam editorial recommendation.',
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
