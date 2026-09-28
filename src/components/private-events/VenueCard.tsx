import Link from 'next/link';
import { Chip } from '@/components/Ui';
import { PinIcon, PeopleIcon } from '@/components/Icons';
import { neighborhoodName } from '@/lib/content/neighborhoods';
import { isSponsored, venueCapacity, venueChips, venueFromPrice } from '@/lib/events/present';
import { formatUsd, type EventVenue } from '@/lib/events/types';
import { VENUE_KIND_LABEL, withShortlist } from '@/lib/private-events';
import { PreviewText } from './Preview';
import { ShortlistButton } from './Shortlist';

/**
 * One venue in a browse grid. Facts only, all derived from the rows: the
 * largest capacities across its spaces, the lowest "from" price, the chips
 * any space earns. Ownership and sponsorship are labels, never order.
 */
export default function VenueCard({ venue, shortlist }: { venue: EventVenue; shortlist: string[] }) {
  const cap = venueCapacity(venue);
  const price = venueFromPrice(venue);
  const chips = venueChips(venue);
  const sponsored = isSponsored(venue);
  const href = withShortlist(`/private-events/venues/${venue.slug}/`, shortlist);
  return (
    <article className="flex h-full flex-col rounded-card border border-paper-edge bg-paper p-5 transition-colors hover:border-ink">
      <p className="eyebrow inline-flex flex-wrap items-center gap-x-2">
        <span>{VENUE_KIND_LABEL[venue.kind]}</span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <PinIcon size={12} />
          {neighborhoodName(venue.neighborhoodSlug)}
        </span>
      </p>
      <h3 className="mt-2 font-display text-[1.375rem] font-extrabold leading-tight tracking-[-0.03em] text-ink">
        <Link href={href} className="hover:underline">
          <PreviewText text={venue.name} />
        </Link>
      </h3>
      {(venue.ownedByBph || sponsored) && (
        <p className="mt-1 flex flex-wrap gap-1.5">
          {venue.ownedByBph ? <Chip>Owned by BPH Hospitality, Nashville.com&rsquo;s parent company</Chip> : null}
          {sponsored ? <Chip>Sponsored placement</Chip> : null}
        </p>
      )}
      <p className="mt-2 text-[15px] leading-snug text-ink-soft">
        <PreviewText text={venue.summary} />
      </p>
      <dl className="mt-4 grid gap-1 text-[15px] text-ink">
        <div className="flex items-start gap-2">
          <dt className="sr-only">Capacity</dt>
          <PeopleIcon size={18} />
          <dd>
            {cap.seated || cap.standing ? (
              <>
                Seats up to {cap.seated.toLocaleString('en-US')} <span className="text-ink-soft">/</span> standing up to {cap.standing.toLocaleString('en-US')}
              </>
            ) : (
              <PreviewText text="TODO capacities" />
            )}
          </dd>
        </div>
        <div className="flex items-start gap-2">
          <dt className="sr-only">Price</dt>
          <span className="w-[18px] text-center font-semibold" aria-hidden="true">
            $
          </span>
          <dd>
            {price ? (
              <>
                From <strong className="font-semibold">{formatUsd(price.amount)}</strong> {price.basis}
              </>
            ) : (
              <PreviewText text="TODO pricing" />
            )}
          </dd>
        </div>
      </dl>
      {chips.length ? (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Space features">
          {chips.map((c) => (
            <li key={c}>
              <Chip>{c}</Chip>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
        <Link href={href} className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline">
          View spaces
          <span aria-hidden="true">→</span>
        </Link>
        <ShortlistButton slug={venue.slug} name={venue.name} compact />
      </div>
    </article>
  );
}

export function VenueGrid({ venues, shortlist, empty }: { venues: EventVenue[]; shortlist: string[]; empty: { title: string; description: string } }) {
  if (!venues.length) {
    return (
      <div className="rounded-card border border-dashed border-paper-edge bg-paper-card px-6 py-12 text-center">
        <h3 className="font-display text-xl">{empty.title}</h3>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-soft">{empty.description}</p>
        <a href="#inquiry" className="btn-primary mt-5">
          Send a brief anyway
          <span aria-hidden="true">→</span>
        </a>
      </div>
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {venues.map((v) => (
        <li key={v.id}>
          <VenueCard venue={v} shortlist={shortlist} />
        </li>
      ))}
    </ul>
  );
}
