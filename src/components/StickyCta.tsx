'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ANALYTICS_EVENTS, track } from '@/lib/analytics';

/**
 * Persistent bottom bar on mobile. The label is chosen from the section the
 * reader is in, so the offer matches their intent rather than being one
 * generic call to action everywhere.
 *
 * Appears after a short scroll so it never covers the hero, and is dismissible.
 */
export default function StickyCta() {
  const pathname = usePathname() || '/';
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Reset visibility between routes so it re-earns its place on each page.
    setVisible(false);
    function onScroll() {
      setVisible(window.scrollY > 500);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  useEffect(() => {
    setDismissed(sessionStorage.getItem('cta-dismissed') === '1');
  }, []);

  // The planner already is the conversion surface; a bar would just cover it.
  if (pathname.startsWith('/plan')) return null;
  if (dismissed || !visible) return null;

  const offer = pickOffer(pathname);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-paper-edge bg-paper-card/97 px-3 py-2.5 backdrop-blur lg:hidden">
      <div className="flex items-center gap-2">
        <Link
          href={offer.href}
          onClick={() => track(ANALYTICS_EVENTS.SPONSOR_CLICKED, { item_id: offer.id, placement: 'editorial' })}
          className="btn-primary flex-1 py-3 text-[15px]"
        >
          {offer.label}
        </Link>
        <button
          type="button"
          aria-label="Dismiss this bar"
          onClick={() => {
            setDismissed(true);
            sessionStorage.setItem('cta-dismissed', '1');
          }}
          className="shrink-0 rounded border border-paper-edge px-3 py-3 text-ink-faint hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function pickOffer(pathname: string): { label: string; href: string; id: string } {
  if (pathname.startsWith('/music') || pathname.startsWith('/events')) {
    return { label: "View tonight's live music", href: '/live-music-tonight/', id: 'cta_live_music' };
  }
  if (pathname.startsWith('/hotels') || pathname.includes('where-to-stay')) {
    return { label: 'Check Availability', href: '/where-to-stay/', id: 'cta_hotels' };
  }
  if (pathname.startsWith('/restaurants')) {
    return { label: 'Reserve a Table', href: '/restaurants/', id: 'cta_dining' };
  }
  if (pathname.startsWith('/things-to-do') || pathname.startsWith('/tours')) {
    return { label: 'Check Availability', href: '/tours/', id: 'cta_tours' };
  }
  if (pathname.startsWith('/guides') || pathname.startsWith('/neighborhoods')) {
    return { label: 'Plan Your Trip', href: '/plan/', id: 'cta_plan' };
  }
  if (pathname.startsWith('/shop')) {
    return { label: 'Shop the Collection', href: '/shop/', id: 'cta_shop' };
  }
  return { label: 'Plan Your Trip', href: '/plan/', id: 'cta_default' };
}
