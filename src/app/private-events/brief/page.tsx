import Link from 'next/link';
import { Breadcrumbs } from '@/components/Ui';
import EventsDisclosure from '@/components/private-events/EventsDisclosure';
import InquiryForm from '@/components/private-events/InquiryForm';
import { PreviewBanner } from '@/components/private-events/Preview';
import { bookedDays, bookedMonths, monthKey, nextMonths } from '@/lib/events/availability';
import { PREVIEW_NOT_SENT, inquiryDeliveryEnabled } from '@/lib/events/delivery';
import { finderEventType, finderParams, readFinderParams } from '@/lib/events/finder';
import { listAvailability, listVenues } from '@/lib/events/venues';
import type { VenueBooked } from '@/components/private-events/InquiryForm';
import { HOW_IT_WORKS, REPLY_PROMISE_SHORT, SHORTLIST_MAX, readBriefParams } from '@/lib/private-events';
import { buildMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

export const metadata = buildMetadata({
  title: 'Build your event inquiry',
  description: 'One brief for your Nashville corporate event, holiday party or convention reception: the event, your details, and a review before anything is sent.',
  path: '/private-events/brief/',
  noindex: true,
});

/**
 * The brief, on its own page. State arrives in the URL: the finder's
 * `event`, `size`, `area` and `pri`, the older `occasion`, `guests`, `date`
 * and `flexible`, `v=` from the shortlist bar and `venue=` from a venue
 * page. Every entry point lands here prefilled, and the back link returns
 * to the finder with the same selections.
 */
export default async function BriefPage(props: { searchParams?: Promise<Params> }) {
  const params = (await props.searchParams) ?? {};
  const { prefill, shortlist, venue } = readBriefParams(params);
  const finder = readFinderParams(params);
  const slugs = venue && !shortlist.includes(venue) && shortlist.length < SHORTLIST_MAX ? [...shortlist, venue] : shortlist;
  const delivery = inquiryDeliveryEnabled();

  const venues = await listVenues();
  const listed = venues.some((v) => v.published && v.spaces.some((s) => s.published));
  const shortlistedVenues = slugs.map((slug) => venues.find((v) => v.slug === slug)).filter((v): v is NonNullable<typeof v> => Boolean(v));
  const shortlisted = shortlistedVenues.map((v) => ({ slug: v.slug, name: v.name }));
  // Months and days each shortlisted venue has declared fully booked, for the grey-out in the form.
  const months = nextMonths(12, monthKey());
  const availability = shortlistedVenues.length ? await listAvailability(shortlistedVenues.map((v) => v.id), months[0], 12) : [];
  const booked: Record<string, VenueBooked> = Object.fromEntries(
    shortlistedVenues.map((v) => {
      const rows = availability.filter((r) => r.venueId === v.id);
      return [v.slug, { months: bookedMonths(rows, v.spaces, months), days: bookedDays(rows, v.spaces) }];
    }),
  );
  const eventDef = finderEventType(finder.eventType);
  const finderQs = finderParams(finder).toString();
  const backHref = `/private-events/${finderQs ? `?${finderQs}` : ''}#plan`;

  return (
    <>
      <div className="shell">
        <Breadcrumbs trail={[{ name: 'Private events', href: '/private-events/' }, { name: 'Your brief', href: '/private-events/brief/' }]} />
        {!delivery ? (
          <div className="mb-4">
            <PreviewBanner>{PREVIEW_NOT_SENT}</PreviewBanner>
          </div>
        ) : null}
      </div>
      <div className="shell grid gap-8 pb-24 pt-2 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
        <aside className="order-2 lg:order-1 lg:border-r lg:border-paper-edge lg:pr-8">
          <p className="eyebrow">Private events in Nashville</p>
          <p className="mt-2 hidden text-[2.25rem] font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-[2.75rem] lg:block" aria-hidden="true">
            Your brief.
          </p>
          <p className="mt-3 max-w-sm text-[16px] text-ink-soft">
            {listed ? `Two steps: the brief, then a review of exactly what goes out. ${REPLY_PROMISE_SHORT}` : 'Two steps: the brief, then a review of exactly what goes out. Our events desk matches you by hand within one business day while the first venues are onboarded.'}
            {eventDef ? ` Started for a ${eventDef.label.toLowerCase()}.` : ''}
          </p>
          <ol className="mt-6 grid gap-3">
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink font-sans text-xs font-bold text-paper" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <p className="font-sans text-[15px] font-bold text-ink">{step.title}</p>
                  <p className="text-[14px] leading-snug text-ink-soft">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6">
            <EventsDisclosure compact />
          </div>
          <p className="mt-4 text-sm">
            <Link href={backHref} className="font-semibold text-ink underline underline-offset-[0.2em]">
              Back to the finder{finder.eventType ? ' with your choices' : ''}
            </Link>
          </p>
        </aside>
        <div className="order-1 lg:order-2">
          <h1 className="text-[2.25rem] leading-[0.98] sm:text-[2.75rem] lg:sr-only">Your brief.</h1>
          <p className="mb-5 mt-2 max-w-prose text-[15px] text-ink-soft lg:hidden">Two steps: the brief, then a review before anything is sent.</p>
          <InquiryForm prefill={{ ...prefill, event: finder.eventType, size: finder.size, area: finder.area, priorities: finder.priorities }} shortlist={shortlisted} venuesListed={listed} booked={booked} delivery={delivery} />
        </div>
      </div>
    </>
  );
}
