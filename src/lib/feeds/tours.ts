/**
 * Tours facade: public catalog + product detail are gated by Nashroam curation.
 */

import { TOUR_EDITORIAL, type TourEditorialRecommendation } from '@/lib/content/tour-editorial';
import {
  experienceToProductSummary,
  getApprovedExperienceByProductCode,
  getExperienceCatalog,
  type ExperienceCard,
} from '@/lib/feeds/experiences';
import {
  getViatorProduct,
  type ViatorProductDetail,
  type ViatorProductSummary,
  type ViatorSearchParams,
} from '@/lib/feeds/viator';

export interface ToursCatalog {
  configured: boolean;
  live: boolean;
  products: ViatorProductSummary[];
  experiences: ExperienceCard[];
  totalCount?: number;
  fetchedAt: string;
  error?: string;
  httpStatus?: number;
  source: 'supabase' | 'none';
  editorial: TourEditorialRecommendation[];
  attribution: string;
}

export async function getToursCatalog(params: ViatorSearchParams = {}): Promise<ToursCatalog> {
  const catalog = await getExperienceCatalog({
    query: params.query,
    startDate: params.startDate,
    endDate: params.endDate,
    count: params.count ?? 24,
  });

  return {
    configured: catalog.configured,
    live: catalog.live,
    products: catalog.experiences.map(experienceToProductSummary),
    experiences: catalog.experiences,
    totalCount: catalog.experiences.length,
    fetchedAt: catalog.fetchedAt,
    error: catalog.error,
    source: catalog.source,
    editorial: TOUR_EDITORIAL,
    attribution: catalog.attribution,
  };
}

/**
 * Product detail is intentionally gated before a live Viator call.
 * Knowing a provider product code is not enough to publish it on Nashroam.
 */
export async function getTourProduct(productCode: string): Promise<{
  configured: boolean;
  live: boolean;
  product?: ViatorProductDetail;
  error?: string;
  attribution: string;
}> {
  const approved = await getApprovedExperienceByProductCode(productCode);
  const attribution =
    'Booked via Viator. Provider ratings/prices remain attributed to Viator; Nashroam shows only approved experiences.';

  if (!approved) {
    return {
      configured: true,
      live: false,
      error: 'This experience is not currently approved and published by Nashroam.',
      attribution,
    };
  }

  const result = await getViatorProduct(productCode);
  if (!result.live || !result.product) {
    return {
      ...result,
      attribution,
    };
  }

  return {
    ...result,
    // Keep the provider-returned live productUrl when available. The canonical
    // approved record still acts as the publication gate.
    product: result.product,
    attribution,
  };
}

export function productsForEditorialHint(
  products: ViatorProductSummary[],
  hint: string,
  limit = 3,
): ViatorProductSummary[] {
  const tokens = hint.toLowerCase().split(/\s+/).filter(Boolean);
  return products
    .map((p) => {
      const title = p.title.toLowerCase();
      const cats = (p.categories ?? []).join(' ');
      const score = tokens.reduce(
        (acc, t) => acc + (title.includes(t) || cats.includes(t) ? 1 : 0),
        0,
      );
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.p.rating || 0) - (a.p.rating || 0))
    .slice(0, limit)
    .map((x) => x.p);
}
