import { getImage, hasMedia, type ImageKey } from '@/lib/media';
import { asset as assetUrl } from '@/lib/seo';

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
 * Full-bleed hero. Static responsive skyline — no autoplay video download on the homepage.
 * Registered hero MP4/WebM remain available for a future smooth loop elsewhere.
 */
export function HeroMedia({ children }: { children: React.ReactNode }) {
  const key = 'hero/nashroam-skyline' as const;
  const stillReady = hasMedia(key);
  const asset = getImage(key) as
    | (NonNullable<ReturnType<typeof getImage>> & {
        srcMobile?: string;
      })
    | undefined;
  const desktop = asset ? assetUrl(asset.src) : undefined;
  const mobile = asset?.srcMobile ? assetUrl(asset.srcMobile) : desktop;

  return (
    <div className="relative isolate min-h-[min(86vh,760px)] overflow-hidden bg-navy">
      <div className="absolute inset-0" aria-hidden="true">
        {desktop && stillReady && asset ? (
          <picture>
            {mobile && mobile !== desktop ? (
              <source media="(max-width: 767px)" srcSet={mobile} />
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={desktop}
              alt=""
              width={asset.width}
              height={asset.height}
              className="h-full w-full object-cover object-center"
              fetchPriority="high"
              decoding="sync"
            />
          </picture>
        ) : (
          <div className="h-full w-full bg-[radial-gradient(1100px_480px_at_80%_-10%,#3A6A94_0%,transparent_55%),radial-gradient(900px_420px_at_5%_110%,#8FC4AD_0%,transparent_50%),linear-gradient(165deg,#214A72_0%,#102A43_100%)]" />
        )}
      </div>

      <div
        className="absolute inset-0 bg-gradient-to-t from-navy/40 via-navy/10 to-transparent"
        aria-hidden="true"
      />

      <div className="relative flex min-h-[min(86vh,760px)] flex-col justify-end pb-20 pt-24 sm:pb-24 sm:pt-28">
        {children}
      </div>
    </div>
  );
}
