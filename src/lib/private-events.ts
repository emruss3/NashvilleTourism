/**
 * Private events (/private-events/): the option lists the quick brief, the
 * full inquiry form and the API route share, plus the editorial copy for the
 * page's fixed sections. Values are the ones the `event_inquiries` table
 * accepts (supabase/migrations/…_add_event_inquiries_v1.sql).
 */
export const EVENT_TYPES = [
  { value: 'corporate', label: 'Corporate event' },
  { value: 'holiday', label: 'Holiday party' },
  { value: 'convention', label: 'Convention reception' },
  { value: 'celebration', label: 'Private celebration' },
  { value: 'other', label: 'Something else' },
] as const;
export type EventType = (typeof EVENT_TYPES)[number]['value'];

export const BUDGET_RANGES = [
  { value: 'under-5k', label: 'Under $5,000' },
  { value: '5k-15k', label: '$5,000 to $15,000' },
  { value: '15k-50k', label: '$15,000 to $50,000' },
  { value: 'over-50k', label: 'Over $50,000' },
  { value: 'undecided', label: 'Not sure yet' },
] as const;
export type BudgetRange = (typeof BUDGET_RANGES)[number]['value'];

export function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && EVENT_TYPES.some((t) => t.value === value);
}
export function isBudgetRange(value: unknown): value is BudgetRange {
  return typeof value === 'string' && BUDGET_RANGES.some((b) => b.value === value);
}

/** Values the quick brief hands to the full form through the URL. */
export interface BriefPrefill {
  type?: EventType;
  guests?: number;
  date?: string;
  flexible?: boolean;
}

export const OCCASIONS = [
  { type: 'corporate' as const, title: 'Corporate events', body: 'Meetings, team gatherings, client entertaining, and corporate milestones.' },
  { type: 'holiday' as const, title: 'Holiday parties', body: 'End-of-year celebrations that bring your team together.' },
  { type: 'convention' as const, title: 'Convention receptions', body: 'Welcome receptions, networking events, and off-site gatherings.' },
  { type: 'celebration' as const, title: 'Private celebrations', body: 'Birthdays, anniversaries, reunions, and other special occasions.' },
];

export const SERVICES = [
  { key: 'food', title: 'Food & beverage' },
  { key: 'music', title: 'Live entertainment' },
  { key: 'transport', title: 'Transportation' },
  { key: 'rooms', title: 'Hotel rooms' },
] as const;

export const STEPS = [
  { title: 'Share your brief', body: 'Tell us about your event and what you’re looking for.' },
  { title: 'Review suitable options', body: 'We’ll connect you with spaces that fit your needs.' },
  { title: 'Confirm with the venue', body: 'Work directly with the venue to finalize the details.' },
];

/** Space families the inquiry can point at, each backed by a real section of the site. */
export const SPACE_TILES = [
  { title: 'Rooftops', line: 'Hotel terraces and pools', href: '/hotels/', image: 'concept/hotel-rooftop-terrace' as const },
  { title: 'Private dining', line: 'Rooms and full buyouts', href: '/restaurants/', image: 'concept/dining-room-evening' as const },
  { title: 'Live music venues', line: 'Stages with a house sound', href: '/music/', image: 'concept/live-music-night' as const },
];
