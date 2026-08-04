import { site } from '@/lib/site';
import { guides, getAuthor } from '@/lib/content';

export const dynamic = 'force-static';

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** RSS 2.0 feed of published guides, newest first. */
export function GET() {
  const items = [...guides]
    .sort((a, b) => (b.dateUpdated ?? b.datePublished).localeCompare(a.dateUpdated ?? a.datePublished))
    .map((g) => {
      const author = getAuthor(g.authorSlug);
      const url = `${site.url}/guides/${g.slug}/`;
      const pub = new Date(`${g.dateUpdated ?? g.datePublished}T09:00:00Z`).toUTCString();
      return `    <item>
      <title>${esc(g.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pub}</pubDate>
      <category>${esc(g.cluster)}</category>
      <dc:creator>${esc(author?.name ?? 'Editorial desk')}</dc:creator>
      <description>${esc(g.shortAnswer)}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(site.name)}</title>
    <link>${site.url}</link>
    <atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${esc(site.description)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
