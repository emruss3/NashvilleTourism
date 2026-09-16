/**
 * Single source of truth for brand-level strings.
 *
 * Brand: NSVL (main visual identity), with NASHVILLE as the supporting logo
 * descriptor and Nashville.com as the destination and attribution name.
 * NSVL and Nashville.com are one identity. See design/nsvl-brand-handoff.
 *
 * The site is still served from nashroam.com until the domain migration is
 * authorised separately; canonical URLs follow the live host, not the brand.
 * The legal entity and business address remain placeholders until launch.
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
    legalName: '[LEGAL ENTITY]',
    address: {
      street: '[Street Address]',
      city: 'Nashville',
      region: 'TN',
      postalCode: '[ZIP]',
      country: 'US',
    },
    email: 'hello@nashroam.com',
    editorialEmail: 'editorial@nashroam.com',
    correctionsEmail: 'corrections@nashroam.com',
    advertisingEmail: 'advertise@nashroam.com',
    phone: '[Phone]',
  },
  /** Only verified accounts are rendered; placeholders stay hidden (no dead icons). */
  social: {
    instagram: 'https://instagram.com/[handle]',
    x: 'https://x.com/[handle]',
    facebook: 'https://facebook.com/[handle]',
    newsletter: '/newsletter/',
  },
  affiliation:
    'NSVL is an independent city guide operated by [LEGAL ENTITY]. It is not affiliated with the Metropolitan Government of Nashville and Davidson County or the Nashville Convention & Visitors Corp.',
} as const;

/** True only after the public business identity has replaced launch placeholders. */
export const hasLaunchIdentity =
  !site.domain.includes('[') &&
  !site.org.legalName.includes('[') &&
  !site.org.email.includes('[') &&
  !site.org.address.street.includes('[');

/** True for a social URL that is a real account rather than a placeholder. */
export function isVerifiedSocial(url: string): boolean {
  return !url.includes('[');
}

/** Top-level navigation (SITE-LAYOUT.md §Header). */
export const primaryNav = [
  { label: 'Explore', href: '/explore/' },
  { label: 'Music', href: '/music/' },
  { label: 'Neighborhoods', href: '/neighborhoods/' },
  { label: 'Eat & Drink', href: '/restaurants/' },
  { label: 'Shop', href: '/shop/' },
  { label: 'Plan', href: '/plan/' },
  { label: 'Journal', href: '/guides/' },
] as const;

export const secondaryNav = [
  { label: 'Events', href: '/events/' },
  { label: 'Live music tonight', href: '/live-music-tonight/' },
  { label: 'Hotels', href: '/hotels/' },
  { label: 'Where to stay', href: '/where-to-stay/' },
  { label: 'Things to do', href: '/things-to-do/' },
  { label: 'Tours', href: '/tours/' },
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
