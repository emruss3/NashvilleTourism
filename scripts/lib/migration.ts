/**
 * Shared pieces of the nashville.com → Nashroam redirect layer.
 *
 * Used by scripts/build-redirects.ts (workbook → JSON), tests/redirects.test.ts
 * (destination check) and nothing at runtime: next.config.mjs and the
 * middleware read the generated JSON only. Plain Node, no path aliases, so it
 * runs under `node` with type stripping and needs no bundler.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

export type RedirectStatus = 301 | 410;

export interface RedirectRule {
  /** Normalised nashville.com path: lower-case, no host, no trailing slash, `/` for the homepage. May carry a query (`/?p=123`). */
  source: string;
  /** Nashroam path. Required for 301; must exist in the route inventory. */
  destination?: string;
  status: RedirectStatus;
  /** Referring domains from the backlink audit, when the sheet has them. */
  referringDomains?: number;
  /** Free text from the sheet (reason, section, editor note). */
  note?: string;
}

export interface RedirectMap {
  generatedAt: string;
  /** Workbook path the rules came from, or a note when none has been supplied. */
  source: string;
  sheet?: string;
  hosts: string[];
  /** Absolute origin every 301 lands on. Relative destinations would stay on the nashville.com host and loop. */
  target: string;
  rules: RedirectRule[];
}

export const MIGRATION_DIR = path.join(process.cwd(), 'data', 'migration');
export const WORKBOOK_PATH = path.join(MIGRATION_DIR, 'nashville_com_backlink_audit_redirect_map.xlsx');
export const REDIRECTS_JSON = path.join(MIGRATION_DIR, 'redirects.json');
export const RESTORES_JSON = path.join(MIGRATION_DIR, 'priority-restores.json');
export const ROUTES_JSON = path.join(MIGRATION_DIR, 'nashroam-routes.json');

/** Hosts the layer applies to. nashroam.com traffic is never touched. */
export const MIGRATION_HOSTS = ['nashville.com', 'www.nashville.com'];
export const TICKETS_HOST = 'tickets.nashville.com';
/** Where the redirects land. Override with MIGRATION_TARGET_ORIGIN when building against a preview. */
export const MIGRATION_TARGET = (process.env.MIGRATION_TARGET_ORIGIN || 'https://nashroam.com').replace(/\/$/, '');

/** Referring-domain threshold for the "republish as a real article" list. */
export const RESTORE_THRESHOLD = 100;

/* ------------------------------------------------------------------ */
/* Path normalisation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Turn whatever the sheet holds (full URL, host-less path, with or without
 * trailing slash, mixed case) into the canonical lookup key. Query strings
 * are kept (lower-cased) because WordPress `/?p=123` URLs are addressed only
 * by their query. Hash fragments are dropped; browsers never send them.
 */
export function normalizeSourcePath(raw: string): string | null {
  let value = String(raw ?? '').trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value) && !value.startsWith('/')) value = `https://nashville.com/${value}`;
  let pathname: string;
  let search: string;
  try {
    const url = new URL(value, 'https://nashville.com');
    pathname = url.pathname;
    search = url.search;
  } catch {
    return null;
  }
  pathname = decodeURIComponent(pathname).toLowerCase().replace(/\/{2,}/g, '/');
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, '');
  if (!pathname) pathname = '/';
  return `${pathname}${search.toLowerCase()}`;
}

/** Nashroam destinations are trailing-slash paths (next.config trailingSlash: true). */
export function normalizeDestinationPath(raw: string): string | null {
  let value = String(raw ?? '').trim();
  if (!value) return null;
  try {
    const url = new URL(value, 'https://nashroam.com');
    if (/^https?:$/i.test(url.protocol) && !/nashroam\.com$|nashville\.com$|localhost$/i.test(url.hostname)) {
      // External destination: keep verbatim. The test flags it.
      return value;
    }
    let pathname = url.pathname.replace(/\/{2,}/g, '/');
    if (!pathname.endsWith('/')) pathname += '/';
    return `${pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Workbook parsing                                                    */
/* ------------------------------------------------------------------ */

const HEADER_SYNONYMS: Record<'source' | 'destination' | 'status' | 'domains' | 'note', string[]> = {
  source: ['source', 'source url', 'old url', 'legacy url', 'url', 'nashville.com url', 'from', 'page', 'page url', 'target url', 'address'],
  destination: ['destination', 'destination url', 'redirect to', 'redirect', 'new url', 'nashroam url', 'to', 'maps to', 'target'],
  status: ['status', 'status code', 'action', 'http status', 'code', 'response', 'decision'],
  domains: ['referring domains', 'ref domains', 'refdomains', 'domains', 'ref. domains', 'referring_domains', 'linking domains'],
  note: ['note', 'notes', 'reason', 'comment', 'comments', 'section', 'category', 'content type'],
};

function clean(header: unknown): string {
  return String(header ?? '').trim().toLowerCase().replace(/[_\s]+/g, ' ');
}

export type ColumnMap = { source: number } & Record<Exclude<keyof typeof HEADER_SYNONYMS, 'source'>, number | undefined>;

/** Map a header row onto the fields we need. Returns null when no source column is recognisable. */
export function detectColumns(headers: unknown[]): ColumnMap | null {
  const cleaned = headers.map(clean);
  const find = (key: keyof typeof HEADER_SYNONYMS) => {
    for (const synonym of HEADER_SYNONYMS[key]) {
      const exact = cleaned.indexOf(synonym);
      if (exact !== -1) return exact;
    }
    for (const synonym of HEADER_SYNONYMS[key]) {
      // Partial matches only on short, header-like cells; a title line such as
      // "Backlink audit: nashville.com priority URLs" must not pass as a header.
      const partial = cleaned.findIndex((h) => h.length <= 32 && h.includes(synonym));
      if (partial !== -1) return partial;
    }
    return undefined;
  };
  // A header row names at least two columns.
  if (cleaned.filter(Boolean).length < 2) return null;
  const source = find('source');
  if (source === undefined) return null;
  let destination = find('destination');
  if (destination === source) destination = undefined;
  return { source, destination, status: find('status'), domains: find('domains'), note: find('note') };
}

function parseStatus(raw: unknown, hasDestination: boolean): RedirectStatus {
  const text = clean(raw);
  if (/410|gone|remove|retire|delete|drop|dead/.test(text)) return 410;
  if (/301|redirect|keep|map|move/.test(text)) return hasDestination ? 301 : 410;
  return hasDestination ? 301 : 410;
}

function parseDomains(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined;
  const n = Number(String(raw).replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

export interface ParseResult {
  sheet: string;
  columns: ColumnMap;
  rules: RedirectRule[];
  skipped: { row: number; reason: string }[];
  headers: string[];
}

/**
 * Pick the priority sheet (the largest sheet whose header row we can map, or
 * the one named on the command line) and turn every row into a rule.
 * Duplicate sources keep the first row; the rest are reported as skipped.
 */
export function parseWorkbook(workbook: XLSX.WorkBook, preferredSheet?: string): ParseResult {
  const candidates = preferredSheet ? [preferredSheet] : workbook.SheetNames.filter((n) => !/summary|readme|notes|legend/i.test(n));
  let best: { name: string; rows: unknown[][]; columns: ColumnMap; headerRow: number } | null = null;
  for (const name of candidates) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' });
    // Header may not be on row 1 (Semrush exports carry a title line).
    for (let i = 0; i < Math.min(rows.length, 10); i += 1) {
      const columns = detectColumns(rows[i] ?? []);
      if (columns) {
        if (!best || rows.length > best.rows.length) best = { name, rows, columns, headerRow: i };
        break;
      }
    }
  }
  if (!best) {
    const seen = workbook.SheetNames.map((n) => {
      const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[n], { header: 1, raw: false, defval: '' });
      return `${n}: ${(rows[0] ?? []).map(String).join(' | ')}`;
    });
    throw new Error(`No sheet with a recognisable URL column. Headers seen:\n${seen.join('\n')}\nPass --sheet and --source-col to override.`);
  }

  const { rows, columns, headerRow, name } = best;
  const rules: RedirectRule[] = [];
  const skipped: ParseResult['skipped'] = [];
  const seen = new Set<string>();
  for (let i = headerRow + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const rowNumber = i + 1;
    const source = normalizeSourcePath(String(row[columns.source] ?? ''));
    if (!source) {
      if (row.some((cell) => String(cell ?? '').trim())) skipped.push({ row: rowNumber, reason: 'no source URL' });
      continue;
    }
    if (source === '/' ) {
      skipped.push({ row: rowNumber, reason: 'homepage; equity transfers with the domain, no rule needed' });
      continue;
    }
    if (seen.has(source)) {
      skipped.push({ row: rowNumber, reason: `duplicate of ${source}` });
      continue;
    }
    seen.add(source);
    const destinationRaw = columns.destination !== undefined ? String(row[columns.destination] ?? '') : '';
    const destination = destinationRaw ? normalizeDestinationPath(destinationRaw) : null;
    const status = parseStatus(columns.status !== undefined ? row[columns.status] : '', Boolean(destination));
    const rule: RedirectRule = { source, status };
    if (status === 301 && destination) rule.destination = destination;
    const domains = columns.domains !== undefined ? parseDomains(row[columns.domains]) : undefined;
    if (domains !== undefined) rule.referringDomains = domains;
    const note = columns.note !== undefined ? String(row[columns.note] ?? '').trim() : '';
    if (note) rule.note = note;
    if (status === 410 && destinationRaw && !rule.note) rule.note = `sheet said 410; destination ignored: ${destinationRaw}`;
    rules.push(rule);
  }
  rules.sort((a, b) => (b.referringDomains ?? 0) - (a.referringDomains ?? 0) || a.source.localeCompare(b.source));
  return { sheet: name, columns, rules, skipped, headers: (rows[headerRow] ?? []).map(String) };
}

export function readWorkbook(file = WORKBOOK_PATH): XLSX.WorkBook {
  return XLSX.read(fs.readFileSync(file), { type: 'buffer' });
}

/* ------------------------------------------------------------------ */
/* Route inventory                                                     */
/* ------------------------------------------------------------------ */

export interface RouteInventory {
  generatedAt: string;
  /** Static routes, trailing-slash form. */
  static: string[];
  /** Dynamic segments and the slugs they publish. */
  dynamic: { pattern: string; slugs: string[] }[];
  /** nashville.com sections and where they land on Nashroam, or null when nothing fits. */
  sections: Record<string, string | null>;
}

const SLUG_RE = /^\s*slug:\s*'([^']+)'/gm;

function slugsFrom(file: string, opts: { between?: [RegExp, RegExp]; excludeSample?: boolean } = {}): string[] {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) return [];
  let text = fs.readFileSync(full, 'utf8');
  if (opts.between) {
    const start = text.search(opts.between[0]);
    if (start === -1) return [];
    const rest = text.slice(start);
    const end = rest.slice(1).search(opts.between[1]);
    text = end === -1 ? rest : rest.slice(0, end + 1);
  }
  const slugs = [...text.matchAll(SLUG_RE)].map((m) => m[1]);
  return opts.excludeSample ? slugs.filter((s) => !s.startsWith('sample-')) : slugs;
}

/**
 * Every path the Next app can serve, derived from src/app and the content
 * modules the dynamic routes read in generateStaticParams. Regex on
 * `slug: '...'` mirrors those modules without importing TypeScript path
 * aliases into plain Node. Sample fixtures (`sample-*`) are excluded: they
 * are not real destinations.
 */
export function routeInventory(): RouteInventory {
  const appDir = path.join(process.cwd(), 'src', 'app');
  const staticRoutes: string[] = [];
  const dynamic: RouteInventory['dynamic'] = [];
  const walk = (dir: string, segments: string[]) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith('(') || entry.name === 'api' || entry.name === 'admin') continue;
        walk(path.join(dir, entry.name), [...segments, entry.name]);
      } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
        const route = `/${segments.join('/')}`;
        if (route.includes('[')) dynamic.push({ pattern: route.replace(/\/$/, '') + '/', slugs: [] });
        else staticRoutes.push(route === '/' ? '/' : `${route}/`);
      }
    }
  };
  walk(appDir, []);

  const listings = 'src/lib/content/listings.ts';
  const slugSources: Record<string, string[]> = {
    '/restaurants/[slug]/': slugsFrom(listings, { between: [/export const restaurants/, /\n(export )?(const|function) /], excludeSample: true }),
    '/events/[slug]/': slugsFrom(listings, { between: [/export const events/, /\n(export )?(const|function) /], excludeSample: true }),
    '/things-to-do/[slug]/': slugsFrom(listings, { between: [/const attractionsBase/, /\n\];/], excludeSample: true }),
    '/hotels/[slug]/': slugsFrom('src/lib/content/hotels.ts', { excludeSample: true }),
    '/neighborhoods/[slug]/': slugsFrom('src/lib/content/neighborhoods.ts'),
    '/guides/[slug]/': slugsFrom('src/lib/content/guides.ts'),
    '/authors/[slug]/': slugsFrom('src/lib/content/authors.ts'),
    '/music/[slug]/': slugsFrom('src/lib/music-venues.ts'),
    '/where-to-stay/[slug]/': slugsFrom('src/app/where-to-stay/[slug]/page.tsx'),
    // Viator product codes are live inventory, not a fixed list; never a redirect destination.
    '/tours/[productCode]/': [],
  };
  for (const d of dynamic) d.slugs = slugSources[d.pattern] ?? [];

  const sections: RouteInventory['sections'] = {
    hotels: '/hotels/',
    golf: null,
    attractions: '/things-to-do/',
    music: '/music/',
    events: '/events/',
    articles: '/guides/',
    restaurants: '/restaurants/',
    neighborhoods: '/neighborhoods/',
  };
  for (const [key, value] of Object.entries(sections)) {
    if (value && !staticRoutes.includes(value)) sections[key] = null;
  }

  return { generatedAt: new Date().toISOString(), static: staticRoutes.sort(), dynamic, sections };
}

/** True when `destination` resolves to a page the app serves today. */
export function destinationExists(destination: string, inventory: RouteInventory): boolean {
  let pathname: string;
  try {
    pathname = new URL(destination, 'https://nashroam.com').pathname;
  } catch {
    return false;
  }
  if (/^https?:\/\//i.test(destination) && !/https?:\/\/(www\.)?(nashroam|nashville)\.com/i.test(destination)) return false;
  if (!pathname.endsWith('/')) pathname += '/';
  if (inventory.static.includes(pathname)) return true;
  for (const d of inventory.dynamic) {
    const prefix = d.pattern.slice(0, d.pattern.indexOf('['));
    if (!pathname.startsWith(prefix)) continue;
    const slug = pathname.slice(prefix.length).replace(/\/$/, '');
    if (slug && !slug.includes('/') && d.slugs.includes(slug)) return true;
  }
  return false;
}

export function readRedirectMap(file = REDIRECTS_JSON): RedirectMap {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as RedirectMap;
}
