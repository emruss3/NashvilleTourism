import { formatNashville } from './sla.ts';

/**
 * What a planner sees per venue on /private-events/status/{reference}/.
 * Pure: derived from the lead row's timestamps and status, and the clock.
 */
export type LeadView = 'waiting' | 'overdue' | 'replied' | 'proposal' | 'unavailable' | 'booked';

export interface LeadLike {
  status: string;
  first_reply_at?: string | null;
  sla_deadline_at: string;
}

export function leadView(lead: LeadLike, now = new Date()): LeadView {
  if (lead.status === 'booked') return 'booked';
  if (lead.status === 'lost') return 'unavailable';
  if (lead.status === 'proposal') return 'proposal';
  if (lead.first_reply_at || lead.status === 'replied') return 'replied';
  return new Date(lead.sla_deadline_at).getTime() < now.getTime() ? 'overdue' : 'waiting';
}

export const LEAD_VIEW_LABEL: Record<LeadView, string> = {
  waiting: 'Waiting for a reply',
  overdue: 'Reply overdue; we are chasing',
  replied: 'Replied',
  proposal: 'Sent a proposal or hold',
  unavailable: 'Date unavailable',
  booked: 'Booked',
};

/** "replies by Tue, Sep 29, 5:00 PM" plus a plain countdown, in Nashville time. */
export function replyDueLine(deadlineIso: string, now = new Date()): { by: string; countdown: string } {
  const deadline = new Date(deadlineIso);
  const ms = deadline.getTime() - now.getTime();
  const hours = Math.round(Math.abs(ms) / 3_600_000);
  const rel = hours < 1 ? 'under an hour' : hours < 48 ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : `${Math.round(hours / 24)} days`;
  return { by: formatNashville(deadline), countdown: ms >= 0 ? `in ${rel}` : `${rel} ago` };
}
