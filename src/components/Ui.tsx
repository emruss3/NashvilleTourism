import Link from 'next/link';
import { asset, breadcrumbSchema } from '@/lib/seo';

/** Renders a JSON-LD block. Kept as a component so schema is easy to audit. */
export function JsonLd({ data }: { data: object | object[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, '\\u003c') }}
        />
      ))}
    </>
  );
}

export interface Crumb {
  name: string;
  href: string;
}

/** Visible breadcrumbs plus matching BreadcrumbList schema. */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const full: Crumb[] = [{ name: 'Home', href: '/' }, ...trail];
  return (
    <>
      <JsonLd data={breadcrumbSchema(full)} />
      <nav aria-label="Breadcrumb" className="py-4">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-faint">
          {full.map((c, i) => {
            const last = i === full.length - 1;
            return (
              <li key={c.href} className="flex items-center gap-1.5">
                {last ? (
                  <span aria-current="page" className="text-ink-soft">
                    {c.name}
                  </span>
                ) : (
                  <>
                    <Link href={c.href} className="hover:text-clay hover:underline">
                      {c.name}
                    </Link>
                    <span aria-hidden="true">/</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
  as = 'h2',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  as?: 'h1' | 'h2';
}) {
  const Heading = as;
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-prose">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <Heading className={as === 'h1' ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-[28px]'}>{title}</Heading>
        {description && <p className="mt-2 max-w-xl text-[16px] leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="shrink-0 text-sm font-semibold text-clay underline underline-offset-4 hover:text-clay-deep"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

/** Page-level header used on index and detail templates. */
export function PageHeader({
  eyebrow,
  title,
  intro,
  meta,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  meta?: React.ReactNode;
}) {
  return (
    <header className="border-b border-paper-edge pb-8">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h1 className="max-w-3xl text-3xl sm:text-4xl lg:text-[44px]">{title}</h1>
      {intro && <p className="mt-3 max-w-prose text-lg leading-relaxed text-ink-soft">{intro}</p>}
      {meta && <div className="mt-4">{meta}</div>}
    </header>
  );
}

/** Link out to a map. Not an embedded iframe, which would cost performance. */
export function MapLink({ query, label = 'Open in maps' }: { query: string; label?: string }) {
  const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-clay underline underline-offset-2 hover:text-clay-deep"
      data-analytics="map_opened"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 1.5c-2.2 0-4 1.8-4 4 0 3 4 9 4 9s4-6 4-9c0-2.2-1.8-4-4-4Z"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <circle cx="8" cy="5.5" r="1.4" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      {label}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** Key/value list used on every listing template. */
export function FactTable({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="divide-y divide-paper-edge rounded-card border border-paper-edge bg-white">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[minmax(7rem,10rem)_1fr] gap-4 px-4 py-3">
          <dt className="text-sm font-semibold text-ink">{row.label}</dt>
          <dd className="text-sm text-ink-soft">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Answer-first summary block.
 *
 * Answer engines quote the passage that most directly answers the query. Giving
 * that passage a stable class, a real heading, and a definition list makes it
 * cheap to extract correctly instead of leaving the model to guess which
 * paragraph is the answer. Pairs with `speakableSchema`.
 */
export function KeyFacts({
  title = 'Key facts',
  answer,
  facts,
}: {
  title?: string;
  answer?: string;
  facts: { label: string; value: string }[];
}) {
  return (
    <section className="short-answer rounded-card border-l-4 border-clay bg-clay-wash p-5">
      <h2 className="eyebrow mb-2 text-clay-deep">{title}</h2>
      {answer && <p className="mb-3 max-w-prose text-[17px] leading-relaxed text-ink">{answer}</p>}
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {facts.map((f) => (
          <div key={f.label} className="flex flex-wrap gap-x-2 text-[15px]">
            <dt className="font-semibold text-ink">{f.label}:</dt>
            <dd className="text-ink-soft">{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Wrapper for wide tables.
 *
 * A container that scrolls horizontally must be reachable by keyboard,
 * otherwise a keyboard-only user cannot see the columns that overflow. Making
 * it a labelled region with tabIndex={0} satisfies WCAG 2.1.1 and is what axe's
 * `scrollable-region-focusable` rule checks for.
 */
export function ScrollableTable({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="overflow-x-auto rounded-card border border-paper-edge bg-white"
    >
      {children}
    </div>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-paper-edge bg-paper-sunk px-2 py-0.5 text-2xs font-medium text-ink-soft">
      {children}
    </span>
  );
}

/* --------------------------------- States --------------------------------- */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-paper-edge bg-paper-card px-6 py-14 text-center">
      <div className="mb-4 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset('/brand/star.png')} alt="" className="h-7 w-7 object-contain" aria-hidden="true" />
      </div>
      <h2 className="font-display text-xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-soft">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-card border border-paper-edge bg-white">
          <div className="aspect-[3/2] animate-pulse bg-paper-sunk" />
          <div className="space-y-2 p-4">
            <div className="h-2.5 w-24 animate-pulse rounded bg-paper-sunk" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-paper-sunk" />
            <div className="h-3 w-full animate-pulse rounded bg-paper-sunk" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-card border border-clay/25 bg-clay-wash px-6 py-10 text-center">
      <h2 className="font-display text-xl text-clay-deep">Something went wrong</h2>
      <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-soft">{message}</p>
      {retry && <div className="mt-5">{retry}</div>}
    </div>
  );
}
