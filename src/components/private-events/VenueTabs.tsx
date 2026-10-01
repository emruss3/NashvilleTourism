'use client';

import { useId, useState, type ReactNode } from 'react';

export interface VenuePanel {
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
}

/**
 * Tabs for the venue page: Spaces, Floor plans, Terms (and more as they
 * come). Panels are rendered on the server and handed in; only the
 * switching happens here. Every panel stays in the HTML (hidden, not
 * removed), so search engines and find-in-page see all of it.
 */
export default function VenueTabs({ panels, initial }: { panels: VenuePanel[]; initial?: string }) {
  const id = useId();
  const [active, setActive] = useState(initial ?? panels[0]?.id);
  if (!panels.length) return null;
  return (
    <div>
      <div role="tablist" aria-label="Venue details" className="flex flex-wrap gap-1 border-b border-paper-edge">
        {panels.map((p) => (
          <button
            key={p.id}
            role="tab"
            id={`${id}-tab-${p.id}`}
            aria-selected={active === p.id}
            aria-controls={`${id}-panel-${p.id}`}
            tabIndex={active === p.id ? 0 : -1}
            type="button"
            onClick={() => setActive(p.id)}
            onKeyDown={(e) => {
              const i = panels.findIndex((x) => x.id === active);
              if (e.key === 'ArrowRight') setActive(panels[(i + 1) % panels.length].id);
              if (e.key === 'ArrowLeft') setActive(panels[(i - 1 + panels.length) % panels.length].id);
            }}
            className={`-mb-px min-h-11 border-b-2 px-3 text-[15px] font-semibold ${active === p.id ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}
          >
            {p.label}
            {p.count !== undefined ? <span className="ml-1 font-normal text-ink-soft">({p.count})</span> : null}
          </button>
        ))}
      </div>
      {panels.map((p) => (
        <div key={p.id} role="tabpanel" id={`${id}-panel-${p.id}`} aria-labelledby={`${id}-tab-${p.id}`} hidden={active !== p.id} className="pt-6">
          {p.content}
        </div>
      ))}
    </div>
  );
}
