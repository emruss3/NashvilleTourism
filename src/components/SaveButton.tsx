'use client';

import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { toggleSaved, type SavedItem } from '@/lib/saved';
import { BookmarkIcon } from './Icons';
import { useSaved } from './useSaved';

/**
 * Shared Save control (PAGE-LAYOUTS.md §Shared frame). A real toggle button,
 * kept separate from the card link so it never hijacks navigation. Saving adds
 * the item to the reader's trip draft in this browser; it is not a reservation,
 * and the accessible name says so.
 */
export default function SaveButton({
  item,
  tone = 'ink',
  variant = 'text',
  className = '',
}: {
  item: Omit<SavedItem, 'savedAt'>;
  /** `paper` for charcoal surfaces. */
  tone?: 'ink' | 'paper';
  /** `icon` renders a square 44px control with the label for screen readers only. */
  variant?: 'text' | 'icon';
  className?: string;
}) {
  const { items } = useSaved();
  const saved = items.some((x) => x.id === item.id);

  function onClick() {
    const next = toggleSaved(item);
    track(ANALYTICS_EVENTS.ITEM_SAVED, { item_id: item.id, item_type: item.kind, value: next ? 1 : 0 });
  }

  const color = tone === 'paper' ? 'text-paper hover:bg-paper/10' : 'text-ink hover:bg-paper-sunk';
  const shape =
    variant === 'icon'
      ? 'h-11 w-11 justify-center rounded'
      : 'min-h-11 gap-1.5 rounded px-2 text-[15px] font-semibold';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      title={saved ? 'Saved to your trip. Saving is not a reservation.' : 'Save to your trip. Saving is not a reservation.'}
      className={`inline-flex shrink-0 items-center transition-colors ${shape} ${color} ${className}`}
    >
      <BookmarkIcon size={18} filled={saved} />
      <span className={variant === 'icon' ? 'sr-only' : ''}>
        {saved ? 'Saved' : 'Save'}
        <span className="sr-only"> {item.title} to your trip</span>
      </span>
    </button>
  );
}
