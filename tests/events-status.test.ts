/**
 * Planner status page: what each lead row reads as, and the reply-by line.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { leadView, replyDueLine } from '../src/lib/events/status.ts';

const now = new Date('2026-09-29T15:00:00Z');

test('a lead reads as waiting, overdue, replied, proposal, unavailable or booked', () => {
  assert.equal(leadView({ status: 'routed', sla_deadline_at: '2026-09-29T22:00:00Z' }, now), 'waiting');
  assert.equal(leadView({ status: 'routed', sla_deadline_at: '2026-09-29T14:00:00Z' }, now), 'overdue');
  assert.equal(leadView({ status: 'routed', first_reply_at: '2026-09-29T14:30:00Z', sla_deadline_at: '2026-09-29T14:00:00Z' }, now), 'replied', 'a late reply is still a reply');
  assert.equal(leadView({ status: 'replied', sla_deadline_at: '2026-09-29T22:00:00Z' }, now), 'replied');
  assert.equal(leadView({ status: 'proposal', first_reply_at: '2026-09-29T14:30:00Z', sla_deadline_at: '2026-09-29T22:00:00Z' }, now), 'proposal');
  assert.equal(leadView({ status: 'lost', sla_deadline_at: '2026-09-29T22:00:00Z' }, now), 'unavailable');
  assert.equal(leadView({ status: 'booked', sla_deadline_at: '2026-09-29T22:00:00Z' }, now), 'booked');
});

test('the reply-by line is Nashville time with a plain countdown', () => {
  const due = replyDueLine('2026-09-29T22:00:00Z', now);
  assert.equal(due.by, 'Tue, Sep 29, 5:00 PM');
  assert.equal(due.countdown, 'in 7 hours');
  assert.equal(replyDueLine('2026-09-29T14:00:00Z', now).countdown, '1 hour ago');
  assert.equal(replyDueLine('2026-10-03T15:00:00Z', now).countdown, 'in 4 days');
  assert.equal(replyDueLine('2026-09-29T15:20:00Z', now).countdown, 'in under an hour');
});
