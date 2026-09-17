/**
 * nashville.com → Nashroam redirect map builder.
 *
 *   npm run redirects:build
 *   node scripts/build-redirects.ts [--workbook path.xlsx] [--sheet "Priority URLs"] [--dry-run]
 *
 * Reads data/migration/nashville_com_backlink_audit_redirect_map.xlsx and
 * writes:
 *   data/migration/redirects.json          every rule (301 with destination, or 410)
 *   data/migration/priority-restores.json  mapped URLs with ≥100 referring domains,
 *                                          for the "republish as a real article" decision
 *   data/migration/nashroam-routes.json    the current route inventory the test
 *                                          and middleware rely on
 *
 * Nothing here is hard-coded: re-run after every fresh Semrush / Screaming
 * Frog pull (docs/migration/REDIRECTS.md) and commit the regenerated JSON.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  MIGRATION_HOSTS,
  MIGRATION_TARGET,
  REDIRECTS_JSON,
  RESTORES_JSON,
  RESTORE_THRESHOLD,
  ROUTES_JSON,
  WORKBOOK_PATH,
  destinationExists,
  parseWorkbook,
  readWorkbook,
  routeInventory,
  type RedirectMap,
} from './lib/migration.ts';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

const workbookPath = path.resolve(arg('--workbook') ?? WORKBOOK_PATH);
const sheet = arg('--sheet');
const dryRun = process.argv.includes('--dry-run');

const inventory = routeInventory();
fs.mkdirSync(path.dirname(ROUTES_JSON), { recursive: true });
if (!dryRun) fs.writeFileSync(ROUTES_JSON, `${JSON.stringify(inventory, null, 2)}\n`);

if (!fs.existsSync(workbookPath)) {
  console.error(`Workbook not found: ${workbookPath}`);
  console.error('Drop the backlink audit export there (see docs/migration/REDIRECTS.md) and run again.');
  console.error(`Route inventory written: ${inventory.static.length} static routes, ${inventory.dynamic.length} dynamic segments.`);
  process.exit(2);
}

const workbook = readWorkbook(workbookPath);
const parsed = parseWorkbook(workbook, sheet);

const map: RedirectMap = {
  generatedAt: new Date().toISOString(),
  source: path.relative(process.cwd(), workbookPath),
  sheet: parsed.sheet,
  hosts: MIGRATION_HOSTS,
  target: MIGRATION_TARGET,
  rules: parsed.rules,
};

const restores = parsed.rules
  .filter((r) => (r.referringDomains ?? 0) >= RESTORE_THRESHOLD)
  .map((r) => ({
    source: r.source,
    referringDomains: r.referringDomains,
    currentDecision: r.status === 301 ? `301 → ${r.destination}` : '410',
    note: r.note ?? '',
    decision: 'undecided: republish as an article, or keep the redirect',
  }));

const missing = parsed.rules.filter((r) => r.status === 301 && (!r.destination || !destinationExists(r.destination, inventory)));
const gaps = Object.entries(inventory.sections).filter(([, v]) => v === null).map(([k]) => k);

console.log(`Sheet "${parsed.sheet}" (${parsed.headers.join(' | ')})`);
console.log(`Rules: ${parsed.rules.length} (${parsed.rules.filter((r) => r.status === 301).length} × 301, ${parsed.rules.filter((r) => r.status === 410).length} × 410)`);
console.log(`Skipped rows: ${parsed.skipped.length}${parsed.skipped.length ? ` (${parsed.skipped.slice(0, 5).map((s) => `row ${s.row}: ${s.reason}`).join('; ')}${parsed.skipped.length > 5 ? '; …' : ''})` : ''}`);
console.log(`Priority restores (≥${RESTORE_THRESHOLD} referring domains): ${restores.length}`);
if (missing.length) {
  console.log(`\n${missing.length} destination(s) do not exist on Nashroam yet; the build test will fail until they are remapped:`);
  for (const r of missing.slice(0, 25)) console.log(`  ${r.source} → ${r.destination ?? '(none)'}`);
  if (missing.length > 25) console.log(`  … and ${missing.length - 25} more`);
}
if (gaps.length) console.log(`\nnashville.com sections with no Nashroam page (flag, do not scaffold): ${gaps.join(', ')}`);

if (dryRun) {
  console.log('\nDry run; nothing written.');
} else {
  fs.writeFileSync(REDIRECTS_JSON, `${JSON.stringify(map, null, 2)}\n`);
  fs.writeFileSync(RESTORES_JSON, `${JSON.stringify({ generatedAt: map.generatedAt, threshold: RESTORE_THRESHOLD, items: restores }, null, 2)}\n`);
  console.log(`\nWrote ${path.relative(process.cwd(), REDIRECTS_JSON)}, ${path.relative(process.cwd(), RESTORES_JSON)}, ${path.relative(process.cwd(), ROUTES_JSON)}`);
}
