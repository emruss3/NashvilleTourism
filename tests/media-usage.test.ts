/**
 * Visit Music City usage guard. Runs before `next build` (package.json
 * `prebuild`) and on demand with `npm run test:media`.
 *
 * The Nashville Convention & Visitors Corp usage statement allows their
 * photography for promoting Nashville as a destination and in tourism
 * articles, and forbids for-profit, commercial, merchandising and
 * advertising use. So CVC-licensed keys may appear only on editorial
 * surfaces. This test fails the build if one is referenced from a commercial
 * surface: the shop, the bag, advertising, private events, affiliate hotel
 * and tour modules, or the listing fallbacks that feed affiliate cards.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const ROOT = process.cwd();
const MEDIA = fs.readFileSync(path.join(ROOT, 'src/lib/media.ts'), 'utf8');
const IMPORTED = fs.existsSync(path.join(ROOT, 'src/lib/media-cvc.ts')) ? fs.readFileSync(path.join(ROOT, 'src/lib/media-cvc.ts'), 'utf8') : '';

/** Keys whose registry entry carries the Visit Music City licence. */
function cvcKeys(): string[] {
  const keys: string[] = [];
  const entry = /'([a-z-]+\/[a-z0-9-]+)':\s*\{([\s\S]*?)\n  \},?/g;
  let m: RegExpExecArray | null;
  for (const text of [MEDIA, IMPORTED]) {
    entry.lastIndex = 0;
    while ((m = entry.exec(text))) {
      if (/licence:\s*'[^']*Visit Music City usage statement/.test(m[2])) keys.push(m[1]);
    }
  }
  return keys;
}

const COMMERCIAL_SURFACES = [
  'src/app/shop',
  'src/app/bag',
  'src/app/advertising',
  'src/app/private-events',
  'src/components/private-events',
  'src/components/home/ShopFeature.tsx',
  'src/components/home/ToursHotels.tsx',
  'src/components/hotels',
  'src/components/tours',
  'src/components/BookingWidget.tsx',
  'src/components/BookingLink.tsx',
  'src/app/tours',
  'src/app/hotels',
  'src/app/where-to-stay',
];

function walk(p: string): string[] {
  const full = path.join(ROOT, p);
  if (!fs.existsSync(full)) return [];
  if (fs.statSync(full).isFile()) return [full];
  return fs.readdirSync(full, { withFileTypes: true }).flatMap((e) => walk(path.join(p, e.name)));
}

test('CVC-licensed keys are declared and allowlisted for production', () => {
  const keys = cvcKeys();
  assert.ok(keys.length > 0, 'expected at least one Visit Music City licensed key');
  const list = MEDIA.match(/export const CVC_EDITORIAL_KEYS[^;]*;/)?.[0] ?? '';
  for (const key of keys) {
    const imported = IMPORTED.includes(`'${key}': {`); // media-cvc.ts is allowlisted wholesale via CVC_IMPORTED_KEYS
    assert.ok(imported || list.includes(`'${key}'`) || !MEDIA.includes(`'${key}': {`), `${key} carries the CVC licence but is not in CVC_EDITORIAL_KEYS`);
  }
});

test('no CVC-licensed key is referenced from a commercial surface', () => {
  const keys = cvcKeys();
  const offenders: string[] = [];
  for (const surface of COMMERCIAL_SURFACES) {
    for (const file of walk(surface)) {
      if (!/\.(tsx?|mjs|js)$/.test(file)) continue;
      const text = fs.readFileSync(file, 'utf8');
      for (const key of keys) if (text.includes(`'${key}'`) || text.includes(`"${key}"`)) offenders.push(`${path.relative(ROOT, file)} → ${key}`);
    }
  }
  // Listing fallbacks feed affiliate hotel and restaurant cards.
  const placements = fs.readFileSync(path.join(ROOT, 'src/lib/media-placements.ts'), 'utf8');
  const fallbackBlock = placements.slice(placements.indexOf('const AREA_FALLBACKS'), placements.indexOf('export function listingFallbackKey'));
  for (const key of keys) if (fallbackBlock.includes(`'${key}'`)) offenders.push(`media-placements AREA_FALLBACKS → ${key}`);
  assert.deepEqual(offenders, [], `Visit Music City photography on a commercial surface:\n${offenders.join('\n')}`);
});
