/**
 * Public pages show price bands, never a space's stored amounts. This walks
 * every source file under the two public private-events directories and
 * fails on any reference to a space's minimum spend, room fee, F&B minimum,
 * buyout or per-person floor, or on `formatUsd` applied to anything but a
 * package price. The lib keeps the exact cents for ranking and fee
 * estimates; the pages only ever receive the band. Runs before `next build`.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const ROOTS = ['src/components/private-events', 'src/app/private-events'];
const STORED_FIELDS = ['minSpendCents', 'roomFeeCents', 'fbMinimumCents', 'buyoutFromCents', 'perPersonCents', 'min_spend_cents', 'room_fee_cents', 'fb_minimum_cents', 'buyout_from_cents', 'per_person_cents', 'spaceEventCost'];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

const files = ROOTS.flatMap((r) => walk(r));

test('the public private-events tree has files to check', () => {
  assert.ok(files.length > 10, `found ${files.length} files`);
});

test('no public component or page reads a space’s stored amount', () => {
  const offenders: string[] = [];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    for (const field of STORED_FIELDS) {
      // perPersonMaxCents is the public per-person ceiling and is allowed.
      const re = new RegExp(`\\b${field}\\b`);
      if (re.test(src)) offenders.push(`${file}: ${field}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('formatUsd only ever formats a package price', () => {
  const offenders: string[] = [];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/formatUsd\(([^)]*)\)/g)) {
      const arg = m[1];
      if (!/pkg\.priceCents|package\.priceCents|p\.priceCents/.test(arg)) offenders.push(`${file}: formatUsd(${arg.trim()})`);
    }
  }
  assert.deepEqual(offenders, []);
});
