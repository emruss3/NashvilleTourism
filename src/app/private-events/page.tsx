import Link from 'next/link';
import { PeopleIcon, PinIcon } from '@/components/Icons';
import DateField from '@/components/DateField';
import { SmartImage } from '@/components/Media';
import { Breadcrumbs, JsonLd } from '@/components/Ui';
import PageIntro from '@/components/hub/PageIntro';
import SectionHead from '@/components/hub/SectionHead';
import BigDates from '@/components/private-events/BigDates';
import EventsDisclosure from '@/components/private-events/EventsDisclosure';
import InquiryForm from '@/components/private-events/InquiryForm';
import { PreviewBanner } from '@/components/private-events/Preview';
import ShortlistBar from '@/components/private-events/Shortlist';
import { VenueGrid } from '@/components/private-events/VenueCard';
import { neighborhoods } from '@/lib/content/neighborhoods';
import { hasPlaceholder } from '@/lib/events/types';
import { listVenues, showUnpublished } from '@/lib/events/venues';
import { EVENT_OCCASIONS, HOW_IT_WORKS, PAID_BY_VENUE, SIZE_BANDS, isEventType, isOccasion, occasionByValue, parseShortlist, withShortlist, type BriefPrefill } from '@/lib/private-events';
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
    description: 'Nashville venues that publish their capacities and minimums. Send one brief to up to five; each replies within 24 business hours. No fee to planners.',
    path: '/private-events/',
    noindex: ['type', 'occasion', 'guests', 'date', 'v'].some((k) => one(params, k)),
  });
}

/**
 * Private events hub (board: "Bring your people. Make it Nashville."). The
 * quick brief is a plain GET form that lands on the full form with its values
 * carried across. Venues come from the marketplace tables in editorial order;
 * preview builds also show unpublished seed venues with their placeholders
 * marked. The shortlist rides in `?v=` and nowhere else.
 */
export default async function PrivateEventsPage(props: { searchParams?: Promise<Params> }) {
  const params = (await props.searchParams) ?? {};
  const typeParam = one(params, 'type');
  const occasionParam = one(params, 'occasion');
  const guestsParam = Number(one(params, 'guests'));
  const dateParam = one(params, 'date');
  const shortlist = parseShortlist(params.v);
  const prefill: BriefPrefill = {
    type: isEventType(typeParam) ? typeParam : undefined,
    occasion: isOccasion(occasionParam) ? occasionParam : undefined,
    guests: Number.isInteger(guestsParam) && guestsParam > 0 ? guestsParam : undefined,
    date: dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined,
    flexible: one(params, 'flexible') === '1',
  };

  const venues = await listVenues();
  const preview = showUnpublished() && venues.some((v) => !v.published || hasPlaceholder(v));
  const shortlisted = shortlist.map((slug) => venues.find((v) => v.slug === slug)).filter((v): v is NonNullable<typeof v> => Boolean(v)).map((v) => ({ slug: v.slug, name: v.name }));
  const listed = venues.some((v) => v.published && v.spaces.some((s) => s.published));

  return (
    <>
      <JsonLd
        data={serviceSchema({
          path: '/private-events/',
          name: 'Private event venue referrals in Nashville',
          serviceType: 'Event venue referral',
          description: 'A Nashville-only marketplace for private events: venues publish seated and standing capacity, minimum spend or room fee and buyout terms; planners send one brief to up to five venues, each of which replies within 24 business hours. Planners pay nothing; the venue pays Nashville.com 5% of contracted spend only when an event books.',
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
        support="Venues that publish their numbers. One brief to up to five of them. A reply within 24 business hours. No fee to you."
        media={
          <div className="overflow-hidden rounded-card bg-ink">
            <SmartImage imageKey="concept/group-toast" ratio="aspect-[4/3] lg:aspect-auto lg:h-[440px]" sizes="(max-width: 1023px) 100vw, 58vw" priority />
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-4">
          <a href="#inquiry" className="btn-primary">
            Send a brief
            <span aria-hidden="true">→</span>
          </a>
          <a href="#venues" className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-ink underline underline-offset-[0.2em]">
            Browse venues
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </PageIntro>

      {/* Quick brief: GET to this page, lands on the full form with the values carried over. */}
      <section className="shell" aria-labelledby="brief-title">
        <form action="/private-events/#inquiry" method="get" className="grid gap-5 rounded-card border-2 border-ink bg-paper p-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)] lg:items-end lg:gap-8 lg:p-6">
          {shortlist.length ? <input type="hidden" name="v" value={shortlist.join(',')} /> : null}
          <div className="lg:border-r lg:border-paper-edge lg:pr-6">
            <h2 id="brief-title" className="font-sans text-2xs font-bold uppercase tracking-[0.14em] text-ink">
              Quick event brief
            </h2>
            <p className="mt-1 text-[15px] text-ink-soft">Three details to start. The full brief takes two minutes.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1.1fr_auto_auto] lg:items-end">
            <div>
              <label htmlFor="brief-occasion" className="field-label">
                Occasion
              </label>
              <select id="brief-occasion" name="occasion" defaultValue={prefill.occasion ?? ''} className="field-input">
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
                Guest count
              </label>
              <input id="brief-guests" name="guests" type="number" min={1} max={5000} inputMode="numeric" placeholder="e.g. 50" defaultValue={prefill.guests ?? ''} className="field-input" />
            </div>
            <div>
              <label htmlFor="brief-date" className="field-label">
                Preferred date
              </label>
              <DateField id="brief-date" name="date" defaultValue={prefill.date ?? ''} min={todayChicagoISO()} label="Open the calendar for your event date" />
            </div>
            <label className="inline-flex min-h-12 items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="flexible" value="1" defaultChecked={prefill.flexible} className="h-4 w-4 accent-ink" />
              Flexible dates
            </label>
            <button type="submit" className="btn-primary sm:col-span-2 lg:col-span-1">
              Start your brief
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      </section>

      <section className="shell section" aria-labelledby="occasions-title">
        <SectionHead id="occasions-title" size="md" title="Browse by occasion." support="Every venue takes every occasion; the order changes with what each one tends to need." />
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {EVENT_OCCASIONS.map((o) => (
            <li key={o.value}>
              <Link href={withShortlist(`/private-events/occasions/${o.slug}/`, shortlist)} className="flex h-full flex-col rounded-card border border-paper-edge bg-paper p-4 transition-colors hover:border-ink">
                <span className="font-sans text-[17px] font-bold text-ink">{o.title}</span>
                <span className="mt-1 text-[15px] leading-snug text-ink-soft">{o.line}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-paper-edge" aria-labelledby="where-title">
        <div className="shell section grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <SectionHead id="where-title" size="md" title="Browse by neighborhood." />
            <ul className="mt-5 flex flex-wrap gap-2">
              {neighborhoods.map((n) => (
                <li key={n.slug}>
                  <Link href={withShortlist(`/private-events/neighborhoods/${n.slug}/`, shortlist)} className="inline-flex min-h-11 items-center gap-1.5 rounded border border-paper-edge bg-paper px-3 text-[15px] font-semibold text-ink transition-colors hover:border-ink">
                    <PinIcon size={14} />
                    {n.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHead id="size-title" size="md" title="Browse by size." />
            <ul className="mt-5 flex flex-wrap gap-2">
              {SIZE_BANDS.map((b) => (
                <li key={b.slug}>
                  <Link href={withShortlist(`/private-events/size/${b.slug}/`, shortlist)} className="inline-flex min-h-11 items-center gap-1.5 rounded border border-paper-edge bg-paper px-3 text-[15px] font-semibold text-ink transition-colors hover:border-ink">
                    <PeopleIcon size={14} />
                    {b.label} guests
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="venues" className="scroll-mt-20 border-t border-paper-edge" aria-labelledby="venues-title">
        <div className="shell section">
          <SectionHead id="venues-title" title="Venues that publish their numbers." support="Seated and standing capacity, and what it costs to start, on every listing. In editorial order. Ownership and sponsorship are labeled and never move a venue." />
          {preview ? (
            <div className="mt-6">
              <PreviewBanner>Preview build: unpublished venues are shown with their placeholders marked. Production shows published venues only.</PreviewBanner>
            </div>
          ) : null}
          <div className="mt-6">
            <VenueGrid
              venues={venues}
              shortlist={shortlist}
              empty={{ title: 'The first listings are on their way.', description: 'A venue goes live only once its capacities, pricing and photos are confirmed. Until then, send a brief and the events desk matches you by hand.' }}
            />
          </div>
        </div>
      </section>

      <section className="bg-ink text-paper" aria-labelledby="process-title">
        <div className="shell grid gap-8 py-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-start lg:gap-12">
          <div className="lg:border-r lg:border-paper/20 lg:pr-8">
            <h2 id="process-title" className="text-[1.75rem] text-paper sm:text-[2rem]">
              How it works.
            </h2>
            <p className="mt-3 max-w-sm text-[15px] text-paper/85">{PAID_BY_VENUE}</p>
          </div>
          <ol className="grid gap-5 sm:grid-cols-2">
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper font-sans text-sm font-bold text-ink" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-sans text-[15px] font-bold text-paper">
                    <span className="sr-only">Step {i + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="mt-1 text-[14px] leading-snug text-paper/80">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <BigDates shortlist={shortlist} />

      <section className="shell pb-8">
        <EventsDisclosure />
      </section>

      <section id="inquiry" className="scroll-mt-20 bg-paper-sunk pb-24" aria-labelledby="inquiry-title">
        <div className="shell section grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
          <div className="lg:border-r lg:border-ink/15 lg:pr-8">
            <h2 id="inquiry-title" className="text-[2rem] sm:text-[2.5rem]">
              Your brief.
            </h2>
            <p className="mt-3 max-w-sm text-[16px] text-ink-soft">
              One form, up to five venues. Each one replies to you directly within 24 business hours, and you confirm everything with the venue.
              {occasionByValue(prefill.occasion) ? ` Started for a ${occasionByValue(prefill.occasion)!.title.toLowerCase().replace(/s$/, '')}.` : ''}
            </p>
          </div>
          <InquiryForm prefill={prefill} shortlist={shortlisted} venuesListed={listed} />
        </div>
      </section>

      <ShortlistBar venues={venues.map((v) => ({ slug: v.slug, name: v.name }))} />
    </>
  );
}
