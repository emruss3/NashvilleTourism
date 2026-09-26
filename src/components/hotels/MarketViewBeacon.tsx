'use client';

import { useEffect } from 'react';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';

/** Fires once per render of a marketplace rail: which area, how many results, whether the cache answered. */
export default function MarketViewBeacon({ area, count, cached, surface }: { area: string; count: number; cached: boolean; surface: string }) {
  useEffect(() => {
    track(ANALYTICS_EVENTS.HOTEL_MARKET_VIEWED, { item_id: `${surface}:${area}`, item_type: 'hotels', neighborhood: area, result_count: count, cached, partner: 'LiteAPI', placement: 'whitelabel' });
  }, [area, count, cached, surface]);
  return null;
}
