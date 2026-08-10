import type {
  ItineraryDay,
  ItineraryStop,
  NeighborhoodSlug,
  TripInput,
  TripType,
} from './types';
import { restaurants, venues, attractions } from './content/listings';
import { hotels } from './content/hotels';
import { neighborhoods, neighborhoodName } from './content/neighborhoods';

/**
 * Deterministic itinerary builder.
 *
 * Candidate retrieval (experiences + planner context from Supabase) is separate
 * from scoring/composition. The planner composes only from supplied records;
 * it never invents provider inventory or Nashville context.
 */

export interface ExperienceCandidate {
  id: string;
  slug: string;
  title: string;
  categories: string[];
  productCode: string;
  productUrl: string;
  durationLabel?: string;
  rating?: number;
  fromPrice?: { formatted: string };
  travelerTypes?: string[];
  bestFor?: string[];
  plannerPriority?: number;
}

export interface PlannerContextCandidate {
  id: string;
  type: string;
  title: string;
  guidance: string;
  instruction: string;
  neighborhood?: string | null;
  priority: number;
  rules?: Record<string, unknown>;
}

export interface PlannerGuidance {
  title: string;
  note: string;
}

export type PlannedItineraryDay = ItineraryDay & {
  guidance: PlannerGuidance[];
};

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  'first-visit': 'First visit',
  couples: 'Couples trip',
  friends: 'Friends weekend',
  bachelor: 'Bachelor party',
  bachelorette: 'Bachelorette party',
  family: 'Family trip',
  business: 'Business trip',
  music: 'Music-focused trip',
  food: 'Food-focused trip',
};

export const INTEREST_OPTIONS = [
  'Live music',
  'Restaurants',
  'Bars and nightlife',
  'History and museums',
  'Shopping',
  'Outdoors and parks',
  'Whiskey and breweries',
  'Sports',
];

const TYPE_NEIGHBORHOODS: Record<TripType, NeighborhoodSlug[]> = {
  'first-visit': ['downtown-broadway', 'the-gulch', 'germantown'],
  couples: ['germantown', '12-south', 'east-nashville'],
  friends: ['downtown-broadway', 'the-gulch', 'midtown'],
  bachelor: ['downtown-broadway', 'the-gulch', 'midtown'],
  bachelorette: ['the-gulch', 'downtown-broadway', '12-south'],
  family: ['green-hills', 'sylvan-park', 'germantown'],
  business: ['downtown-broadway', 'the-gulch', 'midtown'],
  music: ['downtown-broadway', 'east-nashville', 'the-gulch'],
  food: ['east-nashville', 'germantown', '12-south'],
};

const PACE_STOPS: Record<TripInput['pace'], number> = {
  relaxed: 3,
  balanced: 4,
  packed: 5,
};

export function tripLength(start: string, end: string): number {
  if (!start || !end) return 2;
  const a = Date.parse(start);
  const b = Date.parse(end);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 2;
  const days = Math.round((b - a) / 86_400_000) + 1;
  return Math.min(Math.max(days, 1), 7);
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function travelNote(from: string | undefined, to: string): string | undefined {
  if (!from) return undefined;
  if (from === to) return 'Walkable from the last stop, under 10 minutes.';
  return `About 10 to 20 minutes from ${neighborhoodName(from)} by car. Allow longer at rush hour.`;
}

function pickHoods(input: TripInput): NeighborhoodSlug[] {
  const chosen = input.neighborhoods.length > 0 ? input.neighborhoods : TYPE_NEIGHBORHOODS[input.tripType];
  const valid = chosen.filter((s) => neighborhoods.some((n) => n.slug === s));
  return valid.length > 0 ? valid : ['downtown-broadway'];
}

function rotate<T>(list: T[], index: number): T | undefined {
  if (list.length === 0) return undefined;
  return list[index % list.length];
}

function numericRule(context: PlannerContextCandidate | undefined, key: string): number | undefined {
  const raw = context?.rules?.[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
}

function booleanRule(context: PlannerContextCandidate | undefined, key: string): boolean {
  return context?.rules?.[key] === true;
}

export function buildItinerary(
  input: TripInput,
  experienceCandidates: ExperienceCandidate[] = [],
  plannerContexts: PlannerContextCandidate[] = [],
): PlannedItineraryDay[] {
  const days = tripLength(input.startDate, input.endDate);
  const hoods = pickHoods(input);
  const stopsPerDay = PACE_STOPS[input.pace];

  const foodPool = restaurants.filter((r) => {
    if (input.hasChildren && !r.goodForGroups && input.travelers > 3) return false;
    if (input.budget === 'value' && r.priceRange === '$$$$') return false;
    if (input.budget === 'premium' && r.priceRange === '$') return false;
    return true;
  });
  const seePool = attractions.filter((a) => (input.hasChildren ? a.familyFriendly : true));
  const nightPool = input.wantsNightlife ? venues : venues.filter((v) => v.coverNote.toLowerCase().includes('free'));
  const experiencePool = rankExperiencesForTrip(input, experienceCandidates);

  const globalAudienceContext = plannerContexts
    .filter((c) => !c.neighborhood && c.type === 'audience')
    .sort((a, b) => b.priority - a.priority);
  const avoidLateNight = globalAudienceContext.some((c) => booleanRule(c, 'avoid_late_night'));

  const result: PlannedItineraryDay[] = [];
  const usedExperienceIds = new Set<string>();

  for (let i = 0; i < days; i += 1) {
    const hood = hoods[i % hoods.length];
    const hoodContexts = plannerContexts
      .filter((c) => c.neighborhood === hood)
      .sort((a, b) => b.priority - a.priority);
    const primaryHoodContext = hoodContexts[0];
    const maxBlockHours = numericRule(primaryHoodContext, 'max_block_hours');
    const compactBlock = maxBlockHours != null && maxBlockHours <= 4 && hoods.length > 1;
    const lateHood = compactBlock ? hoods[(i + 1) % hoods.length] : hood;

    const inHoodFor = <T extends { neighborhood: NeighborhoodSlug }>(list: T[], target: NeighborhoodSlug) => {
      const local = list.filter((x) => x.neighborhood === target);
      return local.length > 0 ? local : list;
    };
    const inHood = <T extends { neighborhood: NeighborhoodSlug }>(list: T[]) => inHoodFor(list, hood);

    const morning = rotate(inHood(seePool), i);
    const lunch = rotate(inHood(foodPool), i);
    const experience = experiencePool.find((e) => !usedExperienceIds.has(e.id));
    const afternoon = experience ? undefined : rotate(inHood(seePool), i + 1);
    const dinner = rotate(inHoodFor(foodPool, lateHood), i + 2);
    const eveningPool = nightPool.length ? nightPool : venues;
    const evening = rotate(inHoodFor(eveningPool, lateHood), i);

    const stops: ItineraryStop[] = [];
    let prevHood: string | undefined;

    function push(
      slot: ItineraryStop['slot'],
      item: { slug: string; title: string; neighborhood: NeighborhoodSlug; summary: string; mapQuery: string } | undefined,
      hrefBase: string,
      note: string,
      reservationNote?: string,
      altPool: { slug: string; title: string; summary: string }[] = [],
      fallbackPool: { slug: string; title: string; summary: string }[] = [],
    ) {
      if (!item) return;

      const seen = new Set([item.slug]);
      const alternatives: ItineraryStop['alternatives'] = [];
      for (const candidate of [...altPool, ...fallbackPool]) {
        if (alternatives.length >= 2) break;
        if (seen.has(candidate.slug)) continue;
        seen.add(candidate.slug);
        alternatives.push({ title: candidate.title, href: `${hrefBase}${candidate.slug}/`, note: candidate.summary });
      }

      stops.push({
        slot,
        title: item.title,
        href: `${hrefBase}${item.slug}/`,
        neighborhood: neighborhoodName(item.neighborhood),
        note: note || item.summary,
        reservationNote,
        travelNote: travelNote(prevHood, item.neighborhood),
        mapQuery: item.mapQuery,
        alternatives,
      });
      prevHood = item.neighborhood;
    }

    push('Morning', morning, '/things-to-do/', morning?.summary ?? '', undefined, inHood(seePool), seePool);
    push('Lunch', lunch, '/restaurants/', lunch?.summary ?? '', 'Lunch rarely needs a booking. Arrive before noon or after 1.30pm to skip the rush.', inHood(foodPool), foodPool);

    if (stopsPerDay >= 4) {
      if (experience) {
        usedExperienceIds.add(experience.id);
        const priceBit = experience.fromPrice?.formatted ? ` From ${experience.fromPrice.formatted} on Viator.` : '';
        const durationBit = experience.durationLabel ? ` ${experience.durationLabel}.` : '';
        stops.push({
          slot: 'Afternoon',
          title: experience.title,
          href: `/tours/${encodeURIComponent(experience.productCode)}/`,
          neighborhood: neighborhoodName(hood),
          note: `Bookable Nashville experience.${durationBit}${priceBit}`,
          reservationNote: 'Book on Viator with the affiliate link on the experience page.',
          travelNote: travelNote(prevHood, hood),
          mapQuery: `${experience.title}, Nashville, TN`,
          alternatives: experiencePool
            .filter((e) => e.id !== experience.id)
            .slice(0, 2)
            .map((e) => ({ title: e.title, href: `/tours/${encodeURIComponent(e.productCode)}/`, note: e.durationLabel || 'Viator experience' })),
        });
        prevHood = hood;
      } else {
        push('Afternoon', afternoon, '/things-to-do/', afternoon?.summary ?? '', undefined, inHood(seePool), seePool);
      }
    }

    push(
      'Dinner',
      dinner,
      '/restaurants/',
      dinner?.summary ?? '',
      input.budget === 'premium' ? 'Book three to four weeks out for a weekend table.' : 'Book a week or two out for a weekend table.',
      inHoodFor(foodPool, lateHood),
      foodPool,
    );

    if ((stopsPerDay >= 5 || input.wantsNightlife) && !avoidLateNight) {
      push('Evening', evening, '/music/', evening?.summary ?? '', 'Check the venue calendar before you commit the night.', inHoodFor(venues, lateHood), venues);
    }

    const guidance: PlannerGuidance[] = [];
    if (primaryHoodContext) {
      guidance.push({ title: primaryHoodContext.title, note: primaryHoodContext.guidance });
    }
    if (i === 0 && globalAudienceContext[0]) {
      guidance.push({ title: globalAudienceContext[0].title, note: globalAudienceContext[0].guidance });
    }

    result.push({
      dayNumber: i + 1,
      date: input.startDate ? addDays(input.startDate, i) : '',
      theme: compactBlock ? `${neighborhoodName(hood)} + ${neighborhoodName(lateHood)}` : `${neighborhoodName(hood)} and around`,
      stops,
      guidance: guidance.slice(0, 2),
    });
  }

  return result;
}

function rankExperiencesForTrip(input: TripInput, candidates: ExperienceCandidate[]): ExperienceCandidate[] {
  if (!candidates.length) return [];
  const blob = `${input.tripType} ${input.interests.join(' ')}`.toLowerCase();
  return [...candidates]
    .map((e) => {
      let score = e.plannerPriority ?? 50;
      if (e.travelerTypes?.some((t) => blob.includes(t) || blob.includes(t.replace(/-/g, ' ')))) score += 15;
      if (blob.includes('music') && e.categories.includes('music')) score += 12;
      if (blob.includes('food') && e.categories.includes('food')) score += 12;
      if ((blob.includes('whiskey') || blob.includes('brew')) && e.categories.includes('brewery-distillery')) score += 12;
      if (input.hasChildren && e.categories.includes('family')) score += 10;
      if (e.rating != null) score += e.rating * 2;
      return { e, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.e);
}

export function suggestHotels(input: TripInput) {
  const hoods = pickHoods(input);
  const budgetRank = { value: ['$', '$$'], moderate: ['$$', '$$$'], premium: ['$$$', '$$$$'] }[input.budget];
  const matches = hotels.filter((h) => hoods.includes(h.neighborhood) && budgetRank.includes(h.priceCategory));
  const fallback = hotels.filter((h) => hoods.includes(h.neighborhood));
  return (matches.length > 0 ? matches : fallback.length > 0 ? fallback : hotels).slice(0, 3);
}
