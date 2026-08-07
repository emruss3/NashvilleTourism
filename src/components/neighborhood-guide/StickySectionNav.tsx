'use client';

import { useEffect, useRef, useState } from 'react';

export type SectionNavItem = {
  id: string;
  label: string;
};

export function StickySectionNav({ items }: { items: SectionNavItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '');
  const [stuck, setStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => {
      setStuck(!entry.isIntersecting);
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0.1, 0.35, 0.6] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  return (
    <>
      <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />
      <nav
        aria-label="On this page"
        className={`z-30 border-b border-paper-edge/80 bg-paper/95 backdrop-blur-md transition-shadow ${
          stuck ? 'sticky top-0 shadow-sm' : 'relative'
        }`}
      >
        <div className="shell">
          <ul className="flex gap-1 overflow-x-auto py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((item) => {
              const isActive = active === item.id;
              return (
                <li key={item.id} className="shrink-0">
                  <a
                    href={`#${item.id}`}
                    className={`inline-flex whitespace-nowrap px-3 py-1.5 text-2xs font-bold uppercase tracking-[0.14em] transition-colors ${
                      isActive ? 'text-clay' : 'text-ink-faint hover:text-navy'
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}
