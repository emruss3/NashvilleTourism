'use client';

import Link from 'next/link';
import { useCallback, useId, useState } from 'react';
import { neighborhoods } from '@/lib/content';
import type { ImageKey } from '@/lib/media';
import { asset as assetUrl } from '@/lib/seo';
import type { Neighborhood } from '@/lib/types';
import { SmartImage } from './Media';
import StarMark from './StarMark';

/**
 * Illustrated Nashville neighborhood map with clickable hotspots.
 * Positions are percentage boxes over the artwork labels.
 */

type Hotspot = {
  id: string;
  slug: Neighborhood['slug'];
  label: string;
  /** Percentage of map width/height */
  left: number;
  top: number;
  width: number;
  height: number;
};

const HOTSPOTS: Hotspot[] = [
  { id: 'germantown', slug: 'germantown', label: 'Germantown', left: 5, top: 13, width: 30, height: 22 },
  { id: 'east-nashville', slug: 'east-nashville', label: 'East Nashville', left: 63, top: 17, width: 33, height: 26 },
  { id: 'west-end', slug: 'midtown', label: 'West End', left: 3, top: 37, width: 26, height: 18 },
  { id: 'downtown', slug: 'downtown-broadway', label: 'Downtown', left: 28, top: 32, width: 32, height: 22 },
  { id: 'music-row', slug: 'midtown', label: 'Music Row', left: 9, top: 54, width: 22, height: 11 },
  { id: 'the-gulch', slug: 'the-gulch', label: 'The Gulch', left: 31, top: 55, width: 28, height: 18 },
  { id: 'hillsboro-village', slug: 'hillsboro-village', label: 'Hillsboro Village', left: 2, top: 68, width: 30, height: 24 },
  { id: '12-south', slug: '12-south', label: '12 South', left: 33, top: 73, width: 24, height: 20 },
  { id: 'wedgewood-houston', slug: 'wedgewood-houston', label: 'Wedgewood-Houston', left: 58, top: 64, width: 38, height: 28 },
];

/** Unique neighborhood order for the detail carousel (map labels only). */
const CAROUSEL_SLUGS = [
  'germantown',
  'east-nashville',
  'downtown-broadway',
  'midtown',
  'the-gulch',
  'hillsboro-village',
  '12-south',
  'wedgewood-houston',
] as const;

function hoodFor(slug: string): Neighborhood {
  return neighborhoods.find((n) => n.slug === slug)!;
}

export default function NeighborhoodMap() {
  const [activeId, setActiveId] = useState('downtown');
  const baseId = useId();
  const active = HOTSPOTS.find((h) => h.id === activeId) ?? HOTSPOTS[3];
  const hood = hoodFor(active.slug);
  const carouselIndex = Math.max(0, CAROUSEL_SLUGS.indexOf(active.slug as (typeof CAROUSEL_SLUGS)[number]));

  const selectHotspot = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const go = useCallback((delta: number) => {
    setActiveId((currentId) => {
      const current = HOTSPOTS.find((h) => h.id === currentId) ?? HOTSPOTS[3];
      const i = CAROUSEL_SLUGS.indexOf(current.slug as (typeof CAROUSEL_SLUGS)[number]);
      const nextSlug = CAROUSEL_SLUGS[(i + delta + CAROUSEL_SLUGS.length) % CAROUSEL_SLUGS.length];
      const nextHotspot = HOTSPOTS.find((h) => h.slug === nextSlug);
      return nextHotspot?.id ?? currentId;
    });
  }, []);

  return (
    <div className="overflow-hidden rounded-card bg-cumberland shadow-lift">
      <div className="grid lg:grid-cols-[1.55fr_1fr]">
        <div className="relative bg-paper p-3 sm:p-4 lg:p-5">
          <div className="relative mx-auto aspect-square w-full max-w-[640px] overflow-hidden rounded-card bg-paper-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl('/media/maps/nashville-illustrated-map.png')}
              alt="Illustrated map of Nashville neighborhoods including Germantown, East Nashville, Downtown, The Gulch, 12 South, and more."
              width={1024}
              height={1024}
              className="h-full w-full object-cover"
              draggable={false}
            />

            <div className="absolute inset-0" role="group" aria-label="Neighborhood map hotspots">
              {HOTSPOTS.map((spot) => {
                const isActive = spot.id === activeId;
                const relatedSelected = !isActive && spot.slug === active.slug;
                return (
                  <button
                    key={spot.id}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={`${spot.label}. View ${hoodFor(spot.slug).name}`}
                    onClick={() => selectHotspot(spot.id)}
                    className={`absolute rounded-md transition-[box-shadow,background-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay ${
                      isActive
                        ? 'bg-clay/15 shadow-[inset_0_0_0_3px_#D95D45]'
                        : relatedSelected
                          ? 'bg-clay/10 shadow-[inset_0_0_0_2px_rgba(217,93,69,0.55)]'
                          : 'bg-transparent hover:bg-clay/10 hover:shadow-[inset_0_0_0_2px_rgba(217,93,69,0.45)]'
                    }`}
                    style={{
                      left: `${spot.left}%`,
                      top: `${spot.top}%`,
                      width: `${spot.width}%`,
                      height: `${spot.height}%`,
                    }}
                  >
                    <span className="sr-only">{spot.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-3 text-center text-2xs font-medium text-ink-faint sm:text-xs">
            Tap a neighborhood on the map
          </p>
        </div>

        <div
          className="flex flex-col justify-between gap-5 p-6 text-paper-card sm:p-8"
          aria-live="polite"
          id={`${baseId}-panel`}
        >
          <div>
            <div className="relative mb-5 aspect-[16/10] overflow-hidden rounded-card bg-navy/40">
              <SmartImage
                imageKey={`neighborhood/${hood.slug}` as ImageKey}
                ratio="absolute inset-0"
                className="opacity-80"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-t from-navy/70 via-transparent to-transparent p-4">
                <StarMark size={18} />
                <p className="font-sans text-2xl font-bold uppercase tracking-[0.08em] text-paper-card sm:text-3xl">
                  {active.label}
                </p>
              </div>
            </div>

            <p className="text-2xs font-bold uppercase tracking-[0.16em] text-dogwood">Explore</p>
            <h3 className="mt-1 font-sans text-2xl font-bold leading-tight text-paper-card">{hood.name}</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-paper-card/85">{hood.summary}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {hood.knownFor.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded border border-paper-card/25 bg-paper-card/10 px-2.5 py-1 text-2xs font-semibold text-paper-card"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-paper-card/15 pt-5">
            <Link href={`/neighborhoods/${hood.slug}/`} className="btn-primary">
              Read More
            </Link>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded border border-paper-card/30 text-paper-card transition-colors hover:bg-paper-card/10"
                aria-label="Previous neighborhood"
                onClick={() => go(-1)}
              >
                <Chevron dir="left" />
              </button>
              <span className="min-w-[4.5rem] text-center text-2xs font-bold tracking-[0.14em] text-paper-card/70">
                {carouselIndex + 1} OF {CAROUSEL_SLUGS.length}
              </span>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded border border-paper-card/30 text-paper-card transition-colors hover:bg-paper-card/10"
                aria-label="Next neighborhood"
                onClick={() => go(1)}
              >
                <Chevron dir="right" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {dir === 'left' ? (
        <path d="M10 3 L5 8 L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M6 3 L11 8 L6 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
