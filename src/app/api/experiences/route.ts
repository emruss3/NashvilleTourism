import {
  getExperienceCatalog,
  getPlannerExperienceCandidates,
} from '@/lib/feeds/experiences';

/**
 * Narrow public read model for published experiences.
 * Does not expose service keys, Viator keys, or raw provider payloads.
 */
export const dynamic = 'force-dynamic';

function toPublicCard(e: {
  id: string;
  slug: string;
  title: string;
  categories: string[];
  durationLabel?: string;
  rating?: number;
  reviewCount?: number;
  fromPrice?: { amount: number; currency: string; formatted: string };
  freeCancellation: boolean;
  imageUrl?: string;
  productCode: string;
  productUrl: string;
  plannerPriority: number;
  travelerTypes: string[];
  bestFor: string[];
}) {
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    categories: e.categories,
    durationLabel: e.durationLabel,
    rating: e.rating,
    reviewCount: e.reviewCount,
    fromPrice: e.fromPrice,
    freeCancellation: e.freeCancellation,
    imageUrl: e.imageUrl,
    productCode: e.productCode,
    productUrl: e.productUrl,
    plannerPriority: e.plannerPriority,
    travelerTypes: e.travelerTypes,
    bestFor: e.bestFor,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || undefined;
  const startDate = url.searchParams.get('startDate') || undefined;
  const endDate = url.searchParams.get('endDate') || undefined;
  const count = Math.min(Number(url.searchParams.get('count')) || 24, 60);
  const sync = url.searchParams.get('sync') === '1';
  const planner = url.searchParams.get('planner') === '1';
  const tripType = url.searchParams.get('tripType') || 'first-visit';
  const interests = (url.searchParams.get('interests') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (planner) {
    const experiences = await getPlannerExperienceCandidates({
      tripType,
      interests,
      startDate,
      endDate,
      limit: count,
    });
    return Response.json(
      {
        configured: true,
        live: experiences.length > 0,
        source: 'supabase',
        attribution:
          'Planner candidates from the NashRoam experience catalog (Viator commercial data cached in Supabase).',
        experiences: experiences.map(toPublicCard),
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=60',
        },
      },
    );
  }

  const catalog = await getExperienceCatalog({
    query: q,
    startDate,
    endDate,
    count,
    allowLiveFallback: true,
    syncIfEmpty: sync,
  });

  return Response.json(
    {
      configured: catalog.configured,
      live: catalog.live,
      source: catalog.source,
      attribution: catalog.attribution,
      error: catalog.error,
      fetchedAt: catalog.fetchedAt,
      experiences: catalog.experiences.map(toPublicCard),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  );
}
