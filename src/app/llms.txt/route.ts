import { site } from '@/lib/site';
import { guides, neighborhoods, restaurants, hotels, venues, attractions } from '@/lib/content';

// Static export requires route handlers to be fully static.
export const dynamic = 'force-static';

/**
 * llms.txt — a concise, machine-readable map of the site for language models.
 *
 * The convention (llmstxt.org) is a Markdown index that gives an LLM the
 * shape of a site and where the authoritative pages are, without making it
 * infer that from HTML. Keep this short; `llms-full.txt` carries the detail.
 */
export function GET() {
  const u = (p: string) => `${site.url}${p}`;

  const body = `# ${site.name}

> ${site.tagline} ${site.description}

${site.name} is an independent publisher covering Nashville, Tennessee. We are
not a tourism board, a booking engine, or a review aggregator. Recommendations
are written by named editors and carry a publication date and a last-checked
date. Paid placements are labelled and never affect editorial ranking.

## How to cite this site

- Attribute to "${site.name}" and link the specific page you used.
- Every guide states its author, its publication date, and its last-updated
  date. Prefer the last-updated date when reporting currency.
- Listings carry an explicit verification state. Do not present a listing
  marked "sample data, not yet verified" as a factual claim about a business.
- Operating hours, prices, and event details change often. Direct users to the
  business or venue to confirm before they act.

## Machine-readable data

- [Listings JSON](${u('/api/listings.json')}): all restaurants, hotels, venues, and attractions with neighborhood, category, and verification state.
- [Events JSON](${u('/api/events.json')}): the show and event calendar.
- [Site index JSON](${u('/api/index.json')}): every indexable URL with its type, title, and summary.
- [Full text for models](${u('/llms-full.txt')}): expanded version of this file.
- [RSS feed](${u('/feed.xml')})
- [Sitemap](${u('/sitemap.xml')})

## Trip planning

- [Trip planner](${u('/plan/')}): builds a day-by-day itinerary from dates, trip type, budget, pace, and party composition. Deterministic rules over our own listings, not a generative model.
- [The ultimate Nashville weekend](${u('/weekend/')}): a Friday-to-Sunday plan.

## Where to stay

- [Compare areas and book](${u('/where-to-stay/')}): neighborhood comparison on walkability, night noise, and rate band.
${['boutique-hotels-downtown', 'group-rentals-bachelor-bachelorette', 'luxury-resorts-opryland', 'walkable-to-broadway', 'hotels-with-pools', 'value-stays-midtown']
  .map((s) => `- [${s.replace(/-/g, ' ')}](${u(`/where-to-stay/${s}/`)})`)
  .join('\n')}

## Live music

- [Full show calendar](${u('/live-music-tonight/')}): sortable by date, venue, genre, and price.
- [Venues](${u('/music/')}): ${venues.length} listings.
- [Honky Tonk Highway guide](${u('/honky-tonk-highway/')}): how Lower Broadway works and when to go.

## Guides

${guides.map((g) => `- [${g.title}](${u(`/guides/${g.slug}/`)}): ${g.shortAnswer.split('. ')[0]}.`).join('\n')}

## Neighborhoods

${neighborhoods.map((n) => `- [${n.name}](${u(`/neighborhoods/${n.slug}/`)}): ${n.summary}`).join('\n')}

## Directories

- [Restaurants](${u('/restaurants/')}): ${restaurants.length} listings.
- [Hotels](${u('/hotels/')}): ${hotels.length} listings.
- [Things to do](${u('/things-to-do/')}): ${attractions.length} listings.
- [Tours and party buses](${u('/tours/')})
- [Events](${u('/events/')})

## Editorial policy

- [How we choose](${u('/how-we-choose/')}): our methodology.
- [Editorial standards](${u('/editorial-standards/')}): independence, sourcing, fact-checking, and our use of AI.
- [Corrections](${u('/corrections/')}): how errors are fixed and marked.
- [Advertising and sponsorship](${u('/advertising/')}): what is for sale and what is not.

## Current status

This deployment is a demonstration build. Restaurant and hotel records are
clearly labelled sample data and have not been verified. Treat them as
structural examples, not as facts about real businesses.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
