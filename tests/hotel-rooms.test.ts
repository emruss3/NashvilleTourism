/**
 * Room grouping for the hotel room list (KindredTrips pattern): one card per
 * room name and board, cheapest first, photos matched from the hotel's room
 * catalog by normalized name. Runs before `next build`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupRooms, jaccard, mapDetail, mapRoomRate, matchCatalogRoom, normalizedName, type CatalogRoom, type RoomRate } from '../src/lib/hotel-rooms.ts';

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
  { name: 'Deluxe King Room', maxOccupancy: 2, size: 32, sizeUnit: 'm2', bedTypes: ['1 king'], amenities: ['Wi-Fi'], photos: [{ url: 'https://static.cupid.travel/k1.jpg' }, { url: 'https://static.cupid.travel/k2.jpg' }] },
  { name: 'Two Queen Beds', maxOccupancy: 4, bedTypes: ['2 queen'], amenities: [], photos: [{ url: 'https://static.cupid.travel/q1.jpg' }] },
  { name: 'Suite with Balcony', maxOccupancy: 3, bedTypes: [], amenities: [], photos: [] },
];

test('normalized names drop noise words so provider and catalog names match', () => {
  assert.equal(normalizedName('Deluxe King Room, Non Smoking'), 'deluxe king');
  assert.equal(normalizedName('DELUXE KING'), 'deluxe king');
  assert.equal(jaccard(['deluxe', 'king'], ['deluxe', 'king', 'city', 'view']), 0.5);
});

test('catalog match: exact first, then token overlap at 0.5 or above, else none', () => {
  assert.equal(matchCatalogRoom('Deluxe King Room - Non-Smoking', catalog)?.name, 'Deluxe King Room');
  assert.equal(matchCatalogRoom('Deluxe King City View', catalog)?.name, 'Deluxe King Room');
  assert.equal(matchCatalogRoom('Penthouse Loft', catalog), undefined);
});

test('groups by room name and board; cheapest on the card, rest as variants in price order', () => {
  const rates = [
    rate({ roomName: 'Deluxe King Room', total: 520, refundable: 'RFN', offerId: 'a' }),
    rate({ roomName: 'Deluxe King Room, Non Smoking', total: 480, refundable: 'NRFN', offerId: 'b' }),
    rate({ roomName: 'Deluxe King Room', total: 560, boardType: 'BB', boardName: 'Bed and Breakfast', offerId: 'c' }),
    rate({ roomName: 'Two Queen Beds', total: 450, offerId: 'd' }),
  ];
  const groups = groupRooms(rates, { rooms: catalog, images: [] });
  assert.deepEqual(
    groups.map((g) => [g.name, g.boardType, g.cheapest.total.amount, g.variants.length]),
    [
      ['Two Queen Beds', 'RO', 450, 1],
      ['Deluxe King Room, Non Smoking', 'RO', 480, 2],
      ['Deluxe King Room', 'BB', 560, 1],
    ],
  );
  const king = groups[1];
  assert.deepEqual(king.variants.map((v) => v.offerId), ['b', 'a']);
  assert.equal(king.refundableAvailable, true);
  assert.equal(king.size, '32 m²');
  assert.deepEqual(king.bedTypes, ['1 king']);
});

test('photos: matched catalog photos rotate across groups sharing a room; hotel gallery is the fallback', () => {
  const rates = [
    rate({ roomName: 'Deluxe King Room', total: 500 }),
    rate({ roomName: 'Deluxe King Room', total: 540, boardType: 'BB', boardName: 'Breakfast' }),
    rate({ roomName: 'Penthouse Loft', total: 900 }),
  ];
  const groups = groupRooms(rates, { rooms: catalog, images: [{ url: 'https://static.cupid.travel/h1.jpg' }, { url: 'https://static.cupid.travel/h2.jpg' }] });
  const [kingRo, kingBb, loft] = groups;
  assert.equal(kingRo.photosSource, 'matched');
  assert.equal(kingRo.photos[0].url, 'https://static.cupid.travel/k1.jpg');
  assert.equal(kingBb.photos[0].url, 'https://static.cupid.travel/k2.jpg', 'second group on the same room starts on the next photo');
  assert.equal(loft.photosSource, 'hotel');
  assert.equal(loft.photos[0].url, 'https://static.cupid.travel/h1.jpg');
  const bare = groupRooms([rate({ roomName: 'Penthouse Loft', total: 900 })]);
  assert.equal(bare[0].photosSource, 'none');
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
