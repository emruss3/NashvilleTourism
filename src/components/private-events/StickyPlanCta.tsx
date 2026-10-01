'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

/**
 * Phone-only sticky "Plan my event" bar on the hub, sitting above the bottom
 * navigation. It steps aside whenever it would cover something a person is
 * using: while the finder or the brief entry is on screen, while a text
 * field has focus (on-screen keyboard), while the header menu is open, and
 * whenever the shortlist bar is showing (that bar carries its own action).
 */
function Cta({ targets }: { targets: string[] }) {
  const params = useSearchParams();
  const [covering, setCovering] = useState(false);
  const [typing, setTyping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const els = targets.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    const visible = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
        setCovering(visible.size > 0);
      },
      { rootMargin: '0px 0px -72px 0px', threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [targets]);

  useEffect(() => {
    const isField = (el: Element | null) => Boolean(el && (el.matches('input:not([type=checkbox]):not([type=radio]):not([type=submit])') || el.matches('textarea') || el.matches('select')));
    const onFocusIn = (e: FocusEvent) => setTyping(isField(e.target as Element));
    const onFocusOut = () => setTyping(false);
    const observer = new MutationObserver(() => setMenuOpen(document.body.style.overflow === 'hidden'));
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      observer.disconnect();
    };
  }, []);

  if (params.get('v') || covering || typing || menuOpen) return null;
  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-30 px-4 md:hidden">
      <a href={`#${targets[0]}`} className="btn-primary w-full justify-center shadow-lg shadow-ink/20">
        Plan my event
        <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}

export default function StickyPlanCta({ targets = ['plan'] }: { targets?: string[] }) {
  return (
    <Suspense fallback={null}>
      <Cta targets={targets} />
    </Suspense>
  );
}
