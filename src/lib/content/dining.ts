import { hasMedia, type ImageKey } from '@/lib/media';
import type { NeighborhoodSlug } from '@/lib/types';
import { neighborhoodGuides } from './neighborhood-guides';
import { neighborhoodName } from './neighborhoods';

/**
 * Dining directory for /restaurants/.
 *
 * Built from the dining picks inside the published neighborhood guides, which
 * are real, editor-written recommendations with verified websites. The
 * `[Sample]` restaurant fixtures in listings.ts are demonstration records and
 * never appear here. Photography renders only when the media registry has the
 * cleared file; otherwise the row is text-only rather than a placeholder.
 */
export interface DiningPlace {
  id: string;
  title: string;
  neighborhood: NeighborhoodSlug;
  /** Short editorial reason to go. */
  bestFor: string;
  body: string;
  note?: string;
  /** Verified restaurant website. */
  externalHref?: string;
  /** Internal guide anchor with more context. */
  guideHref: string;
  imageKey?: ImageKey;
  category?: string;
  occasions: Occasion[];
}

export const OCCASIONS = [
  { value: 'brunch', label: 'Brunch' },
  { value: 'date-night', label: 'Date night' },
  { value: 'with-a-group', label: 'With a group' },
  { value: 'before-the-show', label: 'Before the show' },
  { value: 'long-lunch', label: 'Long lunch' },
  { value: 'late-night', label: 'Late night' },
] as const;

export type Occasion = (typeof OCCASIONS)[number]['value'];

export function isOccasion(value: unknown): value is Occasion {
  return typeof value === 'string' && OCCASIONS.some((o) => o.value === value);
}

/**
 * Occasion tags are derived from the editors' own words (bestFor, category and
 * body) with these keyword rules, so a filter never claims something the
 * guide did not say.
 */
function deriveOccasions(text: string): Occasion[] {
  const t = text.toLowerCase();
  const tags: Occasion[] = [];
  if (/brunch|breakfast/.test(t)) tags.push('brunch');
  if (/date|couple|intimate|refined|chef-driven|destination|special/.test(t)) tags.push('date-night');
  if (/group|large|split up|everyone|table for/.test(t)) tags.push('with-a-group');
  if (/broadway|ryman|show|pre-show|before the/.test(t)) tags.push('before-the-show');
  if (/lunch|patio|daytime/.test(t)) tags.push('long-lunch');
  if (/late|nightlife|upstairs|drinks|bar\b/.test(t)) tags.push('late-night');
  return tags;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Guide order is the editorial rotation for the featured slot: the first
 * pick with cleared photography in this order is featured.
 */
const GUIDE_ORDER: NeighborhoodSlug[] = ['germantown', 'downtown-broadway', 'wedgewood-houston', 'the-gulch', '12-south'];

export const diningPlaces: DiningPlace[] = GUIDE_ORDER.flatMap((slug) => {
  const guide = neighborhoodGuides.find((g) => g.slug === slug);
  if (!guide) return [];
  return guide.diningPicks.map<DiningPlace>((pick) => {
    const imageKey = pick.photoPolicy !== 'text-only' && pick.imageKey && hasMedia(pick.imageKey) ? pick.imageKey : undefined;
    return {
      id: `restaurant:${slugify(pick.title)}`,
      title: pick.title,
      neighborhood: guide.slug,
      bestFor: pick.bestFor,
      body: pick.body,
      note: pick.note,
      externalHref: pick.externalHref,
      guideHref: `/neighborhoods/${guide.slug}/#eat`,
      imageKey,
      category: pick.category,
      occasions: deriveOccasions([pick.bestFor, pick.category ?? '', pick.body].join(' ')),
    };
  });
});

export const featuredDining: DiningPlace | undefined = diningPlaces.find((p) => p.imageKey);

export function diningNeighborhoods(): { value: NeighborhoodSlug; label: string; count: number }[] {
  const counts = new Map<NeighborhoodSlug, number>();
  for (const p of diningPlaces) counts.set(p.neighborhood, (counts.get(p.neighborhood) ?? 0) + 1);
  return [...counts.entries()].map(([value, count]) => ({ value, label: neighborhoodName(value), count }));
}

export function filterDining(query: { neighborhood?: string; occasion?: string; q?: string }): DiningPlace[] {
  const q = query.q?.trim().toLowerCase();
  return diningPlaces.filter((p) => {
    if (query.neighborhood && p.neighborhood !== query.neighborhood) return false;
    if (isOccasion(query.occasion) && !p.occasions.includes(query.occasion)) return false;
    if (q) {
      const blob = [p.title, p.bestFor, p.category ?? '', p.body, neighborhoodName(p.neighborhood)].join(' ').toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}
