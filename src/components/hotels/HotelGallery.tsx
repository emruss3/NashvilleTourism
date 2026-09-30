'use client';

import { useId, useState } from 'react';

export interface GalleryImage {
  url: string;
  caption?: string;
}

/**
 * Provider photos of a hotel: one lead image and four thumbnails, with the
 * rest behind "All N photos". Provider images are display only, hot-linked
 * from the provider's CDN with no referrer, and credited in the line under
 * the grid; they never replace editorial copy.
 */
export default function HotelGallery({ images, name, attribution }: { images: GalleryImage[]; name: string; attribution?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  if (!images.length) return null;
  const lead = images[0];
  const thumbs = images.slice(1, 5);
  const rest = images.slice(5);

  return (
    <figure className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-card bg-paper-sunk sm:row-span-2 sm:aspect-auto sm:min-h-[340px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lead.url} alt={lead.caption || name} className="absolute inset-0 h-full w-full object-cover" loading="eager" fetchPriority="high" referrerPolicy="no-referrer" />
        </div>
        {thumbs.length ? (
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-2" aria-label={`${name} photos`}>
            {thumbs.map((img, i) => (
              <li key={img.url} className="relative aspect-[4/3] overflow-hidden rounded-card bg-paper-sunk">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.caption || ''} className="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                {i === thumbs.length - 1 && rest.length && !open ? (
                  <button type="button" className="absolute inset-0 flex items-center justify-center bg-ink/55 text-sm font-semibold text-paper" aria-controls={`${id}-all`} aria-expanded={open} onClick={() => setOpen(true)}>
                    All {images.length} photos
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {open && rest.length ? (
        <ul id={`${id}-all`} className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {rest.map((img) => (
            <li key={img.url} className="relative aspect-[4/3] overflow-hidden rounded-card bg-paper-sunk">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.caption || ''} className="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
            </li>
          ))}
        </ul>
      ) : null}
      <figcaption className="text-2xs text-ink-soft">Photos supplied by the property{attribution ? ` via ${attribution.includes('LiteAPI') ? 'LiteAPI (Nuitée)' : 'our booking partner'}` : ''}.</figcaption>
    </figure>
  );
}
