'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { primaryNav, secondaryNav } from '@/lib/site';
import CartButton from './commerce/CartButton';
import Wordmark from './Wordmark';

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const isActive = (href: string) => {
    if (href === '/where-to-stay/') {
      return pathname.startsWith('/where-to-stay') || pathname.startsWith('/hotels');
    }
    if (href === '/music/') {
      return pathname.startsWith('/music') || pathname.startsWith('/live-music-tonight');
    }
    return pathname === href || pathname.startsWith(href);
  };

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

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/95 backdrop-blur-md">
      <div className="shell flex h-16 items-center gap-4 lg:h-[4.5rem] lg:gap-6">
        <Wordmark priority />

        <nav aria-label="Primary" className="hidden min-w-0 flex-1 lg:block">
          <ul className="flex items-center justify-center gap-0.5 xl:gap-1">
            {primaryNav.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex border-b-2 px-2.5 py-2 font-sans text-[13px] font-semibold transition-colors xl:px-3 xl:text-[14px] ${
                      active ? 'border-clay text-clay' : 'border-transparent text-ink hover:text-clay'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <Link
            href="/shop/"
            aria-current={pathname.startsWith('/shop') ? 'page' : undefined}
            className={`hidden rounded px-2.5 py-2 text-sm font-semibold transition-colors md:inline-flex ${
              pathname.startsWith('/shop') ? 'text-clay' : 'text-ink hover:bg-sky/60 hover:text-clay'
            }`}
          >
            Shop
          </Link>
          <Link
            href="/search/"
            className="inline-flex items-center justify-center rounded p-2.5 text-ink transition-colors hover:bg-sky/60 hover:text-clay"
            aria-label="Search the site"
          >
            <SearchIcon />
          </Link>
          <CartButton />
          <Link href="/plan/" className="btn-primary hidden px-4 py-2 font-sans sm:inline-flex">
            Plan Your Trip
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex items-center justify-center rounded border border-ink/15 bg-paper-card p-2.5 text-ink transition-colors hover:border-clay hover:text-clay lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            <MenuIcon open={open} />
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 top-16 z-40 bg-ink/30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            id="mobile-nav"
            className="fixed inset-x-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-paper-edge bg-paper-card shadow-card"
          >
            <nav aria-label="Mobile" className="shell py-3">
              <ul className="divide-y divide-paper-edge">
                {primaryNav.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={`block py-3.5 font-sans text-[15px] font-semibold ${
                          active ? 'text-clay' : 'text-ink hover:text-clay'
                        }`}
                        onClick={() => setOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">
                More
              </p>
              <ul className="mt-1 divide-y divide-paper-edge">
                {secondaryNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block py-3 text-[14px] font-medium text-ink-soft hover:text-clay"
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/plan/"
                className="btn-primary mt-5 w-full font-sans"
                onClick={() => setOpen(false)}
              >
                Plan Your Trip
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
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
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
