import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PinIcon } from '@/components/Icons';
import { Breadcrumbs, Chip, JsonLd, MapLink } from '@/components/Ui';
import EventsDisclosure from '@/components/private-events/EventsDisclosure';
import { PreviewBanner, PreviewText } from '@/components/private-events/Preview';
import ShortlistBar, { ShortlistButton } from '@/components/private-events/Shortlist';
import SpaceCard from '@/components/private-events/SpaceCard';
import VenueViewBeacon from '@/components/private-events/VenueViewBeacon';
import { neighborhoodName } from '@/lib/content/neighborhoods';
import { isSponsored, venueCapacity } from '@/lib/events/present';
import { hasPlaceholder } from '@/lib/events/types';
import { getVenueBySlug, listMedia, listVenues, showUnpublished } from '@/lib/events/venues';
import { OWNED_VENUE_DISCLOSURE, SHORTLIST_MAX, VENUE_KIND_LABEL, parseShortlist, withShortlist } from '@/lib/private-events';
import { buildMetadata, canonical } from '@/lib/seo';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

export async function generateMetadata(props: { params: Promise<{ slug: string }>; searchParams?: Promise<Params> }) {
  const { slug } = await props.params;
  const query = (await props.searchParams) ?? {};
  const venue = await getVenueBySlug(slug);
  if (!venue) return buildMetadata({ title: 'Venue not found', description: '', path: '/private-events/', noindex: true });
  const placeholder = hasPlaceholder(venue);
  return buildMetadata({
    title: `${venue.name}: private events`,
    description: placeholder ? `Private event spaces at ${venue.name} in ${neighborhoodName(venue.neighborhoodSlug)}.` : venue.summary,
    path: `/private-events/venues/${venue.slug}/`,
    noindex: placeholder || !venue.published || Boolean(query.v),
  });
}

/**
 * A venue and its bookable spaces, every number straight from the rows. In
 * production only published venues resolve and no placeholder can render; in
 * preview builds the seed venues render with each placeholder marked.
 */
export default async function VenuePage(props: { params: Promise<{ slug: string }>; searchParams?: Promise<Params> }) {
  const { slug } = await props.params;
  const query = (await props.searchParams) ?? {};
  const venue = await getVenueBySlug(slug);
  if (!venue) notFound();
  const placeholder = hasPlaceholder(venue);
  if ((placeholder || !venue.published) && !showUnpublished()) notFound();

  const [media, all] = await Promise.all([listMedia(venue.id), listVenues()]);
  const shortlist = parseShortlist(query.v);
  const briefList = shortlist.includes(venue.slug) || shortlist.length >= SHORTLIST_MAX ? shortlist : [...shortlist, venue.slug];
  const sponsored = isSponsored(venue);
  const cap = venueCapacity(venue);
  const hood = neighborhoodName(venue.neighborhoodSlug);
  const spaces = venue.spaces;

  return (
    <>
      {!placeholder && venue.published ? (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'EventVenue',
            '@id': canonical(`/private-events/venues/${venue.slug}/#venue`),
            name: venue.name,
            description: venue.summary,
            url: canonical(`/private-events/venues/${venue.slug}/`),
            address: { '@type': 'PostalAddress', streetAddress: venue.address, addressLocality: 'Nashville', addressRegion: 'TN', addressCountry: 'US' },
            ...(venue.lat !== undefined && venue.lng !== undefined ? { geo: { '@type': 'GeoCoordinates', latitude: venue.lat, longitude: venue.lng } } : {}),
            ...(cap.standing ? { maximumAttendeeCapacity: cap.standing } : {}),
            ...(venue.website ? { sameAs: venue.website } : {}),
            ...(media.length ? { image: media.map((m) => m.url) } : {}),
          }}
        />
      ) : null}
      <VenueViewBeacon slug={venue.slug} name={venue.name} neighborhood={venue.neighborhoodSlug} sponsored={sponsored} />

      <div className="shell">
        <Breadcrumbs trail={[{ name: 'Private events', href: '/private-events/' }, { name: venue.name, href: `/private-events/venues/${venue.slug}/` }]} />
      </div>

      <header className="shell pt-4">
        {placeholder || !venue.published ? (
          <div className="mb-5">
            <PreviewBanner />
          </div>
        ) : null}
        <p className="eyebrow inline-flex flex-wrap items-center gap-x-2">
          <span>{VENUE_KIND_LABEL[venue.kind]}</span>
          <span aria-hidden="true">·</span>
          <Link href={withShortlist(`/private-events/neighborhoods/${venue.neighborhoodSlug}/`, shortlist)} className="inline-flex items-center gap-1 underline-offset-[0.2em] hover:underline">
            <PinIcon size={12} />
            {hood}
          </Link>
        </p>
        <h1 className="mt-2 text-[2.5rem] leading-[0.98] sm:text-[3.25rem]">
          <PreviewText text={venue.name} />
        </h1>
        {sponsored ? (
          <p className="mt-3">
            <Chip>Sponsored placement</Chip>
          </p>
        ) : null}
        {venue.ownedByBph ? <p className="mt-3 max-w-prose text-[15px] font-semibold text-ink">{OWNED_VENUE_DISCLOSURE}</p> : null}
        <p className="mt-3 max-w-prose text-[17px] text-ink-soft">
          <PreviewText text={venue.summary} />
        </p>
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-ink">
          <span>
            <PreviewText text={venue.address} />
          </span>
          {!/TODO/.test(venue.address) ? <MapLink query={`${venue.name}, ${venue.address}`} /> : null}
          {venue.website ? (
            <a href={venue.website} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-[0.2em]">
              Venue website<span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : null}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href={withShortlist('/private-events/#inquiry', briefList)} className="btn-primary">
            Send a brief to {venue.name}
            <span aria-hidden="true">→</span>
          </Link>
          <ShortlistButton slug={venue.slug} name={venue.name} />
        </div>
      </header>

      {media.length ? (
        <section className="shell mt-8" aria-label="Photos">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((m, i) => (
              <li key={m.id} className={i === 0 ? 'sm:col-span-2 lg:col-span-2 lg:row-span-2' : ''}>
                <figure className="h-full overflow-hidden rounded-card bg-ink">
                  {/* Venue-supplied, rights-cleared photos hosted off-site; sized by the grid, not by Next image optimization. */}
                  <img src={m.url} alt={m.alt} loading={i === 0 ? 'eager' : 'lazy'} className="h-full w-full object-cover aspect-[4/3]" />
                  {m.credit ? <figcaption className="px-2 py-1 text-2xs text-paper/80">Photo: {m.credit}</figcaption> : null}
                </figure>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="shell section" aria-labelledby="spaces-title">
        <h2 id="spaces-title" className="text-[1.75rem] sm:text-[2rem]">
          Spaces
        </h2>
        <p className="mt-2 max-w-prose text-[15px] text-ink-soft">
          {cap.seated || cap.standing ? `Up to ${cap.seated.toLocaleString('en-US')} seated or ${cap.standing.toLocaleString('en-US')} standing across ${spaces.length} ${spaces.length === 1 ? 'space' : 'spaces'}. ` : ''}
          Prices are where each space starts; the venue confirms the rest with you.
        </p>
        {spaces.length ? (
          <ul className="mt-6 grid gap-4 lg:grid-cols-2">
            {spaces.map((s) => (
              <li key={s.id}>
                <SpaceCard space={s} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-[15px] text-ink-soft">No spaces published yet.</p>
        )}
      </section>

      {venue.description ? (
        <section className="shell pb-8" aria-labelledby="about-title">
          <h2 id="about-title" className="text-[1.5rem] sm:text-[1.75rem]">
            About {venue.name}
          </h2>
          <div className="prose-editorial mt-3 max-w-prose">
            {venue.description.split(/\n{2,}/).map((p) => (
              <p key={p.slice(0, 40)}>
                <PreviewText text={p} />
              </p>
            ))}
          </div>
        </section>
      ) : null}

      <section className="shell pb-24">
        <EventsDisclosure />
        <p className="mt-4 text-sm text-ink-soft">
          <Link href={withShortlist('/private-events/', shortlist)} className="font-semibold text-ink underline underline-offset-[0.2em]">
            All private event venues
          </Link>
        </p>
      </section>

      <ShortlistBar venues={all.map((v) => ({ slug: v.slug, name: v.name }))} />
    </>
  );
}
