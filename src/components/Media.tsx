import { getImage, hasMedia, heroVideo, type ImageKey } from '@/lib/media';
import { asset as assetUrl } from '@/lib/seo';
import HeroVideo from '@/components/HeroVideo';

/**
 * Renders a real photograph when the licensed file has been added, and a
 * quiet fallback until then. The fallback reserves the same space, so
 * swapping in the real asset causes no layout shift.
 *
 * Credits stay in the media registry and /photo-credits — never as on-image pills
 * (those read as location labels).
 */
export function SmartImage({
  imageKey,
  ratio = 'aspect-[3/2]',
  className = '',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  rounded = false,
  showCredit: _showCredit = false,
}: {
  imageKey?: ImageKey;
  ratio?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  rounded?: boolean;
  /** Deprecated: on-image credit pills are not rendered. */
  showCredit?: boolean;
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

  const desktopSrcSet = buildSrcSet(asset);
  const mobileSrcSet = asset.srcMobileSet
    ? buildSrcSet({ src: asset.srcMobile ?? asset.src, srcSet: asset.srcMobileSet })
    : asset.srcMobile
      ? assetUrl(asset.srcMobile)
      : undefined;
  const objectPosition =
    asset.objectPosition ??
    (asset.focal === 'top' ? 'top' : asset.focal === 'bottom' ? 'bottom' : 'center');

  return (
    <figure className={`relative overflow-hidden ${ratio} ${round} ${className}`}>
      <picture>
        {mobileSrcSet ? (
          <source
            media="(max-width: 767px)"
            srcSet={mobileSrcSet}
            sizes="100vw"
          />
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={assetUrl(asset.src)}
          srcSet={desktopSrcSet}
          alt={asset.alt}
          width={asset.width}
          height={asset.height}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
          className="h-full w-full object-cover"
          style={{ objectPosition }}
        />
      </picture>
    </figure>
  );
}

function buildSrcSet(image: {
  src: string;
  srcSet?: string;
  src640?: string;
  src960?: string;
  src1600?: string;
  width?: number;
}): string | undefined {
  if (image.srcSet) {
    return image.srcSet
      .split(',')
      .map((part) => {
        const trimmed = part.trim();
        const space = trimmed.lastIndexOf(' ');
        if (space === -1) return assetUrl(trimmed);
        return `${assetUrl(trimmed.slice(0, space))} ${trimmed.slice(space + 1)}`;
      })
      .join(', ');
  }

  const parts: string[] = [];
  if (image.src640) parts.push(`${assetUrl(image.src640)} 640w`);
  if (image.src960) parts.push(`${assetUrl(image.src960)} 960w`);
  if (image.src1600) {
    const w = image.width && image.width > 0 ? image.width : 1600;
    parts.push(`${assetUrl(image.src1600)} ${w}w`);
  }
  return parts.length ? parts.join(', ') : undefined;
}

/**
 * Exact listing photography from ContentBase.image. Never falls back to a
 * category stock image — missing photos use PhotoSlot instead.
 */
export function ContentImage({
  image,
  ratio = 'aspect-[3/2]',
  className = '',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  showCredit: _showCredit = false,
}: {
  image: {
    src: string;
    srcSet?: string;
    src640?: string;
    src960?: string;
    src1600?: string;
    alt: string;
    credit?: string;
    width?: number;
    height?: number;
    focal?: 'center' | 'top' | 'bottom';
  };
  ratio?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Deprecated: on-image credit pills are not rendered. */
  showCredit?: boolean;
}) {
  const srcSet = buildSrcSet(image);
  const objectPosition =
    image.focal === 'top' ? 'top' : image.focal === 'bottom' ? 'bottom' : 'center';

  return (
    <figure className={`relative overflow-hidden ${ratio} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={assetUrl(image.src)}
        srcSet={srcSet}
        alt={image.alt}
        width={image.width ?? 1600}
        height={image.height ?? 1200}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        className="h-full w-full object-cover"
        style={{ objectPosition }}
      />
    </figure>
  );
}

/**
 * Full-bleed hero. Daylight Nashville drone loop on desktop; on phones only the
 * poster loads (see HeroVideo), art-directed as a taller crop.
 *
 * Height is deliberately shorter on phones (`svh`, not `vh`, so the browser
 * chrome does not push the booking widget below the fold).
 */
export function HeroMedia({ children }: { children: React.ReactNode }) {
  const poster = heroVideo.poster ? assetUrl(heroVideo.poster) : undefined;
  const heightClass = 'min-h-[min(58svh,520px)] sm:min-h-[min(70vh,640px)] lg:min-h-[min(78vh,720px)]';

  return (
    <div className={`relative isolate overflow-hidden bg-navy ${heightClass}`}>
      <div className="absolute inset-0" aria-hidden="true">
        {poster ? (
          <picture>
            <source
              media="(max-width: 767px)"
              srcSet={assetUrl('/media/hero/nashville-hero-drone-poster-mobile-900.webp')}
              type="image/webp"
            />
            <source
              srcSet={`${assetUrl('/media/hero/nashville-hero-drone-poster-960.webp')} 960w, ${assetUrl('/media/hero/nashville-hero-drone-poster-1600.webp')} 1600w, ${assetUrl(poster)} 2400w`}
              sizes="100vw"
              type="image/webp"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={poster}
              alt=""
              width={2400}
              height={1350}
              className="absolute inset-0 h-full w-full object-cover object-center"
              fetchPriority="high"
              decoding="sync"
            />
          </picture>
        ) : (
          <div className="h-full w-full bg-[radial-gradient(1100px_480px_at_80%_-10%,#3A6A94_0%,transparent_55%),radial-gradient(900px_420px_at_5%_110%,#8FC4AD_0%,transparent_50%),linear-gradient(165deg,#214A72_0%,#102A43_100%)]" />
        )}
        <HeroVideo />
      </div>

      {/* Readability wash: bottom and left, where the copy sits. */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/40 to-navy/10"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 hidden bg-gradient-to-r from-navy/50 via-transparent to-transparent lg:block"
        aria-hidden="true"
      />

      <div className={`relative flex flex-col justify-end pb-12 pt-20 sm:pb-16 sm:pt-24 lg:pb-24 ${heightClass}`}>
        {children}
      </div>
    </div>
  );
}
