/**
 * Venue-to-neighborhood matching for live events on /explore/.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { venueNeighborhood } from '../src/lib/event-neighborhoods.ts';

test('well-known ticketed venues resolve to the neighborhood we cover', () => {
  assert.equal(venueNeighborhood('Ryman Auditorium'), 'downtown-broadway');
  assert.equal(venueNeighborhood('The Ryman'), 'downtown-broadway');
  assert.equal(venueNeighborhood('Bridgestone Arena - Nashville'), 'downtown-broadway');
  assert.equal(venueNeighborhood('3rd & Lindsley'), 'downtown-broadway');
  assert.equal(venueNeighborhood('Grand Ole Opry House'), 'music-valley-opryland');
  assert.equal(venueNeighborhood('The Station Inn'), 'the-gulch');
  assert.equal(venueNeighborhood('The Basement East'), 'east-nashville');
  assert.equal(venueNeighborhood('The Basement'), 'wedgewood-houston');
  assert.equal(venueNeighborhood('EXIT/IN'), 'midtown');
  assert.equal(venueNeighborhood('Marathon Music Works'), 'germantown');
  assert.equal(venueNeighborhood('Belcourt Theatre'), 'hillsboro-village');
  assert.equal(venueNeighborhood('The Bluebird Cafe'), 'green-hills');
});

test('unknown venues are left unplaced rather than guessed', () => {
  assert.equal(venueNeighborhood('Franklin Theatre'), undefined);
  assert.equal(venueNeighborhood(''), undefined);
  assert.equal(venueNeighborhood('Eastside Bowl'), undefined);
});
