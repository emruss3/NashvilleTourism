'use client';

import { useEffect } from 'react';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';

/** Fires the 75% scroll event once per guide view. */
export default function ScrollDepth({ slug }: { slug: string }) {
  useEffect(() => {
    let fired = false;
    function onScroll() {
      if (fired) return;
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.body.scrollHeight;
      if (total > 0 && scrolled / total >= 0.75) {
        fired = true;
        track(ANALYTICS_EVENTS.GUIDE_SCROLLED_75, { item_id: slug, item_type: 'Guide' });
        window.removeEventListener('scroll', onScroll);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [slug]);

  return null;
}
