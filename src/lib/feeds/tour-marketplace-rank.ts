import type { ViatorProductSummary } from '@/lib/feeds/viator';

type BrowseCandidate = {
  product: ViatorProductSummary;
  providerIndex: number;
  tier: number;
  family: string;
};

function titleText(product: ViatorProductSummary): string {
  return product.title.toLowerCase().replace(/[’]/g, "'");
}

function isTransportOnly(product: ViatorProductSummary): boolean {
  const title = titleText(product);
  return (
    /\b(airport|arrival|departure)\b.*\b(transfer|transport|chauffeur)\b/.test(title) ||
    /\b(private\s+)?(airport\s+)?transfer\b/.test(title) ||
    /\bchauffeur[- ]driven transport\b/.test(title)
  );
}

function isDayTrip(product: ViatorProductSummary): boolean {
  const title = titleText(product);
  return (
    /\b(day\s*trip|daytrip)\b/.test(title) ||
    /\bnashville\s+to\b/.test(title) ||
    /\b(graceland|memphis|lynchburg|jack daniel(?:'s|s)?|loretta lynn|bowling green|kentucky)\b/.test(
      title,
    ) ||
    (/\b(civil war|carnton|lotz house|carter house|battle of franklin)\b/.test(title) &&
      /\bfrom nashville\b/.test(title))
  );
}

function isSeasonal(product: ViatorProductSummary): boolean {
  return /\b(new year'?s eve|christmas|holiday lights?|valentine'?s day|halloween)\b/.test(
    titleText(product),
  );
}

function experienceFamily(product: ViatorProductSummary): string {
  const title = titleText(product);
  const families: Array<[string, RegExp]> = [
    ['daytrip-memphis-graceland', /\b(graceland|memphis)\b/],
    ['daytrip-jack-daniels', /\b(jack daniel(?:'s|s)?|lynchburg)\b/],
    ['songwriting-session', /\b(write|record)\b.*\bsong\b|\bsongwriter experience\b/],
    ['party-pontoon', /\b(party boat|party pontoon|pontoon party|double decker.*boat)\b/],
    ['river-sightseeing-cruise', /\b(riverboats? sightseeing|sightseeing cruise|river cruise experience)\b/],
    ['showboat-cruise', /\b(showboat|general jackson)\b/],
    ['party-bus', /\b(party bus|honky tonk on wheels|open air party bus)\b/],
    ['party-tractor', /\bparty tractor\b/],
    ['party-bike', /\b(pedal tavern|pedal pub|party bike|pedal bar)\b/],
    ['hop-on-hop-off', /\bhop[- ]?on\b.*\bhop[- ]?off\b/],
    ['double-decker-city-tour', /\bdouble[- ]?decker\b.*\b(city|sightseeing)\b/],
    ['trolley-tour', /\btrolley tour\b/],
    ['electric-bike-tour', /\b(e[- ]?bike|electric bike)\b/],
  ];

  for (const [family, pattern] of families) {
    if (pattern.test(title)) return family;
  }
  return `product:${product.productCode}`;
}

function addCandidate(
  candidate: BrowseCandidate,
  selected: ViatorProductSummary[],
  selectedCodes: Set<string>,
  familyCounts: Map<string, number>,
): void {
  selected.push(candidate.product);
  selectedCodes.add(candidate.product.productCode);
  familyCounts.set(candidate.family, (familyCounts.get(candidate.family) ?? 0) + 1);
}

/**
 * The provider's DEFAULT order is the primary ranking signal. This guard makes
 * the generic Nashville browse page more useful by keeping local experiences
 * ahead of out-of-town day trips, removing transport-only inventory, and
 * preventing several versions of the same route from occupying the first row.
 * User-entered searches do not use this function.
 */
export function rankMarketplaceBrowse(
  products: ViatorProductSummary[],
  limit = 24,
): ViatorProductSummary[] {
  const safeLimit = Math.max(0, Math.min(limit, 50));
  if (!safeLimit) return [];

  const candidates: BrowseCandidate[] = products
    .filter((product) => !isTransportOnly(product))
    .map((product, providerIndex) => ({
      product,
      providerIndex,
      tier: isDayTrip(product) ? 1 : isSeasonal(product) ? 2 : 0,
      family: experienceFamily(product),
    }))
    .sort((a, b) => a.tier - b.tier || a.providerIndex - b.providerIndex);

  const selected: ViatorProductSummary[] = [];
  const selectedCodes = new Set<string>();
  const familyCounts = new Map<string, number>();
  const diverseWindow = Math.min(safeLimit, 12);

  // First row / first screen: one representative per recognizable experience.
  for (const candidate of candidates) {
    if (selected.length >= diverseWindow) break;
    if ((familyCounts.get(candidate.family) ?? 0) > 0) continue;
    addCandidate(candidate, selected, selectedCodes, familyCounts);
  }

  // Fill the page while keeping duplicate local formats to two and duplicate
  // day-trip routes to one. Provider order remains the tie-breaker.
  for (const candidate of candidates) {
    if (selected.length >= safeLimit) break;
    if (selectedCodes.has(candidate.product.productCode)) continue;
    const familyCap = candidate.tier === 1 ? 1 : 2;
    if ((familyCounts.get(candidate.family) ?? 0) >= familyCap) continue;
    addCandidate(candidate, selected, selectedCodes, familyCounts);
  }

  // Only relax the family cap when the provider pool does not contain enough
  // distinct inventory to fill the requested result count.
  for (const candidate of candidates) {
    if (selected.length >= safeLimit) break;
    if (selectedCodes.has(candidate.product.productCode)) continue;
    addCandidate(candidate, selected, selectedCodes, familyCounts);
  }

  return selected;
}
