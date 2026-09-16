import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Section opener for the page families: eyebrow, display heading and an
 * optional support line or "See all" link on the right. Same rhythm as the
 * homepage sections so every family reads as one system.
 */
export default function SectionHead({
  eyebrow,
  title,
  support,
  href,
  linkLabel,
  id,
  size = 'lg',
  tone = 'ink',
  className = '',
}: {
  eyebrow?: string;
  title: ReactNode;
  support?: ReactNode;
  href?: string;
  linkLabel?: string;
  id?: string;
  size?: 'lg' | 'md';
  tone?: 'ink' | 'paper';
  className?: string;
}) {
  const paper = tone === 'paper';
  const heading =
    size === 'lg' ? 'text-[2rem] sm:text-[2.5rem] lg:text-[3.25rem]' : 'text-[1.625rem] sm:text-[2rem] lg:text-[2.25rem]';
  return (
    <div className={`grid gap-3 md:grid-cols-[1fr_auto] md:items-end md:gap-8 ${className}`}>
      <div>
        {eyebrow ? <p className={`eyebrow ${paper ? 'text-paper/75' : ''}`}>{eyebrow}</p> : null}
        <h2 id={id} className={`mt-1 ${heading} ${paper ? 'text-paper' : ''}`}>
          {title}
        </h2>
        {support ? <p className={`mt-2 max-w-xl text-[16px] leading-snug ${paper ? 'text-paper/80' : 'text-ink-soft'}`}>{support}</p> : null}
      </div>
      {href && linkLabel ? (
        <Link
          href={href}
          className={`inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold underline-offset-[0.2em] hover:underline md:pb-2 ${
            paper ? 'text-paper' : 'text-ink'
          }`}
        >
          {linkLabel}
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}
