/**
 * Whether a brief sent from this deployment is delivered: stored, routed to
 * venues and emailed. Production only, and only while
 * `EVENTS_INQUIRY_DELIVERY` is not `off`. Every other build (Vercel preview,
 * local) is a private preview: the intake route answers with a labeled
 * "not sent" receipt, writes nothing, emails nobody and calls no lead
 * system. Server-side; the pages read the same answer to label themselves.
 */
export function inquiryDeliveryEnabled(): boolean {
  const production = (process.env.VERCEL_ENV ?? '').toLowerCase() === 'production';
  const paused = (process.env.EVENTS_INQUIRY_DELIVERY ?? '').toLowerCase() === 'off';
  return production && !paused;
}

/** The planner-facing line for a build where delivery is off. */
export const PREVIEW_NOT_SENT = 'Inquiry drafts are not sent from this build. Nothing goes to a venue, the events desk or any lead system.';
