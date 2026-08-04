import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

/**
 * Crawler policy.
 *
 * AI crawlers are allowed deliberately rather than by omission. Being cited by
 * an assistant is a primary discovery channel for a guide like this, so the
 * named agents below are given the same access as search crawlers.
 *
 * The one exception is CCBot: Common Crawl feeds bulk training corpora with no
 * attribution path back to us, which is a different exchange from a retrieval
 * agent that cites its source. Flip that entry if the policy changes.
 *
 * Note that robots.txt is honoured voluntarily. It is a statement of policy,
 * not an enforcement mechanism.
 */

/** Retrieval and answer engines. These cite sources, so we want them. */
const AI_ANSWER_AGENTS = [
  'GPTBot', // OpenAI crawler for ChatGPT
  'OAI-SearchBot', // OpenAI search index
  'ChatGPT-User', // Live fetch when a user asks ChatGPT to open a link
  'ClaudeBot', // Anthropic crawler
  'Claude-User', // Live fetch on behalf of a Claude user
  'Claude-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended', // Gemini grounding
  'Applebot-Extended',
  'Bingbot',
  'DuckAssistBot',
  'Amazonbot',
  'MistralAI-User',
  'cohere-ai',
  'YouBot',
];

export default function robots(): MetadataRoute.Robots {
  const disallow = ['/search/', '/404/'];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
      // Named answer engines: same access, stated explicitly so the policy is
      // unambiguous to both the crawler and anyone auditing it.
      ...AI_ANSWER_AGENTS.map((agent) => ({
        userAgent: agent,
        allow: '/',
        disallow,
      })),
      {
        // Bulk training corpus with no citation path back to the publisher.
        userAgent: 'CCBot',
        disallow: '/',
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
