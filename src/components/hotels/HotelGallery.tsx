'use client';

import { useEffect, useId, useState } from 'react';
import PhotoFlipper, { type FlipImage } from '@/components/hotels/PhotoFlipper';

export type GalleryImage = FlipImage;

/**
 * Provider photos of a hotel as a full-width mosaic: one lead frame and
 * four thumbnails, the last carrying "+N photos". Any frame opens a
 * lightbox that flips through every photo (arrows, swipe, arrow keys,
 * thumbnail strip, Esc to close). Provider images are display only, hot
 * linked with no referrer, credited under the mosaic; they never replace
 * editorial copy.
 */
export default function HotelGallery({ images, name, attribution }: { images: GalleryImage[]; name: string; attribution?: string }) {
  const id = useId();
  const [open, setOpen] = useState<number | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!images.length) return null;
  const lead = images[0];
  const thumbs = images.slice(1, 5);
  const extra = Math.max(images.length - 5, 0);
  const show = (i: number) => {
    setIndex(i);
    setOpen(i);
  };
  const credit = `Photos supplied by the property${attribution ? ` via ${attribution.includes('LiteAPI') ? 'LiteAPI (Nuitée)' : 'our booking partner'}` : ''}.`;

  return (
    <figure className="space-y-2">
      <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2">
        <button type="button" onClick={() => show(0)} className="relative aspect-[16/10] overflow-hidden rounded-card bg-paper-sunk focus:outline-none focus-visible:ring-2 focus-visible:ring-ink md:row-span-2 md:aspect-auto md:min-h-[400px]" aria-label={`Open photo 1 of ${images.length}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lead.url} alt={lead.caption || name} className="absolute inset-0 h-full w-full object-cover" loading="eager" fetchPriority="high" referrerPolicy="no-referrer" draggable={false} />
        </button>
        {thumbs.length ? (
          <ul className="contents" aria-label={`${name} photos`}>
            {thumbs.map((img, i) => (
              <li key={img.url} className="relative hidden aspect-[4/3] overflow-hidden rounded-card bg-paper-sunk md:block md:aspect-auto">
                <button type="button" onClick={() => show(i + 1)} className="absolute inset-0 h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ink" aria-label={`Open photo ${i + 2} of ${images.length}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.caption || ''} className="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" draggable={false} />
                  {i === thumbs.length - 1 && extra > 0 ? <span className="absolute inset-0 flex items-center justify-center bg-ink/55 text-sm font-semibold text-paper">+{extra} photos</span> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-2xs text-ink-soft">
        <span>{credit}</span>
        {images.length > 1 ? (
          <button type="button" onClick={() => show(0)} className="font-semibold text-ink underline underline-offset-2 md:hidden">
            All {images.length} photos
          </button>
        ) : null}
      </figcaption>

      {open !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name} photos`}
          className="fixed inset-0 z-[60] flex flex-col bg-ink/95 p-3 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(null);
          }}
        >
          <div className="flex items-center justify-between text-paper">
            <p className="text-sm">
              <span className="font-semibold">{name}</span>
              <span className="text-paper/70">
                {' '}
                · {index + 1} of {images.length}
              </span>
            </p>
            <button type="button" onClick={() => setOpen(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-paper/15 text-xl leading-none text-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-paper" aria-label="Close photos" autoFocus>
              ×
            </button>
          </div>
          <div className="mx-auto mt-3 w-full max-w-5xl flex-1">
            <PhotoFlipper images={images} name={name} ratio="aspect-[4/3] sm:aspect-[16/10]" index={index} onIndexChange={setIndex} rounded />
            {images[index]?.caption ? <p className="mt-2 text-center text-sm text-paper/80">{images[index].caption}</p> : null}
          </div>
          <ul id={`${id}-strip`} className="mx-auto mt-3 flex w-full max-w-5xl gap-2 overflow-x-auto pb-1" aria-label="Photo thumbnails">
            {images.map((img, i) => (
              <li key={img.url} className="shrink-0">
                <button type="button" onClick={() => setIndex(i)} aria-label={`Photo ${i + 1}`} aria-current={i === index ? 'true' : undefined} className={`relative block h-14 w-20 overflow-hidden rounded bg-paper-sunk ${i === index ? 'ring-2 ring-paper' : 'opacity-60 hover:opacity-100'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" draggable={false} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </figure>
  );
}
