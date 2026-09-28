import Link from 'next/link';
import { Breadcrumbs } from '@/components/Ui';
import EventsDisclosure from '@/components/private-events/EventsDisclosure';
import InquiryForm from '@/components/private-events/InquiryForm';
import { listVenues } from '@/lib/events/venues';
import { HOW_IT_WORKS, SHORTLIST_MAX, occasionByValue, readBriefParams } from '@/lib/private-events';
import { buildMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

export const metadata = buildMetadata({
  title: 'Send an event brief',
  description: 'One brief for your Nashville private event. Occasion, headcount, date, and where to reach you; the rest can come later.',
  path: '/private-events/brief/',
  noindex: true,
});

/**
 * The brief, on its own page. State arrives in the URL from the hub's quick
 * brief (occasion, guests, date), from venue pages (`venue=`), and from the
 * shortlist bar (`v=`); every entry point lands here prefilled. Under a
 * minute to send: five required fields, everything else behind "add detail"
 * or the link in the confirmation email.
 */
export default async function BriefPage(props: { searchParams?: Promise<Params> }) {
  const params = (await props.searchParams) ?? {};
  const { prefill, shortlist, venue } = readBriefParams(params);
  const slugs = venue && !shortlist.includes(venue) && shortlist.length < SHORTLIST_MAX ? [...shortlist, venue] : shortlist;

  const venues = await listVenues();
  const listed = venues.some((v) => v.published && v.spaces.some((s) => s.published));
  const shortlisted = slugs.map((slug) => venues.find((v) => v.slug === slug)).filter((v): v is NonNullable<typeof v> => Boolean(v)).map((v) => ({ slug: v.slug, name: v.name }));
  const occasion = occasionByValue(prefill.occasion);

  return (
    <>
      <div className="shell">
        <Breadcrumbs trail={[{ name: 'Private events', href: '/private-events/' }, { name: 'Your brief', href: '/private-events/brief/' }]} />
      </div>
      <div className="shell grid gap-8 pb-24 pt-4 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
        <aside className="order-2 lg:order-1 lg:border-r lg:border-paper-edge lg:pr-8">
          <p className="eyebrow">Private events in Nashville</p>
          <p className="mt-2 hidden text-[2.25rem] font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-[2.75rem] lg:block" aria-hidden="true">Your brief.</p>
          <p className="mt-3 max-w-sm text-[16px] text-ink-soft">
            {listed
              ? 'Five details to send. Each venue replies to you directly within 24 business hours, and you confirm everything with the venue.'
              : 'Five details to send. Our events desk matches you by hand within one business day while the first venues are onboarded.'}
            {occasion ? ` Started for ${/^[aeiou]/i.test(occasion.title) ? 'an' : 'a'} ${occasion.title.toLowerCase().replace(/s$/, '')}.` : ''}
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
            <Link href="/private-events/" className="font-semibold text-ink underline underline-offset-[0.2em]">
              Back to private events
            </Link>
          </p>
        </aside>
        <div className="order-1 lg:order-2">
          <h1 className="text-[2.25rem] leading-[0.98] sm:text-[2.75rem] lg:sr-only">Your brief.</h1>
          <p className="mb-5 mt-2 max-w-prose text-[15px] text-ink-soft lg:hidden">Five details to send. {listed ? 'Venues reply within 24 business hours.' : 'Our events desk matches you by hand within one business day.'}</p>
          <InquiryForm prefill={prefill} shortlist={shortlisted} venuesListed={listed} />
        </div>
      </div>
    </>
  );
}
