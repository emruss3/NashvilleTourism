'use client';

import Link from 'next/link';
import { useCallback, useId, useState } from 'react';
import { neighborhoods } from '@/lib/content';
import type { ImageKey } from '@/lib/media';
import type { Neighborhood } from '@/lib/types';
import { SmartImage } from './Media';
import StarMark from './StarMark';

/**
 * Interactive neighborhood explorer — Austin-inspired layout (map + detail panel),
 * Nashville geography and NASHVILLE brand system. Not a copy of Visit Austin art.
 */

type MapSpot = {
  slug: Neighborhood['slug'];
  label: string;
  /** Region label shown on the map canvas */
  region?: string;
  cx: number;
  cy: number;
};

/** Mental-map positions — approximate, not survey-accurate. */
const SPOTS: MapSpot[] = [
  { slug: 'germantown', label: 'Germantown', region: 'NORTH', cx: 355, cy: 168 },
  { slug: 'east-nashville', label: 'East Nashville', region: 'EAST', cx: 545, cy: 245 },
  { slug: 'downtown-broadway', label: 'Downtown', region: 'DOWNTOWN', cx: 390, cy: 275 },
  { slug: 'the-gulch', label: 'The Gulch', cx: 355, cy: 335 },
  { slug: 'midtown', label: 'Midtown', region: 'WEST', cx: 255, cy: 290 },
  { slug: 'wedgewood-houston', label: 'WeHo', cx: 420, cy: 400 },
  { slug: '12-south', label: '12 South', region: 'SOUTH', cx: 310, cy: 430 },
  { slug: 'hillsboro-village', label: 'Hillsboro', cx: 230, cy: 390 },
  { slug: 'sylvan-park', label: 'Sylvan Park', cx: 145, cy: 310 },
  { slug: 'green-hills', label: 'Green Hills', cx: 210, cy: 480 },
];

function hoodFor(slug: string): Neighborhood {
  return neighborhoods.find((n) => n.slug === slug)!;
}

export default function NeighborhoodMap() {
  const [index, setIndex] = useState(2); // Downtown as default
  const baseId = useId();
  const active = SPOTS[index];
  const hood = hoodFor(active.slug);

  const go = useCallback(
    (next: number) => {
      setIndex((next + SPOTS.length) % SPOTS.length);
    },
    [],
  );

  const selectSlug = useCallback((slug: string) => {
    const i = SPOTS.findIndex((s) => s.slug === slug);
    if (i >= 0) setIndex(i);
  }, []);

  return (
    <div className="overflow-hidden rounded-card bg-cumberland shadow-lift">
      <div className="grid lg:grid-cols-[1.55fr_1fr]">
        {/* Map canvas */}
        <div className="relative min-h-[320px] bg-dogwood/35 p-3 sm:min-h-[420px] sm:p-5 lg:min-h-[480px]">
          <div className="absolute inset-3 overflow-hidden rounded-card bg-paper sm:inset-5">
            <svg
              viewBox="0 0 700 560"
              className="h-full w-full"
              role="img"
              aria-label="Illustrated map of Nashville neighborhoods. Select a neighborhood to learn more."
            >
              {/* Soft layered field */}
              <rect width="700" height="560" fill="#F8F3E9" />
              <rect x="24" y="28" width="652" height="504" rx="8" fill="#FFFDFC" opacity="0.7" />

              {/* Cumberland River */}
              <path
                d="M480 40 C460 120, 470 180, 500 240 C540 320, 520 380, 480 460 C450 520, 420 540, 400 560"
                fill="none"
                stroke="#7EB8D4"
                strokeWidth="28"
                strokeLinecap="round"
                opacity="0.85"
              />
              <path
                d="M480 40 C460 120, 470 180, 500 240 C540 320, 520 380, 480 460 C450 520, 420 540, 400 560"
                fill="none"
                stroke="#DDECEF"
                strokeWidth="12"
                strokeLinecap="round"
                opacity="0.5"
              />
              <text
                x="530"
                y="200"
                fill="#214A72"
                fontSize="11"
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight="600"
                letterSpacing="0.12em"
                opacity="0.7"
              >
                CUMBERLAND
              </text>

              {/* Highway suggestion — I-40 corridor */}
              <path
                d="M40 300 H660"
                stroke="#E8E2D6"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M300 40 V520"
                stroke="#E8E2D6"
                strokeWidth="8"
                strokeLinecap="round"
              />

              {/* Region banners */}
              <RegionBanner x={300} y={95} label="NORTH" />
              <RegionBanner x={560} y={175} label="EAST" />
              <RegionBanner x={120} y={250} label="WEST" />
              <RegionBanner x={280} y={505} label="SOUTH" />

              {/* Simple place icons — no guitars, boots, or neon */}
              <MapIcon kind="bridge" x={455} y={290} />
              <MapIcon kind="plate" x={520} y={310} />
              <MapIcon kind="building" x={370} y={250} />
              <MapIcon kind="leaf" x={160} y={340} />
              <MapIcon kind="cup" x={300} y={450} />
              <MapIcon kind="gallery" x={440} y={420} />

              {/* Clickable neighborhood spots */}
              {SPOTS.map((spot, i) => {
                const selected = i === index;
                return (
                  <g key={spot.slug}>
                    <circle
                      cx={spot.cx}
                      cy={spot.cy}
                      r={selected ? 28 : 22}
                      fill={selected ? '#D95D45' : '#102A43'}
                      opacity={selected ? 1 : 0.88}
                      className="cursor-pointer transition-all"
                      role="button"
                      tabIndex={0}
                      aria-pressed={selected}
                      aria-label={hoodFor(spot.slug).name}
                      onClick={() => selectSlug(spot.slug)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          selectSlug(spot.slug);
                        }
                      }}
                    />
                    {selected && (
                      <circle
                        cx={spot.cx}
                        cy={spot.cy}
                        r={36}
                        fill="none"
                        stroke="#D95D45"
                        strokeWidth="2"
                        opacity="0.45"
                      />
                    )}
                    <text
                      x={spot.cx}
                      y={spot.cy + (selected ? 44 : 38)}
                      textAnchor="middle"
                      fill="#102A43"
                      fontSize="11"
                      fontFamily="Inter, system-ui, sans-serif"
                      fontWeight="700"
                      letterSpacing="0.04em"
                      className="pointer-events-none uppercase"
                    >
                      {spot.label}
                    </text>
                  </g>
                );
              })}

              {/* Downtown label callout */}
              <text
                x={390}
                y={220}
                textAnchor="middle"
                fill="#102A43"
                fontSize="13"
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight="800"
                letterSpacing="0.16em"
                opacity="0.35"
              >
                DOWNTOWN
              </text>
            </svg>
          </div>
        </div>

        {/* Detail panel */}
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

            <p className="text-2xs font-bold uppercase tracking-[0.16em] text-dogwood">
              Explore
            </p>
            <h3 className="mt-1 font-sans text-2xl font-bold leading-tight text-paper-card">
              {hood.name}
            </h3>
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
                onClick={() => go(index - 1)}
              >
                <Chevron dir="left" />
              </button>
              <span className="min-w-[4.5rem] text-center text-2xs font-bold tracking-[0.14em] text-paper-card/70">
                {index + 1} OF {SPOTS.length}
              </span>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded border border-paper-card/30 text-paper-card transition-colors hover:bg-paper-card/10"
                aria-label="Next neighborhood"
                onClick={() => go(index + 1)}
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

function RegionBanner({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g>
      <rect x={x - 36} y={y - 12} width={72} height={22} rx={3} fill="#F2B7AE" opacity="0.85" />
      <text
        x={x}
        y={y + 3}
        textAnchor="middle"
        fill="#102A43"
        fontSize="10"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="800"
        letterSpacing="0.14em"
      >
        {label}
      </text>
    </g>
  );
}

function MapIcon({ kind, x, y }: { kind: 'bridge' | 'plate' | 'building' | 'leaf' | 'cup' | 'gallery'; x: number; y: number }) {
  const stroke = '#214A72';
  return (
    <g transform={`translate(${x} ${y})`} opacity="0.55" aria-hidden="true">
      {kind === 'bridge' && (
        <>
          <path d="M-14 4 H14" stroke={stroke} strokeWidth="2" fill="none" />
          <path d="M-10 4 Q0 -8 10 4" stroke={stroke} strokeWidth="2" fill="none" />
          <circle cx="-10" cy="4" r="2" fill={stroke} />
          <circle cx="10" cy="4" r="2" fill={stroke} />
        </>
      )}
      {kind === 'plate' && (
        <>
          <circle r="10" fill="none" stroke={stroke} strokeWidth="2" />
          <circle r="5" fill="none" stroke={stroke} strokeWidth="1.5" />
        </>
      )}
      {kind === 'building' && (
        <>
          <rect x="-8" y="-12" width="16" height="20" fill="none" stroke={stroke} strokeWidth="2" />
          <path d="M-4 -6 h3 M-4 0 h3 M-4 6 h3 M2 -6 h3 M2 0 h3 M2 6 h3" stroke={stroke} strokeWidth="1.5" />
        </>
      )}
      {kind === 'leaf' && (
        <path
          d="M0 10 C-12 2 -10 -10 0 -12 C10 -10 12 2 0 10 Z"
          fill="none"
          stroke="#2F6B55"
          strokeWidth="2"
        />
      )}
      {kind === 'cup' && (
        <>
          <path d="M-7 -6 h12 v10 a6 6 0 0 1 -12 0 z" fill="none" stroke={stroke} strokeWidth="2" />
          <path d="M5 -2 h4 a3 3 0 0 1 0 6 h-4" fill="none" stroke={stroke} strokeWidth="2" />
        </>
      )}
      {kind === 'gallery' && (
        <>
          <rect x="-11" y="-8" width="22" height="16" fill="none" stroke={stroke} strokeWidth="2" />
          <path d="M-6 4 L-1 -2 L3 2 L7 -4" fill="none" stroke={stroke} strokeWidth="1.5" />
        </>
      )}
    </g>
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
