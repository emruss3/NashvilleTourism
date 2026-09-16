import Link from 'next/link';
import type { CSSProperties } from 'react';
import { site } from '@/lib/site';
import { asset as assetUrl } from '@/lib/seo';

/**
 * NSVL identity (design/nsvl-brand-handoff/logos).
 *
 * ASSET STATUS: the artwork is the supplied charcoal silhouette PNG, a
 * provisional raster reconstruction of the approved mark. It is rendered
 * through a CSS mask so every color direction (Charcoal Ink on Paper White,
 * Paper White on Charcoal Ink) comes from one file, as logo-preview.html
 * prescribes. The paper-white review PNGs are never shipped. A vector master
 * and an approved small-size favicon remain outstanding.
 *
 * Never recreate the mark with typed letters.
 */

type Tone = 'ink' | 'paper';
type Variant = 'mark' | 'lockup';

/** Cropped artwork proportions (width / height). */
const RATIO: Record<Variant, number> = { mark: 2.1483, lockup: 3.0248 };

const ART: Record<Variant, { small: string; large: string }> = {
  mark: { small: '/brand/nsvl/nsvl-mark-480.png', large: '/brand/nsvl/nsvl-mark-960.png' },
  lockup: { small: '/brand/nsvl/nsvl-lockup-640.png', large: '/brand/nsvl/nsvl-lockup-1280.png' },
};

export function NsvlLogo({
  variant = 'mark',
  tone = 'ink',
  width,
  className = '',
  decorative = false,
}: {
  variant?: Variant;
  tone?: Tone;
  /** CSS width of the artwork, e.g. 112 or '240px'. Minimums: mark 88px, lockup 140px. */
  width: number | string;
  className?: string;
  /** True when a parent already carries the accessible name. */
  decorative?: boolean;
}) {
  const art = ART[variant];
  const w = typeof width === 'number' ? `${width}px` : width;
  const style: CSSProperties & Record<string, string> = {
    width: w,
    aspectRatio: String(RATIO[variant]),
    WebkitMaskImage: `url(${assetUrl(art.large)})`,
    maskImage: `url(${assetUrl(art.large)})`,
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
  };
  const label = variant === 'lockup' ? `${site.name} ${site.descriptor}` : site.name;
  return (
    <span
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      className={`block shrink-0 ${tone === 'paper' ? 'bg-paper' : 'bg-ink'} ${className}`}
      style={style}
    />
  );
}

/** Standalone mark, for compact headers and small chrome. */
export function NsvlMark(props: Omit<Parameters<typeof NsvlLogo>[0], 'variant'>) {
  return <NsvlLogo variant="mark" {...props} />;
}

/**
 * Primary lockup (NSVL with the NASHVILLE descriptor), linked home unless
 * `href` is null. Desktop header and footer use this; phones use the mark.
 */
export default function Wordmark({
  href = '/',
  tone = 'ink',
  width = 240,
  className = '',
}: {
  href?: string | null;
  tone?: Tone;
  width?: number | string;
  className?: string;
  /** Kept for call-site compatibility. */
  priority?: boolean;
  size?: string;
}) {
  if (!href) return <NsvlLogo variant="lockup" tone={tone} width={width} className={className} />;
  return (
    <Link href={href} className={`inline-flex shrink-0 ${className}`} aria-label={`${site.name} home`}>
      <NsvlLogo variant="lockup" tone={tone} width={width} decorative />
    </Link>
  );
}
