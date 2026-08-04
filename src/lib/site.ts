/**
 * Single source of truth for brand-level strings.
 * The working name and domain are placeholders until the brand is chosen.
 * Change them here and they propagate through metadata, schema, and UI.
 */
/**
 * The canonical origin. Must be a parseable URL because Next builds
 * `metadataBase` and every canonical/OG tag from it, so the brand placeholder
 * cannot be used here. Set NEXT_PUBLIC_SITE_URL to the real domain at build
 * time; until then canonicals point at a clearly fake host rather than a
 * domain someone else owns.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://brand-placeholder.example.com';

export const site = {
  name: '[BRAND NAME]',
  shortName: '[BRAND]',
  domain: '[DOMAIN.COM]',
  url: SITE_URL,
  tagline: 'The independent guide to Nashville.',
  description:
    'Independent recommendations for where to stay, eat, drink, and what to do in Nashville, plus a trip planner built around your dates and interests.',
  positioning:
    'Restaurants, hotels, events, music, and local recommendations, carefully selected.',
  locale: 'en_US',
  // Placeholder business identity. Replace before launch: a real, checkable
  // address and contact is a baseline trust requirement.
  org: {
    legalName: '[LEGAL ENTITY NAME]',
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
} as const;

/**
 * Intent-led navigation. Each item is where a real search lands, rather than a
 * content-type label, so the nav routes people toward something bookable.
 */
export const primaryNav = [
  { label: 'Where to Stay', href: '/where-to-stay/' },
  { label: 'Live Music', href: '/live-music-tonight/' },
  { label: 'Tours', href: '/tours/' },
  { label: 'Things to Do', href: '/things-to-do/' },
  { label: 'Restaurants', href: '/restaurants/' },
  { label: 'Neighborhoods', href: '/neighborhoods/' },
] as const;

/** Shown in the mobile drawer under the primary items. */
export const secondaryNav = [
  { label: 'Honky Tonk Highway', href: '/honky-tonk-highway/' },
  { label: 'The Ultimate Weekend', href: '/weekend/' },
  { label: 'Events', href: '/events/' },
  { label: 'Venues', href: '/music/' },
  { label: 'Hotels A-Z', href: '/hotels/' },
  { label: 'Guides', href: '/guides/' },
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
    { label: 'Where to stay', href: '/where-to-stay/' },
    { label: 'Live music tonight', href: '/live-music-tonight/' },
    { label: 'Tours and party buses', href: '/tours/' },
    { label: 'Honky Tonk Highway', href: '/honky-tonk-highway/' },
    { label: 'The ultimate weekend', href: '/weekend/' },
    { label: 'Restaurants', href: '/restaurants/' },
    { label: 'Neighborhoods', href: '/neighborhoods/' },
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
  ],
} as const;
