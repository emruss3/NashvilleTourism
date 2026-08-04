'use client';

import { ANALYTICS_EVENTS, track } from '@/lib/analytics';

/**
 * Commercial clickout for restaurant reservations. When no URL is configured
 * we say so plainly rather than rendering a dead button.
 */
export default function ReservationLink({
  url,
  name,
  slug,
  platform,
}: {
  url?: string;
  name: string;
  slug: string;
  platform?: string;
}) {
  if (!url) {
    return (
      <p className="text-sm text-ink-soft">
        No reservation link on file. Contact the restaurant directly.
      </p>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="btn-primary w-full"
      onClick={() =>
        track(ANALYTICS_EVENTS.RESTAURANT_RESERVATION_CLICKED, {
          item_id: slug,
          item_name: name,
          partner: platform,
        })
      }
    >
      Book a table{platform ? ` on ${platform}` : ''}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
