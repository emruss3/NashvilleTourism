import Link from 'next/link';
import { SmartImage } from '@/components/Media';
import { Breadcrumbs, JsonLd } from '@/components/Ui';
import EventsDisclosure from '@/components/private-events/EventsDisclosure';
import { PreviewBanner } from '@/components/private-events/Preview';
import ProcessFaq from '@/components/private-events/ProcessFaq';
import ShortlistBar from '@/components/private-events/Shortlist';
import StickyPlanCta from '@/components/private-events/StickyPlanCta';
import VenueBrowser, { type BrowserVenue } from '@/components/private-events/VenueBrowser';
import { neighborhoodName } from '@/lib/content/neighborhoods';
import { PREVIEW_NOT_SENT, inquiryDeliveryEnabled } from '@/lib/events/delivery';
import { finderEventType, readFinderParams } from '@/lib/events/finder';
import { formatBandRange, isSponsored, venueBandRange, venueCapacity } from '@/lib/events/present';
import { hasPlaceholder, type EventVenue } from '@/lib/events/types';
import { listMedia, listVenues, showUnpublished } from '@/lib/events/venues';
import { getImage, type ImageKey } from '@/lib/media';
import { EVENT_OCCASIONS, NO_PLANNING_FEE, REPLY_PROMISE_SHORT, briefHref, parseShortlist, withShortlist } from '@/lib/private-events';
import { asset, buildMetadata, serviceSchema } from '@/lib/seo';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

function one(params: Params, key: string): string | undefined {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

export async function generateMetadata(props: { searchParams?: Promise<Params> }) {
  const params = (await props.searchParams) ?? {};
  return buildMetadata({
    title: 'Private Events in Nashville',
    description: 'Corporate events, holiday parties and convention receptions in Nashville. Filter venues by event type, group size, area and priorities, then send one brief to venues that publish their capacities. No planning fee to you.',
    path: '/private-events/',
    noindex: ['event', 'size', 'area', 'pri', 'v'].some((k) => one(params, k)),
  });
}

/**
 * Registry photographs for venues that have not uploaded their own yet.
 * Venue-uploaded, rights-cleared photos (event_media, kind `photo`) win
 * when they exist. Keys here are BPH-owned media cleared for this surface.
 */
const VENUE_IMAGE: Partial<Record<string, ImageKey>> = {
  'jbjs-nashville': 'venues/jbjs-rooftop',
};

function registryImage(key: ImageKey | undefined): BrowserVenue['image'] {
  const a = getImage(key);
  if (!a) return null;
  const srcSet = a.srcSet
    ? a.srcSet
        .split(',')
        .map((part) => {
          const t = part.trim();
          const i = t.lastIndexOf(' ');
          return i === -1 ? asset(t) : `${asset(t.slice(0, i))} ${t.slice(i + 1)}`;
        })
        .join(', ')
    : undefined;
  return { src: asset(a.src), srcSet, alt: a.alt };
}

async function toBrowserVenue(v: EventVenue): Promise<BrowserVenue> {
  const photo = (await listMedia(v.id)).find((m) => m.kind === 'photo');
  const cap = venueCapacity(v);
  const bands = venueBandRange(v);
  return {
    slug: v.slug,
    name: v.name,
    kind: v.kind,
    neighborhoodSlug: v.neighborhoodSlug,
    ownedByBph: v.ownedByBph,
    verified: Boolean(v.verifiedAt),
    features: v.features,
    spaces: v.spaces.filter((s) => s.published),
    summary: v.summary,
    image: photo ? { src: photo.url, alt: photo.alt } : registryImage(VENUE_IMAGE[v.slug]),
    capacity: cap,
    bandRange: bands ? formatBandRange(bands) : undefined,
    sponsored: isSponsored(v),
  };
}

/**
 * Private events hub (board: "Bring your people. Make it Nashville."), for
 * the planner organizing a substantial corporate, holiday, convention or
 * group event.
 *
 * Four sections, one accent: a short hero (paper); the filter bar directly
 * above the venue grid, where the grid is the recommendation and the
 * prose notes sit collapsed under it (paper-sunk); three steps, FAQ and
 * the disclosure (paper); the brief entry (ink). Filter state rides in
 * the URL so a round trip to the brief keeps it, and the shortlist stays
 * in `?v=`. Builds where delivery is off say so at the top.
 */
export default async function PrivateEventsPage(props: { searchParams?: Promise<Params> }) {
  const params = (await props.searchParams) ?? {};
  const shortlist = parseShortlist(params.v);
  const finder = readFinderParams(params);
  const delivery = inquiryDeliveryEnabled();

  const venues = await listVenues();
  const listed = venues.filter((v) => v.published && !hasPlaceholder(v) && v.spaces.some((s) => s.published));
  const onboarding = showUnpublished() ? venues.filter((v) => !listed.includes(v)) : [];
  const cards = await Promise.all(listed.map(toBrowserVenue));
  const areas = [...new Set(listed.map((v) => v.neighborhoodSlug))].map((slug) => ({ slug, name: neighborhoodName(slug) }));
  const briefLink = briefHref({ event: finder.eventType, size: finder.size, area: finder.area, priorities: finder.priorities, occasion: finderEventType(finder.eventType)?.occasion, shortlist });

  return (
    <>
      <JsonLd
        data={serviceSchema({
          path: '/private-events/',
          name: 'Private event venue referrals in Nashville',
          serviceType: 'Event venue referral',
          description: 'A Nashville-only marketplace for corporate events, holiday parties, convention receptions and group events: venues publish seated and standing capacity and a price band; planners send one brief and each venue replies within 24 business hours (Monday to Friday, 9am to 6pm Nashville time). Planners pay nothing; the venue pays Nashville.com 5% of contracted spend only when an event books.',
          audience: 'Corporate, convention and group event planners',
        })}
      />

      {/* Hero: capped height, copy at 7/12, photograph at 5/12. */}
      <section className="shell pb-6 lg:pb-8" aria-labelledby="page-title">
        <Breadcrumbs trail={[{ name: 'Private events', href: '/private-events/' }]} />
        {!delivery ? (
          <div className="mb-4">
            <PreviewBanner>{PREVIEW_NOT_SENT}</PreviewBanner>
          </div>
        ) : null}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-10">
          <div className="max-w-[640px]">
            <p className="eyebrow">Private events in Nashville</p>
            <h1 id="page-title" className="mt-2 text-[2.25rem] leading-[1] sm:text-[2.75rem] lg:text-[3rem]">
              Bring your people.
              <br />
              Make it Nashville.
            </h1>
            <p className="mt-3 max-w-[36rem] text-[17px] leading-snug text-ink-soft">Corporate events, holiday parties and convention receptions—planned around your group.</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a href="#venues" className="btn-primary">
                Find my event fit
                <span aria-hidden="true">→</span>
              </a>
              <Link href={briefLink} className="btn-secondary">
                Build my inquiry
              </Link>
            </div>
            <p className="mt-3 text-sm text-ink-soft">{NO_PLANNING_FEE}</p>
          </div>
          <figure className="relative overflow-hidden rounded-card bg-ink lg:h-[320px]">
            <SmartImage imageKey="venues/jbjs-rooftop" ratio="aspect-[3/2] lg:aspect-auto lg:h-full" sizes="(max-width: 1023px) 100vw, 42vw" priority />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-ink/0 px-3 pb-2 pt-6 text-2xs text-paper/90">The rooftop at JBJ&rsquo;s Nashville, Lower Broadway. Photograph courtesy of BPH Hospitality.</figcaption>
          </figure>
        </div>
      </section>

      {/* One section: filters above the grid; the grid is the recommendation. */}
      <section id="venues" className="scroll-mt-16 border-t border-paper-edge bg-paper-sunk py-12" aria-labelledby="venues-title">
        <div className="shell">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
            <h2 id="venues-title" className="text-[1.625rem] sm:text-[2rem]">
              Venues that fit your brief.
            </h2>
            <p className="max-w-md text-sm text-ink-soft lg:pb-1.5">{cards.length ? `Published capacities, a price band and the venue’s own terms on every card. ${REPLY_PROMISE_SHORT}` : 'The first listings are being verified. Until they are live, every brief goes to the events desk and is matched by hand.'}</p>
          </div>
          {onboarding.length ? (
            <div className="mt-4">
              <PreviewBanner>
                Preview build: {onboarding.length === 1 ? 'one venue is' : `${onboarding.length} venues are`} still onboarding ({onboarding.map((v) => v.name).join(', ')}) and {onboarding.length === 1 ? 'is' : 'are'} not shown to planners until capacities, prices and photos are confirmed.
              </PreviewBanner>
            </div>
          ) : null}
          <div className="mt-4">
            {cards.length ? (
              <VenueBrowser venues={cards} initial={finder} shortlist={shortlist} areas={areas} />
            ) : (
              <div className="rounded-card border border-dashed border-paper-edge bg-paper px-6 py-10 text-center">
                <h3 className="font-display text-xl">The first listings are on their way.</h3>
                <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-soft">A venue goes live only once its capacities, pricing and photos are confirmed. Send a brief now and the events desk matches you by hand.</p>
                <Link href={briefLink} className="btn-primary mt-5">
                  Build my inquiry
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            )}
          </div>
          <nav aria-label="Browse by occasion and area" className="mt-8 grid gap-1.5 text-sm text-ink-soft">
            <p>
              <span className="font-semibold text-ink">By occasion: </span>
              {EVENT_OCCASIONS.map((o, i) => (
                <span key={o.slug}>
                  {i ? ' · ' : ''}
                  <Link href={withShortlist(`/private-events/occasions/${o.slug}/`, shortlist)} className="underline-offset-[0.2em] hover:text-ink hover:underline">
                    {o.title}
                  </Link>
                </span>
              ))}
            </p>
            {areas.length ? (
              <p>
                <span className="font-semibold text-ink">By area: </span>
                {areas.map((n, i) => (
                  <span key={n.slug}>
                    {i ? ' · ' : ''}
                    <Link href={withShortlist(`/private-events/neighborhoods/${n.slug}/`, shortlist)} className="underline-offset-[0.2em] hover:text-ink hover:underline">
                      {n.name}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}
          </nav>
        </div>
      </section>

      <section id="process" className="scroll-mt-16 border-t border-paper-edge bg-paper py-12" aria-labelledby="process-title">
        <div className="shell">
          <ProcessFaq />
          <div className="mt-8">
            <EventsDisclosure compact />
          </div>
        </div>
      </section>

      <section id="brief-cta" className="scroll-mt-16 bg-ink py-10 text-paper" aria-labelledby="brief-cta-title">
        <div className="shell grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-10">
          <div>
            <p className="eyebrow text-paper/75">Ready when you are</p>
            <h2 id="brief-cta-title" className="mt-1 text-[1.75rem] text-paper sm:text-[2.25rem]">
              Build your inquiry.
            </h2>
            <p className="mt-2 max-w-prose text-[16px] text-paper/85">Your filters and shortlist carry over. You see the whole brief before it goes anywhere.</p>
          </div>
          <div className="lg:justify-self-end">
            <Link href={briefLink} className="btn-secondary">
              Plan my event
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="pb-20 md:pb-0" />
      <ShortlistBar venues={venues.map((v) => ({ slug: v.slug, name: v.name }))} />
      <StickyPlanCta targets={['venues', 'brief-cta']} />
    </>
  );
}
