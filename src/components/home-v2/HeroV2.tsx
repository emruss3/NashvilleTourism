import Link from 'next/link';
import { getImage, hasMedia } from '@/lib/media';
import { asset as assetUrl } from '@/lib/seo';

/**
 * Concept hero: 68–72vh, left-aligned lower third, restrained left/bottom wash.
 * Structure accepts a future skyline still or video without layout changes.
 */
export default function HeroV2() {
  const ready = hasMedia('hero/lower-broadway');
  const asset = getImage('hero/lower-broadway');
  const src = asset ? assetUrl(asset.src) : undefined;

  return (
    <section className="relative isolate min-h-[68vh] overflow-hidden bg-navy lg:min-h-[72vh]">
      {/* Media plane — swap src / add <video> later without changing layout */}
      <div className="absolute inset-0" aria-hidden="true" data-hero-media>
        {src && ready ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            width={asset?.width ?? 2400}
            height={asset?.height ?? 1350}
            className="h-full w-full object-cover object-[center_35%]"
            fetchPriority="high"
            decoding="sync"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-cumberland to-navy" />
        )}
      </div>

      {/* Readability wash — left + bottom only, not a full navy veil */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-navy/75 via-navy/35 to-transparent"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent"
        aria-hidden="true"
      />

      <div className="relative flex min-h-[68vh] flex-col justify-end pb-16 pt-24 sm:pb-20 lg:min-h-[72vh] lg:pb-28">
        <div className="shell max-w-2xl animate-hero-in text-left">
          <h1 className="font-sans text-4xl font-bold tracking-tight text-paper-card sm:text-5xl lg:text-hero">
            Make the most of Nashville.
          </h1>
          <p className="mt-4 max-w-lg text-lead text-paper-card/90">
            The best places to stay, eat, hear live music, and spend your time.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/plan/" className="btn-primary px-5">
              Plan Your Trip
            </Link>
            <Link
              href="#explore"
              className="btn border-paper-card/40 bg-transparent px-5 text-paper-card hover:bg-paper-card/10"
            >
              Explore Nashville
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
