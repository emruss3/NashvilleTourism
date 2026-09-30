/**
 * Room grouping for the hotel room list (KindredTrips pattern, then
 * further): every supplier spelling of a room lands on the catalog room it
 * matches, one card per room type, one option line per board and
 * cancellation kind, photos matched by normalized name. Runs before
 * `next build`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { displayRoomName, groupRooms, jaccard, mapDetail, mapRoomRate, matchCatalogRoom, normalizedName, type CatalogRoom, type RoomRate } from '../src/lib/hotel-rooms.ts';

function rate(over: Partial<Omit<RoomRate, 'total'>> & { roomName: string; total: number; offerId?: string }): RoomRate {
  return {
    offerId: over.offerId ?? `offer-${over.roomName}-${over.total}`,
    rateId: over.rateId,
    roomTypeId: over.roomTypeId,
    roomName: over.roomName,
    boardType: over.boardType ?? 'RO',
    boardName: over.boardName ?? 'Room Only',
    maxOccupancy: over.maxOccupancy ?? 2,
    refundable: over.refundable,
    cancelBy: over.cancelBy,
    total: { amount: over.total, currency: 'USD' },
    nightly: { amount: over.total / 2, currency: 'USD' },
    nights: 2,
    ssp: over.ssp,
    perks: over.perks ?? [],
    remarks: over.remarks,
    paymentTypes: over.paymentTypes ?? [],
  };
}

const catalog: CatalogRoom[] = [
  { name: 'Classic Room One King Bed', maxOccupancy: 2, size: 32, sizeUnit: 'm2', bedTypes: ['1 king'], amenities: ['Wi-Fi'], photos: [{ url: 'https://static.cupid.travel/k1.jpg' }, { url: 'https://static.cupid.travel/k2.jpg' }] },
  { name: 'Classic Corner One King Bed', maxOccupancy: 2, bedTypes: ['1 king'], amenities: [], photos: [{ url: 'https://static.cupid.travel/c1.jpg' }] },
  { name: 'Classic Room Two Queen Beds', maxOccupancy: 4, bedTypes: ['2 queen'], amenities: [], photos: [{ url: 'https://static.cupid.travel/q1.jpg' }] },
  { name: 'King Room with Adapted Tub - Mobility Accessible', maxOccupancy: 2, bedTypes: [], amenities: [], photos: [] },
];

test('normalized names drop supplier filler so every spelling of a room agrees', () => {
  const spellings = ['Classic Room, 1 King Bed, Non Smoking', 'CLASSIC, KING BED', 'Classic King, Guest room, 1 King', 'classic room 1 king bed', 'Classic Room(1 King Bed, Non Smoking)', 'GUEST ROOM, CLASSIC, KING BED'];
  for (const s of spellings) assert.equal(normalizedName(s), 'classic king', s);
  assert.equal(normalizedName('CLASSIC ROOM TWO QUEEN BEDS'), normalizedName('Classic 2 Queens, Guest room, 2 Queen'));
  assert.equal(jaccard(['classic', 'king'], ['classic', 'corner', 'king']), 2 / 3);
});

test('catalog match: exact first, then overlap at 0.5 or above, but distinguishing words must agree', () => {
  assert.equal(matchCatalogRoom('CLASSIC, KING BED', catalog)?.name, 'Classic Room One King Bed');
  assert.equal(matchCatalogRoom('Classic Room, 1 King Bed, Corner', catalog)?.name, 'Classic Corner One King Bed');
  // "corner" is a distinguishing word: a plain classic king never lands on the corner room, and vice versa.
  assert.equal(matchCatalogRoom('Classic 1 King Bed, City', catalog)?.name, 'Classic Room One King Bed');
  // An accessible room never merges into the standard one; with no close accessible catalog room it stands alone.
  assert.equal(matchCatalogRoom('CLASSIC, KING BED, ACCESSIBLE', catalog), undefined);
  assert.equal(matchCatalogRoom('King, Mobility Accessible, Adapted Tub', catalog)?.name, 'King Room with Adapted Tub - Mobility Accessible');
  assert.equal(matchCatalogRoom('Penthouse Loft', catalog), undefined);
});

test('one card per room type: supplier spellings merge, one option per board and cancellation kind, cheapest first', () => {
  const rates = [
    rate({ roomName: 'Classic Room, 1 King Bed, Non Smoking', total: 520, refundable: 'NRFN', offerId: 'a' }),
    rate({ roomName: 'CLASSIC, KING BED', total: 480, refundable: 'NRFN', offerId: 'b' }),
    rate({ roomName: 'Classic King, Guest room, 1 King', total: 610, refundable: 'RFN', offerId: 'c' }),
    rate({ roomName: 'classic room 1 king bed', total: 640, refundable: 'RFN', offerId: 'c2' }),
    rate({ roomName: 'Classic Room, 1 King Bed', total: 560, boardType: 'BI', boardName: 'Breakfast Included', refundable: 'NRFN', offerId: 'd' }),
    rate({ roomName: 'Classic Room, 1 King Bed, Corner', total: 700, refundable: 'NRFN', offerId: 'e' }),
    rate({ roomName: 'Two Queen Room', total: 450, refundable: 'NRFN', offerId: 'f' }),
  ];
  const groups = groupRooms(rates, { rooms: catalog, images: [] });
  assert.deepEqual(
    groups.map((g) => [g.name, g.cheapest.total.amount, g.rateCount, g.variants.map((v) => v.offerId)]),
    [
      ['Classic Room Two Queen Beds', 450, 1, ['f']],
      ['Classic Room One King Bed', 480, 5, ['b', 'd', 'c']],
      ['Classic Corner One King Bed', 700, 1, ['e']],
    ],
  );
  const king = groups[1];
  assert.equal(king.refundableAvailable, true);
  assert.equal(king.size, '32 m²');
  assert.deepEqual(king.bedTypes, ['1 king']);
});

test('photos: matched catalog photos, rotated when two cards share a room; hotel gallery is the fallback', () => {
  const rates = [
    rate({ roomName: 'Classic King', total: 500 }),
    rate({ roomName: 'Classic King, City', total: 540 }),
    rate({ roomName: 'Penthouse Loft', total: 900 }),
  ];
  const groups = groupRooms(rates, { rooms: catalog, images: [{ url: 'https://static.cupid.travel/h1.jpg' }, { url: 'https://static.cupid.travel/h2.jpg' }] });
  // Both classic king spellings match the same catalog room, so they are one card.
  assert.equal(groups.length, 2);
  assert.equal(groups[0].photosSource, 'matched');
  assert.equal(groups[0].photos[0].url, 'https://static.cupid.travel/k1.jpg');
  assert.equal(groups[1].photosSource, 'hotel');
  assert.equal(groups[1].photos[0].url, 'https://static.cupid.travel/h1.jpg');
  const shared = groupRooms([rate({ roomName: 'Classic King', total: 500 }), rate({ roomName: 'Classic King Corner', total: 600 })], { rooms: [catalog[0], { ...catalog[1], photos: catalog[0].photos }], images: [] });
  assert.equal(shared[1].photos[0].url, 'https://static.cupid.travel/k1.jpg', 'different catalog rooms keep their own first photo');
  const bare = groupRooms([rate({ roomName: 'Penthouse Loft', total: 900 })]);
  assert.equal(bare[0].photosSource, 'none');
});

test('display names: catalog name when matched, title case for shouting suppliers', () => {
  assert.equal(displayRoomName('CLASSIC, KING BED, CORNER'), 'Classic, King Bed, Corner');
  assert.equal(displayRoomName('classic room,1 king bed,mobility accessible,tub'), 'Classic Room, 1 King Bed, Mobility Accessible, Tub');
  assert.equal(displayRoomName('Deluxe Room, 1 King Bed'), 'Deluxe Room, 1 King Bed');
});

test('offer ids pass through untouched, however long', () => {
  const offerId = 'A'.repeat(1200);
  const mapped = mapRoomRate({ offerId, roomName: 'King', total: { amount: 300, currency: 'USD' }, nightly: { amount: 150, currency: 'USD' }, nights: 2 });
  assert.equal(mapped?.offerId, offerId);
  assert.equal(groupRooms([mapped!])[0].cheapest.offerId, offerId);
});

test('mapRoomRate and mapDetail drop malformed rows instead of throwing', () => {
  assert.equal(mapRoomRate({ roomName: 'King' }), undefined);
  assert.equal(mapRoomRate({ total: { amount: 1 }, nightly: { amount: 1 } }), undefined);
  assert.equal(mapDetail(null), undefined);
  const detail = mapDetail({ hotelId: 'lp12345', name: 'Hotel', images: [{ url: 'https://x/1.jpg' }, { nope: true }], rooms: [{ name: 'King', photos: [{ url: 'https://x/k.jpg' }, {}] }, { photos: [] }] });
  assert.equal(detail?.images.length, 1);
  assert.equal(detail?.rooms.length, 1);
  assert.equal(detail?.rooms[0].photos.length, 1);
});
