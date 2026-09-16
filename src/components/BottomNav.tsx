'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Mobile bottom navigation (MOBILE-FIRST.md §Navigation and overlays).
 * Four labeled destinations under 768px: Explore, Events, Shop, Plan.
 * Active state uses a top rule and weight plus aria-current, never color
 * alone. The bar hides while a text field has focus (on-screen keyboard) and
 * while the header menu dialog is open, so nothing stacks or overlaps.
 *
 * Detail pages with a purchase action bar would replace this bar; none ship
 * one yet, so the bar is present on every route under 768px.
 */
const ITEMS = [
  { label: 'Explore', href: '/explore/', match: ['/explore', '/neighborhoods', '/restaurants', '/things-to-do', '/music', '/where-to-stay', '/tours', '/guides'], icon: CompassIcon },
  { label: 'Events', href: '/events/', match: ['/events', '/live-music-tonight'], icon: CalendarIcon },
  { label: 'Shop', href: '/shop/', match: ['/shop'], icon: BagIcon },
  { label: 'Plan', href: '/plan/', match: ['/plan', '/weekend'], icon: PlanIcon },
] as const;

export default function BottomNav() {
  const pathname = usePathname() || '/';
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const isTextField = (el: Element | null) =>
      Boolean(el && (el.matches('input:not([type=checkbox]):not([type=radio]):not([type=submit])') || el.matches('textarea') || el.matches('select')));
    let showTimer: number | undefined;
    const onFocusIn = (e: FocusEvent) => {
      window.clearTimeout(showTimer);
      setHidden(isTextField(e.target as Element));
    };
    // Re-show after a beat so a tap that moves focus off a field (for
    // example onto a submit button near the bottom edge) lands on its
    // target, not on a bar that appeared beneath the finger.
    const onFocusOut = () => {
      window.clearTimeout(showTimer);
      showTimer = window.setTimeout(() => setHidden(false), 350);
    };
    const observer = new MutationObserver(() => {
      setHidden((h) => document.body.style.overflow === 'hidden' || (h && isTextField(document.activeElement)));
    });
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => {
      window.clearTimeout(showTimer);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      observer.disconnect();
    };
  }, []);

  return (
    <nav
      aria-label="Primary, mobile"
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-paper-edge bg-paper md:hidden ${hidden ? 'hidden' : ''}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="grid h-16 grid-cols-4">
        {ITEMS.map((item) => {
          const active = item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`) || pathname.startsWith(m));
          const Icon = item.icon;
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 border-t-2 text-[12px] leading-none ${
                  active ? 'border-ink font-bold text-ink' : 'border-transparent font-medium text-ink-soft'
                }`}
              >
                <Icon />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function CompassIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="m15.5 8.5-2.2 5.3-4.8 1.7 2.2-5.3 4.8-1.7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 8h14l-1 12H6L5 8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function PlanIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 4.5h14v15H5z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
