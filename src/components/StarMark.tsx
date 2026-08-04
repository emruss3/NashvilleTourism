import { asset } from '@/lib/seo';

/**
 * Coral star from the NASHVILLE logo sheet — primary brand accent.
 * One star only in the master identity.
 */
export default function StarMark({
  className = '',
  size = 14,
  title,
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset('/brand/star.png')}
      alt={title ?? ''}
      width={176}
      height={168}
      className={`star-mark shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
      aria-hidden={title ? undefined : true}
      decoding="async"
    />
  );
}
