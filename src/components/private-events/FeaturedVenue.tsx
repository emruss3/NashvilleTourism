import Link from 'next/link';
import { SmartImage } from '@/components/Media';
import { PinIcon } from '@/components/Icons';
import { Chip } from '@/components/Ui';
import { neighborhoodName } from '@/lib/content/neighborhoods';
import { formatBandRange, isSponsored, spaceChips, venueBandRange, venueCapacity } from '@/lib/events/present';
import { priceBandLabel, spacePriceBand, type EventMedia, type EventVenue } from '@/lib/events/types';
import type { ImageKey } from '@/lib/media';
import { OWNED_VENUE_DISCLOSURE, VENUE_KIND_LABEL, briefHref, featureLabel, withShortlist } from '@/lib/private-events';
import { PreviewText } from './Preview';
import { ShortlistButton } from './Shortlist';

export interface FinderQuery {
  event?: string;
  size?: string;
  area?: string;
  priorities?: string[];
}

/**
 * Registry photographs for venues that have not uploaded their own yet.
 * Venue-uploaded, rights-cleared photos (event_media, kind `photo`) win
 * when they exist. Keys here are BPH-owned media cleared for this surface.
 */
const VENUE_IMAGE: Partial<Record<string, ImageKey>> = {
  'jbjs-nashville': 'venues/jbjs-rooftop',
};

const ROWS_SHOWN = 6;

/**
 * One listed venue as a featured block: photograph, the facts that decide a
 * brief (capacities, price bands, area, features), the labels that never
 * move it (ownership, sponsorship, verification), and its spaces as a
 * capacity table. Spaces get a card of their own only when the venue has
 * supplied a photograph for that room; until then the table carries the
 * numbers and the venue page carries the rest.
 */
export default function FeaturedVenue({ venue, media, shortlist, finderQuery }: { venue: EventVenue; media: EventMedia[]; shortlist: string[]; finderQuery?: FinderQuery }) {
  const cap = venueCapacity(venue);
  const bands = venueBandRange(venue);
  const sponsored = isSponsored(venue);
  const href = withShortlist(`/private-events/venues/${venue.slug}/`, shortlist);
  const photo = media.find((m) => m.kind === 'photo');
  const imageKey = VENUE_IMAGE[venue.slug];
  const spaces = venue.spaces.filter((s) => s.published);
  const shown = spaces.slice(0, ROWS_SHOWN);
  const features = venue.features.slice(0, 6);

  return (
    <article className="min-w-0 rounded-card border border-paper-edge bg-paper" aria-labelledby={`featured-${venue.slug}`}>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="overflow-hidden rounded-t-card bg-ink lg:rounded-l-card lg:rounded-tr-none [&_figure]:h-full [&_img]:h-full">
          {photo ? (
            <figure className="h-full">
              {/* Venue-supplied, rights-cleared photo hosted off-site. */}
              <img src={photo.url} alt={photo.alt} loading="lazy" className="aspect-[4/3] h-full w-full object-cover lg:aspect-auto" />
            </figure>
          ) : imageKey ? (
            <SmartImage imageKey={imageKey} ratio="aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[360px]" sizes="(max-width: 1023px) 100vw, 58vw" />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center text-sm text-paper/70">Photography on the way</div>
          )}
        </div>
        <div className="p-5 sm:p-6">
          <p className="eyebrow inline-flex flex-wrap items-center gap-x-2">
            <span>{VENUE_KIND_LABEL[venue.kind]}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <PinIcon size={12} />
              {neighborhoodName(venue.neighborhoodSlug)}
            </span>
          </p>
          <h3 id={`featured-${venue.slug}`} className="mt-2 font-display text-[1.75rem] font-extrabold leading-tight tracking-[-0.03em] text-ink sm:text-[2rem]">
            <Link href={href} className="hover:underline">
              <PreviewText text={venue.name} />
            </Link>
          </h3>
          {venue.verifiedAt || sponsored ? (
            <p className="mt-2 flex flex-wrap gap-1.5">
              {venue.verifiedAt ? <Chip>Verified by Nashville.com</Chip> : null}
              {sponsored ? <Chip>Sponsored placement</Chip> : null}
            </p>
          ) : null}
          {venue.ownedByBph ? <p className="mt-2 text-sm font-semibold text-ink">{OWNED_VENUE_DISCLOSURE}</p> : null}
          <p className="mt-3 text-[15px] leading-snug text-ink-soft">
            <PreviewText text={venue.summary} />
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[15px]">
            <div>
              <dt className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Seated</dt>
              <dd className="font-semibold text-ink">{cap.seated ? `up to ${cap.seated.toLocaleString('en-US')}` : <PreviewText text="TODO" />}</dd>
            </div>
            <div>
              <dt className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Standing</dt>
              <dd className="font-semibold text-ink">{cap.standing ? `up to ${cap.standing.toLocaleString('en-US')}` : <PreviewText text="TODO" />}</dd>
            </div>
            <div>
              <dt className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Spaces</dt>
              <dd className="font-semibold text-ink">{spaces.length}</dd>
            </div>
            <div>
              <dt className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Minimum spend</dt>
              <dd className="font-semibold tracking-[0.06em] text-ink">{bands ? formatBandRange(bands) : <PreviewText text="TODO" />}</dd>
            </div>
          </dl>
          {features.length ? (
            <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Venue features">
              {features.map((f) => (
                <li key={f}>
                  <Chip>{featureLabel(f)}</Chip>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={href} className="btn-secondary">
              View all spaces
              <span aria-hidden="true">→</span>
            </Link>
            <ShortlistButton slug={venue.slug} name={venue.name} compact />
          </div>
        </div>
      </div>
      {shown.length ? (
        <div className="border-t border-paper-edge px-5 py-4 sm:px-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[14px]">
              <caption className="sr-only">Spaces at {venue.name} with verified capacities</caption>
              <thead>
                <tr className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Space
                  </th>
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Seated
                  </th>
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Standing
                  </th>
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Minimum group
                  </th>
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Price band
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    Features
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-edge">
                {shown.map((s) => {
                  const band = spacePriceBand(s);
                  const chips = spaceChips(s);
                  return (
                    <tr key={s.id} className="align-top">
                      <th scope="row" className="py-2.5 pr-3 font-sans font-semibold text-ink">
                        <PreviewText text={s.name} />
                      </th>
                      <td className="py-2.5 pr-3 tabular-nums text-ink">{s.seatedCapacity ? s.seatedCapacity.toLocaleString('en-US') : '–'}</td>
                      <td className="py-2.5 pr-3 tabular-nums text-ink">{s.standingCapacity ? s.standingCapacity.toLocaleString('en-US') : '–'}</td>
                      <td className="py-2.5 pr-3 tabular-nums text-ink-soft">{s.minGuests ? s.minGuests.toLocaleString('en-US') : '–'}</td>
                      <td className="py-2.5 pr-3 text-ink">{band ? <span title={`${priceBandLabel(band.band)} ${band.basis}`}><strong className="font-semibold tracking-[0.08em]">{band.band}</strong> <span className="text-ink-soft">{band.basis}</span></span> : '–'}</td>
                      <td className="py-2.5 text-ink-soft">{chips.join(', ') || '–'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {spaces.length > shown.length ? (
              <Link href={href} className="font-semibold text-ink underline underline-offset-[0.2em]">
                All {spaces.length} spaces, floor plans and terms
              </Link>
            ) : (
              <Link href={href} className="font-semibold text-ink underline underline-offset-[0.2em]">
                Floor plans, terms and the virtual tour
              </Link>
            )}
            <Link href={briefHref({ shortlist, venue: venue.slug, ...finderQuery })} className="font-semibold text-ink underline underline-offset-[0.2em]">
              Send a brief to {venue.name}
            </Link>
          </p>
        </div>
      ) : null}
    </article>
  );
}
