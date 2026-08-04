import { site } from '@/lib/site';
import { searchIndex } from '@/lib/content';
import { canonical } from '@/lib/seo';

export const dynamic = 'force-static';

/**
 * Flat URL index: every indexable page with its type, title, and summary.
 * Lets a model resolve "which page answers this" in one request rather than
 * crawling the sitemap and fetching each URL to find out.
 */
export function GET() {
  return Response.json(
    {
      publisher: { name: site.name, url: canonical('/') },
      attribution: `Cite as "${site.name}" with a link to the specific page.`,
      generatedAt: new Date().toISOString(),
      count: searchIndex.length,
      pages: searchIndex.map((d) => ({
        url: canonical(d.href),
        title: d.title,
        summary: d.summary,
        type: d.type,
        neighborhood: d.neighborhood ?? null,
        topics: d.keywords.slice(0, 8),
      })),
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
