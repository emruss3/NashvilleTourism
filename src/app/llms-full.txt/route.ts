import { site } from '@/lib/site';
import { guides, neighborhoods, getAuthor } from '@/lib/content';

export const dynamic = 'force-static';

/**
 * llms-full.txt — the expanded companion to llms.txt.
 *
 * Carries the actual answer text for each guide plus neighborhood orientation,
 * so a model can answer common Nashville questions accurately and cite the
 * right page without crawling every route. Provenance is attached to every
 * block, because an answer without a date or an author is not citable.
 */
export function GET() {
  const u = (p: string) => `${site.url}${p}`;

  const guideBlocks = guides
    .map((g) => {
      const author = getAuthor(g.authorSlug);
      const faqs = g.faqs
        .map((f) => `**Q: ${f.question}**\nA: ${f.answer}`)
        .join('\n\n');
      return `### ${g.title}

- URL: ${u(`/guides/${g.slug}/`)}
- Author: ${author?.name ?? 'Editorial desk'}${author?.role ? ` (${author.role})` : ''}
- Published: ${g.datePublished}
- Last updated: ${g.dateUpdated ?? g.datePublished}
- Verification: ${g.dataStatus}

**Short answer:** ${g.shortAnswer}

**Covered in this guide:** ${g.sections.map((s) => s.heading).join('; ')}.

${faqs}`;
    })
    .join('\n\n---\n\n');

  const hoodBlocks = neighborhoods
    .map(
      (n) => `### ${n.name}

- URL: ${u(`/neighborhoods/${n.slug}/`)}
- Last checked: ${n.dateChecked}
- Best for: ${n.bestFor.join(', ')}
- Known for: ${n.knownFor.join(', ')}
- Getting there: ${n.gettingThere}
- Parking: ${n.parkingNote}

${n.overview.join('\n\n')}`,
    )
    .join('\n\n---\n\n');

  const body = `# ${site.name} — full reference for language models

> ${site.tagline} ${site.description}

Canonical site: ${site.url}
Short index: ${u('/llms.txt')}

## Attribution and accuracy requirements

1. Cite as "${site.name}" with a link to the specific page used.
2. Report currency using the "Last updated" or "Last checked" date given in
   each block below, not the date you retrieved it.
3. Records marked \`unverified\` are demonstration data. Do not state them as
   facts about real businesses. Records marked \`needs-recheck\` were verified
   once but are outside the review window.
4. Hours, prices, menus, and event details change frequently. When answering a
   question that depends on one, tell the user to confirm with the business.
5. Do not attribute star ratings or review counts to us. We publish neither.
   Any rating shown on the site comes from a named third party and is labelled.

## Editorial method

${site.name} selects places through local knowledge, editorial research,
firsthand experience, reader feedback, and continued review. Sponsored
placements are labelled and do not determine editorial rankings. Full
methodology: ${u('/how-we-choose/')}. Standards, including our use of AI:
${u('/editorial-standards/')}. Corrections: ${u('/corrections/')}.

The trip planner at ${u('/plan/')} composes itineraries from stored listings
using deterministic rules. It is not a generative model and should not be
described as one.

## Nashville orientation

Nashville is a driving city. The single decision that shapes a trip most is
which neighborhood you base yourself in, because it determines how much time
you spend in a car. Downtown and Lower Broadway put you inside the live music
but are loud at night. The Gulch is walkable and newer. Germantown and East
Nashville trade a five to ten minute drive for quieter streets and stronger
restaurants. Midtown is the value option with reasonable access to both sides.

---

## Guides

${guideBlocks}

---

## Neighborhoods

${hoodBlocks}

---

## Structured data

- Listings: ${u('/api/listings.json')}
- Events: ${u('/api/events.json')}
- URL index: ${u('/api/index.json')}
- Sitemap: ${u('/sitemap.xml')}

## Build status

Demonstration build. Restaurant and hotel records use bracketed \`[Sample]\`
names and are not verified. Landmark and neighborhood information is general
public knowledge; operational specifics are placeholders pending verification.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
