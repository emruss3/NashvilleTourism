/**
 * Redirect-layer guard. Runs before `next build` (package.json `prebuild`) and
 * on demand with `npm run test:redirects`.
 *
 * Fails the build when:
 *   - data/migration/redirects.json is malformed,
 *   - a 301 destination is not a page the current route tree serves,
 *   - a rule shape is wrong (410 with a destination, 301 without one, un-normalised source).
 *
 * Also exercises the workbook parser and path normaliser against an in-memory
 * workbook, so a fresh Semrush export with slightly different headers is
 * caught here rather than at cutover.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import * as XLSX from 'xlsx';
import {
  REDIRECTS_JSON,
  ROUTES_JSON,
  destinationExists,
  detectColumns,
  normalizeDestinationPath,
  normalizeSourcePath,
  parseWorkbook,
  readRedirectMap,
  routeInventory,
  type RedirectRule,
} from '../scripts/lib/migration.ts';

const inventory = routeInventory();

test('route inventory covers the site', () => {
  for (const route of ['/', '/events/', '/hotels/', '/music/', '/things-to-do/', '/guides/', '/restaurants/', '/neighborhoods/']) {
    assert.ok(inventory.static.includes(route), `expected ${route} in the static route inventory`);
  }
  assert.ok(destinationExists('/neighborhoods/east-nashville/', inventory));
  assert.ok(destinationExists('/guides/nashville-with-kids/', inventory));
  assert.equal(destinationExists('/restaurants/sample-germantown-chophouse/', inventory), false, 'sample fixtures are not destinations');
  assert.equal(destinationExists('/golf/', inventory), false);
  assert.equal(destinationExists('/events/ryman-auditorium/', inventory), false, 'venue slugs are not event pages');
  assert.ok(destinationExists('/music/ryman-auditorium/', inventory));
  assert.equal(destinationExists('https://example.com/', inventory), false);
});

test('nashroam-routes.json matches the current route tree', () => {
  assert.ok(fs.existsSync(ROUTES_JSON), 'run `npm run redirects:build` to generate data/migration/nashroam-routes.json');
  const committed = JSON.parse(fs.readFileSync(ROUTES_JSON, 'utf8')) as ReturnType<typeof routeInventory>;
  assert.deepEqual(committed.static, inventory.static, 'static routes changed; re-run `npm run redirects:build` and commit nashroam-routes.json');
  assert.deepEqual(
    committed.dynamic.map((d) => [d.pattern, d.slugs.length]),
    inventory.dynamic.map((d) => [d.pattern, d.slugs.length]),
    'dynamic slugs changed; re-run `npm run redirects:build` and commit nashroam-routes.json',
  );
});

test('every mapped destination is a page Nashroam serves today', () => {
  const map = readRedirectMap(REDIRECTS_JSON);
  assert.ok(Array.isArray(map.rules), 'redirects.json must carry a rules array');
  assert.ok(map.hosts.includes('nashville.com'));
  assert.match(map.target, /^https:\/\/[a-z0-9.-]+$/, 'target must be an absolute https origin with no trailing slash');
  if (map.rules.length === 0) {
    console.warn('\n  redirects.json has no rules yet: the backlink workbook has not been converted. The layer is inert until `npm run redirects:build` runs against it.\n');
    return;
  }
  const bad: string[] = [];
  const seen = new Set<string>();
  for (const rule of map.rules as RedirectRule[]) {
    if (rule.source !== normalizeSourcePath(rule.source)) bad.push(`${rule.source}: source is not normalised`);
    if (seen.has(rule.source)) bad.push(`${rule.source}: duplicate source`);
    seen.add(rule.source);
    if (rule.status === 410) {
      if (rule.destination) bad.push(`${rule.source}: 410 must not carry a destination`);
      continue;
    }
    if (rule.status !== 301) bad.push(`${rule.source}: status must be 301 or 410`);
    if (!rule.destination) bad.push(`${rule.source}: 301 without a destination`);
    else if (!destinationExists(rule.destination, inventory)) bad.push(`${rule.source} → ${rule.destination}: destination is not a Nashroam route`);
  }
  assert.equal(bad.length, 0, `\n${bad.join('\n')}\n\nRemap these in the workbook (a section page that does not exist must be flagged, not scaffolded) and re-run npm run redirects:build.`);
});

test('source and destination normalisation', () => {
  assert.equal(normalizeSourcePath('https://www.nashville.com/Hotels/Downtown/'), '/hotels/downtown');
  assert.equal(normalizeSourcePath('hotels/downtown'), '/hotels/downtown');
  assert.equal(normalizeSourcePath('/hotels//downtown/#top'), '/hotels/downtown');
  assert.equal(normalizeSourcePath('/?p=1234'), '/?p=1234');
  assert.equal(normalizeSourcePath('http://nashville.com/'), '/');
  assert.equal(normalizeSourcePath(''), null);
  assert.equal(normalizeDestinationPath('/events'), '/events/');
  assert.equal(normalizeDestinationPath('https://nashroam.com/guides/x/?utm=1'), '/guides/x/?utm=1');
  assert.equal(normalizeDestinationPath('https://example.com/elsewhere'), 'https://example.com/elsewhere');
});

test('workbook parser recognises a Semrush-style export', () => {
  const rows = [
    ['Backlink audit: nashville.com priority URLs'],
    ['Source URL', 'Referring Domains', 'Redirect To', 'Action', 'Notes'],
    ['https://nashville.com/shinedown-to-make-grand-ole-opry-debut/', '219', '/music/grand-ole-opry/', '301', 'article'],
    ['https://www.nashville.com/Hotels/', 12, 'https://nashroam.com/hotels', 'redirect', 'section'],
    ['http://nashville.com/golf/', '40', '', '', 'no equivalent'],
    ['/wp-content/uploads/2012/logo.png', 3, '/', '410', 'asset'],
    ['https://nashville.com/', 3200, '/', '301', 'homepage'],
    ['https://nashville.com/hotels/', 1, '/hotels/', '301', 'dup'],
    ['', '', '', '', ''],
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Summary'], ['Total', 6]]), 'Summary');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Priority URLs');
  const parsed = parseWorkbook(wb);
  assert.equal(parsed.sheet, 'Priority URLs');
  assert.deepEqual(
    parsed.rules.map((r) => [r.source, r.status, r.destination ?? null, r.referringDomains ?? null]),
    [
      ['/shinedown-to-make-grand-ole-opry-debut', 301, '/music/grand-ole-opry/', 219],
      ['/golf', 410, null, 40],
      ['/hotels', 301, '/hotels/', 12],
      ['/wp-content/uploads/2012/logo.png', 410, null, 3],
    ],
  );
  assert.equal(parsed.skipped.length, 2, 'homepage row and the duplicate are skipped');
  assert.ok(parsed.rules.every((r) => r.status !== 301 || destinationExists(r.destination!, inventory)));
});

test('header detection tolerates other column names', () => {
  assert.deepEqual(detectColumns(['URL', 'Ref. domains', 'New URL', 'Status code']), { source: 0, destination: 2, status: 3, domains: 1, note: undefined });
  assert.equal(detectColumns(['Anchor', 'Count']), null);
});
