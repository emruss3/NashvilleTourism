import type { ReactNode } from 'react';

/**
 * Page-family opener (page-designs/README.md §Shared system).
 *
 * Compact typographic introduction with the search or task entry directly
 * under it, paired with purposeful photography. On phones the title, support
 * line and primary control come first so they sit inside the first viewport
 * at 390×844; the photograph follows. On desktop the two sit side by side.
 *
 * `over` places the copy on the photograph behind a left-weighted charcoal
 * scrim (Things to do, Neighborhoods, Events); `split` keeps the copy on
 * paper next to the photograph (Restaurants, Tours, Hotels, Shop, Plan).
 */
export default function PageIntro({
  eyebrow,
  title,
  support,
  children,
  media,
  layout = 'split',
  tone = 'paper',
  mediaFirst = false,
  aside,
  titleId = 'page-title',
  className = '',
}: {
  eyebrow?: string;
  title: ReactNode;
  support?: ReactNode;
  /** Search field, quick links or form. */
  children?: ReactNode;
  /** Photograph(s). Rendered after the copy on phones. */
  media?: ReactNode;
  layout?: 'split' | 'over';
  /** `ink` renders a charcoal band (Events). */
  tone?: 'paper' | 'ink';
  /** Desktop only: photograph on the left. */
  mediaFirst?: boolean;
  /** Desktop right-column module for `over` layouts (e.g. numbered index). */
  aside?: ReactNode;
  titleId?: string;
  className?: string;
}) {
  const ink = tone === 'ink';
  const textTone = ink || layout === 'over' ? 'text-paper' : 'text-ink';
  const supportTone = ink || layout === 'over' ? 'text-paper/85' : 'text-ink-soft';
  const eyebrowTone = ink || layout === 'over' ? 'text-paper/80' : 'text-ink-soft';

  const copy = (
    <div className={`max-w-[640px] ${textTone}`}>
      {eyebrow ? <p className={`eyebrow ${eyebrowTone}`}>{eyebrow}</p> : null}
      <h1 id={titleId} className={`mt-2 text-[2.5rem] leading-[0.98] sm:text-[3.25rem] lg:text-[4rem] ${textTone}`}>
        {title}
      </h1>
      {support ? <p className={`mt-3 max-w-md text-[17px] sm:text-lead ${supportTone}`}>{support}</p> : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );

  if (layout === 'over') {
    return (
      <section className={`relative isolate bg-ink text-paper ${className}`} aria-labelledby={titleId}>
        <div className={`grid ${aside ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
          <div className="relative flex min-h-[420px] flex-col justify-end md:min-h-[480px] lg:min-h-[520px]">
            {media ? <div className="absolute inset-0 -z-10 overflow-hidden [&_figure]:h-full [&_figure]:w-full [&_img]:h-full">{media}</div> : null}
            <div
              className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/90 via-ink/50 to-ink/20 md:bg-gradient-to-r md:from-ink/85 md:via-ink/45 md:to-ink/10"
              aria-hidden="true"
            />
            <div className="shell py-8 md:py-12">{copy}</div>
          </div>
          {aside ? <div className="border-t border-paper-edge bg-paper text-ink lg:border-l lg:border-t-0">{aside}</div> : null}
        </div>
      </section>
    );
  }

  const bandClass = ink ? 'bg-ink text-paper' : 'bg-paper';
  return (
    <section className={`${bandClass} ${className}`} aria-labelledby={titleId}>
      <div className="shell grid gap-6 pb-8 pt-6 md:pt-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-12 lg:pb-10">
        <div className={mediaFirst ? 'lg:order-2' : ''}>{copy}</div>
        {media ? <div className={`${mediaFirst ? 'lg:order-1' : ''}`}>{media}</div> : null}
      </div>
    </section>
  );
}

/** Two photographs, one wide and one narrow, in an asymmetric pair. */
export function MediaPair({ primary, secondary, className = '' }: { primary: ReactNode; secondary?: ReactNode; className?: string }) {
  return (
    <div className={`grid gap-2 ${secondary ? 'grid-cols-[3fr_2fr]' : ''} ${className}`}>
      <div className="overflow-hidden rounded-card bg-ink [&_figure]:h-full [&_figure]:w-full [&_img]:h-full">{primary}</div>
      {secondary ? <div className="overflow-hidden rounded-card bg-ink [&_figure]:h-full [&_figure]:w-full [&_img]:h-full">{secondary}</div> : null}
    </div>
  );
}
