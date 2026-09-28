import type { ReactNode } from 'react';

/**
 * Preview builds render unpublished seed venues whose numbers a person has
 * not supplied yet. Every `TODO` run is wrapped in a visible mark so nobody
 * mistakes it for content. Production never sees one: the publish check
 * refuses any row that still says TODO, and unpublished venues are not read.
 */
const PLACEHOLDER = /(TODO[^.\n]*)/;

export function PreviewText({ text }: { text?: string | null }): ReactNode {
  if (!text) return null;
  if (!text.includes('TODO')) return text;
  // split() with a capturing group alternates plain text (even) and matches (odd).
  return text.split(PLACEHOLDER).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-ink px-1 py-0.5 font-sans text-[0.85em] font-semibold text-paper" title="Placeholder. A person replaces this before the venue is published.">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function PreviewBanner({ children }: { children?: ReactNode }) {
  return (
    <div role="note" className="rounded-card border-2 border-dashed border-ink bg-paper-sunk px-4 py-3 text-sm text-ink">
      <strong className="font-semibold">Preview only.</strong> {children ?? 'This venue is not published. Marked values are placeholders a person replaces before it goes live; the publish check blocks them from production.'}
    </div>
  );
}
