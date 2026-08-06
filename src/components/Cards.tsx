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
import type { ImageKey } from '@/lib/media';
import { neighborhoodName } from '@/lib/content/neighborhoods';
import { ContentImage, SmartImage } from './Media';
import { PlacementLabel, VerificationBadge, formatDateShort } from './Trust';

/**
 * Typographic image stand-in when a listing has no exact photograph.
 * Never substitute a category or unrelated business image.
 */
export function PhotoSlot({
  label,
  ratio = 'aspect-[3/2]',
  className = '',
}: {
  label: string;
  ratio?: string;
  className?: string;
}) {
  return (
    <div className={`photo-slot ${ratio} ${className}`} role="img" aria-label={`Photography placeholder for ${label}`}>
      <span className="sr-only">Photography coming soon for {label}</span>
    </div>
  );
}

/** Exact listing photo or intentional placeholder — never a generic category image. */
function ListingMedia({
  image,
  label,
  ratio = 'aspect-[3/2]',
}: {
  image?: ImageRef;
  label: string;
  ratio?: string;
}) {
  if (image?.src) {
    return <ContentImage image={image} ratio={ratio} />;
  }
  return <PhotoSlot label={label} ratio={ratio} />;
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
      {!compact && <ListingMedia image={item.image} label={item.title} />}
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
      <ListingMedia image={item.image} label={item.title} />
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
      <ListingMedia image={item.image} label={item.title} />
      <div className="flex flex-1 flex-col gap-2 p-4">
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
      <ListingMedia image={item.image} label={item.title} ratio="aspect-[4/3]" />
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

export function guideImageKey(item: Guide): ImageKey {
  const bySlug: Partial<Record<string, ImageKey>> = {
    'nashville-first-time-visitors': 'guide/first-time-visitors',
    'where-to-stay-nashville': 'guide/where-to-stay',
    'nashville-weekend-itinerary': 'guide/weekend-itinerary',
  };
  const slugKey = bySlug[item.slug];
  if (slugKey) return slugKey;

  const byCluster: Record<Guide['cluster'], ImageKey> = {
    'Trip Planning': 'hub/weekend',
    Restaurants: 'hub/restaurants',
    Hotels: 'hub/hotels',
    'Things to Do': 'hub/tours',
    Music: 'hub/live-music',
    Events: 'hub/tickets',
  };
  return byCluster[item.cluster];
}

export function GuideCard({ item, featured = false }: { item: Guide; featured?: boolean }) {
  return (
    <article
      className={`card group relative flex overflow-hidden ${featured ? 'flex-col sm:flex-row' : 'flex-col'}`}
    >
      <SmartImage
        imageKey={guideImageKey(item)}
        ratio={featured ? 'aspect-[3/2] sm:aspect-square sm:w-52 sm:shrink-0' : 'aspect-[3/2]'}
        sizes={featured ? '(max-width: 640px) 100vw, 208px' : '(max-width: 640px) 100vw, 33vw'}
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <MetaRow items={[item.cluster, `${item.readingTimeMinutes} min read`]} />
        <h3 className={`font-sans font-bold leading-snug ${featured ? 'text-xl' : 'text-lg'}`}>
          <Link href={`/guides/${item.slug}/`} className="after:absolute after:inset-0 hover:text-clay">
            {item.title}
          </Link>
        </h3>
        <p className="flex-1 text-[15px] leading-relaxed text-ink-soft">{item.summary}</p>
        <p className="text-2xs text-ink-faint">
          Updated {formatDateShort(item.dateUpdated || item.datePublished)}
        </p>
      </div>
    </article>
  );
}

/* -------------------------------- Neighborhood -------------------------------- */

export function NeighborhoodCard({ item }: { item: Neighborhood }) {
  return (
    <article className="card group relative flex flex-col overflow-hidden">
      <SmartImage
        imageKey={`neighborhood/${item.slug}` as ImageKey}
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
