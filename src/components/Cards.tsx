import Link from 'next/link';
import type {
  Attraction,
  Guide,
  Hotel,
  ImageRef,
  NashvilleEvent,
  Neighborhood,
  Restaurant,
  Venue,
} from '@/lib/types';
import { hasMedia, type ImageKey } from '@/lib/media';
import { guideImageKey, listingFallbackKey, neighborhoodImageKey } from '@/lib/media-placements';
import { neighborhoodName } from '@/lib/content/neighborhoods';
import { ContentImage, SmartImage } from './Media';
import { PlacementLabel, VerificationBadge } from './Trust';

export { guideImageKey, neighborhoodImageKey } from '@/lib/media-placements';

/**
 * When a listing has no exact photograph, show the cleared photograph of its
 * neighborhood. Never a category stock image or another business.
 */
export function PhotoSlot({
  label,
  neighborhood,
  ratio = 'aspect-[3/2]',
  className = '',
}: {
  label: string;
  neighborhood?: string;
  ratio?: string;
  className?: string;
}) {
  const key = neighborhood ? listingFallbackKey(neighborhood, label) : undefined;
  if (!key) return null;
  return <SmartImage imageKey={key} ratio={ratio} className={className} sizes="(max-width: 1023px) 100vw, 60vw" />;
}

/** Exact listing photo, otherwise the neighborhood photograph. */
function ListingMedia({
  image,
  label,
  neighborhood,
  ratio = 'aspect-[3/2]',
  sizes,
}: {
  image?: ImageRef;
  label: string;
  neighborhood?: string;
  ratio?: string;
  sizes?: string;
}) {
  if (image?.src) {
    return <ContentImage image={image} ratio={ratio} sizes={sizes} />;
  }
  return <PhotoSlot label={label} neighborhood={neighborhood} ratio={ratio} />;
}

function MetaRow({ items }: { items: (string | undefined | false)[] }) {
  const visible = items.filter(Boolean) as string[];
  return (
    <p className="text-2xs font-medium uppercase tracking-wider text-ink-faint">
      {visible.join(' · ')}
    </p>
  );
}

/* --------------------------------- Restaurant --------------------------------- */

export function RestaurantCard({ item, compact = false }: { item: Restaurant; compact?: boolean }) {
  return (
    <article className="card group relative flex flex-col overflow-hidden">
      {!compact && <ListingMedia image={item.image} label={item.title} neighborhood={item.neighborhood} />}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <MetaRow items={[neighborhoodName(item.neighborhood), item.cuisine, item.priceRange]} />
        <h3 className="font-sans font-bold text-lg leading-snug">
          <Link href={`/restaurants/${item.slug}/`} className="after:absolute after:inset-0 hover:text-clay">
            {item.title}
          </Link>
        </h3>
        <p className="flex-1 text-[15px] leading-relaxed text-ink-soft">{item.summary}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <VerificationBadge status={item.dataStatus} date={item.dateChecked} />
          <PlacementLabel placement={item.placement} sponsorName={item.sponsorName} />
        </div>
      </div>
    </article>
  );
}

/* ----------------------------------- Hotel ----------------------------------- */

export function HotelCard({ item }: { item: Hotel }) {
  return (
    <article className="card group relative flex flex-col overflow-hidden">
      <ListingMedia image={item.image} label={item.title} neighborhood={item.neighborhood} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <MetaRow items={[neighborhoodName(item.neighborhood), item.priceCategory]} />
        <h3 className="font-sans font-bold text-lg leading-snug">
          <Link href={`/hotels/${item.slug}/`} className="after:absolute after:inset-0 hover:text-clay">
            {item.title}
          </Link>
        </h3>
        <p className="flex-1 text-[15px] leading-relaxed text-ink-soft">{item.summary}</p>
        {item.bestFor.length > 0 && (
          <p className="text-sm text-ink-faint">
            <span className="font-semibold text-ink-soft">Best for:</span> {item.bestFor.slice(0, 3).join(', ')}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <VerificationBadge status={item.dataStatus} date={item.dateChecked} />
          <PlacementLabel placement={item.placement} sponsorName={item.sponsorName} />
        </div>
      </div>
    </article>
  );
}

/* ----------------------------------- Event ----------------------------------- */

export function EventCard({ item, compact = false }: { item: NashvilleEvent; compact?: boolean }) {
  return (
    <article className="card group relative flex gap-4 overflow-hidden p-4">
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded border border-paper-edge bg-sky py-2 text-center">
        <span className="text-2xs font-bold uppercase tracking-wider text-clay">
          {monthAbbr(item.startDate)}
        </span>
        <span className="text-xl font-bold leading-none text-ink">{dayNum(item.startDate)}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <MetaRow items={[item.category, neighborhoodName(item.neighborhood)]} />
        <h3 className="font-sans font-bold text-base leading-snug">
          <Link href={`/events/${item.slug}/`} className="after:absolute after:inset-0 hover:text-clay">
            {item.title}
          </Link>
        </h3>
        <p className="text-sm text-ink-faint">
          {item.venue} · {item.timeNote}
        </p>
        {!compact && (
          <>
            <p className="line-clamp-2 text-[15px] leading-relaxed text-ink-soft">{item.summary}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <VerificationBadge status={item.dataStatus} date={item.dateChecked} />
              <PlacementLabel placement={item.placement} sponsorName={item.sponsorName} />
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function monthAbbr(iso: string) {
  const m = Number(iso.split('-')[1]);
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] ?? '';
}
function dayNum(iso: string) {
  return Number(iso.split('-')[2]?.slice(0, 2)) || '';
}

/* ----------------------------------- Venue ----------------------------------- */

export function VenueCard({ item }: { item: Venue }) {
  return (
    <article className="card group relative flex flex-col overflow-hidden">
      <ListingMedia
        image={item.image}
        label={item.title} neighborhood={item.neighborhood}
        sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        {item.statusNote ? (
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-clay">{item.statusNote}</p>
        ) : null}
        <MetaRow items={[neighborhoodName(item.neighborhood), item.genres.slice(0, 2).join(', ')]} />
        <h3 className="font-sans font-bold text-lg leading-snug">
          <Link href={`/music/${item.slug}/`} className="after:absolute after:inset-0 hover:text-clay">
            {item.title}
          </Link>
        </h3>
        <p className="flex-1 text-[15px] leading-relaxed text-ink-soft">{item.summary}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <VerificationBadge status={item.dataStatus} date={item.dateChecked} />
          <PlacementLabel placement={item.placement} sponsorName={item.sponsorName} />
        </div>
      </div>
    </article>
  );
}

/* --------------------------------- Attraction --------------------------------- */

export function AttractionCard({ item }: { item: Attraction }) {
  return (
    <article className="card group relative flex flex-col overflow-hidden">
      <ListingMedia
        image={item.image}
        label={item.title} neighborhood={item.neighborhood}
        ratio="aspect-[4/3]"
        sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <MetaRow items={[neighborhoodName(item.neighborhood), item.category]} />
        <h3 className="font-sans font-bold text-base leading-snug">
          <Link href={`/things-to-do/${item.slug}/`} className="after:absolute after:inset-0 hover:text-clay">
            {item.title}
          </Link>
        </h3>
        <p className="flex-1 text-[15px] leading-relaxed text-ink-soft">{item.summary}</p>
        <p className="text-sm text-ink-faint">
          {item.timeNeeded} · {item.priceNote}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <VerificationBadge status={item.dataStatus} date={item.dateChecked} />
        </div>
      </div>
    </article>
  );
}

/* ----------------------------------- Guide ----------------------------------- */

export function GuideCard({ item, featured = false }: { item: Guide; featured?: boolean }) {
  const cover = guideImageKey(item);
  // A guide whose cover is not yet cleared renders as a text card rather than
  // reserving an empty photo slot; a blank block reads as broken, not pending.
  const hasCover = hasMedia(cover);
  return (
    <article
      className={`group relative flex overflow-hidden bg-transparent ${featured ? 'flex-col sm:flex-row sm:gap-5' : 'flex-col'} ${
        hasCover ? '' : 'rounded-card border border-paper-edge bg-paper-card p-4'
      }`}
    >
      {hasCover ? (
        <SmartImage
          imageKey={cover}
          ratio={featured ? 'aspect-[3/2] sm:aspect-square sm:w-52 sm:shrink-0' : 'aspect-[3/2]'}
          sizes={featured ? '(max-width: 640px) 100vw, 208px' : '(max-width: 640px) 100vw, 33vw'}
          className={featured ? 'sm:rounded-none' : 'rounded-card'}
        />
      ) : null}
      <div
        className={`flex flex-1 flex-col ${featured ? 'gap-2 py-1 sm:py-0' : hasCover ? 'gap-2 pt-4' : 'gap-2'}`}
      >
        <p className="text-2xs font-semibold uppercase tracking-wider text-clay">
          {[item.cluster, `${item.readingTimeMinutes} min read`].filter(Boolean).join(' · ')}
        </p>
        <h3 className={`font-sans font-bold uppercase leading-snug tracking-wide text-navy ${featured ? 'text-xl' : 'text-lg'}`}>
          <Link href={`/guides/${item.slug}/`} className="after:absolute after:inset-0 hover:text-clay">
            {item.title}
          </Link>
        </h3>
        <p className="flex-1 text-[15px] leading-relaxed text-ink-soft">{item.summary}</p>
      </div>
    </article>
  );
}

/* -------------------------------- Neighborhood -------------------------------- */

export function NeighborhoodCard({ item }: { item: Neighborhood }) {
  return (
    <article className="card group relative flex flex-col overflow-hidden">
      <SmartImage
        imageKey={neighborhoodImageKey(item.slug)}
        ratio="aspect-[16/9]"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-sans font-bold text-lg leading-snug">
          <Link href={`/neighborhoods/${item.slug}/`} className="after:absolute after:inset-0 hover:text-clay">
            {item.name}
          </Link>
        </h3>
        <p className="line-clamp-3 flex-1 text-[15px] leading-relaxed text-ink-soft">{item.summary}</p>
        <p className="text-sm text-ink-faint">
          <span className="font-medium text-ink-soft">Best for</span> {item.bestFor.slice(0, 2).join(', ')}
        </p>
      </div>
    </article>
  );
}
