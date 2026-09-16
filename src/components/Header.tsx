'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { primaryNav, secondaryNav, site } from '@/lib/site';
import Wordmark, { NsvlMark } from './Wordmark';

/**
 * Site header.
 *
 * Under 768px (MOBILE-FIRST.md): one compact 64px sticky row with the menu
 * and the standalone NSVL mark linked home. Search is a visible field on the
 * page, not a header icon, and there is no bag because the shop has no cart
 * yet; a decorative bag would misrepresent a working action.
 *
 * Desktop (SITE-LAYOUT.md): an editorial masthead with the centered lockup,
 * search on the right, and a second row of top-level navigation. It scrolls
 * away; a slim sticky bar takes over once the masthead is off screen.
 */
export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const mastheadRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => {
    if (href === '/explore/') return pathname.startsWith('/explore') || pathname.startsWith('/events');
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

  const navLink = (href: string, label: string, compact = false) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`inline-flex min-h-11 items-center border-b-2 px-3 font-sans font-semibold text-ink transition-colors ${
          compact ? 'text-[14px]' : 'text-[15px]'
        } ${active ? 'border-ink' : 'border-transparent hover:border-ink/40'}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header>
      {/* Desktop masthead */}
      <div ref={mastheadRef} className="hidden border-b border-paper-edge bg-paper lg:block">
        <div className="shell relative flex flex-col items-center py-6">
          <Wordmark width={240} />
          <div className="absolute right-[var(--page-gutter)] top-6">
            <Link
              href="/search/"
              className="inline-flex h-11 w-11 items-center justify-center rounded text-ink transition-colors hover:bg-paper-sunk"
              aria-label="Search Nashville.com"
            >
              <SearchIcon />
            </Link>
          </div>
          <nav aria-label="Primary" className="mt-5">
            <ul className="flex items-center justify-center gap-1">
              {primaryNav.map((item) => (
                <li key={item.href}>{navLink(item.href, item.label)}</li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Desktop condensed bar, visible only after the masthead scrolls away */}
      <div
        className={`fixed inset-x-0 top-0 z-50 hidden border-b border-paper-edge bg-paper/95 backdrop-blur transition-transform lg:block ${
          condensed ? 'translate-y-0' : 'pointer-events-none invisible -translate-y-full'
        }`}
        aria-hidden={!condensed}
      >
        <div className="shell flex h-14 items-center gap-6">
          <Link href="/" aria-label={`${site.name} home`} className="inline-flex shrink-0" tabIndex={condensed ? 0 : -1}>
            <NsvlMark width={96} decorative />
          </Link>
          <nav aria-label="Primary, condensed" className="min-w-0 flex-1">
            <ul className="flex items-center gap-0.5">
              {primaryNav.map((item) => (
                <li key={item.href}>
                  {condensed ? (
                    navLink(item.href, item.label, true)
                  ) : (
                    <span className="inline-flex min-h-11 items-center px-3 text-[14px] font-semibold text-ink">{item.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </nav>
          <Link
            href="/search/"
            className="inline-flex h-11 w-11 items-center justify-center rounded text-ink hover:bg-paper-sunk"
            aria-label="Search Nashville.com"
            tabIndex={condensed ? 0 : -1}
          >
            <SearchIcon />
          </Link>
        </div>
      </div>

      {/* Phone and tablet header: 64px, menu + mark */}
      <div className="sticky top-0 z-50 border-b border-paper-edge bg-paper/95 backdrop-blur lg:hidden">
        <div className="shell flex h-16 items-center gap-2">
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded text-ink transition-colors hover:bg-paper-sunk"
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
          <span className="h-11 w-11" aria-hidden="true" />
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
                  {primaryNav.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={`flex min-h-12 items-center py-3 font-sans text-[17px] font-semibold text-ink ${
                            active ? 'underline underline-offset-[0.2em]' : ''
                          }`}
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

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
