'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { planNav, primaryNav, secondaryNav, site, tripNav } from '@/lib/site';
import { BagIcon } from './Icons';
import Wordmark, { NsvlMark } from './Wordmark';

/**
 * Site header.
 *
 * Desktop: a two-row masthead. Row one on the cream tone carries the lockup
 * on the left and the utilities on the right: "My trip" as a text link, the
 * boxed "Plan your trip" call to action, then the bag at the far right. Row
 * two is one flat navigation row spread evenly across the shell:
 * Restaurants, Tours, Neighborhoods, Things to do, Concerts & Events, Hotels,
 * Shop. There is no search icon in the header; search lives on the pages.
 * The masthead scrolls away and a slim sticky bar takes over.
 *
 * Under 768px (MOBILE-FIRST.md): one compact 64px sticky row with the menu
 * and the standalone NSVL mark. The menu lists the same seven sections, then
 * My trip and Plan your trip, then the secondary links.
 *
 * The bag sits top right in every variant and opens the bag page. No
 * commerce provider is connected yet, so it shows no count; the bag page
 * says the store is not taking orders and lists saved places.
 */
export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const mastheadRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => {
    const base = href.replace(/#.*$/, '');
    if (base === '/events/') return pathname.startsWith('/events') || pathname.startsWith('/music') || pathname.startsWith('/live-music');
    if (base === '/bag/') return pathname.startsWith('/bag');
    return pathname === base || pathname.startsWith(base);
  };

  useEffect(() => {
    const el = mastheadRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setCondensed(!entry.isIntersecting), {
      rootMargin: '-1px 0px 0px 0px',
      threshold: 0,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
      if (e.key === 'Tab' && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    // Body overflow doubles as the signal the bottom navigation watches to hide itself.
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) drawerRef.current?.querySelector<HTMLElement>('a[href]')?.focus();
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const linkClass = (active: boolean, compact: boolean) =>
    `inline-flex items-center whitespace-nowrap border-b-2 font-sans font-semibold text-ink transition-colors ${
      compact ? 'min-h-11 px-2.5 text-[14px]' : 'min-h-16 px-2 text-[17px]'
    } ${active ? 'border-ink' : 'border-transparent hover:border-ink/40'}`;

  const navRow = (compact: boolean, tabbable: boolean) => (
    <ul className={`flex items-center ${compact ? 'gap-0.5' : 'justify-between gap-2'}`}>
      {primaryNav.map((item) => {
        const active = isActive(item.href);
        return (
          <li key={item.href}>
            <Link href={item.href} aria-current={active ? 'page' : undefined} className={linkClass(active, compact)} tabIndex={tabbable ? 0 : -1}>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <header>
      {/* Desktop masthead: lockup and utilities on cream, then the flat navigation row */}
      <div ref={mastheadRef} className="hidden lg:block">
        <div className="bg-paper-sunk">
          <div className="shell flex items-center justify-between gap-6 py-5">
            <Wordmark width={220} />
            <div className="flex items-center gap-4">
              <TripLink active={isActive(tripNav.href)} />
              <PlanBox active={isActive(planNav.href)} />
              <BagLink />
            </div>
          </div>
        </div>
        <nav aria-label="Primary" className="border-y border-paper-edge bg-paper">
          <div className="shell">{navRow(false, true)}</div>
        </nav>
      </div>

      {/* Desktop condensed bar, visible only after the masthead scrolls away */}
      <div
        className={`fixed inset-x-0 top-0 z-50 hidden border-b border-paper-edge bg-paper-sunk/95 backdrop-blur transition-transform lg:block ${
          condensed ? 'translate-y-0' : 'pointer-events-none invisible -translate-y-full'
        }`}
        aria-hidden={!condensed}
      >
        <div className="shell flex h-14 items-center gap-6">
          <Link href="/" aria-label={`${site.name} home`} className="inline-flex shrink-0" tabIndex={condensed ? 0 : -1}>
            <NsvlMark width={96} decorative />
          </Link>
          <nav aria-label="Primary, condensed" className="min-w-0 flex-1">
            {navRow(true, condensed)}
          </nav>
          <TripLink active={isActive(tripNav.href)} compact tabbable={condensed} />
          <PlanBox active={isActive(planNav.href)} compact tabbable={condensed} />
          <BagLink tabbable={condensed} />
        </div>
      </div>

      {/* Phone and tablet header: 64px, menu + mark */}
      <div className="sticky top-0 z-50 bg-paper-sunk/95 backdrop-blur lg:hidden">
        <div className="shell flex h-16 items-center gap-2">
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded text-ink transition-colors hover:bg-ink/5"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            <MenuIcon open={open} />
          </button>
          <Link href="/" aria-label={`${site.name} home`} className="inline-flex flex-1 justify-center">
            <NsvlMark width={104} decorative />
          </Link>
          {/* Balances the menu control so the mark stays centered. */}
          <BagLink />
        </div>

        {open && (
          <div>
            <div className="fixed inset-0 top-16 z-40 bg-ink/40" onClick={() => setOpen(false)} aria-hidden="true" />
            <div
              ref={drawerRef}
              id="mobile-nav"
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="fixed inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-paper-edge bg-paper"
            >
              <nav aria-label="Menu" className="shell py-3">
                <ul className="divide-y divide-paper-edge">
                  {[...primaryNav, tripNav, planNav].map((item) => {
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={`flex min-h-12 items-center py-3 font-sans text-[17px] font-semibold text-ink ${active ? 'underline underline-offset-[0.2em]' : ''}`}
                          onClick={() => setOpen(false)}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <p className="eyebrow mt-5">More</p>
                <ul className="mt-1 divide-y divide-paper-edge">
                  {secondaryNav.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex min-h-11 items-center py-2.5 text-[15px] font-medium text-ink-soft hover:text-ink"
                        onClick={() => setOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href="/search/" className="flex min-h-11 items-center py-2.5 text-[15px] font-medium text-ink-soft hover:text-ink" onClick={() => setOpen(false)}>
                      Search
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/** "My trip" text link beside the planner call to action. */
function TripLink({ active, compact = false, tabbable = true }: { active: boolean; compact?: boolean; tabbable?: boolean }) {
  return (
    <Link
      href={tripNav.href}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex items-center whitespace-nowrap font-sans font-semibold text-ink underline-offset-[0.2em] hover:underline ${
        compact ? 'h-9 text-[13px]' : 'h-11 text-[15px]'
      } ${active ? 'underline' : ''}`}
      tabIndex={tabbable ? 0 : -1}
    >
      {tripNav.label}
    </Link>
  );
}

/** Boxed "Plan your trip" call to action in the top-right utilities. */
function PlanBox({ active, compact = false, tabbable = true }: { active: boolean; compact?: boolean; tabbable?: boolean }) {
  return (
    <Link
      href={planNav.href}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded border font-sans font-semibold transition-colors ${
        compact ? 'h-9 px-3.5 text-[13px]' : 'h-11 px-4 text-[15px]'
      } ${active ? 'border-ink bg-paper text-ink' : 'border-ink bg-ink text-paper hover:bg-navy-deep'}`}
      tabIndex={tabbable ? 0 : -1}
    >
      {planNav.label}
    </Link>
  );
}

/** Shopping bag, top right on every header variant. Opens the bag page. */
function BagLink({ tabbable = true }: { tabbable?: boolean }) {
  return (
    <Link
      href="/bag/"
      className="inline-flex h-11 w-11 items-center justify-center rounded text-ink transition-colors hover:bg-ink/5"
      aria-label="Your bag"
      tabIndex={tabbable ? 0 : -1}
    >
      <BagIcon size={22} />
    </Link>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {open ? (
        <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}
