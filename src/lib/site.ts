/**
 * Single source of truth for brand-level strings.
 *
 * Brand: NSVL (main visual identity), with NASHVILLE as the supporting logo
 * descriptor and Nashville.com as the destination and attribution name.
 * NSVL and Nashville.com are one identity. See design/nsvl-brand-handoff.
 *
 * The site is still served from nashroam.com until the domain migration is
 * authorised separately; canonical URLs follow the live host, not the brand.
 */

/**
 * The canonical origin. Must be a parseable URL because Next builds
 * `metadataBase` and every canonical tag, OG tag, sitemap entry, and llms.txt
 * link from it.
 *
 * Resolution order, most specific first:
 *   1. NEXT_PUBLIC_SITE_URL          the real domain, once one is chosen
 *   2. Vercel's production domain    stable across deploys
 *   3. Vercel's per-deployment URL   preview builds
 *   4. The live host                  local work with no environment set
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  // Vercel supplies these as bare hostnames, without a scheme.
  const vercelProd =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return `https://${vercelProd.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;

  const vercelDeploy = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  if (vercelDeploy) return `https://${vercelDeploy.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;

  return 'https://nashroam.com';
}

const SITE_URL = resolveSiteUrl();

export const site = {
  /** Main visual identity. */
  name: 'NSVL',
  /** Supporting logo descriptor. */
  descriptor: 'NASHVILLE',
  /** Destination and attribution name; used in titles and the footer. */
  destination: 'Nashville.com',
  shortName: 'NSVL',
  /** Live host. The Nashville.com move is a separate, explicitly authorised migration. */
  domain: 'nashroam.com',
  url: SITE_URL,
  /** Descriptive topic followed by Nashville.com (brand guide §2). */
  titleSuffix: 'Nashville.com',
  tagline: 'Get into Nashville.',
  description:
    'A guide to Nashville and the things that make it worth coming back: music, neighborhoods, places to eat, and plans worth keeping.',
  positioning: 'NSVL is Nashville.com: a guide to the city and the things that make it worth coming back.',
  headline: 'Get into Nashville.',
  headlineSupport: 'Great music. Good food. Better company.',
  heroEyebrow: 'Music. People. Places.',
  brandIdea: 'One good plan changes everything.',
  trustLine: 'Regularly checked. Clearly labeled. Locally informed.',
  newsletter: {
    name: 'The weekly edit',
    heading: 'Your next good plan.',
    promise: 'A weekly edit of Nashville shows, places and new releases.',
    cta: 'Send me the edit',
  },
  locale: 'en_US',
  org: {
    /** Publisher name as it appears in legal and provenance contexts. */
    legalName: 'NSVL',
    /** Based in Nashville; correspondence goes by email. */
    address: {
      city: 'Nashville',
      region: 'TN',
      country: 'US',
    },
    email: 'hello@nashroam.com',
    editorialEmail: 'editorial@nashroam.com',
    correctionsEmail: 'corrections@nashroam.com',
    advertisingEmail: 'advertise@nashroam.com',
    eventsEmail: 'hello@nashroam.com',
  },
  /** Public profiles. Only real accounts are listed; add handles here when they exist. */
  social: {
    newsletter: '/newsletter/',
    profiles: [] as { label: string; href: string }[],
  },
  affiliation:
    'NSVL is an independent city guide based in Nashville. It is not affiliated with the Metropolitan Government of Nashville and Davidson County or the Nashville Convention & Visitors Corp.',
} as const;

/**
 * Top-level navigation (HOMEPAGE.md §1): Explore, Events, Shop, Plan your
 * trip. Explore opens the five discovery families so every category page is
 * one click from the header on desktop and in the phone menu.
 */
export const exploreNav = [
  { label: 'Restaurants', href: '/restaurants/' },
  { label: 'Tours', href: '/tours/' },
  { label: 'Neighborhoods', href: '/neighborhoods/' },
  { label: 'Things to do', href: '/things-to-do/' },
  { label: 'Hotels', href: '/hotels/' },
] as const;

/** Header row, left to right; Shop stays at the far right. */
/**
 * One flat row under the masthead, evenly spread across the shell. Ordered by
 * the reader's intent: broad exploration first, the Music City hook, the daily
 * need, experiences, orientation, then the booking and retail commitments.
 */
export const primaryNav = [
  { label: 'Things to do', href: '/things-to-do/' },
  { label: 'Music', href: '/music/' },
  { label: 'Restaurants', href: '/restaurants/' },
  { label: 'Tours', href: '/tours/' },
  { label: 'Neighborhoods', href: '/neighborhoods/' },
  { label: 'Hotels', href: '/hotels/' },
  { label: 'Private Events', href: '/private-events/' },
  { label: 'Shop', href: '/shop/' },
] as const;

/** Boxed call to action in the header's top-right utilities. */
export const planNav = { label: 'Plan your trip', href: '/plan/' } as const;

/** Text link beside it: the reader's saved places (localStorage `nsvl:trip`), listed on the bag page. */
export const tripNav = { label: 'My trip', href: '/bag/#saved-title' } as const;

export const secondaryNav = [
  { label: 'Live music tonight', href: '/live-music-tonight/' },
  { label: 'Journal', href: '/guides/' },
  { label: 'Where to stay', href: '/where-to-stay/' },
  { label: 'The weekend', href: '/weekend/' },
  { label: 'Honky Tonk Highway', href: '/honky-tonk-highway/' },
] as const;

export const footerNav = {
  NSVL: [
    { label: 'About', href: '/about/' },
    { label: 'Contact', href: '/contact/' },
    { label: 'Accessibility', href: '/contact/#accessibility' },
    { label: 'Editorial standards', href: '/editorial-standards/' },
    { label: 'How we choose', href: '/how-we-choose/' },
    { label: 'Corrections', href: '/corrections/' },
  ],
  Explore: [
    { label: 'Neighborhoods', href: '/neighborhoods/' },
    { label: 'Events', href: '/events/' },
    { label: 'Music', href: '/music/' },
    { label: 'Eat & Drink', href: '/restaurants/' },
    { label: 'Things to do', href: '/things-to-do/' },
    { label: 'Where to stay', href: '/where-to-stay/' },
    { label: 'Tours', href: '/tours/' },
    { label: 'Journal', href: '/guides/' },
  ],
  Plan: [
    { label: 'Build a trip', href: '/plan/' },
    { label: 'Private events', href: '/private-events/' },
    { label: 'The weekend', href: '/weekend/' },
    { label: 'Live music tonight', href: '/live-music-tonight/' },
    { label: 'Shop NSVL', href: '/shop/' },
    { label: 'The weekly edit', href: '/newsletter/' },
  ],
  Legal: [
    { label: 'Privacy', href: '/privacy/' },
    { label: 'Terms', href: '/terms/' },
    { label: 'Advertising', href: '/advertising/' },
    { label: 'Photo credits', href: '/photo-credits/' },
  ],
} as const;
