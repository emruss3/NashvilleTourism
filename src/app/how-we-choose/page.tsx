import Link from 'next/link';
import { Breadcrumbs, PageHeader } from '@/components/Ui';
import { buildMetadata } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'How we choose',
  description:
    'Our methodology: how places get considered, how often listings are re-checked, what each verification state means, and how to challenge a recommendation.',
  path: '/how-we-choose/',
});

export default function HowWeChoosePage() {
  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'How we choose', href: '/how-we-choose/' }]} />
      <PageHeader
        eyebrow="Methodology"
        title="How we choose"
        intro="The process behind every recommendation on this site, including what we check, how often, and what we refuse to do."
      />
      <div className="prose-editorial py-10">
        <p>
          Our recommendations are based on local knowledge, editorial research, firsthand experience,
          reader feedback, and continued review. Sponsored placements are clearly identified and do
          not determine editorial rankings.
        </p>

        <h2 className="text-2xl mt-10 mb-3">How a place gets considered</h2>
        <p>
          Candidates reach us from a few places: writers who live in the neighborhood and eat there,
          reader mail, openings we track, and businesses that get in touch. How a place came to our
          attention has no bearing on whether it gets in. A pitch from a publicist and a tip from a
          reader go into the same queue and face the same questions.
        </p>
        <p>Before anything is written, an editor decides whether the place is worth a reader&rsquo;s time by asking:</p>
        <ul className="mt-3 space-y-2 list-disc pl-5">
          <li>
            Does it answer a question a real visitor or resident has, and can we say specifically who
            it suits?
          </li>
          <li>Is it doing something the alternatives nearby are not doing, or doing it better?</li>
          <li>Is it consistent, or was one good night mistaken for a pattern?</li>
          <li>
            Can we describe the practical experience honestly, including wait, noise, cost, parking,
            and accessibility?
          </li>
          <li>Can we confirm the details that would ruin a trip if they were wrong?</li>
        </ul>
        <p>
          Ordering within a page follows how useful something is for the reader that page is written
          for. A hotel guide for a first trip orders differently than one for a return visit. We say
          on the page what the ordering is based on.
        </p>

        <h2 className="text-2xl mt-10 mb-3">How we visit</h2>
        <p>
          Writers pay their own way wherever possible. Meals, tickets, and rooms are paid for out of
          our own budget so that the visit is the same one you would have. Nobody announces
          themselves in advance to get a better table.
        </p>
        <p>
          Sometimes that is not possible: a press preview, an opening night, a comped room, or a
          ticket provided by a venue. When any part of a visit was provided free or at a discount, we
          say so on the page. Accepting a comped visit never comes with agreed coverage, copy
          approval, or a promise to publish anything at all.
        </p>

        <h2 className="text-2xl mt-10 mb-3">How often we re-check</h2>
        <p>
          A recommendation is only as good as the details attached to it. Every listing carries the
          date a person last checked it, and each category has a review window:
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-5">
          <li>
            <strong className="font-semibold text-ink">Events:</strong> confirmed with the organizer
            or venue before publication and re-checked as the date approaches. Cancelled and
            rescheduled events are updated, not deleted.
          </li>
          <li>
            <strong className="font-semibold text-ink">Restaurants and bars:</strong> hours, price
            range, and reservation practice re-checked at least every three months, and immediately
            when we learn of a closure, a chef change, or a move.
          </li>
          <li>
            <strong className="font-semibold text-ink">Hotels:</strong> rates, resort fees, parking
            charges, and renovation status re-checked at least every six months.
          </li>
          <li>
            <strong className="font-semibold text-ink">Music venues and attractions:</strong>{' '}
            ticketing, age policies, and admission prices re-checked at least every six months.
          </li>
          <li>
            <strong className="font-semibold text-ink">Anything reported to us as wrong:</strong>{' '}
            checked as soon as we see the report, ahead of the schedule.
          </li>
        </ul>
        <p>
          When a listing has fallen outside its window, the page says so rather than presenting old
          information as current.
        </p>

        <h2 className="text-2xl mt-10 mb-3">The three verification states</h2>
        <p>
          Every listing shows one of three badges. They mean exactly what they say, and they are
          styled differently so a checked record cannot be mistaken for an unchecked one.
        </p>
        <h3 className="text-xl mt-6 mb-2">Verified</h3>
        <p>
          A person confirmed the practical details against a primary source on the date shown: the
          business, the venue, the organizer, or an official booking or ticketing system. This is the
          only state in which we present a detail as fact.
        </p>
        <h3 className="text-xl mt-6 mb-2">Last checked</h3>
        <p>
          The listing was verified on the date shown, but the review window has since lapsed. The
          details were right when a person looked and may have changed since. Treat prices and hours
          as indicative and confirm anything that matters before you travel.
        </p>
        <h3 className="text-xl mt-6 mb-2">Sample data, not yet verified</h3>
        <p>
          The record exists in our system but no one has confirmed its details against a source. It
          is not a recommendation and should not be used to plan anything. In this template, seeded
          records carry this state on purpose so that nothing unchecked can pass as confirmed.
        </p>

        <h2 className="text-2xl mt-10 mb-3">What money cannot buy</h2>
        <p>
          We do not accept payment for editorial rankings. There is no fee to be included, no fee to
          rank higher, no fee to have a competitor removed, and no fee to have criticism taken down.
          A business that buys advertising gets an advertisement, labeled as one.
        </p>
        <p>
          Some links earn a commission when you book through them. Commissions never affect which
          places we recommend or the order they appear in, and we recommend plenty of places that
          earn us nothing. Sponsored placements are labeled <em>Sponsored</em>, paid editorial-style
          content is labeled <em>Paid partnership</em>, and commission links are labeled{' '}
          <em>Affiliate link</em>. The full commercial policy is on the{' '}
          <Link href="/advertising/#disclosure">disclosure section of the advertising page</Link>.
        </p>

        <h2 className="text-2xl mt-10 mb-3">No star ratings, no unverifiable reviews</h2>
        <p>
          We do not publish star ratings or numeric scores. A single number flattens the thing that
          actually helps you decide, which is who a place is right for and what the tradeoff is. We
          would rather write the sentence than assign the score.
        </p>
        <p>
          We also do not publish user reviews or testimonials we cannot verify. Anonymous submitted
          ratings are trivially gamed, and we will not put our name on a signal we cannot stand
          behind. Reader feedback does reach us and does change our coverage, but it does so by
          prompting a writer to go back and look, not by being republished as a score.
        </p>

        <h2 className="text-2xl mt-10 mb-3">How to challenge a recommendation</h2>
        <p>
          If you think a recommendation is wrong, tell us. Disagreement about a place is worth as
          much to us as a factual correction, and we would rather hear it than be quietly wrong.
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-5">
          <li>
            Write to <a href={`mailto:${site.org.editorialEmail}`}>{site.org.editorialEmail}</a> with
            the page URL and what you think we got wrong.
          </li>
          <li>
            Tell us when you went and what happened. Specifics are what let an editor act on it.
          </li>
          <li>
            An editor reviews the challenge and, when it holds up, assigns a re-visit or a re-check
            rather than editing the page from an inbox.
          </li>
          <li>
            If the recommendation changes, the page is updated with a dated note. If it does not
            change, we will tell you why.
          </li>
        </ul>
        <p>
          Business owners can challenge coverage the same way. We will correct anything factually
          wrong. We will not remove an accurate criticism, and we will not trade coverage for
          advertising. If you are reporting a specific factual error, the{' '}
          <Link href="/corrections/">corrections process</Link> is faster. The standards behind all
          of this are in our <Link href="/editorial-standards/">editorial standards</Link>, and{' '}
          {site.name} applies them to every category we cover.
        </p>
      </div>
    </div>
  );
}
