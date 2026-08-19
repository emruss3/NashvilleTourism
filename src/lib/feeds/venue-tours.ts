import {
  getViatorProduct,
  searchNashvilleProducts,
  type ViatorProductSummary,
} from '@/lib/feeds/viator';

export interface CuratedVenueTourResult {
  configured: boolean;
  live: boolean;
  product?: ViatorProductSummary;
}

const RYMAN_SELF_GUIDED_PRODUCT_CODE = '6585P3';
const BROAD_TOUR_TERMS =
  /\b(trolley|hop[- ]on|city tour|food tour|ghost|pub crawl|bar crawl|party bus|private tour|sightseeing bus)\b/i;
const DIRECT_PRODUCT_TERMS =
  /\b(tour|admission|self[- ]guided|backstage|ticket|experience)\b/i;

function rymanScore(product: ViatorProductSummary): number {
  const title = product.title.trim();
  const text = [product.title, product.description ?? '', ...(product.categories ?? [])].join(' ');

  if (!/\bryman\b/i.test(title)) return -1000;

  let score = 100;
  if (/^ryman\b/i.test(title)) score += 30;
  if (/\bryman auditorium\b/i.test(title)) score += 25;
  if (DIRECT_PRODUCT_TERMS.test(title)) score += 20;
  if (DIRECT_PRODUCT_TERMS.test(text)) score += 8;
  if (BROAD_TOUR_TERMS.test(title)) score -= 80;
  if (BROAD_TOUR_TERMS.test(text)) score -= 20;
  score += Math.min(product.rating ?? 0, 5);
  score += Math.min((product.reviewCount ?? 0) / 1000, 5);

  return score;
}

/**
 * Prefer Viator's exact Ryman self-guided product. Freetext search is retained
 * only as a provider fallback because its ranking can surface generic Nashville
 * tours that merely pass the Ryman.
 */
export async function getRymanTour(): Promise<CuratedVenueTourResult> {
  const direct = await getViatorProduct(RYMAN_SELF_GUIDED_PRODUCT_CODE);
  if (direct.product && rymanScore(direct.product) >= 100) {
    return {
      configured: direct.configured,
      live: direct.live,
      product: direct.product,
    };
  }

  const result = await searchNashvilleProducts({
    query: 'Ryman Auditorium tour',
    count: 16,
    campaign: 'music-ryman',
  });

  const ranked = result.products
    .map((product) => ({ product, score: rymanScore(product) }))
    .filter((row) => row.score >= 100)
    .sort((a, b) => b.score - a.score);

  return {
    configured: direct.configured || result.configured,
    live: direct.live || result.live,
    product: ranked[0]?.product,
  };
}
