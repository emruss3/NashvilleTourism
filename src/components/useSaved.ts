'use client';

import { useEffect, useState } from 'react';
import { readSaved, subscribeSaved, type SavedItem } from '@/lib/saved';

/**
 * Saved-trip items for client components. Starts empty so server and first
 * client render agree, then reads storage after mount.
 */
export function useSaved(): { items: SavedItem[]; ready: boolean } {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setItems(readSaved());
    sync();
    setReady(true);
    return subscribeSaved(sync);
  }, []);

  return { items, ready };
}
