/**
 * Tours catalog facade: NashRoam editorial + live Viator commercial data.
 * Providers own volatile fields; editorial rankings stay first-party.
 */

import { TOUR_EDITORIAL, type TourEditorialRecommendation } from '@/lib/content/tour-editorial';
import {
  getViatorProduct,
  searchNashvilleProducts,
  type ViatorProductDetail,
  type ViatorProductSummary,
  type ViatorSearchParams,
  type ViatorSearchResult,
} from '@/lib/feeds/viator';

export interface ToursCatalog extends ViatorSearchResult {
  editorial: TourEditorialRecommendation[];
  /** Provenance note for UI disclosures. */
  attribution: string;
}

export async function getToursCatalog(params: ViatorSearchParams = {}): Promise<ToursCatalog> {
  const result = await searchNashvilleProducts(params);
  return {
    ...result,
    editorial: TOUR_EDITORIAL,
    attribution: 'Experiences powered by Viator. Ratings and prices from Viator; NashRoam ranks formats editorially.',
  };
}

export async function getTourProduct(productCode: string): Promise<{
  configured: boolean;
  live: boolean;
  product?: ViatorProductDetail;
  error?: string;
  attribution: string;
}> {
  const result = await getViatorProduct(productCode);
  return {
    ...result,
    attribution: 'Booked via Viator. Use the booking link exactly as provided for affiliate attribution.',
  };
}

/** Match editorial format hints to live products without overwriting provider fields. */
export function productsForEditorialHint(
  products: ViatorProductSummary[],
  hint: string,
  limit = 3,
): ViatorProductSummary[] {
  const tokens = hint.toLowerCase().split(/\s+/).filter(Boolean);
  return products
    .map((p) => {
      const title = p.title.toLowerCase();
      const score = tokens.reduce((acc, t) => acc + (title.includes(t) ? 1 : 0), 0);
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.p.rating || 0) - (a.p.rating || 0))
    .slice(0, limit)
    .map((x) => x.p);
}
