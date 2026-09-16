/**
 * Saved-for-the-trip store (PAGE-LAYOUTS.md §Shared frame).
 *
 * The shared Save control adds an item to the reader's trip; it never
 * reserves, books or holds anything. Drafts live in this browser only
 * (localStorage) until a durable backend exists, so the planner reads them
 * as must-dos and everything stays honest about what "saved" means.
 */

export type SavedKind = 'restaurant' | 'tour' | 'neighborhood' | 'activity' | 'event' | 'hotel' | 'product';

export interface SavedItem {
  /** Stable id, e.g. `restaurant:etch` or `event:tm-123`. */
  id: string;
  kind: SavedKind;
  title: string;
  href: string;
  /** Small caps line: neighborhood, venue or category. */
  meta?: string;
  /** ISO date for dated items (events). */
  date?: string;
  savedAt: string;
}

export const SAVED_STORAGE_KEY = 'nsvl:trip';
export const SAVED_EVENT = 'nsvl:saved-change';

export const SAVED_KIND_LABELS: Record<SavedKind, string> = {
  restaurant: 'Restaurant',
  tour: 'Experience',
  neighborhood: 'Neighborhood',
  activity: 'Thing to do',
  event: 'Event',
  hotel: 'Hotel',
  product: 'Shop',
};

function canStore(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readSaved(): SavedItem[] {
  if (!canStore()) return [];
  try {
    const raw = window.localStorage.getItem(SAVED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is SavedItem =>
        Boolean(x) && typeof x === 'object' && typeof (x as SavedItem).id === 'string' && typeof (x as SavedItem).href === 'string',
    );
  } catch {
    return [];
  }
}

function writeSaved(items: SavedItem[]): void {
  if (!canStore()) return;
  try {
    window.localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Private mode or full storage: the UI already treats saving as best effort.
  }
  window.dispatchEvent(new CustomEvent(SAVED_EVENT));
}

export function isSaved(id: string): boolean {
  return readSaved().some((item) => item.id === id);
}

/** Toggle an item. Returns the new saved state. */
export function toggleSaved(item: Omit<SavedItem, 'savedAt'>): boolean {
  const current = readSaved();
  const exists = current.some((x) => x.id === item.id);
  if (exists) {
    writeSaved(current.filter((x) => x.id !== item.id));
    return false;
  }
  writeSaved([...current, { ...item, savedAt: new Date().toISOString() }]);
  return true;
}

export function removeSaved(id: string): void {
  writeSaved(readSaved().filter((x) => x.id !== id));
}

/** Subscribe to changes from this tab (custom event) and other tabs (storage). */
export function subscribeSaved(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === SAVED_STORAGE_KEY) callback();
  };
  window.addEventListener(SAVED_EVENT, callback);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(SAVED_EVENT, callback);
    window.removeEventListener('storage', onStorage);
  };
}
