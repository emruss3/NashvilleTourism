import type { Metadata } from 'next';
import { site } from './site';
import type { Guide, Hotel, NashvilleEvent, Neighborhood, Restaurant, Attraction, Author } from './types';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** Absolute canonical URL for a site-relative path. */
export function canonical(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${site.url}${clean}`;
}

interface MetaArgs {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  authorName?: string;
  /** Set true on thin or duplicative pages we do not want indexed. */
  noindex?: boolean;
}

/** Builds a complete, unique metadata object including OG and Twitter cards. */
export function buildMetadata({
  title,
  description,
  path,
  type = 'website',
  publishedTime,
  modifiedTime,
  authorName,
  noindex,
}: MetaArgs): Metadata {
  const url = canonical(path);
  const fullTitle = title.includes(site.name) ? title : `${title} | ${site.name}`;
  return {
    // `absolute` stops the root layout's title template from appending the
    // brand a second time.
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: site.name,
      locale: site.locale,
      type,
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      ...(authorName ? { authors: [authorName] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
    },
  };
}

/* --------------------------------- JSON-LD --------------------------------- */

/**
 * Publisher entity.
 *
 * Typed as an Organization rather than a bare Organization so answer engines
 * can classify what kind of source this is. `publishingPrinciples`,
 * `correctionsPolicy`, and `ownershipFundingInfo` are the properties Google and
 * the major answer engines read as provenance signals, and they are exactly
 * the pages a reader would want anyway.
 */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'NewsMediaOrganization'],
    '@id': `${site.url}/#organization`,
    name: site.name,
    url: site.url,
    description: site.description,
    slogan: site.tagline,
    email: site.org.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.org.address.street,
      addressLocality: site.org.address.city,
      addressRegion: site.org.address.region,
      postalCode: site.org.address.postalCode,
      addressCountry: site.org.address.country,
    },
    areaServed: {
      '@type': 'City',
      name: 'Nashville',
      addressRegion: 'TN',
      addressCountry: 'US',
    },
    knowsAbout: [
      'Nashville travel',
      'Nashville restaurants',
      'Nashville hotels',
      'Nashville live music',
      'Nashville neighborhoods',
      'Trip planning',
    ],
    publishingPrinciples: `${site.url}/editorial-standards/`,
    correctionsPolicy: `${site.url}/corrections/`,
    ownershipFundingInfo: `${site.url}/advertising/`,
    diversityPolicy: `${site.url}/editorial-standards/`,
    actionableFeedbackPolicy: `${site.url}/corrections/`,
    sameAs: [site.social.instagram, site.social.x, site.social.facebook],
  };
}

/**
 * ItemList for index and hub pages.
 *
 * Answer engines lean on ItemList to extract ranked "best X in Y" sets. Without
 * it they have to infer the list from markup, which is where mangled or
 * partial answers come from.
 */
export function itemListSchema(
  items: { name: string; url: string; description?: string }[],
  listName: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    numberOfItems: items.length,
    itemListOrder: 'https://schema.org/ItemListUnordered',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: canonical(item.url),
      ...(item.description ? { description: item.description } : {}),
    })),
  };
}

/**
 * Marks the answer-first block on a page as the passage worth reading aloud or
 * quoting. Used with the `shortAnswer` pattern on guides.
 */
export function speakableSchema(cssSelectors: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: cssSelectors,
    },
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    url: site.url,
    name: site.name,
    description: site.description,
    publisher: { '@id': `${site.url}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${site.url}/search/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbSchema(trail: { name: string; href: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: canonical(item.href),
    })),
  };
}

export function personSchema(author: Author) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${site.url}/authors/${author.slug}/#person`,
    name: author.name,
    jobTitle: author.role,
    description: author.bio,
    email: author.email,
    knowsAbout: author.covers,
    worksFor: { '@id': `${site.url}/#organization` },
  };
}

export function articleSchema(guide: Guide, author: Author | undefined, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.summary,
    datePublished: guide.datePublished,
    dateModified: guide.dateUpdated || guide.datePublished,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical(path) },
    author: author
      ? { '@type': 'Person', name: author.name, url: canonical(`/authors/${author.slug}/`) }
      : undefined,
    publisher: { '@id': `${site.url}/#organization` },
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function restaurantSchema(r: Restaurant, neighborhoodName: string, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: r.title,
    description: r.summary,
    servesCuisine: r.cuisine,
    priceRange: r.priceRange,
    url: canonical(path),
    address: {
      '@type': 'PostalAddress',
      streetAddress: r.address,
      addressLocality: 'Nashville',
      addressRegion: 'TN',
      addressCountry: 'US',
    },
    areaServed: neighborhoodName,
  };
}

export function hotelSchema(h: Hotel, neighborhoodName: string, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: h.title,
    description: h.summary,
    priceRange: h.priceCategory,
    url: canonical(path),
    amenityFeature: h.amenities.map((a) => ({ '@type': 'LocationFeatureSpecification', name: a })),
    address: {
      '@type': 'PostalAddress',
      streetAddress: h.address,
      addressLocality: 'Nashville',
      addressRegion: 'TN',
      addressCountry: 'US',
    },
    areaServed: neighborhoodName,
  };
}

export function eventSchema(e: NashvilleEvent, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    description: e.description,
    startDate: e.startDate,
    ...(e.endDate ? { endDate: e.endDate } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: canonical(path),
    location: {
      '@type': 'Place',
      name: e.venue,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Nashville',
        addressRegion: 'TN',
        addressCountry: 'US',
      },
    },
  };
}

export function attractionSchema(a: Attraction, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: a.title,
    description: a.summary,
    url: canonical(path),
    isAccessibleForFree: a.priceNote.toLowerCase().includes('free'),
    address: {
      '@type': 'PostalAddress',
      streetAddress: a.address,
      addressLocality: 'Nashville',
      addressRegion: 'TN',
      addressCountry: 'US',
    },
  };
}

export function placeSchema(n: Neighborhood, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: `${n.name}, Nashville`,
    description: n.summary,
    url: canonical(path),
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Nashville',
      addressRegion: 'TN',
      addressCountry: 'US',
    },
  };
}

/** Prefix a static asset path with the deployment base path. */
export function asset(path: string): string {
  return `${BASE}${path}`;
}
