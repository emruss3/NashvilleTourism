import Link from 'next/link';
import DateField from '@/components/DateField';
import { SmartImage } from '@/components/Media';
import { Breadcrumbs, JsonLd } from '@/components/Ui';
import PageIntro from '@/components/hub/PageIntro';
import SectionHead from '@/components/hub/SectionHead';
import BigDates from '@/components/private-events/BigDates';
import EventsDisclosure from '@/components/private-events/EventsDisclosure';
import { PreviewBanner } from '@/components/private-events/Preview';
import ShortlistBar from '@/components/private-events/Shortlist';
import { VenueGrid } from '@/components/private-events/VenueCard';
import { neighborhoods } from '@/lib/content/neighborhoods';
import { hasPlaceholder } from '@/lib/events/types';
import { rankVenues } from '@/lib/events/venue-rank';
import { listVenues, showUnpublished } from '@/lib/events/venues';
import { BRIEF_PATH, EVENT_OCCASIONS, HOW_IT_WORKS, PAID_BY_VENUE, SIZE_BANDS, briefHref, occasionBySlug, parseShortlist, sizeBandBySlug, venueFitsBand } from '@/lib/private-events';
import { buildMetadata, serviceSchema } from '@/lib/seo';
import { todayChicagoISO } from '@/lib/stay-dates';

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
    description: 'Nashville venues that publish their capacities and minimums. Send one brief; each venue replies within 24 business hours. No fee to planners.',
    path: '/private-events/',
    noindex: ['occasion', 'hood', 'size', 'v', 'type', 'guests', 'date'].some((k) => one(params, k)),
  });
}

/** Hub filter links keep the other filters and the shortlist. */
function hubHref(f: { occasion?: string; hood?: string; size?: string }, shortlist: string[]): string {
  const sp = new URLSearchParams();
  if (f.occasion) sp.set('occasion', f.occasion);
  if (f.hood) sp.set('hood', f.hood);
  if (f.size) sp.set('size', f.size);
  if (shortlist.length) sp.set('v', shortlist.join(','));
  const qs = sp.toString();
  return `/private-events/${qs ? `?${qs}` : ''}#venues`;
}

/**
 * Private events hub (board: "Bring your people. Make it Nashville.").
 *
 * Venues first, always: hero, the grid with occasion, neighborhood and size
 * chips and the shortlist bar (the brief is something you send to venues you
 * can see; "Send to these N" is the primary action), then how it works and
 * the disclosure, then the three-field quick brief for planners who would
 * rather we pick. The empty-state branch, a concierge band in the grid's
 * place, stays in the code for the case where no venue is published and
 * should never show once the owned venues have their content. Preview
 * builds also show unpublished seed venues with their placeholders marked.
 */
export default async function PrivateEventsPage(props: { searchParams?: Promise<Params> }) {
  const params = (await props.searchParams) ?? {};
  const shortlist = parseShortlist(params.v);
  const occasion = occasionBySlug(one(params, 'occasion') ?? '');
  const hoodSlug = one(params, 'hood');
  const hood = neighborhoods.find((n) => n.slug === hoodSlug);
  const size = sizeBandBySlug(one(params, 'size') ?? '');

  const venues = await listVenues();
  const listed = venues.some((v) => v.published && v.spaces.some((s) => s.published));
  const preview = showUnpublished() && venues.some((v) => !v.published || hasPlaceholder(v));
  const showGrid = listed || preview;

  let filtered = venues;
  if (hood) filtered = filtered.filter((v) => v.neighborhoodSlug === hood.slug);
  if (size) filtered = filtered.filter((v) => venueFitsBand(v, size));
  if (occasion) filtered = rankVenues(filtered, { needs: occasion.needs }).map((r) => r.venue);
  const anyFilter = Boolean(occasion || hood || size);

  const chipClass = (on: boolean) => `inline-flex min-h-10 items-center gap-1.5 rounded border px-3 text-sm font-semibold transition-colors ${on ? 'border-ink bg-ink text-paper' : 'border-paper-edge bg-paper text-ink hover:border-ink'}`;

  return (
    <>
      <JsonLd
        data={serviceSchema({
          path: '/private-events/',
          name: 'Private event venue referrals in Nashville',
          serviceType: 'Event venue referral',
          description: 'A Nashville-only marketplace for private events: venues publish seated and standing capacity, minimum spend or room fee and buyout terms; planners send one brief and each venue replies within 24 business hours. Planners pay nothing; the venue pays Nashville.com 5% of contracted spend only when an event books.',
          audience: 'Corporate, convention and group event planners',
        })}
      />
      <div className="shell">
        <Breadcrumbs trail={[{ name: 'Private events', href: '/private-events/' }]} />
      </div>

      <PageIntro
        eyebrow="Private events in Nashville"
        title={
          <>
            Bring your people.
            <br />
            Make it Nashville.
          </>
        }
        support={listed ? 'Venues that publish their capacities and minimums. Shortlist up to five, send one brief, and each replies within 24 business hours. No fee to you.' : 'One brief. A person who knows the rooms matches you within one business day. No fee to you.'}
        media={
          <div className="overflow-hidden rounded-card bg-ink">
            <SmartImage imageKey="concept/group-toast" ratio="aspect-[4/3] lg:aspect-auto lg:h-[440px]" sizes="(max-width: 1023px) 100vw, 58vw" priority />
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-4">
          {showGrid ? (
            <a href="#venues" className="btn-primary">
              Browse venues
              <span aria-hidden="true">→</span>
            </a>
          ) : null}
          <Link href={briefHref({ shortlist })} className={showGrid ? 'inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-ink underline underline-offset-[0.2em]' : 'btn-primary'}>
            {showGrid ? 'Or send a brief and we pick' : 'Send a brief'}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </PageIntro>

      {showGrid ? (
        <section id="venues" className="scroll-mt-20" aria-labelledby="venues-title">
          <div className="shell section">
            <SectionHead id="venues-title" title="Venues that publish their numbers." support="Seated and standing capacity, and what it costs to start, on every listing. In editorial order, or by fit when you filter. Ownership and sponsorship are labeled and never move a venue." />
            {preview ? (
              <div className="mt-6">
                <PreviewBanner>Preview build: unpublished venues are shown with their placeholders marked. Production shows published venues only.</PreviewBanner>
              </div>
            ) : null}
            <div className="mt-6 grid gap-3">
              <ul className="flex flex-wrap gap-2" aria-label="Filter by occasion">
                {EVENT_OCCASIONS.map((o) => (
                  <li key={o.slug}>
                    <Link href={hubHref({ occasion: occasion?.slug === o.slug ? undefined : o.slug, hood: hood?.slug, size: size?.slug }, shortlist)} className={chipClass(occasion?.slug === o.slug)} aria-pressed={occasion?.slug === o.slug}>
                      {o.title}
                    </Link>
                  </li>
                ))}
              </ul>
              <ul className="flex flex-wrap gap-2" aria-label="Filter by neighborhood">
                {neighborhoods.map((n) => (
                  <li key={n.slug}>
                    <Link href={hubHref({ occasion: occasion?.slug, hood: hood?.slug === n.slug ? undefined : n.slug, size: size?.slug }, shortlist)} className={chipClass(hood?.slug === n.slug)} aria-pressed={hood?.slug === n.slug}>
                      {n.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <ul className="flex flex-wrap gap-2" aria-label="Filter by size">
                {SIZE_BANDS.map((b) => (
                  <li key={b.slug}>
                    <Link href={hubHref({ occasion: occasion?.slug, hood: hood?.slug, size: size?.slug === b.slug ? undefined : b.slug }, shortlist)} className={chipClass(size?.slug === b.slug)} aria-pressed={size?.slug === b.slug}>
                      {b.label} guests
                    </Link>
                  </li>
                ))}
                {anyFilter ? (
                  <li>
                    <Link href={hubHref({}, shortlist)} className="inline-flex min-h-10 items-center text-sm font-semibold text-ink underline underline-offset-[0.2em]">
                      Clear filters
                    </Link>
                  </li>
                ) : null}
              </ul>
            </div>
            <div className="mt-6">
              <VenueGrid venues={filtered} shortlist={shortlist} empty={{ title: anyFilter ? 'Nothing matches those filters yet.' : 'The first listings are on their way.', description: anyFilter ? 'Clear a filter, or send a brief and the events desk finds the fit by hand.' : 'A venue goes live only once its capacities, pricing and photos are confirmed. Until then, send a brief and the events desk matches you by hand.' }} />
            </div>
          </div>
        </section>
      ) : (
        <section className="border-t border-paper-edge bg-ink text-paper" aria-labelledby="concierge-title">
          <div className="shell grid gap-6 py-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-12">
            <div>
              <p className="eyebrow text-paper/75">Launch season</p>
              <h2 id="concierge-title" className="mt-1 text-[2rem] text-paper sm:text-[2.5rem]">
                We&rsquo;re onboarding Nashville&rsquo;s best venues now.
              </h2>
              <p className="mt-3 max-w-prose text-[16px] text-paper/85">
                Send a brief and our events desk matches you by hand within one business day: the right room for your headcount and budget, with real capacities and minimums, from people who know the rooms.
              </p>
            </div>
            <div className="lg:justify-self-end">
              <Link href={briefHref({ shortlist })} className="btn-secondary">
                Send a brief
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="shell section border-t border-paper-edge" aria-labelledby="process-title">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
          <div className="lg:border-r lg:border-paper-edge lg:pr-8">
            <h2 id="process-title" className="text-[1.75rem] sm:text-[2rem]">
              How it works.
            </h2>
            <p className="mt-3 max-w-sm text-[15px] text-ink-soft">{PAID_BY_VENUE}</p>
          </div>
          <ol className="grid gap-5 sm:grid-cols-2">
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink font-sans text-sm font-bold text-paper" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-sans text-[15px] font-bold text-ink">
                    <span className="sr-only">Step {i + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="mt-1 text-[14px] leading-snug text-ink-soft">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-8">
          <EventsDisclosure />
        </div>
      </section>

      {/* Quick brief: three fields, handed to the brief page with their values. */}
      <section className="shell" aria-labelledby="brief-title">
        <form action={BRIEF_PATH} method="get" className="grid gap-5 rounded-card border-2 border-ink bg-paper p-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)] lg:items-end lg:gap-8 lg:p-6">
          {shortlist.length ? <input type="hidden" name="v" value={shortlist.join(',')} /> : null}
          <div className="lg:border-r lg:border-paper-edge lg:pr-6">
            <h2 id="brief-title" className="font-sans text-2xs font-bold uppercase tracking-[0.14em] text-ink">
              Prefer we pick?
            </h2>
            <p className="mt-1 text-[15px] text-ink-soft">Tell us the basics and the events desk picks venues that fit. Under a minute.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1.1fr_auto_auto] lg:items-end">
            <div>
              <label htmlFor="brief-occasion" className="field-label">
                Occasion
              </label>
              <select id="brief-occasion" name="occasion" defaultValue="" className="field-input">
                <option value="">Select an occasion</option>
                {EVENT_OCCASIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.title}
                  </option>
                ))}
                <option value="other">Something else</option>
              </select>
            </div>
            <div>
              <label htmlFor="brief-guests" className="field-label">
                Guests
              </label>
              <input id="brief-guests" name="guests" type="number" min={1} max={5000} inputMode="numeric" placeholder="e.g. 50" className="field-input" />
            </div>
            <div>
              <label htmlFor="brief-date" className="field-label">
                Date
              </label>
              <DateField id="brief-date" name="date" min={todayChicagoISO()} label="Open the calendar for your event date" />
            </div>
            <label className="inline-flex min-h-12 items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="flexible" value="1" className="h-4 w-4 accent-ink" />
              Flexible
            </label>
            <button type="submit" className="btn-primary sm:col-span-2 lg:col-span-1">
              Continue
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      </section>

      <BigDates shortlist={shortlist} />

      <div className="pb-24" />
      {showGrid ? <ShortlistBar venues={venues.map((v) => ({ slug: v.slug, name: v.name }))} /> : null}
    </>
  );
}
