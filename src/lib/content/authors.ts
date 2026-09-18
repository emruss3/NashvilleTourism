import type { Author } from '../types';

/**
 * Bylines are desks, not pen names. Each desk is a real working group with
 * a monitored address; a piece credits the desk that produced and checked
 * it. When an individual writer is credited, that is a real person.
 */
export const authors: Author[] = [
  {
    slug: 'editorial-desk',
    name: 'NSVL Editorial Desk',
    role: 'Restaurants, bars and neighborhoods',
    bio: 'The desk that walks the neighborhoods, eats at the places we list and keeps the guides current. Every listing is checked against the business itself and re-checked on the date shown on its page.',
    basedIn: 'Nashville, Tennessee',
    email: 'editorial@nashroam.com',
    covers: ['Restaurants', 'Bars', 'Neighborhoods'],
  },
  {
    slug: 'music-desk',
    name: 'NSVL Music Desk',
    role: 'Venues, shows and the songwriter scene',
    bio: 'Covers the rooms on and off Broadway, from the Ryman and the Opry to the listening rooms and neighborhood stages, plus what is on the calendar and what it costs to get in.',
    basedIn: 'Nashville, Tennessee',
    email: 'editorial@nashroam.com',
    covers: ['Music', 'Venues', 'Events'],
  },
  {
    slug: 'managing-editor',
    name: 'NSVL Standards Desk',
    role: 'Fact-checking and corrections',
    bio: 'Responsible for the verification dates on every listing, the corrections log and the separation between editorial recommendations and paid placements. Corrections are acknowledged within two business days.',
    basedIn: 'Nashville, Tennessee',
    email: 'corrections@nashroam.com',
    covers: ['Standards', 'Fact-checking', 'Corrections'],
  },
];

export function getAuthor(slug: string): Author | undefined {
  return authors.find((a) => a.slug === slug);
}
