'use client';

import { useId, useState } from 'react';

export interface FlipImage {
  url: string;
  caption?: string;
}

/**
 * One frame with previous / next arrows, a counter and swipe. Used for the
 * hotel gallery and for each room card, so a room with six catalog photos
 * can be flipped through without leaving the list. Arrow keys work when
 * the frame has focus. Provider images are display only, hot-linked with
 * no referrer.
 */
export default function PhotoFlipper({
  images,
  name,
  ratio = 'aspect-[3/2]',
  className = '',
  eager = false,
  index: controlled,
  onIndexChange,
  rounded = true,
}: {
  images: FlipImage[];
  name: string;
  /** Tailwind aspect class for the frame. */
  ratio?: string;
  className?: string;
  eager?: boolean;
  /** Controlled index when the parent also shows thumbnails. */
  index?: number;
  onIndexChange?: (i: number) => void;
  rounded?: boolean;
}) {
  const id = useId();
  const [inner, setInner] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const index = Math.min(controlled ?? inner, Math.max(images.length - 1, 0));
  const setIndex = (i: number) => {
    const next = (i + images.length) % images.length;
    if (onIndexChange) onIndexChange(next);
    else setInner(next);
  };
  if (!images.length) return null;
  const img = images[index];
  const many = images.length > 1;
  const btn = 'absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-ink shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ink';

  return (
    <div
      className={`relative ${ratio} w-full overflow-hidden bg-paper-sunk ${rounded ? 'rounded-card' : ''} ${className}`}
      role="group"
      aria-roledescription="carousel"
      aria-label={`${name} photos`}
      tabIndex={many ? 0 : -1}
      onKeyDown={(e) => {
        if (!many) return;
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setIndex(index + 1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setIndex(index - 1);
        }
      }}
      onTouchStart={(e) => setTouchX(e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        if (touchX === null || !many) return;
        const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX;
        if (Math.abs(dx) > 40) setIndex(index + (dx < 0 ? 1 : -1));
        setTouchX(null);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={img.url} src={img.url} alt={img.caption || name} className="absolute inset-0 h-full w-full object-cover" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} referrerPolicy="no-referrer" draggable={false} />
      {many ? (
        <>
          <button type="button" className={`${btn} left-2`} onClick={() => setIndex(index - 1)} aria-label="Previous photo">
            <span aria-hidden="true" className="text-lg leading-none">
              ‹
            </span>
          </button>
          <button type="button" className={`${btn} right-2`} onClick={() => setIndex(index + 1)} aria-label="Next photo">
            <span aria-hidden="true" className="text-lg leading-none">
              ›
            </span>
          </button>
          <p id={`${id}-count`} className="absolute bottom-2 right-2 rounded bg-ink/75 px-2 py-0.5 text-2xs font-semibold tabular-nums text-paper" aria-live="polite">
            {index + 1} / {images.length}
          </p>
        </>
      ) : null}
    </div>
  );
}
