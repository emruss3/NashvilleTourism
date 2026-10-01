'use client';

import Link from 'next/link';
import { ANALYTICS_EVENTS, track, type AnalyticsEvent } from '@/lib/analytics';
import { isStayHref } from '@/lib/stay-links';

/**
 * Commercial clickout used for hotels, tickets, and activities. Our booking
 * site (white-label placement, or any URL on the stay host) opens in the
 * same tab: checkout is part of one site. Other partners open in a new tab
 * with `rel="sponsored"`. Site-relative URLs render as an in-app link (the
 * hotel marketplace) and are tracked the same way.
 */
export default function BookingLink({
  url,
  label,
  name,
  slug,
  event,
  partner,
  placement,
  clientReference,
  hotelId,
  variant = 'primary',
  className = 'w-full',
}: {
  url?: string;
  label: string;
  name: string;
  slug: string;
  event: AnalyticsEvent;
  partner?: string;
  placement?: 'editorial' | 'sponsored' | 'affiliate' | 'whitelabel';
  clientReference?: string;
  hotelId?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}) {
  if (!url) {
    return <p className="text-sm text-ink-soft">No booking link on file yet.</p>;
  }
  const payload = { item_id: slug, item_name: name, partner, placement, client_reference: clientReference, hotel_id: hotelId };
  const classes = `${variant === 'primary' ? 'btn-primary' : 'btn-secondary'} ${className}`;

  if (url.startsWith('/')) {
    return (
      <Link href={url} className={classes} onClick={() => track(event, payload)}>
        {label}
      </Link>
    );
  }

  if (placement === 'whitelabel' || isStayHref(url)) {
    return (
      <a href={url} rel="noopener noreferrer sponsored" className={classes} onClick={() => track(event, payload)}>
        {label}
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer sponsored" className={classes} onClick={() => track(event, payload)}>
      {label}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export { ANALYTICS_EVENTS };
