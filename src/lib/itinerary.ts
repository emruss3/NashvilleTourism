import type {
  ItineraryDay,
  ItineraryStop,
  NeighborhoodSlug,
  TripInput,
  TripType,
} from './types';
import { hotels } from './content/hotels';
import { neighborhoods, neighborhoodName } from './content/neighborhoods';

/** Deterministic planner: external data retrieval is separate from composition. */
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

export interface PlannerPlaceCandidate {
  id: string;
  slug: string;
  title: string;
  category: string;
  neighborhood: NeighborhoodSlug;
  summary: string;
  localNote?: string;
  cuisine?: string[];
  priceLevel?: number;
  nashroamScore?: number;
  plannerPriority?: number;
  bestFor?: string[];
  travelerTypes?: string[];
  vibe?: string[];
  mealPeriods?: string[];
  typicalDurationMinutes?: number;
  familyFriendly?: boolean;
  groupFriendly?: boolean;
  reservationRecommended?: boolean;
  websiteUrl?: string;
  reservationUrl?: string;
  mapQuery: string;
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

export interface PlannerEventCandidate {
  id: string;
  name: string;
  startsAt: string;
  date: string;
  time?: string;
  venue?: string;
  category: string;
  impactLevel: number;
  plannerPriority: number;
  ticketUrl?: string;
  neighborhood?: string | null;
  guidance?: string;
}

export interface PlannerGuidance {
  title: string;
  note: string;
}

export type PlannedItineraryDay = ItineraryDay & { guidance: PlannerGuidance[] };

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  'first-visit': 'First visit', couples: 'Couples trip', friends: 'Friends weekend',
  bachelor: 'Bachelor party', bachelorette: 'Bachelorette party', family: 'Family trip',
  business: 'Business trip', music: 'Music-focused trip', food: 'Food-focused trip',
};

export const INTEREST_OPTIONS = [
  'Live music', 'Restaurants', 'Bars and nightlife', 'History and museums',
  'Shopping', 'Outdoors and parks', 'Whiskey and breweries', 'Sports',
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

const PACE_STOPS: Record<TripInput['pace'], number> = { relaxed: 3, balanced: 4, packed: 5 };

export function tripLength(start: string, end: string): number {
  if (!start || !end) return 2;
  const a = Date.parse(start);
  const b = Date.parse(end);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 2;
  return Math.min(Math.max(Math.round((b - a) / 86_400_000) + 1, 1), 7);
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

function numericRule(context: PlannerContextCandidate | undefined, key: string): number | undefined {
  const raw = context?.rules?.[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
}
function booleanRule(context: PlannerContextCandidate | undefined, key: string): boolean {
  return context?.rules?.[key] === true;
}

function rankExperiencesForTrip(input: TripInput, candidates: ExperienceCandidate[]) {
  const blob = `${input.tripType} ${input.interests.join(' ')}`.toLowerCase();
  return [...candidates].map((e) => {
    let score = e.plannerPriority ?? 50;
    const categories = new Set(e.categories);
    const travelers = new Set(e.travelerTypes ?? []);
    if ([...travelers].some((t) => blob.includes(t) || blob.includes(t.replace(/-/g, ' ')))) score += 15;
    if (blob.includes('music') && categories.has('music')) score += 12;
    if ((blob.includes('food') || blob.includes('restaurant')) && categories.has('food-drink')) score += 12;
    if ((blob.includes('whiskey') || blob.includes('brew') || blob.includes('wine')) && categories.has('food-drink')) score += 12;
    if ((blob.includes('history') || blob.includes('museum')) && (categories.has('history') || categories.has('attractions-museums'))) score += 10;
    if ((blob.includes('outdoor') || blob.includes('park')) && categories.has('water-outdoors')) score += 10;
    if ((input.tripType === 'friends' || input.tripType === 'bachelor' || input.tripType === 'bachelorette') && categories.has('nightlife-party')) score += 10;
    if (input.hasChildren && travelers.has('families')) score += 12;
    if (input.tripType === 'first-visit' && (categories.has('city-sightseeing') || categories.has('attractions-museums'))) score += 8;
    if (e.rating != null) score += e.rating * 2;
    return { e, score };
  }).sort((a, b) => b.score - a.score).map((x) => x.e);
}

function rankPlacesForTrip(input: TripInput, candidates: PlannerPlaceCandidate[]) {
  const interestBlob = `${input.tripType} ${input.interests.join(' ')}`.toLowerCase();
  return [...candidates]
    .filter((p) => !(input.hasChildren && p.familyFriendly === false))
    .filter((p) => !(input.travelers >= 6 && p.groupFriendly === false))
    .map((p) => {
      let score = p.plannerPriority ?? 50;
      score += (p.nashroamScore ?? 50) * 0.25;
      if ((p.travelerTypes ?? []).some((t) => interestBlob.includes(t) || interestBlob.includes(t.replace(/-/g, ' ')))) score += 15;
      if (input.tripType === 'food' && p.category === 'restaurant') score += 15;
      if (interestBlob.includes('restaurant') && p.category === 'restaurant') score += 10;
      if (interestBlob.includes('music') && ['venue', 'live-music'].includes(p.category)) score += 12;
      if (interestBlob.includes('history') && ['attraction', 'museum'].includes(p.category)) score += 10;
      if (interestBlob.includes('outdoor') && p.category === 'park') score += 10;
      if (input.budget === 'value' && p.priceLevel != null && p.priceLevel <= 2) score += 6;
      if (input.budget === 'premium' && p.priceLevel != null && p.priceLevel >= 3) score += 6;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}

export function buildItinerary(
  input: TripInput,
  experienceCandidates: ExperienceCandidate[] = [],
  plannerContexts: PlannerContextCandidate[] = [],
  placeCandidates: PlannerPlaceCandidate[] = [],
  eventCandidates: PlannerEventCandidate[] = [],
): PlannedItineraryDay[] {
  const days = tripLength(input.startDate, input.endDate);
  const hoods = pickHoods(input);
  const stopsPerDay = PACE_STOPS[input.pace];

  // Production rule: never invent/sample a business. Use approved Supabase
  // places only. When a category pool is empty, emit an honest planning note.
  const rankedPlaces = rankPlacesForTrip(input, placeCandidates);
  const realFoodPool = rankedPlaces.filter((p) => ['restaurant', 'coffee'].includes(p.category));
  const realSeePool = rankedPlaces.filter((p) => ['attraction', 'park', 'outdoor'].includes(p.category));
  const realNightPool = rankedPlaces.filter((p) => ['venue', 'live-music', 'bar-nightlife'].includes(p.category));
  const experiencePool = rankExperiencesForTrip(input, experienceCandidates);

  const globalAudienceContext = plannerContexts.filter((c) => !c.neighborhood && c.type === 'audience').sort((a, b) => b.priority - a.priority);
  const avoidLateNight = globalAudienceContext.some((c) => booleanRule(c, 'avoid_late_night'));
  const result: PlannedItineraryDay[] = [];
  const usedExperienceIds = new Set<string>();
  const usedPlaceIds = new Set<string>();
  const usedEventIds = new Set<string>();

  for (let i = 0; i < days; i += 1) {
    const hood = hoods[i % hoods.length];
    const hoodContexts = plannerContexts.filter((c) => c.neighborhood === hood).sort((a, b) => b.priority - a.priority);
    const primaryHoodContext = hoodContexts[0];
    const maxBlockHours = numericRule(primaryHoodContext, 'max_block_hours');
    const compactBlock = maxBlockHours != null && maxBlockHours <= 4 && hoods.length > 1;
    const lateHood = compactBlock ? hoods[(i + 1) % hoods.length] : hood;
    const dayDate = input.startDate ? addDays(input.startDate, i) : '';

    const inHoodFor = <T extends { neighborhood: NeighborhoodSlug }>(list: T[], target: NeighborhoodSlug) => {
      const local = list.filter((x) => x.neighborhood === target);
      return local.length > 0 ? local : list;
    };
    const firstUnused = (list: PlannerPlaceCandidate[]) => list.find((p) => !usedPlaceIds.has(p.id)) ?? list[0];

    const realMorning = firstUnused(inHoodFor(realSeePool, hood));
    const realLunchPool = inHoodFor(realFoodPool.filter((p) => !p.mealPeriods?.length || p.mealPeriods.some((m) => ['breakfast','brunch','lunch'].includes(m))), hood);
    const realDinnerPool = inHoodFor(realFoodPool.filter((p) => !p.mealPeriods?.length || p.mealPeriods.includes('dinner')), lateHood);
    const realLunch = firstUnused(realLunchPool);
    const realDinner = firstUnused(realDinnerPool);
    const experience = experiencePool.find((e) => !usedExperienceIds.has(e.id));
    const realEvening = firstUnused(inHoodFor(realNightPool, lateHood));
    const dayEvents = eventCandidates
      .filter((e) => !dayDate || e.date === dayDate)
      .filter((e) => !usedEventIds.has(e.id))
      .sort((a, b) => b.impactLevel - a.impactLevel || b.plannerPriority - a.plannerPriority);

    const stops: ItineraryStop[] = [];
    let prevHood: string | undefined;

    function pushPlanningNote(slot: ItineraryStop['slot'], title: string, note: string, mapArea: NeighborhoodSlug) {
      stops.push({
        slot,
        title,
        neighborhood: neighborhoodName(mapArea),
        note,
        travelNote: travelNote(prevHood, mapArea),
        mapQuery: `${neighborhoodName(mapArea)}, Nashville, TN`,
        alternatives: [],
      });
      prevHood = mapArea;
    }

    function pushReal(slot: ItineraryStop['slot'], item: PlannerPlaceCandidate | undefined, alternatives: PlannerPlaceCandidate[] = []) {
      if (!item) return;
      usedPlaceIds.add(item.id);
      const bookingNote = item.reservationRecommended ? 'Reservations are recommended; use the restaurant/venue’s current booking channel.' : undefined;
      stops.push({
        slot,
        title: item.title,
        href: item.websiteUrl,
        neighborhood: neighborhoodName(item.neighborhood),
        note: item.localNote || item.summary,
        reservationNote: bookingNote,
        travelNote: travelNote(prevHood, item.neighborhood),
        mapQuery: item.mapQuery,
        alternatives: alternatives.filter((x) => x.id !== item.id).slice(0, 2).map((x) => ({ title: x.title, href: x.websiteUrl, note: x.summary })),
      });
      prevHood = item.neighborhood;
    }

    if (realSeePool.length) pushReal('Morning', realMorning, inHoodFor(realSeePool, hood));
    else {
      pushPlanningNote(
        'Morning',
        `Explore ${neighborhoodName(hood)}`,
        `Attraction recommendations for ${neighborhoodName(hood)} are still being curated. Start with official museums, parks, and visitor centers nearby.`,
        hood,
      );
    }

    if (realFoodPool.length) pushReal('Lunch', realLunch, realLunchPool);
    else {
      pushPlanningNote(
        'Lunch',
        `Lunch in ${neighborhoodName(hood)}`,
        `Restaurant recommendations are still being curated. Use official neighborhood guides and check current hours before you go.`,
        hood,
      );
    }

    if (stopsPerDay >= 4) {
      if (experience) {
        usedExperienceIds.add(experience.id);
        const priceBit = experience.fromPrice?.formatted ? ` From ${experience.fromPrice.formatted} on Viator.` : '';
        const durationBit = experience.durationLabel ? ` ${experience.durationLabel}.` : '';
        stops.push({
          slot: 'Afternoon', title: experience.title, href: `/tours/${encodeURIComponent(experience.productCode)}/`,
          neighborhood: neighborhoodName(hood), note: `Bookable Nashville experience.${durationBit}${priceBit}`,
          reservationNote: 'Book on Viator with the affiliate link on the experience page.',
          travelNote: travelNote(prevHood, hood), mapQuery: `${experience.title}, Nashville, TN`,
          alternatives: experiencePool.filter((e) => e.id !== experience.id).slice(0, 2).map((e) => ({ title: e.title, href: `/tours/${encodeURIComponent(e.productCode)}/`, note: e.durationLabel || 'Viator experience' })),
        });
        prevHood = hood;
      } else if (dayEvents[0] && dayEvents[0].impactLevel >= 60) {
        const event = dayEvents[0];
        usedEventIds.add(event.id);
        stops.push({
          slot: 'Afternoon',
          title: event.name,
          href: event.ticketUrl,
          neighborhood: event.venue || neighborhoodName(hood),
          note: event.guidance || `Live event during your stay${event.time ? ` at ${event.time}` : ''}.`,
          reservationNote: event.ticketUrl ? 'Check tickets and start times on the official listing.' : undefined,
          travelNote: travelNote(prevHood, hood),
          mapQuery: `${event.venue || event.name}, Nashville, TN`,
          alternatives: [],
        });
        prevHood = hood;
      } else if (realSeePool.length) {
        pushReal('Afternoon', firstUnused(inHoodFor(realSeePool, hood)), inHoodFor(realSeePool, hood));
      } else {
        pushPlanningNote(
          'Afternoon',
          `Afternoon in ${neighborhoodName(hood)}`,
          'Bookable experiences and attraction picks for this slot are still being curated.',
          hood,
        );
      }
    }

    if (realFoodPool.length) pushReal('Dinner', realDinner, realDinnerPool);
    else {
      pushPlanningNote(
        'Dinner',
        `Dinner in ${neighborhoodName(lateHood)}`,
        `Dinner recommendations for ${neighborhoodName(lateHood)} are still being curated. Prefer restaurants with current official hours and reservation links.`,
        lateHood,
      );
    }

    if ((stopsPerDay >= 5 || input.wantsNightlife) && !avoidLateNight) {
      if (realNightPool.length) pushReal('Evening', realEvening, inHoodFor(realNightPool, lateHood));
      else {
        pushPlanningNote(
          'Evening',
          `Evening in ${neighborhoodName(lateHood)}`,
          'Music venue recommendations are still being curated. Check official venue calendars before you commit the night.',
          lateHood,
        );
      }
    }

    const guidance: PlannerGuidance[] = [];
    if (primaryHoodContext) guidance.push({ title: primaryHoodContext.title, note: primaryHoodContext.guidance });
    if (i === 0 && globalAudienceContext[0]) guidance.push({ title: globalAudienceContext[0].title, note: globalAudienceContext[0].guidance });
    const impact = dayEvents.find((e) => e.impactLevel >= 70);
    if (impact) {
      guidance.push({
        title: `High-impact event: ${impact.name}`,
        note: impact.guidance
          || `${impact.venue || 'A major venue'} has a high-impact event this day. Expect heavier traffic and book dinner earlier if you are nearby.`,
      });
    }

    result.push({
      dayNumber: i + 1,
      date: dayDate,
      theme: compactBlock ? `${neighborhoodName(hood)} + ${neighborhoodName(lateHood)}` : `${neighborhoodName(hood)} and around`,
      stops,
      guidance: guidance.slice(0, 3),
    });
  }

  return result;
}

export function suggestHotels(input: TripInput) {
  const hoods = pickHoods(input);
  const budgetRank = { value: ['$', '$$'], moderate: ['$$', '$$$'], premium: ['$$$', '$$$$'] }[input.budget];
  const matches = hotels.filter((h) => hoods.includes(h.neighborhood) && budgetRank.includes(h.priceCategory));
  const fallback = hotels.filter((h) => hoods.includes(h.neighborhood));
  return (matches.length > 0 ? matches : fallback.length > 0 ? fallback : hotels).slice(0, 3);
}
