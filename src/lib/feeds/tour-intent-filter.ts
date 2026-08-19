import type { ViatorProductSummary } from '@/lib/feeds/viator';

export type TourIntentFilterResult = {
  products: ViatorProductSummary[];
  constrained: boolean;
};

/**
 * Viator free-text search intentionally favors recall. For NashRoam's common
 * high-intent searches we apply a conservative final guard using only product
 * titles and Viator categories. Long descriptions are deliberately excluded:
 * they can mention unrelated transportation/activity words and previously let
 * a tractor tour leak into "boat tour" or a generic bus into "party bus".
 *
 * This never invents inventory. If no provider product clearly matches a known
 * intent, an honest zero-result state is preferable to a misleading card.
 */
export function filterKnownTourIntent(
  products: ViatorProductSummary[],
  query?: string,
): TourIntentFilterResult {
  const q = query?.trim().toLowerCase().replace(/[’']/g, "'") ?? '';
  if (!q) return { products, constrained: false };

  const text = (product: ViatorProductSummary) =>
    [product.title, ...(product.categories ?? [])].join(' ').toLowerCase();
  const keep = (predicate: (value: string) => boolean): TourIntentFilterResult => ({
    products: products.filter((product) => predicate(text(product))),
    constrained: true,
  });

  if (/\b(pedal tavern|pedal pub|party bike|pedal bar)\b/.test(q)) {
    return keep(
      (value) =>
        !/\b(kayak|canoe|paddleboard|paddle board)\b/.test(value) &&
        (/\b(pedal tavern|pedal pub|party bike|pedal bar)\b/.test(value) ||
          (/\bpedal\b/.test(value) && /\b(tavern|pub|bar|party bike)\b/.test(value))),
    );
  }

  if (/\bparty bus\b/.test(q)) {
    return keep(
      (value) =>
        !/\b(boat|pontoon|cruise|kayak|tractor)\b/.test(value) &&
        /\bbus\b/.test(value) &&
        /\b(party|honky|drag|bar|nightlife|open air)\b/.test(value),
    );
  }

  if (/\b(pub crawl|bar crawl|honky.?tonk.*crawl)\b/.test(q)) {
    return keep(
      (value) =>
        /\bcrawl\b/.test(value) &&
        /\b(pub|bar|honky|drink|drinks|whiskey|nightlife)\b/.test(value),
    );
  }

  if (/\b(whiskey|whisky|distill|bourbon|jack daniel)\b/.test(q)) {
    return keep((value) =>
      /\b(whiskey|whisky|distill\w*|bourbon|barrel|jack daniel|lynchburg)\b/.test(value),
    );
  }

  if (/\bboat tour\b/.test(q)) {
    return keep(
      (value) =>
        !/\b(bus|trolley|tractor)\b/.test(value) &&
        /\b(boat|pontoon|cruise|riverboat|river cruise|sightseeing cruises)\b/.test(value),
    );
  }

  if (/\b(bike tour|bicycle tour|e-?bike tour|cycling tour)\b/.test(q)) {
    return keep(
      (value) =>
        !/\b(kayak|canoe|paddleboard|paddle board)\b/.test(value) &&
        /\b(bike|bicycle|e-bike|ebike|cycling)\b/.test(value),
    );
  }

  if (/\bfood tour\b/.test(q)) {
    return keep((value) =>
      /\b(food|culinary|tasting|bbq|barbecue|restaurant|donut|chocolate|coffee)\b/.test(value),
    );
  }

  if (/\bmusic history\b/.test(q)) {
    return keep((value) =>
      /\b(music|songwriter|studio|music row|country music|ryman|opry)\b/.test(value),
    );
  }

  if (/\bcity sightseeing\b/.test(q)) {
    return keep((value) =>
      /\b(sightseeing|city tour|walking tour|trolley|landmark|mural|history tour)\b/.test(value),
    );
  }

  return { products, constrained: false };
}
