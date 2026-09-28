/**
 * Signed reply tokens for venues.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDetailsToken, createReplyToken, detailsUrl, replyUrl, verifyDetailsToken, verifyReplyToken } from '../src/lib/events/magic-link.ts';

const secret = 'test-secret-with-enough-length-1234';
const lead = '2f1a1e2e-9c9d-4c2b-8a1b-0f0e0d0c0b0a';

test('a token round-trips and names its lead', () => {
  const token = createReplyToken(lead, { secret, now: new Date('2026-09-28T12:00:00Z') })!;
  assert.deepEqual(verifyReplyToken(token, { secret, now: new Date('2026-10-01T12:00:00Z') }), { leadId: lead });
  assert.match(replyUrl('https://nashroam.com/', lead, { secret })!, /^https:\/\/nashroam\.com\/private-events\/reply\/[^/]+\/$/);
});

test('tampering, expiry and a missing secret are refused', () => {
  const token = createReplyToken(lead, { secret, now: new Date('2026-09-28T12:00:00Z'), ttlDays: 1 })!;
  assert.deepEqual(verifyReplyToken(token.slice(0, -2) + 'zz', { secret }), { error: 'bad_signature' });
  assert.deepEqual(verifyReplyToken(token.replace(lead, '2f1a1e2e-9c9d-4c2b-8a1b-0f0e0d0c0b0b'), { secret }), { error: 'bad_signature' });
  assert.deepEqual(verifyReplyToken(token, { secret, now: new Date('2026-10-05T12:00:00Z') }), { error: 'expired' });
  assert.deepEqual(verifyReplyToken('nope', { secret }), { error: 'malformed' });
  assert.deepEqual(verifyReplyToken(token, { secret: 'another-secret-of-adequate-length' }), { error: 'bad_signature' });
  assert.equal(createReplyToken(lead, { secret: undefined, now: new Date() }), process.env.EVENTS_MAGIC_LINK_SECRET ? createReplyToken(lead) : undefined);
});

test('planner detail tokens round-trip and are never accepted as venue reply tokens', () => {
  const inquiry = '3a2b1c0d-1111-4222-8333-444455556666';
  const token = createDetailsToken(inquiry, { secret, now: new Date('2026-09-28T12:00:00Z') })!;
  assert.deepEqual(verifyDetailsToken(token, { secret, now: new Date('2026-11-01T12:00:00Z') }), { inquiryId: inquiry });
  assert.deepEqual(verifyReplyToken(token, { secret }), { error: 'bad_signature' }, 'a details token is not a reply token');
  assert.deepEqual(verifyDetailsToken(createReplyToken(inquiry, { secret })!, { secret }), { error: 'bad_signature' }, 'a reply token is not a details token');
  assert.deepEqual(verifyDetailsToken(token, { secret, now: new Date('2027-01-01T12:00:00Z') }), { error: 'expired' });
  assert.match(detailsUrl('https://nashroam.com', inquiry, { secret })!, /^https:\/\/nashroam\.com\/private-events\/brief\/details\/[^/]+\/$/);
});
