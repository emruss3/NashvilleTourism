'use client';

import { useState } from 'react';
import type { StorefrontImage } from '@/lib/shopify/types';

export default function ProductGallery({
  images,
  title,
}: {
  images: StorefrontImage[];
  title: string;
}) {
  const [selected, setSelected] = useState(0);
  const active = images[selected] || images[0];

  if (!active) {
    return (
      <div
        className="photo-slot aspect-[4/5] rounded-card"
        role="img"
        aria-label={`Product photography coming soon for ${title}`}
      />
    );
  }

  return (
    <div>
      <div className="aspect-[4/5] overflow-hidden rounded-card bg-paper-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={active.url}
          alt={active.altText || title}
          width={active.width || 1400}
          height={active.height || 1750}
          className="h-full w-full object-cover"
          fetchPriority="high"
        />
      </div>

      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2" aria-label="Product images">
          {images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={`View image ${index + 1} of ${images.length}`}
              aria-pressed={index === selected}
              className={`aspect-square overflow-hidden rounded border bg-paper-card transition-colors ${
                index === selected ? 'border-clay' : 'border-paper-edge hover:border-ink/30'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt=""
                width={image.width || 300}
                height={image.height || 300}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
