import { getImage, hasMedia, type ImageKey } from '@/lib/media';

/**
 * Renders a real photograph when the licensed file has been added, and a
 * typographic fallback until then. The fallback reserves the same space, so
 * swapping in the real asset causes no layout shift.
 *
 * Uses a plain <img> rather than next/image because the site is statically
 * exported, where next/image optimisation is unavailable anyway.
 */
export function SmartImage({
  imageKey,
  ratio = 'aspect-[3/2]',
  className = '',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  rounded = false,
}: {
  imageKey?: ImageKey;
  ratio?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  rounded?: boolean;
}) {
  const asset = getImage(imageKey);
  const ready = imageKey ? hasMedia(imageKey) : false;
  const round = rounded ? 'rounded-card' : '';

  if (!asset || !ready) {
    return (
      <div
        className={`photo-slot ${ratio} ${round} ${className}`}
        role="img"
        aria-label={asset?.alt ?? 'Photography placeholder'}
      >
        <span className="px-4 text-center font-display text-sm italic text-ink-faint">
          Photo to come
        </span>
      </div>
    );
  }

  return (
    <figure className={`relative overflow-hidden ${ratio} ${round} ${className}`}>
      <img
        src={asset.src}
        alt={asset.alt}
        width={asset.width}
        height={asset.height}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        // eslint-disable-next-line @next/next/no-img-element
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        className="h-full w-full object-cover"
        style={asset.focal === 'top' ? { objectPosition: 'top' } : undefined}
      />
      {asset.credit && (
        <figcaption className="absolute bottom-1 right-1 rounded bg-ink/60 px-1.5 py-0.5 text-2xs text-white/90">
          {asset.credit}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Full-bleed hero media. Plays a muted looping clip when the video files are
 * present. Falls back to the poster still otherwise, and always falls back for
 * anyone who has asked for reduced motion.
 */
export function HeroMedia({ children }: { children: React.ReactNode }) {
  const videoReady = hasMedia('hero/video');

  return (
    <div className="relative isolate overflow-hidden bg-ink">
      {videoReady ? (
        <video
          className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/media/hero/lower-broadway-night.jpg"
          aria-hidden="true"
        >
          <source src="/media/video/lower-broadway-night.webm" type="video/webm" />
          <source src="/media/video/lower-broadway-night.mp4" type="video/mp4" />
        </video>
      ) : null}

      {/* Poster / fallback layer. Always present so reduced-motion users and
          browsers without the video files still get a full-bleed image. */}
      <div
        className={`absolute inset-0 ${videoReady ? 'motion-safe:hidden' : ''}`}
        aria-hidden="true"
      >
        {hasMedia('hero/lower-broadway') ? (
          <img
            src="/media/hero/lower-broadway-night.jpg"
            alt=""
            className="h-full w-full object-cover"
            fetchPriority="high"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(1200px_500px_at_75%_-10%,#3a2418_0%,transparent_60%),radial-gradient(900px_500px_at_10%_110%,#1d2b28_0%,transparent_60%),linear-gradient(160deg,#1a1410_0%,#241a13_100%)]" />
        )}
      </div>

      {/* Legibility scrim. Required for WCAG contrast over any photograph. */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-ink/75 via-ink/55 to-ink/80"
        aria-hidden="true"
      />

      <div className="relative">{children}</div>
    </div>
  );
}
