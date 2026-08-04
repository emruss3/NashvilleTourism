import Link from 'next/link';
import { Breadcrumbs, PageHeader } from '@/components/Ui';
import { buildMetadata } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'Our editorial standards',
  description:
    'The rules our writers and editors work under: independence, sourcing, fact-checking, named authorship, use of AI, corrections, and conflicts of interest.',
  path: '/editorial-standards/',
});

export default function EditorialStandardsPage() {
  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Editorial standards', href: '/editorial-standards/' }]} />
      <PageHeader
        eyebrow="Standards"
        title="Our editorial standards"
        intro="What we require of ourselves before anything is published, and what you can hold us to afterward."
      />
      <div className="prose-editorial py-10">
        <h2 className="text-2xl mt-10 mb-3">Independence</h2>
        <p>
          Editorial decisions at {site.name} are made by the editorial staff alone. No advertiser,
          sponsor, affiliate partner, or business contact has any say in what we cover, what we say
          about it, or where it appears. Advertisers do not see coverage before publication, and they
          do not get advance notice of critical coverage.
        </p>
        <p>
          A commercial relationship neither earns a place a recommendation nor disqualifies it from
          one. If a business we work with commercially is genuinely the right answer to a reader
          question, we say so and label the relationship. If it is not the right answer, it does not
          appear.
        </p>

        <h2 className="text-2xl mt-10 mb-3">Separation of editorial and commercial</h2>
        <p>
          Editorial and commercial are separate functions with separate reporting lines. Sales staff
          do not assign, write, edit, or approve editorial content. Editorial staff do not set
          advertising rates, negotiate deals, or hold revenue targets tied to specific coverage.
        </p>
        <p>
          When the two need to talk, an editor is present and the outcome is a labeling decision,
          not a coverage decision. Sponsored content is written or reviewed to a separate standard,
          is visually distinct, and always carries a label. The complete list of what is and is not
          for sale is on the <Link href="/advertising/">advertising page</Link>.
        </p>

        <h2 className="text-2xl mt-10 mb-3">Sourcing</h2>
        <p>
          Practical details are taken from primary sources: the business itself, the venue, the
          event organizer, the operator&rsquo;s own booking system, or a government or transit
          agency. We do not copy hours, addresses, prices, or dates from another guide, an aggregator,
          or a review site and present them as checked.
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-5">
          <li>Hours, addresses, and prices come from the operator or its official channels.</li>
          <li>
            Event dates and times are confirmed with the organizer or the venue&rsquo;s own calendar.
          </li>
          <li>
            Claims about what a place is like come from firsthand experience by a named writer, or
            they are attributed to whoever made them.
          </li>
          <li>
            Where a detail is likely to change, we date it on the page so you can judge how much
            weight it carries.
          </li>
          <li>
            When a business will not confirm something, we say that it is unconfirmed rather than
            guessing.
          </li>
        </ul>

        <h2 className="text-2xl mt-10 mb-3">Fact-checking</h2>
        <p>Before a page goes live, it goes through the same sequence:</p>
        <ul className="mt-3 space-y-2 list-disc pl-5">
          <li>
            The writer submits the piece with a source for every checkable claim: address, hours,
            price, capacity, closure, ownership, and any superlative.
          </li>
          <li>
            An editor checks each of those claims against the source, not against the draft. Numbers,
            names, and spellings are checked individually.
          </li>
          <li>
            Every listing is stamped with the date a person last checked its practical details and a
            status showing whether that check is current.
          </li>
          <li>
            Anything that cannot be confirmed is cut, softened to what we can support, or marked as
            unverified in plain language.
          </li>
          <li>
            The editor who signs off is recorded on the page. Publication is a decision by a named
            person.
          </li>
        </ul>
        <p>
          How places get considered in the first place, how often we re-check them, and what each
          verification state means is set out in <Link href="/how-we-choose/">how we choose</Link>.
        </p>

        <h2 className="text-2xl mt-10 mb-3">Named authorship</h2>
        <p>
          Every article has a byline with a real person&rsquo;s name, their role, what they cover,
          and a way to contact them. Pages that have been through a formal check also name the
          editor. We do not publish under invented personas, house pen names, or a generic staff
          byline used to obscure who did the work.
        </p>
        <p>
          Bylines carry a publication date and, when a piece has been revised in a way that changes
          its substance, an updated date. Silent rewrites of substantive claims are treated as
          corrections, not edits.
        </p>

        <h2 className="text-2xl mt-10 mb-3">How we use AI</h2>
        <p>
          Plainly: AI assists with drafting. It is used for first drafts, restructuring, summarizing
          source material we have already gathered, and routine copy tasks. The itinerary tool
          assembles plans from stored listings using set rules about timing, distance, and opening
          days. It does not invent places, and it can only return listings we have published.
        </p>
        <p>
          A named human edits everything before it is published and is accountable for it. That
          person is responsible for the accuracy of every claim on the page regardless of how the
          first draft was produced. AI is never the source of a fact, never a byline, and never the
          reason an error stands. We do not publish AI-generated photographs presented as
          photographs of real places.
        </p>

        <h2 className="text-2xl mt-10 mb-3">Errors and corrections</h2>
        <p>
          We correct errors quickly, in place, and visibly. A correction appears on the page it
          affects, dated, describing what was wrong and what it now says. We do not delete a page to
          make a mistake disappear, and we do not quietly swap a wrong fact for a right one on
          anything substantive.
        </p>
        <p>
          Report an error to{' '}
          <a href={`mailto:${site.org.correctionsEmail}`}>{site.org.correctionsEmail}</a>. The full
          policy, including what counts as a correction rather than an update, is on the{' '}
          <Link href="/corrections/">corrections page</Link>.
        </p>

        <h2 className="text-2xl mt-10 mb-3">Conflicts of interest</h2>
        <p>
          Writers and editors disclose to their editor any financial interest, employment,
          consulting work, family relationship, or close personal relationship involving a business
          we cover. Disclosure happens before an assignment, not after publication.
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-5">
          <li>
            Nobody writes about a business they own part of, work for, are paid by, or are related
            to the owners of. That assignment goes to someone else.
          </li>
          <li>
            Where a relationship is unavoidable and the coverage is still worth publishing, it is
            disclosed on the page in the reader&rsquo;s view, not in a policy document.
          </li>
          <li>
            Staff do not accept cash, gift cards, equity, or personal discounts from businesses we
            cover.
          </li>
          <li>
            Press trips, comped meals, comped rooms, and free tickets are disclosed on the resulting
            page. Accepting one never comes with agreed coverage or approval over what we write.
          </li>
          <li>
            Outside freelance work for a business in a category we cover has to be cleared by an
            editor in advance.
          </li>
        </ul>

        <h2 className="text-2xl mt-10 mb-3">Questions about a specific piece</h2>
        <p>
          Ask. Editorial questions go to{' '}
          <a href={`mailto:${site.org.editorialEmail}`}>{site.org.editorialEmail}</a>, and we will
          tell you where a claim came from. Other routes are on the{' '}
          <Link href="/contact/">contact page</Link>.
        </p>
      </div>
    </div>
  );
}
