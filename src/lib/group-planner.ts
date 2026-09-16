import type { AgeBand, Budget, GroupProfile, NeighborhoodSlug, Occasion, Pace, TripInput, TripType } from './types';
import { neighborhoods } from './content/neighborhoods';

/**
 * Group-first planner model (GROUP-TRIP-PLANNER.md).
 *
 * The profile is what the reader tells us. `profileToTripInput` maps it onto
 * the deterministic itinerary engine in itinerary.ts, which only assembles
 * approved records and never invents a business. Occasion changes the
 * follow-up questions and the ranking inputs; explicit answers always win
 * over occasion defaults.
 */

export const OCCASIONS: { value: Occasion; label: string; hint: string }[] = [
  { value: 'bachelorette', label: 'Bachelorette', hint: 'A weekend for the bride and the group.' },
  { value: 'bachelor', label: 'Bachelor', hint: 'One big night, one good day.' },
  { value: 'friends', label: 'Friends', hint: 'A crew that does not need to agree on everything.' },
  { value: 'family', label: 'Family', hint: 'Mixed ages, earlier evenings, easy logistics.' },
  { value: 'couples', label: 'Couples', hint: 'Dinner first, then the show.' },
  { value: 'corporate', label: 'Corporate retreat', hint: 'Meetings by day, the city by night.' },
  { value: 'other', label: 'Other', hint: 'Solo, a reunion, a milestone: tell us.' },
];

export const AGE_BANDS: { value: AgeBand; label: string; child?: boolean }[] = [
  { value: 'under-13', label: 'Under 13', child: true },
  { value: '13-17', label: '13–17', child: true },
  { value: '18-24', label: '18–24' },
  { value: '25-34', label: '25–34' },
  { value: '35-49', label: '35–49' },
  { value: '50-64', label: '50–64' },
  { value: '65-plus', label: '65+' },
];

export const TRANSPORT: { value: GroupProfile['transport']; label: string }[] = [
  { value: 'undecided', label: 'Not decided yet' },
  { value: 'walk-rideshare', label: 'Walking and rideshare' },
  { value: 'car', label: 'We have a car' },
  { value: 'mixed', label: 'A mix' },
];

export const PACES: { value: Pace; label: string }[] = [
  { value: 'relaxed', label: 'Relaxed, three stops a day' },
  { value: 'balanced', label: 'Balanced, four stops a day' },
  { value: 'packed', label: 'Packed, five stops a day' },
];

export const UNIVERSAL_INTERESTS = [
  'Live music',
  'Restaurants',
  'Bars and nightlife',
  'History and museums',
  'Shopping',
  'Outdoors and parks',
  'Whiskey and breweries',
  'Sports',
] as const;

export interface StyleQuestion {
  id: string;
  label: string;
  /** Multi-select chips or a single short text answer. */
  type: 'chips' | 'text';
  options?: string[];
  placeholder?: string;
  hint?: string;
}

/** Conditional follow-ups by occasion (GROUP-TRIP-PLANNER.md §2). */
export const STYLE_QUESTIONS: Record<Occasion, StyleQuestion[]> = {
  bachelorette: [
    { id: 'celebration', label: 'Celebration style', type: 'chips', options: ['Low-key', 'Big night out', 'A mix'] },
    { id: 'wants', label: 'What matters to the group?', type: 'chips', options: ['Nightlife', 'Private experiences', 'Brunch', 'Photo spots', 'Late nights', 'Alcohol-free options'] },
    { id: 'honoree', label: 'Anything the honoree must do?', type: 'text', placeholder: 'A rooftop, a specific bar, a show…' },
  ],
  bachelor: [
    { id: 'celebration', label: 'Celebration style', type: 'chips', options: ['Low-key', 'Big night out', 'A mix'] },
    { id: 'wants', label: 'What matters to the group?', type: 'chips', options: ['Nightlife', 'Private experiences', 'Brunch', 'A daytime activity', 'Late nights', 'Alcohol-free options'] },
    { id: 'honoree', label: 'Anything the honoree must do?', type: 'text', placeholder: 'A game, a distillery, a show…' },
  ],
  corporate: [
    { id: 'balance', label: 'Work and social balance', type: 'chips', options: ['Mostly work', 'Balanced', 'Mostly social'] },
    { id: 'meetings', label: 'Fixed meeting blocks', type: 'text', placeholder: 'e.g. Tuesday 9am–3pm, Wednesday morning', hint: 'These stay fixed; the plan works around them.' },
    { id: 'needs', label: 'What does the group need?', type: 'chips', options: ['Meeting space', 'Private dining room', 'Team activity', 'Expense-friendly', 'Walkable from the hotel'] },
  ],
  family: [
    { id: 'kids', label: 'With the children', type: 'chips', options: ['Stroller-friendly', 'A nap window', 'Earlier evenings', 'Kid-friendly menus', 'Outdoor time'] },
    { id: 'wants', label: 'What would make the trip?', type: 'chips', options: ['Music history', 'Parks', 'Museums', 'A show everyone can see', 'One special dinner'] },
  ],
  friends: [
    { id: 'energy', label: 'Energy', type: 'chips', options: ['Slow mornings', 'Full days', 'Late nights'] },
    { id: 'wants', label: 'What matters most?', type: 'chips', options: ['One big night out', 'Great dinners', 'Live music', 'A daytime activity', 'Rooftops'] },
  ],
  couples: [
    { id: 'energy', label: 'Energy', type: 'chips', options: ['Slow mornings', 'Full days', 'Late nights'] },
    { id: 'wants', label: 'What matters most?', type: 'chips', options: ['A reservation-worthy dinner', 'A listening room show', 'Quiet neighborhoods', 'Cocktails', 'Museums'] },
  ],
  other: [
    { id: 'about', label: 'Tell us about the trip', type: 'text', placeholder: 'A reunion, a solo weekend, a birthday…' },
    { id: 'wants', label: 'What matters most?', type: 'chips', options: ['Live music', 'Great dinners', 'History', 'Outdoors', 'Nightlife', 'Shopping'] },
  ],
};

export const BUDGET_PRESETS = [
  { value: 75, label: 'Under $100' },
  { value: 175, label: '$100–$250' },
  { value: 375, label: '$250–$500' },
  { value: 600, label: '$500+' },
] as const;

export const DEFAULT_PROFILE: GroupProfile = {
  occasion: 'friends',
  headcount: 4,
  ageBands: [],
  startDate: '',
  endDate: '',
  datesUndecided: false,
  stayNeighborhood: '',
  transport: 'undecided',
  budgetMode: 'per-person',
  budgetValue: null,
  budgetScope: 'activities-dining',
  interests: [],
  pace: 'balanced',
  dietary: '',
  accessibility: '',
  mustDos: '',
  avoid: '',
  answers: {},
};

const OCCASION_TO_TYPE: Record<Occasion, TripType> = {
  bachelorette: 'bachelorette',
  bachelor: 'bachelor',
  friends: 'friends',
  family: 'family',
  couples: 'couples',
  corporate: 'business',
  other: 'first-visit',
};

const TYPE_TO_OCCASION: Partial<Record<TripType, Occasion>> = {
  bachelorette: 'bachelorette',
  bachelor: 'bachelor',
  friends: 'friends',
  family: 'family',
  couples: 'couples',
  business: 'corporate',
};

export function occasionFromType(type: string | undefined): Occasion | undefined {
  if (!type) return undefined;
  if (OCCASIONS.some((o) => o.value === type)) return type as Occasion;
  return TYPE_TO_OCCASION[type as TripType];
}

export function hasChildren(profile: GroupProfile): boolean {
  return profile.ageBands.some((b) => AGE_BANDS.find((x) => x.value === b)?.child);
}

/** Per-person budget in USD for the chosen scope, derived from either entry mode. */
export function perPersonBudget(profile: GroupProfile): number | null {
  if (profile.budgetValue == null || !Number.isFinite(profile.budgetValue)) return null;
  if (profile.budgetMode === 'group') return Math.round(profile.budgetValue / Math.max(profile.headcount, 1));
  return profile.budgetValue;
}

export function groupBudget(profile: GroupProfile): number | null {
  const pp = perPersonBudget(profile);
  return pp == null ? null : pp * Math.max(profile.headcount, 1);
}

function budgetTier(profile: GroupProfile): Budget {
  const pp = perPersonBudget(profile);
  if (pp == null) return 'moderate';
  // All-in budgets carry lodging, so the same tier sits higher.
  const [low, high] = profile.budgetScope === 'all-in' ? [200, 450] : [100, 250];
  if (pp < low) return 'value';
  if (pp > high) return 'premium';
  return 'moderate';
}

function chips(profile: GroupProfile, id: string): string[] {
  const value = profile.answers[id];
  return Array.isArray(value) ? value : [];
}

function text(profile: GroupProfile, id: string): string {
  const value = profile.answers[id];
  return typeof value === 'string' ? value : '';
}

/** Occasion defaults, overridden by explicit answers. */
function wantsNightlife(profile: GroupProfile): boolean {
  const wants = chips(profile, 'wants');
  const energy = [...chips(profile, 'energy'), ...chips(profile, 'celebration'), ...chips(profile, 'balance')];
  if (wants.some((w) => /nightlife|big night|late night|rooftop/i.test(w))) return true;
  if (energy.some((e) => /late nights|big night|mostly social/i.test(e))) return true;
  if (energy.some((e) => /low-key|mostly work|slow mornings/i.test(e))) return false;
  if (wants.some((w) => /alcohol-free/i.test(w))) return false;
  if (hasChildren(profile)) return false;
  if (profile.interests.includes('Bars and nightlife')) return true;
  return ['bachelorette', 'bachelor', 'friends'].includes(profile.occasion);
}

function derivedInterests(profile: GroupProfile): string[] {
  const set = new Set(profile.interests);
  for (const w of chips(profile, 'wants')) {
    if (/music|show|listening/i.test(w)) set.add('Live music');
    if (/dinner|brunch|menu/i.test(w)) set.add('Restaurants');
    if (/nightlife|night|cocktail|rooftop/i.test(w)) set.add('Bars and nightlife');
    if (/history|museum/i.test(w)) set.add('History and museums');
    if (/park|outdoor/i.test(w)) set.add('Outdoors and parks');
    if (/shopping/i.test(w)) set.add('Shopping');
  }
  return [...set];
}

export function profileToTripInput(profile: GroupProfile): TripInput {
  const interests = derivedInterests(profile);
  let tripType = OCCASION_TO_TYPE[profile.occasion];
  if (profile.occasion === 'other') {
    if (interests.includes('Live music') && !interests.includes('Restaurants')) tripType = 'music';
    else if (interests.includes('Restaurants') && !interests.includes('Live music')) tripType = 'food';
  }
  const stay = profile.stayNeighborhood && neighborhoods.some((n) => n.slug === profile.stayNeighborhood) ? [profile.stayNeighborhood as NeighborhoodSlug] : [];
  return {
    startDate: profile.datesUndecided ? '' : profile.startDate,
    endDate: profile.datesUndecided ? '' : profile.endDate,
    travelers: Math.max(1, profile.headcount),
    tripType,
    interests,
    neighborhoods: stay,
    budget: budgetTier(profile),
    pace: profile.pace,
    needsHotel: !profile.stayNeighborhood,
    wantsNightlife: wantsNightlife(profile),
    hasChildren: hasChildren(profile),
  };
}

/** Human recap, e.g. "Bachelorette · 12 people · Ages 25–34 · Balanced pace". */
export function profileRecap(profile: GroupProfile): string {
  const occasion = OCCASIONS.find((o) => o.value === profile.occasion)?.label ?? 'Trip';
  const ages = profile.ageBands.length ? `Ages ${profile.ageBands.map((b) => AGE_BANDS.find((x) => x.value === b)?.label ?? b).join(', ')}` : null;
  const pace = `${profile.pace.charAt(0).toUpperCase()}${profile.pace.slice(1)} pace`;
  return [occasion, `${profile.headcount} ${profile.headcount === 1 ? 'person' : 'people'}`, ages, pace].filter(Boolean).join(' · ');
}

/** Constraints and open checks the draft could not verify from data. */
export function outstandingChecks(profile: GroupProfile): string[] {
  const checks: string[] = [];
  if (profile.headcount >= 8) checks.push(`Group capacity for ${profile.headcount} at every restaurant and venue. Large parties may need a request rather than instant booking.`);
  if (hasChildren(profile)) checks.push('Age policies at evening venues; many Broadway rooms are 21+ after 6–8 PM.');
  if (profile.dietary.trim()) checks.push(`Dietary needs (${profile.dietary.trim()}) against each menu.`);
  if (profile.accessibility.trim()) checks.push(`Accessibility (${profile.accessibility.trim()}) at each stop; do not rely on category alone.`);
  if (text(profile, 'meetings').trim()) checks.push(`Fixed meeting blocks: ${text(profile, 'meetings').trim()}. Keep these clear when you move stops.`);
  if (profile.datesUndecided || !profile.startDate) checks.push('Dates are not set, so opening hours and event dates are unverified.');
  checks.push('Live availability is not checked here. Reservations and tickets are confirmed with each provider.');
  return checks;
}

/** Must-dos typed by the reader, one per line or comma. */
export function mustDoList(profile: GroupProfile): string[] {
  return [profile.mustDos, text(profile, 'honoree')]
    .flatMap((v) => v.split(/[\n,;]+/))
    .map((v) => v.trim())
    .filter(Boolean);
}
