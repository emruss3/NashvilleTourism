import { NextResponse, type NextRequest } from 'next/server';
import redirectMap from '../data/migration/redirects.json';
import routes from '../data/migration/nashroam-routes.json';

/**
 * nashville.com → Nashroam: the parts next.config.mjs `redirects()` cannot do.
 *
 * Exact-match 301s from data/migration/redirects.json live in next.config.mjs
 * (Next runs those before middleware). This file handles only:
 *   1. tickets.nashville.com/*  → /events/  (host rule)
 *   2. mixed-case sources       → the mapped destination (config matching is case-sensitive)
 *   3. /?p=123 style sources    → the mapped destination (query-addressed rules)
 *   4. /event/* and /events/*   → /events/  when not a Nashroam route and not in the map
 *   5. /~user/*                 → 410 Gone
 *   6. /wp-content/*, /feed/*, /?p=* → 410 Gone unless in the map
 *
 * Everything is scoped to the nashville.com hosts, so nashroam.com traffic is
 * untouched and the layer is inert until DNS points nashville.com here.
 * Query strings are preserved on every 301.
 */
const HOSTS = new Set<string>(redirectMap.hosts);
const TICKETS_HOST = 'tickets.nashville.com';
/** Every 301 lands on this origin; staying on the nashville.com host would re-enter this file forever. */
const TARGET = String(redirectMap.target || 'https://nashroam.com').replace(/\/$/, '');

type Rule = { source: string; destination?: string; status: number };
const rules = redirectMap.rules as Rule[];
const byPath = new Map<string, Rule>();
/** Query-addressed rules (/?p=123) grouped by path; the rule's params must all be present on the request. */
const byPathAndQuery = new Map<string, { rule: Rule; params: [string, string][] }[]>();
for (const rule of rules) {
  const q = rule.source.indexOf('?');
  if (q === -1) {
    byPath.set(rule.source, rule);
  } else {
    const p = rule.source.slice(0, q);
    const params = [...new URLSearchParams(rule.source.slice(q)).entries()];
    byPathAndQuery.set(p, [...(byPathAndQuery.get(p) ?? []), { rule, params }]);
  }
}

function matchQueryRule(pathname: string, search: URLSearchParams): { rule: Rule; consumed: Set<string> } | null {
  const candidates = byPathAndQuery.get(pathname);
  if (!candidates) return null;
  const lower = new Map<string, string>();
  search.forEach((value, key) => lower.set(key.toLowerCase(), value.toLowerCase()));
  for (const { rule, params } of candidates) {
    if (params.every(([k, v]) => lower.get(k) === v)) return { rule, consumed: new Set(params.map(([k]) => k)) };
  }
  return null;
}

const staticRoutes = new Set<string>(routes.static);
const dynamicRoutes = routes.dynamic as { pattern: string; slugs: string[] }[];

function normalizePath(pathname: string): string {
  let p = decodeURIComponent(pathname).toLowerCase().replace(/\/{2,}/g, '/');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p || '/';
}

function isNashroamRoute(pathname: string): boolean {
  const withSlash = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (staticRoutes.has(withSlash)) return true;
  for (const d of dynamicRoutes) {
    const prefix = d.pattern.slice(0, d.pattern.indexOf('['));
    if (!withSlash.startsWith(prefix)) continue;
    const slug = withSlash.slice(prefix.length).replace(/\/$/, '');
    if (slug && !slug.includes('/') && d.slugs.includes(slug)) return true;
  }
  return false;
}

function gone(): NextResponse {
  return new NextResponse(
    '<!doctype html><title>410 Gone</title><h1>410 Gone</h1><p>This page was removed from nashville.com and has no replacement.</p>',
    { status: 410, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=86400' } },
  );
}

function redirect(request: NextRequest, destination: string, consumed: Set<string> = new Set()): NextResponse {
  const target = new URL(destination, TARGET);
  // Preserve the incoming query; the destination's own query (if any) wins on
  // conflicts, and keys that addressed the rule itself (/?p=123) are dropped.
  request.nextUrl.searchParams.forEach((value, key) => {
    if (!consumed.has(key.toLowerCase()) && !target.searchParams.has(key)) target.searchParams.append(key, value);
  });
  return NextResponse.redirect(target, 301);
}

export function middleware(request: NextRequest) {
  const host = (request.headers.get('host') ?? '').toLowerCase().replace(/:\d+$/, '');
  if (!HOSTS.has(host) && host !== TICKETS_HOST) return NextResponse.next();

  if (host === TICKETS_HOST) return redirect(request, '/events/');

  const { pathname, searchParams } = request.nextUrl;
  const normalized = normalizePath(pathname);

  // Query-addressed rules (WordPress /?p=123) and mixed-case sources.
  const queryMatch = matchQueryRule(normalized, searchParams);
  if (queryMatch) {
    if (queryMatch.rule.status === 410) return gone();
    return redirect(request, queryMatch.rule.destination!, queryMatch.consumed);
  }
  const exact = byPath.get(normalized);
  if (exact) {
    // Lower-case sources are already handled by next.config redirects; this
    // catches /Some/Path and /some/path?x=1 forms Next's matcher misses.
    return exact.status === 410 ? gone() : redirect(request, exact.destination!);
  }

  // WordPress remnants and 1990s user pages: gone, unless the map says otherwise (handled above).
  if (normalized.startsWith('/~') || normalized.startsWith('/wp-content') || normalized.startsWith('/wp-includes') || normalized.startsWith('/wp-json') || normalized === '/feed' || normalized.startsWith('/feed/') || normalized.endsWith('/feed')) {
    return gone();
  }
  if (normalized === '/' && (request.nextUrl.searchParams.has('p') || request.nextUrl.searchParams.has('page_id') || request.nextUrl.searchParams.has('attachment_id'))) {
    return gone();
  }

  // Legacy event URLs not in the map collapse to the events hub. Nashroam's own
  // /events/ routes (the hub, /events/this-weekend/, published event pages) pass through.
  if ((normalized === '/event' || normalized.startsWith('/event/') || normalized.startsWith('/events/')) && !isNashroamRoute(normalized)) {
    return redirect(request, '/events/');
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals and static files; everything else is cheap: a Set lookup.
  matcher: ['/((?!_next/|api/|favicon.ico|robots.txt|sitemap.xml|media/|brand/|fonts/).*)'],
};
