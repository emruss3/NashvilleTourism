'use client';

import { useEffect, useState } from 'react';

export interface SectionTab {
  id: string;
  label: string;
}

/**
 * Overview / Rooms / Reviews / Location: a sticky row of links to the
 * sections below. Every section stays on the page (nothing is hidden
 * behind a tab), and the row highlights the one in view.
 */
export default function HotelSectionTabs({ tabs }: { tabs: SectionTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);

  useEffect(() => {
    const els = tabs.map((t) => document.getElementById(t.id)).filter((el): el is HTMLElement => Boolean(el));
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [tabs]);

  if (tabs.length < 2) return null;
  return (
    <nav aria-label="Sections" className="sticky top-0 z-30 -mx-4 border-b border-paper-edge bg-paper px-4 lg:top-14 lg:mx-0 lg:px-0">
      <ul className="flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <li key={t.id} className="shrink-0">
            <a href={`#${t.id}`} aria-current={active === t.id ? 'location' : undefined} className={`-mb-px block min-h-11 border-b-2 px-3 py-3 text-[15px] font-semibold ${active === t.id ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}>
              {t.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
