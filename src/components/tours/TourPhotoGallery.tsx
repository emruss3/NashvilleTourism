'use client';

import { useState } from 'react';
import type { ViatorImage } from '@/lib/feeds/viator';

export default function TourPhotoGallery({
  images,
  title,
}: {
  images: ViatorImage[];
  title: string;
}) {
  const coverIndex = Math.max(
    0,
    images.findIndex((image) => image.isCover),
  );
  const [active, setActive] = useState(coverIndex);
  const current = images[active] ?? images[0];
  if (!current) return null;

  return (
    <div>
      <div className="overflow-hidden rounded-card border border-paper-edge bg-sky/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.caption || title}
          className="aspect-[16/10] w-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
      {images.length > 1 ? (
        <ul className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {images.slice(0, 16).map((image, index) => (
            <li key={`${image.url}-${index}`}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-pressed={index === active}
                aria-label={image.caption || `Photo ${index + 1} of ${title}`}
                className={`block overflow-hidden rounded border ${
                  index === active ? 'border-clay' : 'border-paper-edge'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt=""
                  className="aspect-square w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
