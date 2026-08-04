import Link from 'next/link';
import { site } from '@/lib/site';
import { asset as assetUrl } from '@/lib/seo';

type WordmarkSize = 'header' | 'footer' | 'compact';

/** Intrinsic PNG size (2× extract). CSS height controls display size. */
const SIZES: Record<WordmarkSize, { className: string }> = {
  header: { className: 'h-11 w-auto sm:h-12' },
  footer: { className: 'h-12 w-auto sm:h-14' },
  compact: { className: 'h-9 w-auto' },
};

/**
 * Primary masthead — exact PNG from the brand sheet (star + NASHVILLE).
 * Plain <img> so nothing remasters the asset.
 */
export default function Wordmark({
  href = '/',
  size = 'header',
}: {
  href?: string | null;
  size?: WordmarkSize;
  /** Kept for call-site compatibility; unused with plain img. */
  priority?: boolean;
}) {
  const mark = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={assetUrl('/brand/wordmark.png')}
      alt={site.name}
      width={710}
      height={322}
      className={`${SIZES[size].className} object-contain object-left`}
      decoding="async"
    />
  );

  if (!href) return mark;

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center"
      aria-label={`${site.name} home`}
    >
      {mark}
    </Link>
  );
}

type CampaignVariant = 'horizontal' | 'stacked';

const CAMPAIGN: Record<CampaignVariant, { src: string; width: number; height: number }> = {
  horizontal: { src: '/brand/lockup-horizontal.png', width: 760, height: 410 },
  stacked: { src: '/brand/lockup-stacked.png', width: 468, height: 404 },
};

/** Campaign lockup with tagline — promo / shop surfaces only, never the hero. */
export function WordmarkCampaign({
  variant = 'horizontal',
  className = '',
}: {
  variant?: CampaignVariant;
  className?: string;
  priority?: boolean;
}) {
  const asset = CAMPAIGN[variant];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={assetUrl(asset.src)}
      alt={`${site.name} — Make the most of Nashville.`}
      width={asset.width}
      height={asset.height}
      className={`h-auto w-full max-w-sm object-contain ${className}`}
      decoding="async"
    />
  );
}

/** Compact NSH mark — merchandise / small-format only. */
export function NshMark({
  className = '',
  size = 48,
}: {
  className?: string;
  size?: number;
}) {
  const height = Math.round(size * (340 / 362));
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={assetUrl('/brand/nsh.png')}
      alt={site.shortName}
      width={362}
      height={340}
      className={`object-contain ${className}`}
      style={{ width: size, height }}
      decoding="async"
    />
  );
}
