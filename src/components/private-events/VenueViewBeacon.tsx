'use client';

import { useEffect } from 'react';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';

/** Fires once per venue page render. Sponsored placement is reported as such. */
export default function VenueViewBeacon({ slug, name, neighborhood, sponsored }: { slug: string; name: string; neighborhood: string; sponsored: boolean }) {
  useEffect(() => {
    track(ANALYTICS_EVENTS.EVENTS_VENUE_VIEWED, { item_id: slug, item_name: name, item_type: 'event_venue', neighborhood, placement: sponsored ? 'sponsored' : 'editorial' });
  }, [slug, name, neighborhood, sponsored]);
  return null;
}
