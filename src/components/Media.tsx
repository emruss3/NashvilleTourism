import HeroVideo from '@/components/HeroVideo';
import { getImage, hasMedia, heroVideo, type ImageKey } from '@/lib/media';
import { asset as assetUrl } from '@/lib/seo';

/**
 * Renders a real photograph when the licensed file has been added, and a
 * quiet fallback until then. The fallback reserves the same space, so
 * swapping in the real asset causes no layout shift.
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
        <span className="sr-only">Photography coming soon</span>
      </div>
    );
  }

  return (
    <figure className={`relative overflow-hidden ${ratio} ${round} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={assetUrl(asset.src)}
        alt={asset.alt}
        width={asset.width}
        height={asset.height}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
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
 * Full-bleed hero media. Continuous cinematic loop when available, with a
 * readable bottom scrim for type.
 */
export function HeroMedia({ children }: { children: React.ReactNode }) {
  const videoReady = hasMedia('hero/video');
  const stillReady = hasMedia('hero/lower-broadway');
  const poster = heroVideo.poster ? assetUrl(heroVideo.poster) : assetUrl('/media/hero/lower-broadway-day.jpg');

  return (
    <div className="relative isolate min-h-[min(86vh,760px)] overflow-hidden bg-navy">
      {videoReady ? <HeroVideo /> : null}

      <div
        className={`absolute inset-0 ${videoReady ? 'motion-safe:hidden' : ''}`}
        aria-hidden="true"
      >
        {stillReady || videoReady ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={videoReady ? poster : assetUrl('/media/hero/lower-broadway-day.jpg')}
            alt=""
            className="h-full w-full object-cover object-center"
            fetchPriority="high"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(1100px_480px_at_80%_-10%,#3A6A94_0%,transparent_55%),radial-gradient(900px_420px_at_5%_110%,#8FC4AD_0%,transparent_50%),linear-gradient(165deg,#214A72_0%,#102A43_100%)]" />
        )}
      </div>

      <div
        className="absolute inset-0 bg-gradient-to-t from-navy/75 via-navy/30 to-navy/10"
        aria-hidden="true"
      />

      <div className="relative flex min-h-[min(86vh,760px)] flex-col justify-end pb-20 pt-24 sm:pb-24 sm:pt-28">
        {children}
      </div>
    </div>
  );
}
