import Link from 'next/link';
import { SmartImage } from '@/components/Media';
import { Breadcrumbs, JsonLd } from '@/components/Ui';
import SectionHead from '@/components/hub/SectionHead';
import EventFinder from '@/components/private-events/EventFinder';
import EventsDisclosure from '@/components/private-events/EventsDisclosure';
import FeaturedVenue from '@/components/private-events/FeaturedVenue';
import { PreviewBanner } from '@/components/private-events/Preview';
import ProcessFaq from '@/components/private-events/ProcessFaq';
import ShortlistBar from '@/components/private-events/Shortlist';
import StickyPlanCta from '@/components/private-events/StickyPlanCta';
import { neighborhoods } from '@/lib/content/neighborhoods';
import { PREVIEW_NOT_SENT, inquiryDeliveryEnabled } from '@/lib/events/delivery';
import { finderEventType, readFinderParams, type FinderVenue } from '@/lib/events/finder';
import { hasPlaceholder, type EventMedia } from '@/lib/events/types';
import { listMedia, listVenues, showUnpublished } from '@/lib/events/venues';
import { EVENT_OCCASIONS, NO_PLANNING_FEE, REPLY_PROMISE_SHORT, briefHref, parseShortlist, withShortlist } from '@/lib/private-events';
import { buildMetadata, serviceSchema } from '@/lib/seo';

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
    description: 'Corporate events, holiday parties and convention receptions in Nashville. Answer four questions for a recommendation, then send one brief to venues that publish their capacities. No planning fee to you.',
    path: '/private-events/',
    noindex: ['event', 'size', 'area', 'pri', 'v'].some((k) => one(params, k)),
  });
}

/**
 * Private events hub (board: "Bring your people. Make it Nashville."), for
 * the planner organizing a substantial corporate, holiday, convention or
 * group event.
 *
 * Order: a compact hero that names the audience; the event finder (four
 * inputs, no contact details, a recommendation built from the inputs and
 * the published rows); the listed venues as featured blocks with their
 * capacities and price bands; three steps and the questions planners ask,
 * with the fee and ownership disclosures intact; the brief entry. The
 * finder's selections ride in the URL so a round trip to the brief keeps
 * them, and the shortlist stays in `?v=` as before. Builds where delivery
 * is off (every non-production build) say so at the top.
 */
export default async function PrivateEventsPage(props: { searchParams?: Promise<Params> }) {
  const params = (await props.searchParams) ?? {};
  const shortlist = parseShortlist(params.v);
  const finder = readFinderParams(params);
  const finderQuery = { event: finder.eventType, size: finder.size, area: finder.area, priorities: finder.priorities };
  const delivery = inquiryDeliveryEnabled();

  const venues = await listVenues();
  const listed = venues.filter((v) => v.published && !hasPlaceholder(v) && v.spaces.some((s) => s.published));
  const onboarding = showUnpublished() ? venues.filter((v) => !listed.includes(v)) : [];
  const media: Record<string, EventMedia[]> = Object.fromEntries(await Promise.all(listed.map(async (v) => [v.id, await listMedia(v.id)] as const)));
  const finderVenues: FinderVenue[] = listed.map((v) => ({ slug: v.slug, name: v.name, kind: v.kind, neighborhoodSlug: v.neighborhoodSlug, ownedByBph: v.ownedByBph, verified: Boolean(v.verifiedAt), features: v.features, spaces: v.spaces.filter((s) => s.published) }));
  const briefLink = briefHref({ ...finderQuery, occasion: finderEventType(finder.eventType)?.occasion, shortlist });
  const areaCount = new Set(listed.map((v) => v.neighborhoodSlug)).size;

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
      <div className="shell">
        <Breadcrumbs trail={[{ name: 'Private events', href: '/private-events/' }]} />
        {!delivery ? (
          <div className="mb-4">
            <PreviewBanner>{PREVIEW_NOT_SENT}</PreviewBanner>
          </div>
        ) : null}
      </div>

      {/* Hero: copy wide enough for two lines, the audience named at once, both actions to their sections. */}
      <section className="shell pb-8 pt-2 md:pt-4" aria-labelledby="page-title">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:items-center lg:gap-12">
          <div className="max-w-[640px]">
            <p className="eyebrow">Private events in Nashville</p>
            <h1 id="page-title" className="mt-2 text-[2.25rem] leading-[1] sm:text-[2.75rem] lg:text-[3.25rem]">
              Bring your people.
              <br />
              Make it Nashville.
            </h1>
            <p className="mt-4 max-w-[36rem] text-[17px] leading-snug text-ink-soft sm:text-[19px]">Corporate events, holiday parties and convention receptions—planned around your group.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href="#plan" className="btn-primary">
                Find my event fit
                <span aria-hidden="true">→</span>
              </a>
              <a href="#spaces" className="btn-secondary">
                Browse event spaces
              </a>
            </div>
            <p className="mt-4 text-sm text-ink-soft">{NO_PLANNING_FEE}</p>
          </div>
          <figure className="overflow-hidden rounded-card bg-ink">
            <SmartImage imageKey="venues/jbjs-rooftop" ratio="aspect-[4/3] lg:aspect-auto lg:h-[400px]" sizes="(max-width: 1023px) 100vw, 50vw" priority />
            <figcaption className="px-3 py-2 text-2xs text-paper/80">The rooftop at JBJ&rsquo;s Nashville, Lower Broadway. Photograph courtesy of BPH Hospitality.</figcaption>
          </figure>
        </div>
      </section>

      <section id="plan" className="scroll-mt-20 border-t border-paper-edge bg-paper-sunk" aria-labelledby="finder-title">
        <div className="shell section">
          <SectionHead id="finder-title" size="md" title="Find your event fit." support="Four answers, no contact details. Seated or standing, where to hold it, what to plan for, and the verified spaces that fit; it changes with every choice." />
          <div className="mt-6">
            <EventFinder venues={finderVenues} initial={finder} shortlist={shortlist} />
          </div>
        </div>
      </section>

      <section id="spaces" className="scroll-mt-20" aria-labelledby="spaces-title">
        <div className="shell section">
          <SectionHead
            id="spaces-title"
            size="md"
            title="Event spaces with verified numbers."
            support={listed.length ? `${listed.length === 1 ? 'One venue' : `${listed.length} venues`} listed so far, in ${areaCount === 1 ? 'one area' : `${areaCount} areas`}, each with seated and standing capacity, a price band and the venue’s own terms. More are onboarding; the events desk fills the gaps by hand.` : 'The first listings are being verified. Until they are live, every brief goes to the events desk and is matched by hand.'}
          />
          {onboarding.length ? (
            <div className="mt-6">
              <PreviewBanner>
                Preview build: {onboarding.length === 1 ? 'one venue is' : `${onboarding.length} venues are`} still onboarding ({onboarding.map((v) => v.name).join(', ')}) and {onboarding.length === 1 ? 'is' : 'are'} not shown to planners until their capacities, prices and photos are confirmed.
              </PreviewBanner>
            </div>
          ) : null}
          {listed.length ? (
            <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6">
              {listed.map((v) => (
                <FeaturedVenue key={v.id} venue={v} media={media[v.id] ?? []} shortlist={shortlist} finderQuery={finderQuery} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-card border border-dashed border-paper-edge bg-paper-card px-6 py-12 text-center">
              <h3 className="font-display text-xl">The first listings are on their way.</h3>
              <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-soft">A venue goes live only once its capacities, pricing and photos are confirmed. Send a brief now and the events desk matches you by hand.</p>
              <Link href={briefLink} className="btn-primary mt-5">
                Build my inquiry
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
          <nav aria-label="Browse by occasion and area" className="mt-8 grid gap-2 text-sm text-ink-soft">
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
            <p>
              <span className="font-semibold text-ink">By area: </span>
              {neighborhoods.map((n, i) => (
                <span key={n.slug}>
                  {i ? ' · ' : ''}
                  <Link href={withShortlist(`/private-events/neighborhoods/${n.slug}/`, shortlist)} className="underline-offset-[0.2em] hover:text-ink hover:underline">
                    {n.name}
                  </Link>
                </span>
              ))}
            </p>
          </nav>
        </div>
      </section>

      <section id="process" className="scroll-mt-20 border-t border-paper-edge" aria-labelledby="process-title">
        <div className="shell section">
          <ProcessFaq />
          <div className="mt-8">
            <EventsDisclosure compact />
          </div>
        </div>
      </section>

      <section id="brief-cta" className="scroll-mt-20 border-t border-paper-edge bg-ink text-paper" aria-labelledby="brief-cta-title">
        <div className="shell grid gap-6 py-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-12">
          <div>
            <p className="eyebrow text-paper/75">Ready when you are</p>
            <h2 id="brief-cta-title" className="mt-1 text-[1.75rem] text-paper sm:text-[2.25rem]">
              Build your inquiry.
            </h2>
            <p className="mt-3 max-w-prose text-[16px] text-paper/85">Your finder choices and shortlist carry over. You see the whole brief before it goes anywhere. {REPLY_PROMISE_SHORT}</p>
          </div>
          <div className="lg:justify-self-end">
            <Link href={briefLink} className="btn-secondary">
              Plan my event
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="pb-24 md:pb-8" />
      <ShortlistBar venues={venues.map((v) => ({ slug: v.slug, name: v.name }))} />
      <StickyPlanCta targets={['plan', 'brief-cta']} />
    </>
  );
}
