import type { Author } from '../types';

/**
 * DEMO CONTENT NOTICE
 * These author profiles are placeholders for the template. Replace with real
 * staff before launch. Author bylines are a trust signal and must never
 * describe a person who does not exist on a live site.
 */
export const authors: Author[] = [
  {
    slug: 'editorial-desk',
    name: '[Staff Writer]',
    role: 'Staff writer',
    bio: 'Placeholder profile. Replace with a real writer, including how long they have lived in Nashville, what they cover, and how readers can reach them.',
    basedIn: 'Nashville',
    email: 'editorial@[DOMAIN.COM]',
    covers: ['Restaurants', 'Bars', 'Neighborhoods'],
  },
  {
    slug: 'music-desk',
    name: '[Music Editor]',
    role: 'Music editor',
    bio: 'Placeholder profile. Replace with a real editor covering venues, touring schedules, and the songwriter scene.',
    basedIn: 'Nashville',
    email: 'music@[DOMAIN.COM]',
    covers: ['Music', 'Venues', 'Events'],
  },
  {
    slug: 'managing-editor',
    name: '[Managing Editor]',
    role: 'Managing editor',
    bio: 'Placeholder profile. Replace with the person accountable for fact-checking, corrections, and the separation of editorial and paid placements.',
    basedIn: 'Nashville',
    email: 'editor@[DOMAIN.COM]',
    covers: ['Standards', 'Fact-checking'],
  },
];

export function getAuthor(slug: string): Author | undefined {
  return authors.find((a) => a.slug === slug);
}
