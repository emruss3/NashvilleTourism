import { getImage, hasMedia, type ImageKey } from '@/lib/media';
import { asset as assetUrl } from '@/lib/seo';

/**
 * Renders a real photograph when the licensed file has been added. When a
 * key has no cleared file, `fallbackKey` (usually the neighborhood or area
 * photograph) renders instead; with no fallback nothing renders at all, so
 * no page ever shows an empty "photography coming" box.
 *
 * Credits stay in the media registry and /photo-credits — never as on-image pills
 * (those read as location labels).
 */
export function SmartImage({
  imageKey,
  fallbackKey,
  ratio = 'aspect-[3/2]',
  className = '',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  rounded = false,
  showCredit: _showCredit = false,
}: {
  imageKey?: ImageKey;
  /** Cleared photograph of the surrounding area, used when `imageKey` has no cleared file. */
  fallbackKey?: ImageKey;
  ratio?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  rounded?: boolean;
  /** Deprecated: on-image credit pills are not rendered. */
  showCredit?: boolean;
}) {
  const primaryReady = imageKey ? hasMedia(imageKey) : false;
  const key = primaryReady ? imageKey : fallbackKey && hasMedia(fallbackKey) ? fallbackKey : undefined;
  const asset = getImage(key);
  const round = rounded ? 'rounded-card' : '';

  if (!asset || !key) return null;

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
 * category stock image; callers without a photo render the area instead.
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
