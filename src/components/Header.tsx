'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { primaryNav, secondaryNav, site } from '@/lib/site';

export default function Header() {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close on Escape and restore focus to the trigger.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Prevent background scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-paper-edge bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
      <div className="shell flex h-16 items-center gap-6">
        <Link href="/" className="flex shrink-0 items-baseline gap-1.5" aria-label={`${site.name} home`}>
          <span className="font-display text-[22px] font-bold tracking-tight text-ink">{site.name}</span>
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-5">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[15px] font-medium text-ink-soft transition-colors hover:text-clay"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/search/"
            className="btn-quiet px-3"
            aria-label="Search the site"
          >
            <SearchIcon />
            <span className="hidden sm:inline">Search</span>
          </Link>
          <Link href="/plan/" className="btn-primary hidden sm:inline-flex">
            Plan My Trip
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="btn-secondary px-3 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            <MenuIcon open={open} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 top-16 z-40 bg-ink/20"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            id="mobile-nav"
            className="fixed inset-x-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-paper-edge bg-paper shadow-lift"
          >
            <nav aria-label="Mobile" className="shell py-4">
              <ul className="divide-y divide-paper-edge">
                {primaryNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block py-3 text-base font-medium text-ink hover:text-clay"
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-2xs font-bold uppercase tracking-wider text-ink-faint">
                More
              </p>
              <ul className="divide-y divide-paper-edge">
                {secondaryNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block py-2.5 text-[15px] text-ink-soft hover:text-clay"
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/plan/"
                className="btn-primary mt-4 w-full"
                onClick={() => setOpen(false)}
              >
                Plan My Trip
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {open ? (
        <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}
