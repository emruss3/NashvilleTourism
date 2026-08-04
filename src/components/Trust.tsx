import Link from 'next/link';
import type { DataStatus, PlacementType } from '@/lib/types';

/** Formats an ISO date for display. Deterministic so SSR and client agree. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  if (!y || !m || !d) return iso;
  return `${months[m - 1]} ${d}, ${y}`;
}

export function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (!y || !m || !d) return iso;
  return `${months[m - 1]} ${d}, ${y}`;
}

/**
 * Shows the reader exactly how current a listing's practical details are.
 * Three states, each visually distinct, so an unchecked record can never be
 * mistaken for a confirmed one.
 */
export function VerificationBadge({
  status,
  date,
  className = '',
}: {
  status: DataStatus;
  date: string;
  className?: string;
}) {
  const config = {
    verified: {
      label: `Verified ${formatDateShort(date)}`,
      classes: 'bg-mint-wash text-moss border-mint/40',
      icon: '✓',
    },
    'needs-recheck': {
      label: `Last checked ${formatDateShort(date)}`,
      classes: 'bg-sky text-ink-soft border-paper-edge',
      icon: '↻',
    },
    unverified: {
      label: 'Sample data, not yet verified',
      classes: 'bg-dogwood/50 text-clay-deep border-clay/25',
      icon: '!',
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-2xs font-semibold ${config.classes} ${className}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  );
}

/**
 * Paid-placement label. Never styled to blend into editorial content.
 */
export function PlacementLabel({ placement, sponsorName }: { placement: PlacementType; sponsorName?: string }) {
  if (placement === 'editorial') return null;

  if (placement === 'sponsored') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-gold/30 bg-gold-wash px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-gold">
        Sponsored{sponsorName ? ` by ${sponsorName}` : ''}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-paper-edge bg-paper-sunk px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-ink-faint">
      Affiliate link
    </span>
  );
}

/** Inline disclosure placed next to commercial links. */
export function AffiliateDisclosure({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-2xs text-ink-faint">
        We may earn a commission if you book through this link.{' '}
        <Link href="/advertising/#disclosure" className="underline hover:text-ink">
          How this works
        </Link>
      </p>
    );
  }
  return (
    <div className="rounded border border-paper-edge bg-paper-sunk p-4 text-sm text-ink-soft">
      <p>
        <strong className="font-semibold text-ink">Disclosure.</strong> Some links on this page earn
        us a commission when you book. Commissions never determine which places we recommend or the
        order we list them in.{' '}
        <Link href="/how-we-choose/" className="text-clay underline underline-offset-2">
          How we choose
        </Link>
      </p>
    </div>
  );
}

/** Byline block with author, editor, and both dates. */
export function Byline({
  authorName,
  authorSlug,
  editorName,
  published,
  updated,
  readingTime,
}: {
  authorName: string;
  authorSlug?: string;
  editorName?: string;
  published: string;
  updated?: string;
  readingTime?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y border-paper-edge py-3 text-sm text-ink-soft">
      <span>
        By{' '}
        {authorSlug ? (
          <Link href={`/authors/${authorSlug}/`} className="font-semibold text-ink underline underline-offset-2 hover:text-clay">
            {authorName}
          </Link>
        ) : (
          <span className="font-semibold text-ink">{authorName}</span>
        )}
      </span>
      {editorName && <span className="text-ink-faint">Edited by {editorName}</span>}
      <span className="text-ink-faint">
        Published <time dateTime={published}>{formatDate(published)}</time>
      </span>
      {updated && (
        <span className="text-ink-faint">
          Updated <time dateTime={updated}>{formatDate(updated)}</time>
        </span>
      )}
      {readingTime && <span className="text-ink-faint">{readingTime} min read</span>}
    </div>
  );
}

/**
 * Site-wide notice that the seeded records are demonstration data.
 * Remove once real verified content replaces the samples.
 */
export function DemoDataNotice() {
  return (
    <div className="border-b border-paper-edge bg-sky">
      <div className="shell py-1.5 text-center text-2xs text-ink-faint sm:text-sm">
        <strong className="font-semibold text-ink">Demonstration build.</strong>{' '}
        Sample listings — not for planning.
      </div>
    </div>
  );
}

/** Short methodology callout reused across index pages. */
export function HowWeChooseCallout() {
  return (
    <aside className="rounded-card border border-paper-edge bg-white p-6">
      <h2 className="font-display text-xl">How we choose</h2>
      <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
        Our recommendations are based on local knowledge, editorial research, firsthand experience,
        reader feedback, and continued review. Sponsored placements are clearly identified and do not
        determine editorial rankings.
      </p>
      <Link
        href="/how-we-choose/"
        className="mt-3 inline-block text-sm font-semibold text-clay underline underline-offset-2 hover:text-clay-deep"
      >
        Read our full methodology
      </Link>
    </aside>
  );
}
