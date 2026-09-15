'use client';

import { useEffect, useRef, useState } from 'react';
import { heroVideo } from '@/lib/media';
import { asset as assetUrl } from '@/lib/seo';

/**
 * Continuous muted hero loop with a pause control.
 *
 * The video only mounts on wide viewports after hydration. Phones get the
 * poster alone: the loop is 3MB+, most of the audience is on mobile, and the
 * poster is the LCP element either way. Reduced-motion and data-saver users
 * also stay on the poster.
 */
export default function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 768px)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const saveData = Boolean(
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
    );
    const update = () => setEnabled(wide.matches && !reduce.matches && !saveData);
    update();
    wide.addEventListener('change', update);
    reduce.addEventListener('change', update);
    return () => {
      wide.removeEventListener('change', update);
      reduce.removeEventListener('change', update);
    };
  }, []);

  if (!enabled) return null;

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <>
      <video
        ref={ref}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={heroVideo.poster ? assetUrl(heroVideo.poster) : undefined}
        aria-hidden="true"
      >
        {heroVideo.mp4 && <source src={assetUrl(heroVideo.mp4)} type="video/mp4" />}
        {heroVideo.webm && <source src={assetUrl(heroVideo.webm)} type="video/webm" />}
      </video>
      <button
        type="button"
        onClick={toggle}
        className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-paper-card/40 bg-navy/45 text-paper-card backdrop-blur-sm transition-colors hover:bg-navy/65 sm:right-6 sm:top-6"
        aria-label={playing ? 'Pause background video' : 'Play background video'}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5-11-6.5z" />
          </svg>
        )}
      </button>
    </>
  );
}
