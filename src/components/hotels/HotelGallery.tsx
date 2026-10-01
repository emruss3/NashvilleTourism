'use client';

import { useState } from 'react';
import PhotoFlipper, { type FlipImage } from '@/components/hotels/PhotoFlipper';

export type GalleryImage = FlipImage;

/**
 * Provider photos of a hotel: one large frame to flip through (arrows,
 * swipe, arrow keys) with a thumbnail strip under it that jumps to any
 * photo. Provider images are display only and credited in the line under
 * the strip; they never replace editorial copy.
 */
export default function HotelGallery({ images, name, attribution }: { images: GalleryImage[]; name: string; attribution?: string }) {
  const [index, setIndex] = useState(0);
  if (!images.length) return null;

  return (
    <figure className="space-y-2">
      <PhotoFlipper images={images} name={name} ratio="aspect-[16/10]" eager index={index} onIndexChange={setIndex} />
      {images.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label={`${name} photo thumbnails`}>
          {images.map((img, i) => (
            <li key={img.url} className="shrink-0">
              <button type="button" onClick={() => setIndex(i)} aria-label={`Photo ${i + 1} of ${images.length}${img.caption ? `: ${img.caption}` : ''}`} aria-current={i === index ? 'true' : undefined} className={`relative block h-16 w-24 overflow-hidden rounded bg-paper-sunk sm:h-20 sm:w-28 ${i === index ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : 'opacity-80 hover:opacity-100'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" draggable={false} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <figcaption className="text-2xs text-ink-soft">
        {images[index]?.caption ? `${images[index].caption}. ` : ''}Photos supplied by the property{attribution ? ` via ${attribution.includes('LiteAPI') ? 'LiteAPI (Nuitée)' : 'our booking partner'}` : ''}.
      </figcaption>
    </figure>
  );
}
