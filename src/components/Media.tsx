import { getImage, hasMedia, type ImageKey } from '@/lib/media';
import { asset as assetUrl } from '@/lib/seo';

/**
 * Renders a real photograph when the licensed file has been added, and a
 * quiet fallback until then. The fallback reserves the same space, so
 * swapping in the real asset causes no layout shift.
 */
/** Org / library owners — keep in registry + /photo-credits, not as on-image pills. */
function isOwnerCredit(credit?: string): boolean {
  if (!credit) return false;
  return /Convention & Visitors|Four Seasons|Wikimedia Commons|Pexels/i.test(credit);
}

export function SmartImage({
  imageKey,
  ratio = 'aspect-[3/2]',
  className = '',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  rounded = false,
  showCredit = true,
}: {
  imageKey?: ImageKey;
  ratio?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  rounded?: boolean;
  /** Set false when the image sits inside a parent link (avoids nested anchors). */
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

  const overlayCredit =
    showCredit && asset.credit && !isOwnerCredit(asset.credit) ? asset.credit : undefined;

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
      {overlayCredit ? (
        <figcaption className="absolute bottom-1 right-1 rounded bg-ink/60 px-1.5 py-0.5 text-2xs text-white/90">
          <a href="/photo-credits/" className="hover:underline">
            {overlayCredit}
          </a>
        </figcaption>
      ) : null}
    </figure>
  );
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
  showCredit = true,
}: {
  image: {
    src: string;
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
  showCredit?: boolean;
}) {
  return (
    <figure className={`relative overflow-hidden ${ratio} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={assetUrl(image.src)}
        alt={image.alt}
        width={image.width ?? 1600}
        height={image.height ?? 1067}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        className="h-full w-full object-cover"
        style={image.focal === 'top' ? { objectPosition: 'top' } : undefined}
      />
      {showCredit && image.credit && !isOwnerCredit(image.credit) ? (
        <figcaption className="absolute bottom-1 right-1 rounded bg-ink/60 px-1.5 py-0.5 text-2xs text-white/90">
          <a href="/photo-credits/" className="hover:underline">
            {image.credit}
          </a>
        </figcaption>
      ) : null}
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
