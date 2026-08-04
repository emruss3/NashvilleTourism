'use client';

import { ANALYTICS_EVENTS, track, type AnalyticsEvent } from '@/lib/analytics';

/**
 * Generic commercial clickout used for hotels, tickets, and activities.
 * `rel="sponsored"` is set on every monetized link.
 */
export default function BookingLink({
  url,
  label,
  name,
  slug,
  event,
  partner,
  placement,
  variant = 'primary',
}: {
  url?: string;
  label: string;
  name: string;
  slug: string;
  event: AnalyticsEvent;
  partner?: string;
  placement?: 'editorial' | 'sponsored' | 'affiliate';
  variant?: 'primary' | 'secondary';
}) {
  if (!url) {
    return (
      <p className="text-sm text-ink-soft">
        No booking link on file yet. Add one in the CMS to enable this call to action.
      </p>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={`${variant === 'primary' ? 'btn-primary' : 'btn-secondary'} w-full`}
      onClick={() => track(event, { item_id: slug, item_name: name, partner, placement })}
    >
      {label}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
