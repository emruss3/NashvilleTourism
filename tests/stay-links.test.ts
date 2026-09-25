/**
 * White-label deep links. Runs before `next build` (package.json `prebuild`)
 * and on demand with `npm run test:stay`.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { clientReference, occupanciesParam, splitOccupancy, stayCheckoutHref, stayHotelHref, stayListingHref, stayHost } from '../src/lib/stay-links.ts';

const HOST = 'stay.nashroam.com';

function withEnv(values: Record<string, string | undefined>, fn: () => void) {
  const previous: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(values)) {
    previous[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test('occupancies is base64 of one object per room', () => {
  assert.deepEqual(JSON.parse(Buffer.from(occupanciesParam({ adults: 2 }), 'base64').toString()), [{ adults: 2, children: [] }]);
  assert.deepEqual(JSON.parse(Buffer.from(occupanciesParam({ adults: 3, children: [4, 9], rooms: 2 }), 'base64').toString()), [
    { adults: 2, children: [4, 9] },
    { adults: 1, children: [] },
  ]);
  assert.deepEqual(JSON.parse(Buffer.from(occupanciesParam(), 'base64').toString()), [{ adults: 2, children: [] }]);
});

test('large parties split into rooms of two instead of clamping', () => {
  const count = (rooms: { adults: number }[]) => rooms.reduce((n, r) => n + r.adults, 0);
  assert.equal(splitOccupancy({ adults: 4 }).length, 1, 'four adults still share one room');
  assert.deepEqual(splitOccupancy({ adults: 5 }), [{ adults: 2, children: [] }, { adults: 2, children: [] }, { adults: 1, children: [] }]);
  const sixteen = splitOccupancy({ adults: 16 });
  assert.equal(sixteen.length, 8);
  assert.equal(count(sixteen), 16, 'nobody is dropped');
  assert.ok(sixteen.every((r) => r.adults === 2));
  assert.equal(count(splitOccupancy({ adults: 20 })), 20, 'the selectors\' maximum survives intact');
  assert.equal(count(splitOccupancy({ adults: 40 })), 20, 'above the selector maximum is capped, never silently truncated to one room');
  assert.deepEqual(splitOccupancy({ adults: 3, rooms: 2, children: [6] }), [{ adults: 2, children: [6] }, { adults: 1, children: [] }], 'explicit rooms win');
});

test('clientReference is short, lower-case and free of PII or dates', () => {
  assert.equal(clientReference('hotel', 'w-nashville'), 'nsh:hotel:w-nashville');
  assert.equal(clientReference('Hub', 'Hotels With Pools!'), 'nsh:hub:hotels-with-pools');
  assert.equal(clientReference('market'), 'nsh:market:nashville');
  assert.ok(clientReference('x', 'a'.repeat(100)).length <= 50);
});

test('hotel link carries dates, occupancy, language, currency and reference', () => {
  withEnv({ NEXT_PUBLIC_STAY_HOST: HOST }, () => {
    const url = new URL(stayHotelHref('lp65570334', { checkin: '2026-10-09', checkout: '2026-10-11', adults: 2, clientReference: 'nsh:hotel:w-nashville' })!);
    assert.equal(url.origin, `https://${HOST}`);
    assert.equal(url.pathname, '/hotels/lp65570334');
    assert.equal(url.searchParams.get('checkin'), '2026-10-09');
    assert.equal(url.searchParams.get('checkout'), '2026-10-11');
    assert.equal(url.searchParams.get('occupancies'), Buffer.from('[{"adults":2,"children":[]}]').toString('base64'));
    assert.equal(url.searchParams.get('language'), 'en');
    assert.equal(url.searchParams.get('currency'), 'USD');
    assert.equal(url.searchParams.get('clientReference'), 'nsh:hotel:w-nashville');
    assert.equal(url.searchParams.get('needFreeCancellation'), null);
  });
});

test('empty dates and occupancy are omitted; invalid dates are dropped', () => {
  withEnv({ NEXT_PUBLIC_STAY_HOST: `https://${HOST}/` }, () => {
    assert.equal(stayHost(), HOST, 'scheme and trailing slash are stripped');
    const bare = new URL(stayHotelHref('lp65576337')!);
    assert.deepEqual([...bare.searchParams.keys()].sort(), ['currency', 'language']);
    const bad = new URL(stayHotelHref('lp65576337', { checkin: '2026-10-11', checkout: '2026-10-09', needBreakfast: true })!);
    assert.equal(bad.searchParams.get('checkin'), null);
    assert.equal(bad.searchParams.get('needBreakfast'), '1');
  });
});

test('listing link uses the configured Place ID and filter params', () => {
  withEnv({ NEXT_PUBLIC_STAY_HOST: HOST, NEXT_PUBLIC_NASHVILLE_PLACE_ID: 'ChIJPZDrEzLsZIgRoNrpodC5P30' }, () => {
    const url = new URL(stayListingHref({ checkin: '2026-10-09', checkout: '2026-10-11', adults: 4, stars: [4, 5], freeCancellation: true, maxPrice: 400, clientReference: 'nsh:market:the-gulch' })!);
    assert.equal(url.pathname, '/hotels');
    assert.equal(url.searchParams.get('placeId'), 'ChIJPZDrEzLsZIgRoNrpodC5P30');
    assert.equal(url.searchParams.get('stars'), '4,5');
    assert.equal(url.searchParams.get('freeCancellation'), '2');
    assert.equal(url.searchParams.get('max_price'), '400');
    assert.equal(url.searchParams.get('clientReference'), 'nsh:market:the-gulch');
  });
});

test('no host means no white-label link; direct checkout stays behind its flag', () => {
  withEnv({ NEXT_PUBLIC_STAY_HOST: undefined, NEXT_PUBLIC_STAY_DIRECT_CHECKOUT: undefined }, () => {
    assert.equal(stayHost(), undefined);
    assert.equal(stayHotelHref('lp65576337', { adults: 2 }), undefined);
    assert.equal(stayListingHref(), undefined);
  });
  withEnv({ NEXT_PUBLIC_STAY_HOST: HOST, NEXT_PUBLIC_STAY_DIRECT_CHECKOUT: 'false' }, () => {
    assert.equal(stayCheckoutHref('offer-1'), undefined);
  });
  withEnv({ NEXT_PUBLIC_STAY_HOST: HOST, NEXT_PUBLIC_STAY_DIRECT_CHECKOUT: 'true' }, () => {
    const url = new URL(stayCheckoutHref('offer-1', { clientReference: 'nsh:hotel:x' })!);
    assert.equal(url.pathname, '/booking');
    assert.equal(url.searchParams.get('offerId'), 'offer-1');
  });
});

test('Booking.com hand-offs and provider keys never leak into client code', () => {
  const root = process.cwd();
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|mjs)$/.test(entry.name)) {
        const text = fs.readFileSync(full, 'utf8');
        const rel = path.relative(root, full);
        // The only Booking.com URL left is the per-hotel search fallback in the content file.
        if (/booking\.com/i.test(text) && rel !== 'src/lib/content/hotels.ts' && rel !== 'src/lib/hotel-booking.ts') offenders.push(`${rel}: booking.com`);
        if (/liteapi\.travel|LITEAPI_|sand_[a-z0-9]{8}|prod_[a-z0-9]{8}/.test(text)) offenders.push(`${rel}: LiteAPI host or key`);
        if (/NEXT_PUBLIC_BOOKING_AID|BOOKING_DEMAND/.test(text)) offenders.push(`${rel}: dead Booking env`);
      }
    }
  };
  walk(path.join(root, 'src'));
  assert.deepEqual(offenders, []);
});
