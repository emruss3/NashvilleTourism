'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ViatorImage } from '@/lib/feeds/viator';

const SIDE_SLOTS = 4;

function imageSrc(image: ViatorImage, preferThumb = false): string {
  return (preferThumb && image.thumbUrl) || image.url;
}

export default function TourPhotoGallery({
  images,
  title,
}: {
  images: ViatorImage[];
  title: string;
}) {
  const coverIndex = Math.max(0, images.findIndex((image) => image.isCover));
  const [active, setActive] = useState(coverIndex);
  const [lightbox, setLightbox] = useState(false);

  const current = images[active] ?? images[0];
  const hasMore = images.length > SIDE_SLOTS;
  const sideImages = images.slice(0, SIDE_SLOTS);

  const goPrev = useCallback(() => {
    setActive((index) => (index <= 0 ? images.length - 1 : index - 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setActive((index) => (index >= images.length - 1 ? 0 : index + 1));
  }, [images.length]);

  useEffect(() => {
    if (!lightbox) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(false);
      if (event.key === 'ArrowLeft') goPrev();
      if (event.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightbox, goPrev, goNext]);

  if (!current) return null;

  return (
    <>
      <div className="grid gap-1 md:grid-cols-[minmax(4.75rem,5.75rem)_minmax(0,1fr)]">
        {images.length > 1 ? (
          <ul className="hidden grid-rows-4 gap-1 md:grid">
            {sideImages.map((image, index) => {
              const isLastSlot = index === SIDE_SLOTS - 1;
              const showSeeAll = isLastSlot && hasMore;

              return (
                <li key={`${image.url}-${index}`} className="relative min-h-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (showSeeAll) setLightbox(true);
                      else setActive(index);
                    }}
                    aria-pressed={index === active}
                    aria-label={
                      showSeeAll
                        ? `See all ${images.length} photos of ${title}`
                        : image.caption || `Photo ${index + 1} of ${title}`
                    }
                    className={`relative block h-full w-full overflow-hidden rounded-sm border ${
                      index === active ? 'border-clay ring-1 ring-clay' : 'border-paper-edge'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageSrc(image, true)}
                      alt=""
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {showSeeAll ? (
                      <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-ink/55 text-xs font-semibold text-soft-white">
                        <GridIcon />
                        See More
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className="relative min-h-[14rem] overflow-hidden rounded-card border border-paper-edge bg-sky/40 sm:min-h-[18rem] lg:min-h-[24rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.caption || title}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-paper-edge bg-paper-card/95 text-navy shadow-card hover:bg-paper-card"
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-paper-edge bg-paper-card/95 text-navy shadow-card hover:bg-paper-card"
              >
                <ChevronRight />
              </button>
              <button
                type="button"
                onClick={() => setLightbox(true)}
                className="absolute bottom-3 right-3 rounded-full border border-paper-edge bg-paper-card/95 px-3 py-1.5 text-xs font-semibold text-navy shadow-card hover:bg-paper-card md:hidden"
              >
                See all {images.length} photos
              </button>
            </>
          ) : null}
        </div>
      </div>

      {images.length > 1 ? (
        <ul className="mt-2 flex gap-2 overflow-x-auto pb-1 md:hidden">
          {images.map((image, index) => (
            <li key={`${image.url}-mobile-${index}`} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-pressed={index === active}
                aria-label={image.caption || `Photo ${index + 1} of ${title}`}
                className={`block h-16 w-16 overflow-hidden rounded border ${
                  index === active ? 'border-clay ring-1 ring-clay' : 'border-paper-edge'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc(image, true)}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`All photos of ${title}`}
          onClick={() => setLightbox(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-card bg-paper-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-paper-edge px-4 py-3">
              <p className="font-sans text-sm font-semibold text-navy">
                {active + 1} of {images.length}
              </p>
              <button
                type="button"
                onClick={() => setLightbox(false)}
                aria-label="Close photo gallery"
                className="rounded-full px-2 py-1 text-sm font-semibold text-navy hover:bg-sky/40"
              >
                Close
              </button>
            </div>

            <div className="relative bg-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.url}
                alt={current.caption || title}
                className="mx-auto max-h-[58vh] w-full object-contain"
                referrerPolicy="no-referrer"
              />
              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper-card/95 text-navy shadow-card"
                  >
                    <ChevronLeft />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper-card/95 text-navy shadow-card"
                  >
                    <ChevronRight />
                  </button>
                </>
              ) : null}
            </div>

            <ul className="grid max-h-[22vh] grid-cols-4 gap-2 overflow-y-auto p-4 sm:grid-cols-6 md:grid-cols-8">
              {images.map((image, index) => (
                <li key={`${image.url}-lightbox-${index}`}>
                  <button
                    type="button"
                    onClick={() => setActive(index)}
                    aria-pressed={index === active}
                    aria-label={image.caption || `Photo ${index + 1}`}
                    className={`block overflow-hidden rounded border ${
                      index === active ? 'border-clay ring-1 ring-clay' : 'border-paper-edge'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageSrc(image, true)}
                      alt=""
                      className="aspect-square w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="5" height="5" rx="0.5" fill="currentColor" />
      <rect x="11" y="2" width="5" height="5" rx="0.5" fill="currentColor" />
      <rect x="2" y="11" width="5" height="5" rx="0.5" fill="currentColor" />
      <rect x="11" y="11" width="5" height="5" rx="0.5" fill="currentColor" />
    </svg>
  );
}
