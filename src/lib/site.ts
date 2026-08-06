/**
 * Single source of truth for brand-level strings.
 * Consumer brand is NASHVILLE. Domain and legal entity remain placeholders
 * until launch; change them here and they propagate through metadata, schema, and UI.
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
 *   4. A clearly fake placeholder    local work before a domain exists
 *
 * Steps 2 and 3 matter: without them a Vercel deployment ships canonical tags
 * pointing at a domain that does not exist, which tells crawlers the live page
 * is not the authoritative copy and keeps it out of the index.
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

  return 'https://brand-placeholder.example.com';
}

const SITE_URL = resolveSiteUrl();

export const site = {
  name: 'NASHVILLE',
  shortName: 'NSH',
  domain: '[DOMAIN.COM]',
  url: SITE_URL,
  /** Public descriptor — contextual, not a permanent under-logo tagline. */
  tagline: 'Trusted recommendations for Nashville.',
  description:
    'Trusted recommendations for where to stay, eat, drink, listen, shop, and spend your time.',
  positioning:
    'The most useful way to plan, book, and experience Nashville.',
  headline: 'Make the most of Nashville.',
  trustLine: 'Regularly checked. Clearly labeled. Locally informed.',
  /** Campaign copy only — not part of the core logo lockup until counsel clears. */
  campaignLine: 'Your Guide. Your Nashville.',
  newsletter: {
    name: 'NASHVILLE Weekender',
    promise: 'Nashville plans, once a week.',
  },
  locale: 'en_US',
  org: {
    legalName: '[LEGAL ENTITY]',
    address: {
      street: '[Street Address]',
      city: 'Nashville',
      region: 'TN',
      postalCode: '[ZIP]',
      country: 'US',
    },
    email: 'hello@[DOMAIN.COM]',
    editorialEmail: 'editorial@[DOMAIN.COM]',
    correctionsEmail: 'corrections@[DOMAIN.COM]',
    advertisingEmail: 'advertise@[DOMAIN.COM]',
    phone: '[Phone]',
  },
  social: {
    instagram: 'https://instagram.com/[handle]',
    x: 'https://x.com/[handle]',
    facebook: 'https://facebook.com/[handle]',
    newsletter: '/newsletter/',
  },
  affiliation:
    'NASHVILLE is an independent city guide operated by [LEGAL ENTITY]. It is not affiliated with the Metropolitan Government of Nashville and Davidson County or the Nashville Convention & Visitors Corp.',
} as const;

/** True only after the public business identity has replaced launch placeholders. */
export const hasLaunchIdentity =
  !site.domain.includes('[') &&
  !site.org.legalName.includes('[') &&
  !site.org.email.includes('[') &&
  !site.org.address.street.includes('[');

/** Primary header navigation — brand guide §10. */
export const primaryNav = [
  { label: 'Restaurants', href: '/restaurants/' },
  { label: 'Hotels', href: '/where-to-stay/' },
  { label: 'Things to Do', href: '/things-to-do/' },
  { label: 'Events', href: '/events/' },
  { label: 'Music', href: '/music/' },
  { label: 'Neighborhoods', href: '/neighborhoods/' },
  { label: 'Guides', href: '/guides/' },
] as const;

export const secondaryNav = [
  { label: 'Live Music Tonight', href: '/live-music-tonight/' },
  { label: 'Tours', href: '/tours/' },
  { label: 'Honky Tonk Highway', href: '/honky-tonk-highway/' },
  { label: 'NASHVILLE Weekender', href: '/weekend/' },
  { label: 'Hotels A–Z', href: '/hotels/' },
  { label: 'Trip Planner', href: '/plan/' },
  { label: 'Shop', href: '/shop/' },
] as const;

export const footerNav = {
  About: [
    { label: 'About us', href: '/about/' },
    { label: 'Contact', href: '/contact/' },
    { label: 'Our editorial standards', href: '/editorial-standards/' },
    { label: 'How we choose', href: '/how-we-choose/' },
    { label: 'Corrections', href: '/corrections/' },
  ],
  Explore: [
    { label: 'Restaurants', href: '/restaurants/' },
    { label: 'Hotels', href: '/where-to-stay/' },
    { label: 'Things to do', href: '/things-to-do/' },
    { label: 'Events', href: '/events/' },
    { label: 'Live Music Tonight', href: '/live-music-tonight/' },
    { label: 'Music Venues', href: '/music/' },
    { label: 'Tours', href: '/tours/' },
    { label: 'Weekend Guide', href: '/weekend/' },
    { label: 'Neighborhoods', href: '/neighborhoods/' },
    { label: 'Shop', href: '/shop/' },
    { label: 'Guides', href: '/guides/' },
  ],
  Business: [
    { label: 'Advertise with us', href: '/advertising/' },
    { label: 'Partner with us', href: '/advertising/#partner' },
    { label: 'Sponsorship disclosure', href: '/advertising/#disclosure' },
    { label: 'Style guide', href: '/style-guide/' },
  ],
  Legal: [
    { label: 'Privacy policy', href: '/privacy/' },
    { label: 'Terms of use', href: '/terms/' },
    { label: 'Photo credits', href: '/photo-credits/' },
  ],
} as const;
