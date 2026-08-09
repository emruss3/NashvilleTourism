/**
 * Nashroam experience catalog — Supabase is the source of truth.
 *
 * Public/planner surfaces use ONLY experiences that are:
 * - curation_status = approved
 * - is_published = true
 * - status = active
 *
 * Live Viator discovery belongs to ingestion/curation tooling. It is never a
 * public fallback that bypasses editorial approval.
 */

import { getSupabaseServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { ViatorProductSummary } from '@/lib/feeds/viator';

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
  /** Exact Viator affiliate productUrl stored in provider state/source ID. */
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
  source: 'supabase' | 'none';
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
  curation_status?: string;
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

const EXPERIENCE_SELECT = `
  id, slug, title, experience_type, categories,
  duration_min_minutes, duration_max_minutes, is_published, status, curation_status,
  experience_editorial ( nashroam_score, planner_priority, traveler_types, best_for ),
  experience_source_ids ( external_id, external_url, is_primary ),
  experience_source_state (
    rating_value, review_count, from_price, currency, booking_url,
    duration_min_minutes, duration_max_minutes, expires_at, display_allowed, metadata
  )
`;

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
    freeCancellation: Boolean(meta.freeCancellation ?? meta.free_cancellation),
    imageUrl:
      typeof meta.imageUrl === 'string'
        ? meta.imageUrl
        : typeof meta.image_url === 'string'
          ? meta.image_url
          : undefined,
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

/** Public catalog: approved + published + active only. */
export async function listPublishedExperiences(limit = 48): Promise<ExperienceCard[]> {
  const client = getSupabaseServiceClient();
  if (!client) return [];

  const { data, error } = await client
    .from('experiences')
    .select(EXPERIENCE_SELECT)
    .eq('curation_status', 'approved')
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
 * Resolve one Viator product code only if its canonical Nashroam experience is
 * approved, published and active. Used to gate product-detail live refreshes.
 */
export async function getApprovedExperienceByProductCode(
  productCode: string,
): Promise<ExperienceCard | null> {
  const client = getSupabaseServiceClient();
  const code = productCode.trim();
  if (!client || !code) return null;

  const { data: links, error: linkError } = await client
    .from('experience_source_ids')
    .select('experience_id, external_id, data_sources!inner(provider_key)')
    .eq('external_id', code)
    .eq('data_sources.provider_key', 'viator')
    .limit(1);

  if (linkError || !links?.[0]?.experience_id) return null;

  const { data, error } = await client
    .from('experiences')
    .select(EXPERIENCE_SELECT)
    .eq('id', links[0].experience_id)
    .eq('curation_status', 'approved')
    .eq('is_published', true)
    .eq('status', 'active')
    .limit(1);

  if (error || !data?.[0]) return null;
  return mapRow(data[0] as unknown as JoinedRow);
}

/**
 * Public tours catalog. No live-provider fallback is allowed: if editorial has
 * approved nothing yet, the correct state is an empty catalog.
 *
 * Legacy fallback flags remain in the signature temporarily for caller
 * compatibility, but are intentionally ignored.
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
    'Experiences powered by Viator via Nashroam. Provider ratings/prices remain attributed to Viator; Nashroam publishes only editorially approved experiences.';

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
        e.categories.some((c) => c.includes(q)) ||
        e.bestFor.some((b) => b.toLowerCase().includes(q)),
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

  return {
    configured: true,
    live: false,
    source: 'none',
    experiences: [],
    attribution,
    error: 'No Nashroam-approved experiences are published yet',
    fetchedAt,
  };
}

/** Planner candidate pool — approved/published catalog only. */
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
  });
  if (!catalog.live) return [];

  const interestBlob = `${input.tripType} ${input.interests.join(' ')}`.toLowerCase();
  const scored = catalog.experiences.map((e) => {
    let fit = e.plannerPriority;
    if (e.travelerTypes.some((t) => interestBlob.includes(t.replace('-', ' ')) || interestBlob.includes(t))) {
      fit += 15;
    }
    if (
      input.interests.some((i) =>
        e.categories.some(
          (c) => i.toLowerCase().includes(c) || c.includes(i.toLowerCase().split(' ')[0]),
        ),
      )
    ) {
      fit += 10;
    }
    if (interestBlob.includes('music') && e.categories.includes('music')) fit += 12;
    if (interestBlob.includes('food') && e.categories.some((c) => c.includes('food'))) fit += 12;
    if (interestBlob.includes('outdoor') && e.categories.some((c) => c.includes('outdoor'))) fit += 10;
    fit += (e.nashroamScore ?? 0) * 0.2;
    fit += Math.min(10, Math.log10((e.reviewCount ?? 1) + 1) * 4);
    return { e, fit };
  });

  return scored
    .sort((a, b) => b.fit - a.fit)
    .slice(0, input.limit ?? 12)
    .map((x) => x.e);
}
