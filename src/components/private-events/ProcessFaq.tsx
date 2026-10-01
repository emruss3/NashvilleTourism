import Link from 'next/link';
import { HOW_IT_WORKS, NO_PLANNING_FEE, OWNED_VENUE_DISCLOSURE, REPLY_PROMISE, SHORTLIST_MAX } from '@/lib/private-events';

/**
 * Three steps, then the questions a planner asks before sending anything.
 * The referral-fee and ownership disclosures keep their substance and
 * labels here; the formal statement stays at /advertising/#disclosure.
 */
const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: 'What does this cost me?',
    a: (
      <>
        {NO_PLANNING_FEE} When an event that started here books, the venue pays Nashville.com 5% of the contracted spend, with a $250 minimum. The venue&rsquo;s price to you is the same either way.
      </>
    ),
  },
  {
    q: 'How fast do venues reply?',
    a: <>{REPLY_PROMISE} A venue that misses its deadline a second time costs you nothing: the desk sends you two alternatives.</>,
  },
  {
    q: 'Which venues do you own, and does that change the order?',
    a: (
      <>
        Three venues here are owned by BPH Hospitality, Nashville.com&rsquo;s parent company. Each carries the label &ldquo;{OWNED_VENUE_DISCLOSURE}&rdquo; wherever it appears. Ranking and recommendations are a function of capacity, price band, area and your stated needs only, never of ownership, fees or sponsorship. Sponsored placements, when they exist, are labeled too.{' '}
        <Link href="/advertising/#disclosure" className="font-semibold text-ink underline underline-offset-[0.2em]">
          The full disclosure
        </Link>
      </>
    ),
  },
  {
    q: 'Is sending a brief a booking?',
    a: <>No. A brief is a request for options. Availability is confirmed by the venue when it replies, and the contract, deposit and the event itself are between you and the venue.</>,
  },
  {
    q: 'What is a verified space?',
    a: <>A space whose seated and standing capacities, price band and features were supplied by the venue and checked by the events desk before it was published. Prices show as a band; the venue quotes exact numbers when it replies.</>,
  },
  {
    q: 'Can I pick the venues myself?',
    a: <>Yes. Shortlist up to {SHORTLIST_MAX} venues from their pages and your brief goes to those. Leave the shortlist empty and we match up to {SHORTLIST_MAX} on fit.</>,
  },
];

export default function ProcessFaq() {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
      <div>
        <h2 id="process-title" className="text-[1.75rem] sm:text-[2rem]">
          How it works.
        </h2>
        <ol className="mt-6 grid gap-5">
          {HOW_IT_WORKS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink font-sans text-sm font-bold text-paper" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <h3 className="font-sans text-[16px] font-bold text-ink">
                  <span className="sr-only">Step {i + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-1 text-[14px] leading-snug text-ink-soft">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <h2 id="faq-title" className="text-[1.75rem] sm:text-[2rem]">
          Before you send.
        </h2>
        <div className="mt-4 divide-y divide-paper-edge border-y border-paper-edge">
          {FAQ.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 font-sans text-[15px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {item.q}
                <span aria-hidden="true" className="text-ink-soft group-open:rotate-45 motion-safe:transition-transform">
                  +
                </span>
              </summary>
              <p className="max-w-prose pb-4 text-[15px] leading-relaxed text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
