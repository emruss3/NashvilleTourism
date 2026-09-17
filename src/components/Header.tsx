'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { exploreNav, planNav, primaryNav, secondaryNav, site } from '@/lib/site';
import { BagIcon } from './Icons';
import Wordmark, { NsvlMark } from './Wordmark';

/**
 * Site header (HOMEPAGE.md §1).
 *
 * Desktop: an editorial masthead with the centered lockup, the utilities
 * top right (the boxed "Plan your trip" call to action, then the bag at the
 * far right), and one row of top-level navigation: Explore, Events, Music,
 * Hotels, Shop, with Shop at the far right. There is no search icon in the
 * header; search lives on the pages themselves. Explore is a link to the discovery page and also opens
 * a disclosure listing Restaurants, Tours, Neighborhoods, Things to do and
 * Hotels. The masthead scrolls away and a slim sticky bar takes over.
 *
 * Under 768px (MOBILE-FIRST.md): one compact 64px sticky row with the menu
 * and the standalone NSVL mark. The menu lists the Explore categories first,
 * then Events, Shop and Plan, then the secondary links. Search is a visible
 * field on the page, not a header icon.
 *
 * Every header variant sits on the cream tone (Black / Cream board) with no
 * rule under it; the hero photograph starts directly beneath the masthead.
 *
 * The bag sits top right in every variant (HOMEPAGE.md §1) and opens the
 * bag page. No commerce provider is connected yet, so it shows no count;
 * the bag page says the store is not taking orders and lists saved places.
 */
export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const mastheadRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const exploreRef = useRef<HTMLLIElement>(null);

  const exploreActive = pathname.startsWith('/explore') || exploreNav.some((c) => pathname.startsWith(c.href.replace(/\/$/, '')));
  const isActive = (href: string) => {
    if (href === '/explore/') return exploreActive;
    if (href === '/music/') return pathname.startsWith('/music') || pathname.startsWith('/live-music');
    return pathname === href || pathname.startsWith(href);
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

  // Explore disclosure: Escape and outside clicks close it.
  useEffect(() => {
    if (!exploreOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setExploreOpen(false);
        exploreRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    }
    function onClick(e: MouseEvent) {
      if (exploreRef.current && !exploreRef.current.contains(e.target as Node)) setExploreOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [exploreOpen]);

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
    setExploreOpen(false);
  }, [pathname]);

  const linkClass = (active: boolean, compact: boolean) =>
    `inline-flex min-h-11 items-center border-b-2 px-3.5 font-sans font-semibold text-ink transition-colors ${
      compact ? 'text-[14px]' : 'text-[17px]'
    } ${active ? 'border-ink' : 'border-transparent hover:border-ink/40'}`;

  const navRow = (compact: boolean, tabbable: boolean) => (
    <ul className={`flex items-center ${compact ? 'gap-0.5' : 'justify-center gap-1'}`}>
      {primaryNav.map((item) => {
        const active = isActive(item.href);
        if (item.href === '/explore/') {
          return (
            <li key={item.href} className="relative" ref={compact ? undefined : exploreRef}>
              <div className="flex items-center">
                <Link href={item.href} aria-current={active ? 'page' : undefined} className={linkClass(active, compact)} tabIndex={tabbable ? 0 : -1}>
                  {item.label}
                </Link>
                {!compact ? (
                  <button
                    type="button"
                    aria-expanded={exploreOpen}
                    aria-controls="explore-menu"
                    aria-label="Explore categories"
                    onClick={() => setExploreOpen((v) => !v)}
                    className="-ml-2 inline-flex h-11 w-9 items-center justify-center rounded text-ink hover:bg-ink/5"
                  >
                    <Chevron open={exploreOpen} />
                  </button>
                ) : null}
              </div>
              {!compact && exploreOpen ? (
                <div id="explore-menu" className="absolute left-0 top-full z-50 mt-1 w-56 rounded-card border border-paper-edge bg-paper py-2 shadow-none">
                  <ul>
                    {exploreNav.map((c) => (
                      <li key={c.href}>
                        <Link
                          href={c.href}
                          aria-current={pathname.startsWith(c.href.replace(/\/$/, '')) ? 'page' : undefined}
                          className="flex min-h-11 items-center px-4 text-[15px] font-semibold text-ink hover:bg-paper-sunk"
                        >
                          {c.label}
                        </Link>
                      </li>
                    ))}
                    <li className="mt-1 border-t border-paper-edge pt-1">
                      <Link href="/explore/" className="flex min-h-11 items-center px-4 text-[15px] text-ink-soft hover:bg-paper-sunk hover:text-ink">
                        All of Explore
                      </Link>
                    </li>
                  </ul>
                </div>
              ) : null}
            </li>
          );
        }
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
      {/* Desktop masthead */}
      <div ref={mastheadRef} className="hidden bg-paper-sunk lg:block">
        <div className="shell relative flex flex-col items-center pb-3 pt-5">
          <Wordmark width={300} />
          <div className="absolute right-[var(--page-gutter)] top-5 flex items-center gap-2">
            <PlanBox active={isActive(planNav.href)} />
            <BagLink />
          </div>
          <nav aria-label="Primary" className="mt-3">
            {navRow(false, true)}
          </nav>
        </div>
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
          <ul className="hidden items-center gap-0.5 xl:flex" aria-label="Explore categories, condensed">
            {exploreNav.map((c) => (
              <li key={c.href}>
                <Link href={c.href} className="inline-flex min-h-11 items-center px-2.5 text-[13px] font-medium text-ink-soft hover:text-ink" tabIndex={condensed ? 0 : -1}>
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
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
                <p className="eyebrow">Explore</p>
                <ul className="mt-1 divide-y divide-paper-edge">
                  {exploreNav.map((item) => {
                    const active = pathname.startsWith(item.href.replace(/\/$/, ''));
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
                  {[...primaryNav.filter((item) => item.href !== '/explore/' && item.href !== '/hotels/'), planNav].map((item) => {
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

/** Boxed "Plan your trip" call to action in the top-right utilities. */
function PlanBox({ active, compact = false, tabbable = true }: { active: boolean; compact?: boolean; tabbable?: boolean }) {
  return (
    <Link
      href={planNav.href}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded border font-sans font-semibold transition-colors ${
        compact ? 'h-9 px-3.5 text-[13px]' : 'h-11 px-4 text-[15px]'
      } ${active ? 'border-ink bg-ink text-paper' : 'border-ink bg-transparent text-ink hover:bg-ink hover:text-paper'}`}
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

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
      <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
