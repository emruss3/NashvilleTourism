/**
 * NashRoam experience catalog — Supabase is the source of truth.
 * Volatile commercial fields come from experience_source_state (Viator).
 * Editorial fields come from experience_editorial (first-party).
 */

import { getSupabaseServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { ViatorProductSummary } from '@/lib/feeds/viator';
import { searchNashvilleProducts, syncNashvilleCatalog } from '@/lib/feeds/viator';

export interface ExperienceCard {
  id: string;
  slug: string;
  title: string;
  experienceType: string;
  categories: string[];
  durationLabel?: string;
  neighborhood?: string;
  rating?: number;
  reviewCount?: number;
  fromPrice?: { amount: number; currency: string; formatted: string };
  freeCancellation: boolean;
  imageUrl?: string;
  /** Exact Viator affiliate productUrl */
  productUrl: string;
  productCode: string;
  nashroamScore?: number;
  plannerPriority: number;
  travelerTypes: string[];
  bestFor: string[];
  provider: 'viator';
}

export interface ExperienceCatalogResult {
  configured: boolean;
  live: boolean;
  source: 'supabase' | 'edge-search' | 'none';
  experiences: ExperienceCard[];
  attribution: string;
  error?: string;
  fetchedAt: string;
}

function formatMoney(amount: number, currency: string) {
  return {
    amount,
    currency,
    formatted: new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount),
  };
}

function durationLabel(min?: number | null, max?: number | null, metaLabel?: string | null) {
  if (metaLabel) return metaLabel;
  if (min != null && max != null && min === max) {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  if (min != null && max != null) return `${min}–${max} min`;
  return undefined;
}

type JoinedRow = {
  id: string;
  slug: string;
  title: string;
  experience_type: string;
  categories: string[] | null;
  duration_min_minutes: number | null;
  duration_max_minutes: number | null;
  is_published: boolean;
  status: string;
  experience_editorial: {
    nashroam_score: number | null;
    planner_priority: number | null;
    traveler_types: string[] | null;
    best_for: string[] | null;
  } | null;
  experience_source_ids: Array<{
    external_id: string;
    external_url: string | null;
    is_primary: boolean;
  }> | null;
  experience_source_state: Array<{
    rating_value: number | null;
    review_count: number | null;
    from_price: number | null;
    currency: string | null;
    booking_url: string | null;
    duration_min_minutes: number | null;
    duration_max_minutes: number | null;
    expires_at: string | null;
    display_allowed: boolean;
    metadata: Record<string, unknown> | null;
  }> | null;
};

function mapRow(row: JoinedRow): ExperienceCard | null {
  const link = (row.experience_source_ids ?? []).find((l) => l.is_primary) ??
    (row.experience_source_ids ?? [])[0];
  const state = (row.experience_source_state ?? [])[0];
  const productUrl = state?.booking_url || link?.external_url || '';
  const productCode = link?.external_id || '';
  if (!productUrl || !productCode) return null;

  const meta = state?.metadata ?? {};
  const editorial = row.experience_editorial;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    experienceType: row.experience_type,
    categories: row.categories ?? [],
    durationLabel: durationLabel(
      state?.duration_min_minutes ?? row.duration_min_minutes,
      state?.duration_max_minutes ?? row.duration_max_minutes,
      typeof meta.durationLabel === 'string' ? meta.durationLabel : null,
    ),
    rating: state?.rating_value ?? undefined,
    reviewCount: state?.review_count ?? undefined,
    fromPrice:
      state?.from_price != null
        ? formatMoney(Number(state.from_price), state.currency || 'USD')
        : undefined,
    freeCancellation: Boolean(meta.freeCancellation),
    imageUrl: typeof meta.imageUrl === 'string' ? meta.imageUrl : undefined,
    productUrl,
    productCode,
    nashroamScore: editorial?.nashroam_score ?? undefined,
    plannerPriority: editorial?.planner_priority ?? 50,
    travelerTypes: editorial?.traveler_types ?? [],
    bestFor: editorial?.best_for ?? [],
    provider: 'viator',
  };
}

export function experienceToProductSummary(exp: ExperienceCard): ViatorProductSummary {
  return {
    productCode: exp.productCode,
    title: exp.title,
    productUrl: exp.productUrl,
    imageUrl: exp.imageUrl,
    rating: exp.rating,
    reviewCount: exp.reviewCount,
    fromPrice: exp.fromPrice,
    durationLabel: exp.durationLabel,
    freeCancellation: exp.freeCancellation,
    flags: exp.freeCancellation ? ['FREE_CANCELLATION'] : [],
    categories: exp.categories,
    provider: 'viator',
  };
}

/** Read published experiences from Supabase (service role). */
export async function listPublishedExperiences(limit = 48): Promise<ExperienceCard[]> {
  const client = getSupabaseServiceClient();
  if (!client) return [];

  const { data, error } = await client
    .from('experiences')
    .select(
      `
      id, slug, title, experience_type, categories,
      duration_min_minutes, duration_max_minutes, is_published, status,
      experience_editorial ( nashroam_score, planner_priority, traveler_types, best_for ),
      experience_source_ids ( external_id, external_url, is_primary ),
      experience_source_state (
        rating_value, review_count, from_price, currency, booking_url,
        duration_min_minutes, duration_max_minutes, expires_at, display_allowed, metadata
      )
    `,
    )
    .eq('is_published', true)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as unknown as JoinedRow[])
    .map(mapRow)
    .filter(Boolean)
    .sort(
      (a, b) =>
        (b!.plannerPriority - a!.plannerPriority) ||
        (b!.nashroamScore ?? 0) - (a!.nashroamScore ?? 0),
    ) as ExperienceCard[];
}

/**
 * Tours catalog: prefer Supabase published rows; if empty, live Edge search
 * (and optionally kick a catalog sync once). Never fabricates inventory.
 */
export async function getExperienceCatalog(opts: {
  query?: string;
  startDate?: string;
  endDate?: string;
  count?: number;
  allowLiveFallback?: boolean;
  syncIfEmpty?: boolean;
} = {}): Promise<ExperienceCatalogResult> {
  const fetchedAt = new Date().toISOString();
  const attribution =
    'Experiences powered by Viator via NashRoam. Ratings and prices from Viator; NashRoam ranks editorially. Booking links use Viator affiliate URLs exactly as returned.';

  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      live: false,
      source: 'none',
      experiences: [],
      attribution,
      error: 'Supabase is not configured on this server',
      fetchedAt,
    };
  }

  let experiences = await listPublishedExperiences(opts.count ?? 48);

  if (opts.query?.trim()) {
    const q = opts.query.trim().toLowerCase();
    experiences = experiences.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.categories.some((c) => c.includes(q)),
    );
  }

  if (experiences.length > 0) {
    return {
      configured: true,
      live: true,
      source: 'supabase',
      experiences,
      attribution,
      fetchedAt,
    };
  }

  if (opts.syncIfEmpty) {
    // Best-effort background-ish sync (awaited once when catalog empty)
    await syncNashvilleCatalog({
      maxPages: 2,
      limit: 120,
      startDate: opts.startDate,
      endDate: opts.endDate,
    });
    experiences = await listPublishedExperiences(opts.count ?? 48);
    if (experiences.length > 0) {
      return {
        configured: true,
        live: true,
        source: 'supabase',
        experiences,
        attribution,
        fetchedAt: new Date().toISOString(),
      };
    }
  }

  if (opts.allowLiveFallback !== false) {
    const live = await searchNashvilleProducts({
      query: opts.query,
      startDate: opts.startDate,
      endDate: opts.endDate,
      count: opts.count ?? 24,
      sort: 'TRAVELER_RATING',
      campaign: 'tours-marketplace',
    });
    if (live.live) {
      return {
        configured: true,
        live: true,
        source: 'edge-search',
        experiences: live.products.map((p) => ({
          id: p.productCode,
          slug: p.productCode.toLowerCase(),
          title: p.title,
          experienceType: p.categories?.[0] ?? 'tour',
          categories: p.categories ?? [],
          durationLabel: p.durationLabel,
          rating: p.rating,
          reviewCount: p.reviewCount,
          fromPrice: p.fromPrice,
          freeCancellation: p.freeCancellation,
          imageUrl: p.imageUrl,
          productUrl: p.productUrl,
          productCode: p.productCode,
          plannerPriority: 50,
          travelerTypes: [],
          bestFor: [],
          provider: 'viator' as const,
        })),
        attribution,
        error: live.error,
        fetchedAt: live.fetchedAt,
      };
    }
    return {
      configured: true,
      live: false,
      source: 'none',
      experiences: [],
      attribution,
      error: live.error || 'No live Nashville experiences available',
      fetchedAt,
    };
  }

  return {
    configured: true,
    live: false,
    source: 'none',
    experiences: [],
    attribution,
    error: 'Experience catalog is empty',
    fetchedAt,
  };
}

/** Planner candidate pool — published + fresh enough + traveler fit. */
export async function getPlannerExperienceCandidates(input: {
  tripType: string;
  interests: string[];
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<ExperienceCard[]> {
  const catalog = await getExperienceCatalog({
    startDate: input.startDate,
    endDate: input.endDate,
    count: 80,
    allowLiveFallback: false,
    syncIfEmpty: false,
  });
  if (!catalog.live) return [];

  const interestBlob = `${input.tripType} ${input.interests.join(' ')}`.toLowerCase();
  const scored = catalog.experiences.map((e) => {
    let fit = e.plannerPriority;
    if (e.travelerTypes.some((t) => interestBlob.includes(t.replace('-', ' ')) || interestBlob.includes(t))) {
      fit += 15;
    }
    if (input.interests.some((i) => e.categories.some((c) => i.toLowerCase().includes(c) || c.includes(i.toLowerCase().split(' ')[0])))) {
      fit += 10;
    }
    if (interestBlob.includes('music') && e.categories.includes('music')) fit += 12;
    if (interestBlob.includes('food') && e.categories.includes('food')) fit += 12;
    if (interestBlob.includes('outdoor') && e.categories.includes('outdoor')) fit += 10;
    fit += (e.nashroamScore ?? 50) * 0.2;
    fit += Math.min(10, Math.log10((e.reviewCount ?? 1) + 1) * 4);
    return { e, fit };
  });

  return scored
    .sort((a, b) => b.fit - a.fit)
    .slice(0, input.limit ?? 12)
    .map((x) => x.e);
}
