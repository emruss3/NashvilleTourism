'use client';

import { useRef, useState } from 'react';
import { heroVideo } from '@/lib/media';
import { asset as assetUrl } from '@/lib/seo';

/** Continuous muted hero loop with a VisitMusicCity-style pause control. */
export default function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);

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
        className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
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
        className="absolute right-4 top-4 z-10 hidden h-10 w-10 items-center justify-center rounded-full border border-paper-card/40 bg-navy/45 text-paper-card backdrop-blur-sm transition-colors hover:bg-navy/65 motion-safe:inline-flex sm:right-6 sm:top-6"
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
