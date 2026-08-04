import Link from 'next/link';
import { Breadcrumbs, PageHeader } from '@/components/Ui';
import { buildMetadata } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'Corrections',
  description:
    'Our corrections policy: what we correct, how corrections are marked and dated on the page, and how to report an error.',
  path: '/corrections/',
});

export default function CorrectionsPage() {
  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Corrections', href: '/corrections/' }]} />
      <PageHeader
        eyebrow="Accountability"
        title="Corrections"
        intro="We get things wrong. When we do, we fix it in the open and say what changed."
      />
      <div className="prose-editorial py-10">
        <h2 className="text-2xl mt-10 mb-3">The policy</h2>
        <p>
          Any factual error in anything {site.name} publishes gets corrected as soon as we can
          confirm it, on the page where it appeared. We do not delete a page to make an error go
          away, and we do not quietly replace a wrong fact with a right one on anything that
          affected a reader&rsquo;s decision.
        </p>
        <p>
          Correcting the record is not a favor to whoever reported the error. It is the reason the
          rest of the site is worth reading.
        </p>

        <h2 className="text-2xl mt-10 mb-3">What we correct</h2>
        <ul className="mt-3 space-y-2 list-disc pl-5">
          <li>Wrong addresses, phone numbers, websites, or booking links.</li>
          <li>Wrong hours, closure days, or seasonal schedules.</li>
          <li>Wrong prices, cover charges, fees, or price ranges.</li>
          <li>Wrong event dates, times, venues, lineups, or ticket details.</li>
          <li>Misspelled names of people, businesses, streets, or neighborhoods.</li>
          <li>Misattributed quotes, or claims attributed to the wrong source.</li>
          <li>Claims about ownership, chefs, management, or affiliation that are out of date.</li>
          <li>A description of a place that no longer matches what is there.</li>
          <li>A missing or wrong disclosure of a paid, sponsored, or comped relationship.</li>
        </ul>

        <h3 className="text-xl mt-6 mb-2">Corrections, updates, and disagreement</h3>
        <p>
          A <strong className="font-semibold text-ink">correction</strong> means we published
          something that was not true when we published it. A correction notice goes on the page.
        </p>
        <p>
          An <strong className="font-semibold text-ink">update</strong> means the fact was right and
          the world changed: a restaurant raised prices, a venue changed its hours, a hotel finished
          a renovation. Updates change the listing and move its checked date. They are not marked as
          corrections because we did not make an error.
        </p>
        <p>
          A <strong className="font-semibold text-ink">disagreement</strong> about a judgment is
          neither. If you think a recommendation is wrong rather than a fact, the route for that is
          in <Link href="/how-we-choose/">how we choose</Link>. We take those seriously, and they can
          lead to a re-visit, but they are not handled as corrections.
        </p>

        <h2 className="text-2xl mt-10 mb-3">How corrections appear on the page</h2>
        <p>
          Corrections are shown on the affected page, not buried on this one. Each carries the date
          it was made, what was wrong, and what it says now. For example:
        </p>
        <div className="not-prose my-4 rounded border border-paper-edge bg-paper-sunk p-4 text-sm text-ink-soft">
          <p>
            <strong className="font-semibold text-ink">Correction, March 4:</strong> This guide
            originally said the venue was open on Mondays. It is closed Mondays. The hours have been
            corrected.
          </p>
        </div>
        <ul className="mt-3 space-y-2 list-disc pl-5">
          <li>
            The notice stays on the page permanently. We do not remove it once the page has been
            corrected.
          </li>
          <li>The page&rsquo;s updated date changes so the revision is visible in the byline.</li>
          <li>
            If the error was serious enough to have changed a reader&rsquo;s plans, we say what the
            page previously claimed, not just what it says now.
          </li>
          <li>
            If an error appeared in a newsletter or a social post, the correction goes out on the
            same channel.
          </li>
          <li>
            If a piece is wrong beyond repair, we mark it as withdrawn and explain why rather than
            deleting it.
          </li>
        </ul>

        <h2 className="text-2xl mt-10 mb-3">How to submit a correction</h2>
        <p>
          Email <a href={`mailto:${site.org.correctionsEmail}`}>{site.org.correctionsEmail}</a>. To
          help us move quickly, include:
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-5">
          <li>The URL of the page, and the sentence or field that is wrong.</li>
          <li>What it should say instead.</li>
          <li>
            How you know, if you can share it: a link to the business&rsquo;s own page, a
            confirmation email, a photo of posted hours, or the date you were there.
          </li>
          <li>Whether you are connected to the business, which is useful context, not a problem.</li>
        </ul>

        <h2 className="text-2xl mt-10 mb-3">What happens next</h2>
        <ul className="mt-3 space-y-2 list-disc pl-5">
          <li>We aim to acknowledge correction reports within two business days.</li>
          <li>
            An editor checks the claim against a primary source. We correct on evidence, not on
            assertion, including our own.
          </li>
          <li>
            Clear factual errors are usually fixed the same day they are confirmed. Anything
            requiring a re-visit takes longer, and we will tell you that it is in progress.
          </li>
          <li>
            We reply to let you know what we changed, or why we did not. You do not have to chase us
            for an answer.
          </li>
        </ul>
        <p>
          Requests to remove accurate but unflattering coverage are not corrections, and buying
          advertising does not change that. The reasoning is in our{' '}
          <Link href="/editorial-standards/">editorial standards</Link> and on the{' '}
          <Link href="/advertising/">advertising page</Link>. For anything that is not a correction,
          see the <Link href="/contact/">contact page</Link>.
        </p>
      </div>
    </div>
  );
}
