import { SmartImage } from '@/components/Media';
import type { ImageKey } from '@/lib/media';
import { hasMedia } from '@/lib/media';

/** Optional 16:9 lead image for primary visitor hubs. Renders nothing when uncleared. */
export default function HubLead({
  imageKey,
  className = 'mb-8',
}: {
  imageKey: ImageKey;
  className?: string;
}) {
  if (!hasMedia(imageKey)) return null;
  return (
    <SmartImage
      imageKey={imageKey}
      ratio="aspect-[16/9]"
      className={`rounded-card ${className}`}
      sizes="(max-width: 1024px) 100vw, 960px"
      priority
    />
  );
}
